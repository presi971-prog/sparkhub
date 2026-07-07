/**
 * Carte « QCM du jour » Concours SPP — PNG 1080×1080 rendu côté serveur
 * (satori via next/og : même charte que les cartes de titre du blog projet-B :
 * fond marine #1B2A4A→#0F1A30, badge rouge #C8102E, accent or #D4A843).
 *
 * PNG obligatoire (pas le SVG du blog) : Instagram/Facebook via GHL refusent
 * les SVG en média de post. Pas d'emoji dans la carte : satori exige un
 * fetch réseau de glyphes emoji à chaque rendu (fragile dans un cron).
 */

import { ImageResponse } from 'next/og'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export interface QuizCardInput {
  /** Libellé du concours affiché en haut (ex. « Caporal externe »). */
  gradeLabel: string
  question: string
  options: string[]
}

export async function renderQuizCardPng(input: QuizCardInput): Promise<Buffer> {
  const question = input.question.trim()
  const options = input.options.slice(0, 6)
  // Tailles adaptées à la longueur (les questions découverte sont courtes,
  // mais on encaisse les cas longs sans déborder du carré).
  const questionSize = question.length > 160 ? 34 : question.length > 100 ? 40 : 46
  const longestOption = Math.max(...options.map((o) => o.length), 0)
  const optionSize = longestOption > 70 ? 26 : longestOption > 45 ? 30 : 34

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #1B2A4A 0%, #0F1A30 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* En-tête : badge rouge + concours */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              background: '#C8102E',
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 3,
              padding: '12px 28px',
              borderRadius: 999,
            }}
          >
            QCM DU JOUR
          </div>
          <div
            style={{
              display: 'flex',
              color: '#D4A843',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {input.gradeLabel.toUpperCase()}
          </div>
        </div>

        {/* Question */}
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            alignItems: 'center',
            color: '#FFFFFF',
            fontSize: questionSize,
            fontWeight: 800,
            lineHeight: 1.3,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          {question}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: 'rgba(200, 16, 46, 0.9)',
                  color: '#FFFFFF',
                  fontSize: 28,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {LETTERS[i]}
              </div>
              <div
                style={{
                  display: 'flex',
                  color: '#E8ECF4',
                  fontSize: optionSize,
                  lineHeight: 1.25,
                }}
              >
                {opt}
              </div>
            </div>
          ))}
        </div>

        {/* Pied : appel à commenter + marque */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 44,
            paddingTop: 28,
            borderTop: '4px solid #D4A843',
          }}
        >
          <div style={{ display: 'flex', color: '#D4A843', fontSize: 30, fontWeight: 800 }}>
            Sûr de ta réponse ?
          </div>
          <div style={{ display: 'flex', color: '#FFFFFF', fontSize: 30, fontWeight: 800 }}>
            CONCOURS&nbsp;
            <span style={{ color: '#D4A843' }}>SPP</span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  )

  return Buffer.from(await image.arrayBuffer())
}
