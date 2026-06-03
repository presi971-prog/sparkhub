/**
 * Page Réglages SparkExecute — état des connexions GHL.
 *
 * Affiche :
 *  - Si le compte GHL DCG AI est branché côté serveur (variable
 *    GHL_DCGAI_PIT présente).
 *  - La liste des comptes RS connectés dans GHL Social Planner.
 *  - Des liens directs pour connecter un nouveau compte dans GHL.
 *
 * R0 sécurité : on ne révèle jamais le PIT, juste un booléen "configuré".
 */

import type { Metadata } from 'next'

import { ReglagesView } from './reglages-view'

export const metadata: Metadata = {
  title: 'Réglages · GHL',
}

export default function ReglagesPage() {
  return <ReglagesView />
}
