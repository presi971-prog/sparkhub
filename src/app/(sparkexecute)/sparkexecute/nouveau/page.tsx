/**
 * Page "Nouveau livrable" — création manuelle (sans tâche SparkPilot d'origine).
 *
 * Flow en 2 étapes :
 *   1. Sélection du type (grille de 10 cards, 3 actives en V1)
 *   2. Formulaire brief (sujet, audience, ton, mots-clés, longueur)
 *
 * Pure client component pour gérer les transitions d'état (stepper).
 * Création du run via POST /api/sparkexecute/runs puis redirect sur la page détail.
 */

import { NewRunWizard } from './new-run-wizard'

export const metadata = {
  title: 'Créer un livrable',
}

export default function NouveauRunPage() {
  return <NewRunWizard />
}
