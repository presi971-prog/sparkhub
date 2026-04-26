const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

// Voix disponibles
export const VOICES = {
  matthew: 'VVsuXDy0Nf3RxAMSLOB3', // Cobeone (à remplacer)
  myra: 'MF3mGyEYCl7XYWbV9V6O',    // DCG AI — voix féminine FR
  audrey: 'McVZB9hVxVSk3Equu8EH',  // TranspoQuickD
  default: 'VVsuXDy0Nf3RxAMSLOB3',
}

// Mapping marque → voix
export const BRAND_VOICES: Record<string, string> = {
  cobeone: VOICES.matthew,
  'dcg-ai': VOICES.myra,
  sparkhub: VOICES.myra,
  transpoquickd: VOICES.audrey,
  'concours-spp': VOICES.matthew,
}

/**
 * Génère un audio voix off via ElevenLabs.
 * Retourne le buffer audio (MP3).
 */
export async function generateVoiceover(
  text: string,
  voiceId: string = VOICES.default
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY non configurée')
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`)
  }

  return response.arrayBuffer()
}
