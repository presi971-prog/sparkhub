# CLAUDE.md - SparkHub (Cobeone Pro)

Ce fichier donne à Claude tout le contexte et l'expertise nécessaires pour travailler sur SparkHub.

---

## 1. Contexte stratégique

### SparkHub = Outil d'acquisition pour Cobeone

**Cobeone** est une super-app en Guadeloupe (Uber + Deliveroo + Leboncoin + services à domicile).

**SparkHub** est une plateforme d'outils IA (génération vidéo, etc.) qui sert à :
1. Attirer des utilisateurs avec des outils IA pas chers
2. Les obliger à avoir un compte Cobeone pour s'inscrire (N° client requis)
3. Créer de l'urgence avec les places Fondateurs limitées

### Cibles

| Type | Source | Objectif |
|------|--------|----------|
| Livreurs | Cobeone Prestataires | 100 Fondateurs |
| Professionnels | Cobeone Commerces | 100 Fondateurs |

### Système Fondateurs (1 an)

| Rang | Statut | Réduction |
|------|--------|-----------|
| 1-10 | Platine | -50% |
| 11-30 | Or | -30% |
| 31-60 | Argent | -20% |
| 61-100 | Bronze | -10% |

### Gamification (après Year 1)

| Niveau | Points cumulés | Réduction base |
|--------|----------------|----------------|
| Débutant | 0-499 | 0% |
| Régulier | 500-1499 | 10% |
| Expert | 1500-4999 | 20% |
| Légende | 5000+ | 30% |

---

## 2. Stack technique

### Backend
- **Supabase** : PostgreSQL + Auth + Realtime + Storage
- **Next.js 16** : App Router, API Routes
- **Stripe** : Paiements et abonnements

### Frontend
- **React 19** avec Next.js App Router
- **Tailwind CSS 4** : Styling utilitaire
- **Framer Motion** : Animations fluides et micro-interactions
- **GSAP** : Animations complexes (timelines, scroll-triggered)
- **Lenis** : Smooth scroll
- **Mapbox GL** : Carte interactive

### SEO & Performance
- **next/image** : Optimisation images automatique
- **next-seo** : Meta tags et Open Graph
- **Schema.org** : Structured data (JSON-LD)
- **Vercel Analytics** : Core Web Vitals

---

## 3. Expertise Design & UX

### Style visuel SparkHub

**Moderne, premium, énergique** :
- Fonds sombres avec accents néon/électriques
- Glassmorphism subtil (blur, transparence)
- Gradients vibrants (bleu → violet → rose)
- Micro-interactions sur tous les éléments interactifs
- Vidéos en fond (hero sections)

### Palette de couleurs

```css
/* Couleurs principales */
--primary: #3B82F6;        /* Bleu électrique */
--primary-glow: #60A5FA;   /* Bleu lumineux */
--accent: #8B5CF6;         /* Violet */
--accent-pink: #EC4899;    /* Rose */

/* Fondateurs */
--platine: #A78BFA;        /* Violet clair */
--or: #FBBF24;             /* Or */
--argent: #9CA3AF;         /* Gris */
--bronze: #D97706;         /* Cuivre */

/* Fond */
--bg-dark: #0F172A;        /* Slate 900 */
--bg-card: rgba(30, 41, 59, 0.5); /* Glassmorphism */

/* Texte */
--text-primary: #F8FAFC;   /* Blanc cassé */
--text-secondary: #94A3B8; /* Gris clair */
```

### Patterns d'animation

#### Hero avec vidéo de fond
```tsx
<section className="relative h-screen overflow-hidden">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
  >
    <source src="/hero-video.mp4" type="video/mp4" />
  </video>
  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
  <div className="relative z-10 flex items-center justify-center h-full">
    {/* Contenu */}
  </div>
</section>
```

#### Glassmorphism card
```tsx
<div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
  {/* Contenu */}
</div>
```

#### Framer Motion - Fade up on scroll
```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  {/* Contenu */}
</motion.div>
```

#### Framer Motion - Stagger children
```tsx
<motion.ul
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
  variants={{
    visible: { transition: { staggerChildren: 0.1 } }
  }}
>
  {items.map((item) => (
    <motion.li
      key={item.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
    >
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

#### GSAP - Parallax on scroll
```tsx
useEffect(() => {
  gsap.to(".parallax-bg", {
    yPercent: -30,
    ease: "none",
    scrollTrigger: {
      trigger: ".parallax-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
}, []);
```

#### Compteur animé (places restantes)
```tsx
<motion.span
  key={count}
  initial={{ scale: 1.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  className="text-5xl font-bold text-primary"
>
  {count}
</motion.span>
```

#### Hover glow effect
```css
.glow-button {
  @apply relative overflow-hidden;
}
.glow-button::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 blur-xl transition-opacity duration-300;
}
.glow-button:hover::before {
  @apply opacity-50;
}
```

### Micro-interactions obligatoires

| Élément | Animation |
|---------|-----------|
| Boutons | Scale 1.02 + glow au hover |
| Cards | Lift (translateY -4px) + shadow au hover |
| Inputs | Border glow au focus |
| Badges | Pulse subtil quand nouveau |
| Points gagnés | Toast animé + confettis |
| Changement niveau | Explosion de particules |

### Smooth scroll (Lenis)

```tsx
// app/providers.tsx
'use client'
import Lenis from '@studio-freight/lenis'
import { useEffect } from 'react'

export function SmoothScrollProvider({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => lenis.destroy()
  }, [])

  return children
}
```

---

## 4. SEO Technique

### Meta tags obligatoires

```tsx
// app/layout.tsx
export const metadata = {
  title: {
    default: 'SparkHub - Outils IA pour pros en Guadeloupe',
    template: '%s | SparkHub'
  },
  description: 'Générez des vidéos IA professionnelles. Réductions exclusives pour les membres Cobeone.',
  keywords: ['IA', 'vidéo', 'Guadeloupe', 'livreur', 'professionnel'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://sparkhub.pro',
    siteName: 'SparkHub',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }]
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  }
}
```

### Structured Data (JSON-LD)

```tsx
// components/StructuredData.tsx
export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SparkHub",
          url: "https://sparkhub.pro",
          logo: "https://sparkhub.pro/logo.png",
          description: "Plateforme d'outils IA pour professionnels",
          areaServed: {
            "@type": "Place",
            name: "Guadeloupe"
          }
        })
      }}
    />
  )
}
```

### Core Web Vitals - Objectifs

| Métrique | Objectif | Comment |
|----------|----------|---------|
| LCP | < 2.5s | Images optimisées, lazy loading, preload hero |
| FID | < 100ms | Code splitting, defer non-essential JS |
| CLS | < 0.1 | Dimensions fixes sur images/vidéos, font-display: swap |

### Bonnes pratiques SEO

1. **URLs propres** : `/outils/generation-video` pas `/tools?id=123`
2. **Headings hiérarchiques** : Un seul H1, H2 pour sections, H3 pour sous-sections
3. **Alt text** : Toutes les images avec description
4. **Sitemap** : `/sitemap.xml` généré automatiquement
5. **Robots.txt** : Bloquer `/admin`, `/api`

---

## 5. UX / Conversion

### Principes de conversion

1. **Urgence Fondateurs** visible sur chaque page (header ou sidebar)
2. **Prix barrés** partout où il y a une réduction
3. **Social proof** : "X personnes ont rejoint cette semaine"
4. **CTA clair** : Un seul CTA principal par section
5. **Friction minimale** : 3 clics max pour toute action

### Parcours critique : Inscription

```
Landing → CTA "Devenir Fondateur" → Choix type → Formulaire multi-étapes → Confirmation
```

**Optimisations** :
- Progress bar visible
- Sauvegarde automatique (localStorage)
- Validation temps réel
- Messages d'erreur actionnables

### Ton et voix

- **Tutoiement**
- **Phrases courtes**
- **Enthousiaste mais pas excessif**
- **Emojis avec modération** (1-2 par section max)

---

## 6. Références design inspirantes

### Sites à étudier

| Site | Pourquoi |
|------|----------|
| [linear.app](https://linear.app) | Animations fluides, glassmorphism, dark mode |
| [stripe.com](https://stripe.com) | Gradients, illustrations, micro-interactions |
| [vercel.com](https://vercel.com) | Minimalisme, vitesse, dark mode élégant |
| [raycast.com](https://raycast.com) | Hero vidéo, glow effects, premium feel |
| [framer.com](https://framer.com) | Animations scroll, transitions pages |

### Tendances 2025-2026

- **Bento grids** : Layout asymétrique façon dashboard
- **Glow/neon effects** : Lueurs colorées sur éléments clés
- **3D subtil** : Éléments avec perspective légère
- **Grain texture** : Overlay grain pour texture vintage-moderne
- **Cursor effects** : Glow ou trail suivant la souris

---

## 7. Commandes utiles

```bash
# Développement
npm run dev                    # Serveur dev (port 3000)
npm run build                  # Build production
npm run lint                   # Vérifier le code

# Supabase
npx supabase db push           # Appliquer les migrations
npx supabase gen types         # Générer les types TypeScript

# Qualité
npx lighthouse https://sparkhub.pro --view  # Audit performance
```

---

## 8. Fichiers clés

| Fichier | Description |
|---------|-------------|
| `STRATEGIE-SPARKHUB.md` | Document stratégique complet |
| `.claude/skills/` | Skills backend (tables, points, badges, etc.) |
| `supabase/migrations/` | Migrations SQL |
| `app/` | Pages et routes Next.js |
| `components/` | Composants React réutilisables |

---

*Dernière mise à jour : 30 janvier 2026*
