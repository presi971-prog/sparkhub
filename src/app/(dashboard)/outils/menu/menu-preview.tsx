'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { type MenuTemplate } from './menu-templates'
import { type MenuTheme, EXPORT_FORMATS, type ExportFormat } from './menu-themes'

interface MenuItem {
  name: string
  price: number | null
  description?: string | null
}

interface MenuCategory {
  name: string
  items: MenuItem[]
}

interface RestaurantInfo {
  name: string
  slogan?: string
  address?: string
  phone?: string
  hours?: string
  logoUrl?: string
}

interface MenuPreviewProps {
  categories: MenuCategory[]
  restaurantInfo: RestaurantInfo
  template: MenuTemplate
  theme: MenuTheme
  creditsRemaining: number
  onBack: () => void
  onReset: () => void
}

export function MenuPreview({
  categories,
  restaurantInfo,
  template,
  theme,
  creditsRemaining,
  onBack,
  onReset,
}: MenuPreviewProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>('a4')
  const [isExporting, setIsExporting] = useState(false)

  const format = EXPORT_FORMATS.find(f => f.id === selectedFormat) || EXPORT_FORMATS[0]
  const hasTheme = theme.id !== 'aucun'
  const accentColor = theme.accentOverride || template.accentColor
  const headerBg = theme.headerBgOverride || template.headerBg
  const isLightHeader = template.id === 'moderne_epure' && !hasTheme
  const isSocialFormat = selectedFormat !== 'a4'

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return ''
    return `${price.toFixed(2).replace('.', ',')} EUR`
  }

  // Export PDF via window.print
  const handlePrint = () => {
    window.print()
  }

  // Export image via html2canvas
  const handleExportImage = async () => {
    if (!menuRef.current) return
    setIsExporting(true)

    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(menuRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: template.bgColor,
        width: format.width,
        height: format.height === 'auto' ? undefined : format.height,
      })

      const link = document.createElement('a')
      link.download = `menu-${restaurantInfo.name?.replace(/\s+/g, '-').toLowerCase() || 'restaurant'}-${format.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Taille d'affichage a l'ecran (reduit pour l'apercu)
  const getPreviewStyle = (): React.CSSProperties => {
    if (selectedFormat === 'a4') {
      return { maxWidth: '210mm' }
    }
    // Pour les formats sociaux : on affiche a taille reduite
    const maxScreenWidth = 540
    const scale = Math.min(1, maxScreenWidth / format.width)
    const w = format.width * scale
    const h = format.height === 'auto' ? undefined : (format.height as number) * scale
    return {
      width: `${w}px`,
      height: h ? `${h}px` : undefined,
      overflow: 'hidden',
    }
  }

  // Style interne du menu (taille reelle pour capture)
  const getMenuStyle = (): React.CSSProperties => {
    if (selectedFormat === 'a4') {
      return {
        backgroundColor: template.bgColor,
        color: template.textColor,
        fontFamily: template.bodyFont,
        backgroundImage: theme.bgPattern || undefined,
      }
    }
    const maxScreenWidth = 540
    const scale = Math.min(1, maxScreenWidth / format.width)
    return {
      width: `${format.width}px`,
      height: format.height === 'auto' ? undefined : `${format.height}px`,
      backgroundColor: template.bgColor,
      color: template.textColor,
      fontFamily: template.bodyFont,
      backgroundImage: theme.bgPattern || undefined,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  }

  // Ajuster les tailles de police pour formats compacts
  // Formats paysage = texte compact (peu de hauteur)
  const isCompact = ['facebook_post', 'facebook_cover', 'linkedin_post', 'x_post'].includes(selectedFormat)
  const isBanner = selectedFormat === 'facebook_cover'
  const titleSize = isBanner ? 'text-xl' : isCompact ? 'text-2xl' : 'text-4xl'
  const catSize = isBanner ? 'text-sm' : isCompact ? 'text-lg' : 'text-2xl'
  const itemNameSize = isBanner ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg'
  const descSize = isCompact ? 'text-[10px]' : 'text-sm'
  const priceSize = isBanner ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg'
  const padX = isBanner ? 'px-3' : isCompact ? 'px-4' : 'px-8'
  const padY = isBanner ? 'py-2' : isCompact ? 'py-4' : 'py-8'
  const headerPadY = isBanner ? 'py-2' : isCompact ? 'py-4' : 'py-10'
  const spacing = isBanner ? 'space-y-1' : isCompact ? 'space-y-3' : 'space-y-8'
  const itemSpacing = isBanner ? 'space-y-0' : isCompact ? 'space-y-1' : 'space-y-3'
  const itemPadY = isBanner ? 'py-0' : isCompact ? 'py-1' : 'py-2'

  return (
    <div className="space-y-6">
      {/* Actions (masque a l'impression) */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Nouveau menu
        </Button>
      </div>

      {/* Info credits (masque a l'impression) */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        3 credits utilises — {creditsRemaining} credits restants
      </div>

      {/* Selecteur de format */}
      <div className="print:hidden">
        <p className="text-sm font-medium mb-2">Format d'export</p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFormat(f.id)}
              className={`px-3 py-2 rounded-lg border text-center transition-all ${
                selectedFormat === f.id
                  ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20'
                  : 'border-border hover:border-orange-500/50'
              }`}
            >
              <span className="text-sm">{f.icon} {f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone imprimable / capturable */}
      <div className="flex justify-center">
        <div style={getPreviewStyle()} className="shadow-2xl print:shadow-none print:max-w-none">
          <div
            ref={menuRef}
            id="menu-printable"
            style={getMenuStyle()}
          >
            {/* Decoration theme en haut */}
            {hasTheme && theme.headerDecoration && (
              <div className="text-center py-2 text-2xl tracking-[0.5em]" style={{ backgroundColor: template.bgColor }}>
                {theme.headerDecoration}
              </div>
            )}

            {/* Header du menu */}
            <div
              className={`${padX} ${headerPadY} text-center`}
              style={{ background: headerBg }}
            >
              {restaurantInfo.logoUrl && (
                <img
                  src={restaurantInfo.logoUrl}
                  alt="Logo"
                  className="mx-auto mb-4 h-20 w-20 rounded-full object-cover border-2"
                  style={{ borderColor: accentColor }}
                  crossOrigin="anonymous"
                />
              )}
              <h1
                className={`${titleSize} font-bold tracking-wide`}
                style={{
                  fontFamily: template.titleFont,
                  color: isLightHeader ? template.textColor : '#FFFFFF',
                  textShadow: isLightHeader ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {restaurantInfo.name}
              </h1>
              {restaurantInfo.slogan && (
                <p
                  className="mt-2 text-lg italic opacity-90"
                  style={{
                    color: isLightHeader ? template.accentColor : '#FFFFFF',
                  }}
                >
                  {restaurantInfo.slogan}
                </p>
              )}
            </div>

            {/* Corps du menu */}
            <div className={`${padX} ${padY} ${spacing}`}>
              {categories.map((category, catIdx) => (
                <div key={catIdx} className="break-inside-avoid">
                  {/* Divider theme entre categories */}
                  {hasTheme && theme.divider && catIdx > 0 && (
                    <div className="text-center py-2 text-lg tracking-[0.3em] opacity-60">
                      {theme.divider}
                    </div>
                  )}

                  {/* Titre categorie */}
                  <div
                    className="px-4 py-3 mb-4 text-center"
                    style={{
                      backgroundColor: template.categoryBg,
                      borderLeft: `4px solid ${accentColor}`,
                      borderRight: `4px solid ${accentColor}`,
                    }}
                  >
                    <h2
                      className={`${catSize} font-bold uppercase tracking-widest`}
                      style={{
                        fontFamily: template.titleFont,
                        color: template.categoryColor,
                      }}
                    >
                      {category.name}
                    </h2>
                  </div>

                  {/* Items */}
                  <div className={itemSpacing}>
                    {category.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className={`px-4 ${itemPadY}`}
                        style={{ borderBottom: template.itemBorder }}
                      >
                        <div className="flex justify-between items-baseline gap-4">
                          <span
                            className={`font-semibold ${itemNameSize}`}
                            style={{ color: template.textColor }}
                          >
                            {item.name}
                          </span>
                          {item.price !== null && item.price !== undefined && (
                            <span
                              className={`font-bold ${priceSize} whitespace-nowrap`}
                              style={{ color: theme.accentOverride || template.priceColor }}
                            >
                              {formatPrice(item.price)}
                            </span>
                          )}
                        </div>
                        {item.description && !isCompact && (
                          <p
                            className={`mt-1 ${descSize} italic opacity-75`}
                            style={{ color: template.textColor }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className={`${padX} py-6 text-center text-sm space-y-1`}
              style={{
                borderTop: `2px solid ${accentColor}`,
                opacity: 0.8,
              }}
            >
              {/* Decoration theme en bas */}
              {hasTheme && theme.footerDecoration && (
                <p className="text-lg mb-2">{theme.footerDecoration}</p>
              )}
              {restaurantInfo.address && <p>{restaurantInfo.address}</p>}
              {restaurantInfo.phone && <p>Tel : {restaurantInfo.phone}</p>}
              {!isCompact && restaurantInfo.hours && (
                <p className="whitespace-pre-line">{restaurantInfo.hours}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bouton export (masque a l'impression) */}
      <div className="text-center print:hidden">
        {selectedFormat === 'a4' ? (
          <Button onClick={handlePrint} size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Download className="h-5 w-5" />
            Telecharger en PDF
          </Button>
        ) : (
          <Button
            onClick={handleExportImage}
            disabled={isExporting}
            size="lg"
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Telecharger pour {format.name}
              </>
            )}
          </Button>
        )}
      </div>

      {/* CSS d'impression */}
      <style>{`
        @media print {
          body > *:not(#__next),
          header, nav, aside, footer,
          [class*="sidebar"],
          [class*="print\\:hidden"] {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          #menu-printable {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            transform: none !important;
          }

          .break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
