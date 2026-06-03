# SparkPilot — Module Next.js

SparkPilot est le copilote qui transforme un rapport SparkScan en plan
d'action concret : 3 priorités stratégiques deviennent 9 à 12 tâches datées
que l'utilisateur coche au fil de l'eau.

## À quoi ça sert

Le rapport SparkScan dit "voici tes 3 priorités". SparkPilot dit "voici les
9 à 12 choses précises que tu dois cocher cette semaine pour les attaquer".

## Comment ça marche pour l'utilisateur

1. L'utilisateur lance un scan dans **SparkScan** (`/sparkscan`).
2. Une fois le rapport prêt, il peut créer un plan SparkPilot via
   `POST /api/sparkpilot/plans` avec `{ scan_id: "..." }`.
3. Claude lit les 3 priorités du rapport et propose 3 à 4 tâches
   actionnables par priorité (avec titre, contexte, durée, échéance).
4. L'utilisateur retrouve son plan sur `/sparkpilot`, coche les tâches au
   fur et à mesure, suit l'avancement dans le calendrier.

## Où vivent les fichiers

| Rôle | Chemin |
|------|--------|
| Routes API | `src/app/api/sparkpilot/` |
| Pages UI | `src/app/(sparkpilot)/sparkpilot/` |
| Logique métier | `src/lib/sparkpilot/` (`types.ts`, `decompose.ts`) |
| Composants partagés | `src/components/sparkpilot/` |
| Migration SQL | `supabase/migrations/048_sparkpilot_init.sql` |

## Ajouter une feature

Pour ajouter une nouvelle vue, créer un dossier sous
`src/app/(sparkpilot)/sparkpilot/` (Server Component par défaut, ajouter
`'use client'` uniquement pour l'interactivité). Pour un nouveau champ
en base, écrire une nouvelle migration `049_*.sql` (jamais modifier 048).

## Appliquer la migration

```bash
npx supabase migration up
```

La migration 048 crée 3 tables (`sparkpilot_plans`, `sparkpilot_tasks`,
`sparkpilot_activity`) avec RLS strict — un utilisateur ne voit que ses
propres plans et tâches via `auth.uid()`.
