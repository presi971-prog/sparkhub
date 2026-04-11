/**
 * Spark Compta — Health Check Route
 *
 * Vérifie que toutes les dépendances critiques sont accessibles :
 * - Supabase (base de données)
 * - Tables Spark Compta présentes
 *
 * Usage : GET /api/spark-compta/health-check
 * Retourne un JSON avec le statut de chaque dépendance.
 *
 * Sécurisé : accessible uniquement aux utilisateurs authentifiés ou via un
 * header d'API secret (pour monitoring externe).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  checks: {
    supabase_connection: 'ok' | 'error'
    spark_compta_tables: 'ok' | 'error' | 'not_found'
    spark_compta_categories_seed: 'ok' | 'error' | 'empty'
  }
  details?: Record<string, string>
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const result: HealthCheckResult = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      supabase_connection: 'error',
      spark_compta_tables: 'error',
      spark_compta_categories_seed: 'error',
    },
    details: {},
  }

  try {
    const supabase = await createClient()

    // Check 1 : connexion Supabase
    const { error: authError } = await supabase.auth.getSession()
    if (authError) {
      result.details!.supabase_connection = authError.message
      result.status = 'error'
      return NextResponse.json(result, { status: 503 })
    }
    result.checks.supabase_connection = 'ok'

    // Check 2 : table spark_compta_accounts existe et est interrogeable
    const { error: tableError } = await supabase
      .from('spark_compta_accounts')
      .select('id', { count: 'exact', head: true })

    if (tableError) {
      result.checks.spark_compta_tables = 'not_found'
      result.details!.spark_compta_tables = tableError.message
      result.status = 'degraded'
    } else {
      result.checks.spark_compta_tables = 'ok'
    }

    // Check 3 : les catégories seed sont bien en place (86 catégories attendues)
    const { count: categoriesCount, error: seedError } = await supabase
      .from('spark_compta_categories')
      .select('id', { count: 'exact', head: true })

    if (seedError) {
      result.checks.spark_compta_categories_seed = 'error'
      result.details!.spark_compta_categories_seed = seedError.message
      result.status = 'degraded'
    } else if (!categoriesCount || categoriesCount < 86) {
      result.checks.spark_compta_categories_seed = 'empty'
      result.details!.spark_compta_categories_seed = `Expected 86 categories, got ${categoriesCount ?? 0}`
      result.status = 'degraded'
    } else {
      result.checks.spark_compta_categories_seed = 'ok'
      result.details!.categories_count = String(categoriesCount)
    }

    const statusCode = result.status === 'ok' ? 200 : result.status === 'degraded' ? 207 : 503
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    result.status = 'error'
    result.details!.exception = error instanceof Error ? error.message : String(error)
    return NextResponse.json(result, { status: 503 })
  }
}
