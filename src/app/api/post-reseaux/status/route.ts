import { NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const statusUrl = searchParams.get('statusUrl')
  const responseUrl = searchParams.get('responseUrl')

  if (!statusUrl || !responseUrl) {
    return NextResponse.json({ error: 'statusUrl et responseUrl requis' }, { status: 400 })
  }

  try {
    // Vérifier le statut via l'URL fournie par fal.ai
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    })

    if (!statusResponse.ok) {
      const errText = await statusResponse.text()
      return NextResponse.json({
        status: 'error',
        error: `fal.ai status (${statusResponse.status}): ${errText}`,
      })
    }

    const statusData = await statusResponse.json()

    if (statusData.status === 'COMPLETED') {
      // Récupérer le résultat via response_url
      const resultResponse = await fetch(responseUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      })

      if (!resultResponse.ok) {
        return NextResponse.json({
          status: 'error',
          error: 'Impossible de récupérer le résultat fal.ai',
        })
      }

      const resultData = await resultResponse.json()
      const imageUrl = resultData.images?.[0]?.url

      if (!imageUrl) {
        return NextResponse.json({
          status: 'error',
          error: `Pas d'image. Réponse: ${JSON.stringify(resultData).slice(0, 200)}`,
        })
      }

      return NextResponse.json({
        status: 'completed',
        image_url: imageUrl,
      })
    }

    if (statusData.status === 'FAILED') {
      return NextResponse.json({
        status: 'error',
        error: statusData.error || 'La retouche a échoué',
      })
    }

    // IN_QUEUE ou IN_PROGRESS
    return NextResponse.json({
      status: 'processing',
      fal_status: statusData.status,
      queue_position: statusData.queue_position,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    })
  }
}
