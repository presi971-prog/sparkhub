import { NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')

  if (!requestId) {
    return NextResponse.json({ error: 'requestId requis' }, { status: 400 })
  }

  try {
    // Vérifier le statut du job fal.ai
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/nano-banana-pro/edit/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    )

    if (!statusResponse.ok) {
      return NextResponse.json({
        status: 'error',
        error: `fal.ai status error (${statusResponse.status})`,
      })
    }

    const statusData = await statusResponse.json()

    if (statusData.status === 'COMPLETED') {
      // Récupérer le résultat
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/nano-banana-pro/edit/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      )

      if (!resultResponse.ok) {
        return NextResponse.json({
          status: 'error',
          error: 'Impossible de récupérer le résultat',
        })
      }

      const resultData = await resultResponse.json()
      const imageUrl = resultData.images?.[0]?.url

      if (!imageUrl) {
        return NextResponse.json({
          status: 'error',
          error: 'Pas d\'image dans le résultat fal.ai',
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
