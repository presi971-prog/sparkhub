import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'SparkHub <noreply@sparkhub.digital-code-growth.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sparkhub.digital-code-growth.com'

// ============================================================
// Admin Notifications
// ============================================================

export async function sendAdminNewRegistrationAlert(pending: {
  id: string
  full_name: string
  email: string
  user_type: string
  cobeone_id: string
  cobeone_app: string
  created_at: string
}) {
  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL not set, skipping notification')
    return
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: `🆕 Nouvelle inscription à valider : ${pending.full_name}`,
    html: `
      <h2>Nouvelle inscription en attente</h2>
      <table style="border-collapse: collapse;">
        <tr><td style="padding: 8px; font-weight: bold;">Nom :</td><td style="padding: 8px;">${pending.full_name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email :</td><td style="padding: 8px;">${pending.email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Type :</td><td style="padding: 8px;">${pending.user_type}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">N° Cobeone :</td><td style="padding: 8px;">${pending.cobeone_id}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">App Cobeone :</td><td style="padding: 8px;">${pending.cobeone_app}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Date :</td><td style="padding: 8px;">${new Date(pending.created_at).toLocaleString('fr-FR')}</td></tr>
      </table>
      <br>
      <a href="${APP_URL}/admin/validations/${pending.id}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px;">
        👉 Valider cette inscription
      </a>
    `
  })
}

// ============================================================
// User Notifications
// ============================================================

export async function sendUserPendingEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Votre inscription SparkHub est en cours de vérification',
    html: `
      <h2>Bonjour ${name} !</h2>
      <p>Nous avons bien reçu votre demande d'inscription à SparkHub.</p>
      <p>Notre équipe vérifie actuellement votre éligibilité via votre N° Cobeone.</p>
      <p>Vous recevrez une réponse dans les <strong>24-48h</strong>.</p>
      <br>
      <p>À très bientôt !</p>
      <p>L'équipe SparkHub</p>
    `
  })
}

export async function sendApprovalEmail(
  email: string,
  name: string,
  founderResult?: { success: boolean; slot_number: number; founder_status: string } | null
) {
  let founderMessage = ''

  if (founderResult?.success) {
    const typeEmoji: Record<string, string> = {
      platine: '💎',
      or: '🥇',
      argent: '🥈',
      bronze: '🥉'
    }

    const discountPercent: Record<string, number> = {
      platine: 50,
      or: 30,
      argent: 20,
      bronze: 10
    }

    const emoji = typeEmoji[founderResult.founder_status] || ''
    const discount = discountPercent[founderResult.founder_status] || 0
    const statusCapitalized = founderResult.founder_status.charAt(0).toUpperCase() + founderResult.founder_status.slice(1)

    founderMessage = `
      <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <p style="font-size: 24px; margin: 0;">🎉 Félicitations !</p>
        <p style="font-size: 18px; margin: 10px 0;">Vous êtes le <strong>#${founderResult.slot_number}</strong> inscrit !</p>
        <p style="font-size: 20px; margin: 10px 0;">
          ${emoji} <strong>Fondateur ${statusCapitalized}</strong>
        </p>
        <p style="margin: 10px 0;">
          Vous bénéficiez de <strong>-${discount}%</strong> sur tous les outils pendant 1 an !
        </p>
      </div>
    `
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '✅ Votre compte SparkHub est activé !',
    html: `
      <h2>Bienvenue ${name} !</h2>
      <p>Votre compte SparkHub a été validé avec succès.</p>
      ${founderMessage}
      <p>Vous pouvez maintenant vous connecter et profiter de tous nos outils IA.</p>
      <br>
      <a href="${APP_URL}/connexion" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px;">
        👉 Se connecter
      </a>
      <br><br>
      <p>À très bientôt !</p>
      <p>L'équipe SparkHub</p>
    `
  })
}

export async function sendRejectionEmail(email: string, name: string, reason: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '❌ Votre inscription SparkHub n\'a pas été validée',
    html: `
      <h2>Bonjour ${name},</h2>
      <p>Nous avons examiné votre demande d'inscription à SparkHub.</p>
      <p>Malheureusement, nous n'avons pas pu valider votre éligibilité.</p>
      <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0;">
        <strong>Raison :</strong> ${reason}
      </div>
      <p>Si vous pensez qu'il s'agit d'une erreur, vous pouvez nous contacter à support@sparkhub.pro.</p>
      <br>
      <p>L'équipe SparkHub</p>
    `
  })
}

// ============================================================
// Badge Notifications
// ============================================================

export async function sendNewBadgeEmail(
  email: string,
  name: string,
  badge: { name: string; description: string; icon: string }
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `🏅 Nouveau badge débloqué : ${badge.name}`,
    html: `
      <h2>Félicitations ${name} !</h2>
      <p>Vous avez débloqué un nouveau badge :</p>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 64px;">${badge.icon}</div>
        <h3 style="margin: 10px 0;">${badge.name}</h3>
        <p style="color: #6B7280;">${badge.description}</p>
      </div>
      <p>Continuez comme ça pour débloquer encore plus de badges !</p>
      <br>
      <a href="${APP_URL}/badges" style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 8px;">
        👉 Voir tous mes badges
      </a>
    `
  })
}
