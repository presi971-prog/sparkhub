---
name: setup-registration-validation
description: Configure le système de validation manuelle des inscriptions SparkHub (N° Cobeone, alertes admin, notifications)
allowed-tools: Read, Write, Bash
---

# Configuration de la validation des inscriptions SparkHub

## Processus de validation

```
1. Utilisateur s'inscrit avec N° Cobeone
        ↓
2. Inscription en attente (pending_registrations)
        ↓
3. Alerte envoyée à l'admin
        ↓
4. Message à l'utilisateur : "Nous vérifions votre éligibilité"
        ↓
5. Admin vérifie manuellement le N° sur Cobeone
        ↓
6. Admin approuve ou refuse
        ↓
7. Notification à l'utilisateur (email/WhatsApp)
```

## Table `pending_registrations`

```sql
CREATE TABLE pending_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- Stocker temporairement le hash
  full_name TEXT NOT NULL,
  phone TEXT,
  cobeone_id TEXT NOT NULL,
  cobeone_type TEXT NOT NULL, -- 'prestataire' ou 'commerce'
  user_type TEXT NOT NULL, -- 'livreur' ou 'professionnel'

  -- Données spécifiques livreur
  vehicle_type TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  license_plate TEXT,
  zones TEXT[], -- Zones de livraison

  -- Données spécifiques pro
  company_name TEXT,
  siret TEXT,
  address TEXT,
  sector TEXT,

  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  rejection_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Route : Inscription (step 1)

```typescript
// POST /api/auth/register
export async function POST(req: Request) {
  const data = await req.json()

  // Valider les données
  // ...

  // Créer l'inscription en attente
  const { data: pending, error } = await supabase
    .from('pending_registrations')
    .insert({
      email: data.email,
      password_hash: await hashPassword(data.password),
      full_name: data.fullName,
      phone: data.phone,
      cobeone_id: data.cobeoneId,
      cobeone_type: data.cobeoneType,
      user_type: data.userType,
      // ... autres champs selon le type
    })
    .select()
    .single()

  if (error) throw error

  // Envoyer l'alerte admin
  await sendAdminAlert(pending)

  // Envoyer le message de confirmation à l'utilisateur
  await sendUserPendingEmail(data.email, data.fullName)

  return Response.json({
    success: true,
    message: "Inscription reçue. Nous vérifions votre éligibilité."
  })
}
```

## Fonction : Envoyer alerte admin

```typescript
// lib/notifications/admin-alert.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAdminAlert(pending: PendingRegistration) {
  await resend.emails.send({
    from: 'SparkHub <noreply@sparkhub.pro>',
    to: process.env.ADMIN_EMAIL!,
    subject: `🆕 Nouvelle inscription à valider : ${pending.full_name}`,
    html: `
      <h2>Nouvelle inscription en attente</h2>
      <p><strong>Nom :</strong> ${pending.full_name}</p>
      <p><strong>Email :</strong> ${pending.email}</p>
      <p><strong>Type :</strong> ${pending.user_type}</p>
      <p><strong>N° Cobeone :</strong> ${pending.cobeone_id}</p>
      <p><strong>App Cobeone :</strong> ${pending.cobeone_type}</p>
      <p><strong>Date :</strong> ${new Date(pending.created_at).toLocaleString('fr-FR')}</p>
      <br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/validations/${pending.id}">
        👉 Valider cette inscription
      </a>
    `
  })
}
```

## Fonction : Email utilisateur en attente

```typescript
// lib/notifications/user-pending.ts
export async function sendUserPendingEmail(email: string, name: string) {
  await resend.emails.send({
    from: 'SparkHub <noreply@sparkhub.pro>',
    to: email,
    subject: 'Votre inscription SparkHub est en cours de vérification',
    html: `
      <h2>Bonjour ${name} !</h2>
      <p>Nous avons bien reçu votre demande d'inscription à SparkHub.</p>
      <p>Notre équipe vérifie actuellement votre éligibilité. Vous recevrez une réponse dans les 24-48h.</p>
      <p>À très bientôt !</p>
      <p>L'équipe SparkHub</p>
    `
  })
}
```

## API Route : Validation admin

```typescript
// POST /api/admin/registrations/[id]/approve
export async function POST(req: Request, { params }) {
  const { id } = params
  const adminId = await getAdminId(req) // Vérifier que c'est un admin

  // Récupérer l'inscription en attente
  const { data: pending } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('id', id)
    .single()

  if (!pending) throw new Error('Inscription non trouvée')

  // Créer le compte utilisateur
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: pending.email,
    password: pending.password_hash, // Déjà hashé
    email_confirm: true
  })

  // Créer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email: pending.email,
      full_name: pending.full_name,
      phone: pending.phone,
      cobeone_id: pending.cobeone_id,
      cobeone_type: pending.cobeone_type,
      role: pending.user_type,
      is_validated: true,
      validated_at: new Date()
    })
    .select()
    .single()

  // Attribuer un slot Fondateur si disponible
  const { data: founderResult } = await supabase.rpc('claim_founder_slot', {
    p_profile_id: profile.id,
    p_user_type: pending.user_type
  })

  // Mettre à jour le statut de l'inscription
  await supabase
    .from('pending_registrations')
    .update({
      status: 'approved',
      reviewed_at: new Date(),
      reviewed_by: adminId
    })
    .eq('id', id)

  // Envoyer la notification à l'utilisateur
  await sendApprovalEmail(pending.email, pending.full_name, founderResult)

  return Response.json({ success: true })
}
```

## Fonction : Email d'approbation

```typescript
export async function sendApprovalEmail(
  email: string,
  name: string,
  founderResult: { success: boolean, slot_number: number, founder_type: string }
) {
  let founderMessage = ''

  if (founderResult.success) {
    const typeEmoji = {
      platine: '💎',
      or: '🥇',
      argent: '🥈',
      bronze: '🥉'
    }[founderResult.founder_type]

    founderMessage = `
      <p>🎉 <strong>Félicitations !</strong> Vous êtes le ${founderResult.slot_number}ème inscrit !</p>
      <p>Vous êtes <strong>Fondateur ${founderResult.founder_type.charAt(0).toUpperCase() + founderResult.founder_type.slice(1)}</strong> ${typeEmoji}</p>
      <p>Vous bénéficiez d'une réduction de ${
        founderResult.founder_type === 'platine' ? '50%' :
        founderResult.founder_type === 'or' ? '30%' :
        founderResult.founder_type === 'argent' ? '20%' : '10%'
      } sur tous les outils pendant 1 an !</p>
    `
  }

  await resend.emails.send({
    from: 'SparkHub <noreply@sparkhub.pro>',
    to: email,
    subject: '✅ Votre compte SparkHub est activé !',
    html: `
      <h2>Bienvenue ${name} !</h2>
      <p>Votre compte SparkHub a été validé avec succès.</p>
      ${founderMessage}
      <p>Vous pouvez maintenant vous connecter et profiter de tous nos outils IA.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/connexion">
        👉 Se connecter
      </a>
      <p>À très bientôt !</p>
      <p>L'équipe SparkHub</p>
    `
  })
}
```

## API Route : Refus admin

```typescript
// POST /api/admin/registrations/[id]/reject
export async function POST(req: Request, { params }) {
  const { id } = params
  const { reason } = await req.json()
  const adminId = await getAdminId(req)

  const { data: pending } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('id', id)
    .single()

  // Mettre à jour le statut
  await supabase
    .from('pending_registrations')
    .update({
      status: 'rejected',
      reviewed_at: new Date(),
      reviewed_by: adminId,
      rejection_reason: reason
    })
    .eq('id', id)

  // Envoyer la notification de refus
  await sendRejectionEmail(pending.email, pending.full_name, reason)

  return Response.json({ success: true })
}
```

## Page admin : Liste des inscriptions en attente

Créer une page `/admin/validations` qui affiche :
- Liste des inscriptions en attente
- Détails de chaque inscription
- Boutons Approuver / Refuser
- Historique des validations
