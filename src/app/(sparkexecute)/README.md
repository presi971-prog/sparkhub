# SparkExecute — README dev

## À quoi ça sert

SparkExecute est le 3e outil de la triade Spark (après SparkScan et SparkPilot).
Il **produit** réellement les livrables marketing : articles SEO, posts LinkedIn,
visuels. Il est branché sur SparkPilot : chaque tâche du plan peut devenir un
livrable concret en un clic.

## Le flow utilisateur

1. L'utilisateur a un plan SparkPilot avec des tâches (ex : "Rédiger une étude
   de cas client").
2. Sur la tâche, il clique **Faire avec SparkExecute**.
3. `POST /api/sparkexecute/runs { task_id, type }` crée un `sparkexecute_run`
   en statut `generating` et lance la génération en arrière-plan.
4. L'utilisateur est redirigé sur `/sparkexecute/runs/[id]` où la page polle
   l'API toutes les 3s jusqu'à `status = draft`.
5. Une fois le brouillon prêt, l'utilisateur peut éditer le contenu, valider,
   refaire avec une variante, ou archiver.

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `supabase/migrations/052_sparkexecute_init.sql` | Tables `sparkexecute_runs`, `sparkexecute_usage` + bucket Storage `sparkexecute-visuals` |
| `src/lib/sparkexecute/types.ts` | Types TS (RunType, RunStatus, RunInputBrief, RunOutput) |
| `src/lib/sparkexecute/type-mapping.ts` | Mapping framework SparkPilot → type SparkExecute |
| `src/lib/sparkexecute/generators/*.ts` | 3 générateurs V1 : article SEO, post LinkedIn, visuel |
| `src/lib/sparkexecute/orchestrate.ts` | Orchestrateur (route le run vers son générateur) |
| `src/lib/sparkexecute/claude-text.ts` | Helper Claude qui renvoie du texte (les générateurs texte l'utilisent) |
| `src/app/api/sparkexecute/runs/**` | Routes API CRUD + actions (validate, publish, redo) |
| `src/app/(sparkexecute)/sparkexecute/**` | Pages Next.js (dashboard, mes-creations, runs/[id], nouveau) |
| `src/components/sparkexecute/**` | Composants partagés (header, run-card, badges, palette) |

## Ajouter un nouveau type de livrable

V1 = 3 types (article_seo, post_linkedin, visual). Pour en ajouter un 4ᵉ :

1. **Marquer comme disponible** dans `src/lib/sparkexecute/type-mapping.ts` →
   `RUN_TYPE_AVAILABLE_V1[<nouveau_type>] = true`.
2. **Créer le générateur** dans `src/lib/sparkexecute/generators/<nouveau-type>.ts`
   (signature : `(brief, task?) => Promise<{ output, cost, frameworkUsed }>`).
3. **Brancher l'orchestrateur** dans `orchestrate.ts` → `dispatchGeneration()`.
4. **Vérifier les heuristiques** de `deduceTypeFromFramework()` si le nouveau
   type doit être suggéré automatiquement depuis SparkPilot.

Le type doit déjà être dans la contrainte CHECK de la table `sparkexecute_runs`
(les 10 types sont déjà autorisés). Si tu veux en ajouter un 11ᵉ, fais une
migration `053_sparkexecute_new_type.sql` avec un `ALTER TABLE ... CHECK ...`.

## Appliquer la migration

```bash
npx supabase db push                 # applique en local
npx supabase db push --linked        # applique sur le projet distant
```

Ou via le SQL Editor Supabase, copier le contenu de la migration 052.

## Coûts (indicatifs)

- Article SEO 1200 mots : Claude Sonnet 4.6 ≈ $0.03 / run
- Post LinkedIn 800 caractères : Claude Sonnet 4.6 ≈ $0.005 / run
- Visuel 1080×1080 : Nano Banana Pro ≈ $0.03 / image

Cumulés et stockés par jour dans `sparkexecute_usage` (user_id, day, runs_count,
cost_usd).

## R0 absolues (rappel)

- **Pédagogie partout** : microcopies UI et messages d'erreur en français simple
- **Ancrage Guadeloupe** : prompts Claude/Nano Banana forcent les exemples GP
- **Pas inventer** : aucune feature hors V1 (pas d'AI suggestions, pas de team chat)
- **Pas casser le code acté** : la route `/api/sparkpilot/*` n'est pas modifiée
