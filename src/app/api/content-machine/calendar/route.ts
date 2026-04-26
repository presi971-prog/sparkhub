import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { askClaude } from '@/lib/content-machine/anthropic'

/**
 * Planning hebdomadaire par marque.
 * Cle = jour de la semaine (1=Lundi ... 7=Dimanche)
 */
const WEEKLY_PATTERNS: Record<string, Record<number, string>> = {
  cobeone: {
    1: 'post_image',   // Lundi
    2: 'carousel',     // Mardi
    3: 'post_image',   // Mercredi
    4: 'video',        // Jeudi
    5: 'post_image',   // Vendredi
    6: 'carousel',     // Samedi
    7: 'post_image',   // Dimanche
  },
  'dcg-ai': {
    1: 'post_image',   // Lundi
    2: 'post_image',   // Mardi
    3: 'carousel',     // Mercredi
    4: 'post_image',   // Jeudi
    5: 'video',        // Vendredi
    6: 'post_image',   // Samedi
    7: 'carousel',     // Dimanche
  },
  sparkhub: {
    1: 'post_image',
    2: 'carousel',
    3: 'post_image',
    4: 'post_image',
    5: 'carousel',
    6: 'video',
    7: 'post_image',
  },
  transpoquickd: {
    1: 'post_image',
    2: 'post_image',
    3: 'carousel',
    4: 'post_image',
    5: 'post_image',
    6: 'video',
    7: 'post_image',
  },
  'concours-spp': {
    1: 'post_image',
    2: 'carousel',
    3: 'post_image',
    4: 'post_image',
    5: 'carousel',
    6: 'post_image',
    7: 'video',
  },
}

/**
 * Retourne le jour de la semaine ISO (1=Lundi, 7=Dimanche) a partir d'une Date.
 */
function getISODayOfWeek(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

/**
 * Genere des themes creatifs pour une semaine de contenu.
 */
async function generateWeeklyThemes(
  brand: { name: string; description: string; tone: string; target: string; arguments: string },
  schedule: Array<{ date: string; dayName: string; contentType: string }>
): Promise<string[]> {
  const scheduleText = schedule
    .map((s, i) => `${i + 1}. ${s.dayName} (${s.date}) - Type: ${s.contentType}`)
    .join('\n')

  const systemPrompt = `Tu es un directeur editorial expert en strategie de contenu pour les reseaux sociaux.
Marque : ${brand.name}
Description : ${brand.description || 'Non fournie'}
Ton : ${brand.tone || 'Professionnel'}
Cible : ${brand.target || 'Professionnels'}
Arguments cles : ${brand.arguments || 'Qualite, innovation'}

Genere un theme creatif et precis pour chaque jour. Chaque theme doit etre :
- Specifique (pas generique)
- Adapte au type de contenu (post, carousel, video)
- En coherence avec la marque
- Varie (pas de repetitions)

Reponds UNIQUEMENT en JSON : un tableau de strings, un theme par jour, dans l'ordre.
Exemple : ["Theme jour 1", "Theme jour 2", ...]
Pas de markdown, pas de backticks.`

  const rawResponse = await askClaude(systemPrompt, `Voici le planning de la semaine :\n${scheduleText}`, 1500)

  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

const DAY_NAMES: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export async function POST() {
  try {
    const supabase = createAdminSupabase()

    // Recuperer toutes les marques actives
    const { data: brands, error: brandsError } = await supabase
      .from('cm_brands')
      .select('*')

    if (brandsError) {
      return NextResponse.json(
        { error: `Erreur lecture marques: ${brandsError.message}` },
        { status: 500 }
      )
    }

    if (!brands || brands.length === 0) {
      return NextResponse.json(
        { error: 'Aucune marque active trouvee' },
        { status: 404 }
      )
    }

    const calendarEntries: Array<{
      brand: string
      date: string
      contentType: string
      theme: string
    }> = []

    for (const brand of brands) {
      // Determiner le pattern a utiliser (defaut = dcg)
      const pattern = WEEKLY_PATTERNS[brand.slug] || WEEKLY_PATTERNS['dcg-ai']

      // Generer les 7 prochains jours
      const today = new Date()
      const schedule: Array<{ date: string; dayName: string; contentType: string }> = []

      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const isoDay = getISODayOfWeek(date)
        const contentType = pattern[isoDay] || 'post_image'
        const dateStr = date.toISOString().split('T')[0]

        schedule.push({
          date: dateStr,
          dayName: DAY_NAMES[isoDay],
          contentType,
        })
      }

      // Generer les themes via Claude
      let themes: string[]
      try {
        themes = await generateWeeklyThemes(brand, schedule)
      } catch {
        // Fallback : themes generiques si erreur IA
        themes = schedule.map((s) => `Contenu ${s.contentType} du ${s.dayName} pour ${brand.name}`)
      }

      // Verifier qu'il n'y a pas deja des entrees pour ces dates
      const dates = schedule.map(s => s.date)
      const { data: existingEntries } = await supabase
        .from('cm_calendar')
        .select('date')
        .eq('brand_id', brand.id)
        .in('date', dates)

      const existingDates = new Set((existingEntries || []).map(e => e.date))

      // Creer les entrees du calendrier
      const newEntries = schedule
        .map((s, i) => ({
          brand_id: brand.id,
          content_type: s.contentType,
          theme: themes[i] || `Contenu ${s.contentType}`,
          date: s.date,
          status: 'planned',
        }))
        .filter(entry => !existingDates.has(entry.date))

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('cm_calendar')
          .insert(newEntries)

        if (insertError) {
          console.error(`[calendar] Erreur insertion pour ${brand.slug}:`, insertError)
          continue
        }
      }

      for (const entry of newEntries) {
        calendarEntries.push({
          brand: brand.slug,
          date: entry.date,
          contentType: entry.content_type,
          theme: entry.theme,
        })
      }
    }

    return NextResponse.json({
      message: `Calendrier genere : ${calendarEntries.length} entrees creees`,
      entries: calendarEntries,
    })
  } catch (error) {
    console.error('[content-machine/calendar] Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
