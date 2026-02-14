'use client'

import { useRef, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { type MenuTemplate } from './menu-templates'
import { type MenuTheme, EXPORT_FORMATS } from './menu-themes'

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

// Estimation des hauteurs en pixels pour la pagination
function estimateHeights(isCompact: boolean, isBanner: boolean) {
  if (isBanner) {
    return { fullHeader: 70, miniHeader: 40, footer: 40, pageIndicator: 25, categoryTitle: 35, itemLine: 20, divider: 15, themeDecoration: 20 }
  }
  if (isCompact) {
    return { fullHeader: 120, miniHeader: 60, footer: 60, pageIndicator: 30, categoryTitle: 55, itemLine: 30, divider: 20, themeDecoration: 25 }
  }
  // Portrait / carre
  return { fullHeader: 200, miniHeader: 80, footer: 80, pageIndicator: 35, categoryTitle: 70, itemLine: 45, divider: 25, themeDecoration: 30 }
}

// Decoupe les categories en pages selon la hauteur disponible
function splitIntoPages(
  categories: MenuCategory[],
  formatHeight: number | 'auto',
  isCompact: boolean,
  isBanner: boolean,
  hasTheme: boolean,
  hasLogo: boolean,
  hasSlogan: boolean,
): MenuCategory[][] {
  if (formatHeight === 'auto') return [categories]

  const h = estimateHeights(isCompact, isBanner)
  const totalHeight = formatHeight as number

  const pages: MenuCategory[][] = []
  let currentPage: MenuCategory[] = []
  let isFirstPage = true

  // Hauteur du header (complet page 1, mini pages suivantes)
  const getHeaderHeight = (first: boolean) => {
    let hh = first ? h.fullHeader : h.miniHeader
    if (first && hasLogo) hh += 80
    if (first && hasSlogan) hh += 30
    if (hasTheme) hh += h.themeDecoration
    return hh
  }

  let usedHeight = getHeaderHeight(true) + h.footer + h.pageIndicator

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx]
    // Hauteur de cette categorie
    let catHeight = h.categoryTitle
    if (hasTheme && catIdx > 0 && currentPage.length > 0) catHeight += h.divider
    catHeight += cat.items.length * h.itemLine

    // Si la categorie entiere tient dans la page courante
    if (usedHeight + catHeight <= totalHeight) {
      currentPage.push(cat)
      usedHeight += catHeight
    } else {
      // Essayer de splitter la categorie item par item
      // D'abord, si la page courante a du contenu, la finaliser
      if (currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = []
        isFirstPage = false
        usedHeight = getHeaderHeight(false) + h.footer + h.pageIndicator
      }

      // Placer les items de cette categorie sur une ou plusieurs pages
      let remainingItems = [...cat.items]

      while (remainingItems.length > 0) {
        const availableForItems = totalHeight - usedHeight - h.categoryTitle - (hasTheme && currentPage.length > 0 ? h.divider : 0)
        const maxItems = Math.max(1, Math.floor(availableForItems / h.itemLine))

        const pageItems = remainingItems.slice(0, maxItems)
        remainingItems = remainingItems.slice(maxItems)

        const suffix = remainingItems.length > 0 || pages.some(p => p.some(c => c.name === cat.name))
          ? ` (suite)` : ''
        const pageCatName = pages.some(p => p.some(c => c.name === cat.name || c.name === cat.name + ' (suite)'))
          ? cat.name + suffix : cat.name

        currentPage.push({ name: pageCatName, items: pageItems })

        if (remainingItems.length > 0) {
          pages.push(currentPage)
          currentPage = []
          isFirstPage = false
          usedHeight = getHeaderHeight(false) + h.footer + h.pageIndicator
        } else {
          usedHeight += h.categoryTitle + pageItems.length * h.itemLine
        }
      }
    }
  }

  // Derniere page
  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages.length > 0 ? pages : [categories]
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
  const [currentPageIdx, setCurrentPageIdx] = useState(0)

  const format = EXPORT_FORMATS.find(f => f.id === selectedFormat) || EXPORT_FORMATS[0]
  const hasTheme = theme.id !== 'aucun'
  const accentColor = theme.accentOverride || template.accentColor
  const headerBg = theme.headerBgOverride || template.headerBg
  const isLightHeader = template.id === 'moderne_epure' && !hasTheme
  const isSocialFormat = selectedFormat !== 'a4'

  const isCompact = ['facebook_post', 'facebook_cover', 'linkedin_post', 'x_post'].includes(selectedFormat)
  const isBanner = selectedFormat === 'facebook_cover'

  // Pagination : decouper en pages si format a hauteur fixe
  const pages = useMemo(() => {
    const result = splitIntoPages(
      categories,
      format.height,
      isCompact,
      isBanner,
      hasTheme,
      !!restaurantInfo.logoUrl,
      !!restaurantInfo.slogan,
    )
    return result
  }, [categories, format.height, isCompact, isBanner, hasTheme, restaurantInfo.logoUrl, restaurantInfo.slogan])

  const totalPages = pages.length
  const isMultiPage = totalPages > 1 && isSocialFormat

  // Reset page quand on change de format
  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId)
    setCurrentPageIdx(0)
  }

  const currentCategories = pages[currentPageIdx] || categories
  const isFirstPage = currentPageIdx === 0

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return ''
    return `${price.toFixed(2).replace('.', ',')} EUR`
  }

  // Export PDF via window.print
  const handlePrint = () => {
    window.print()
  }

  // Export une seule page image
  const exportSinglePage = async (pageDiv: HTMLElement, pageNum: number) => {
    const html2canvas = (await import('html2canvas-pro')).default
    const canvas = await html2canvas(pageDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: template.bgColor,
      width: format.width,
      height: format.height === 'auto' ? undefined : format.height,
    })

    const link = document.createElement('a')
    const baseName = restaurantInfo.name?.replace(/\s+/g, '-').toLowerCase() || 'restaurant'
    const suffix = totalPages > 1 ? `-${pageNum}` : ''
    link.download = `menu-${baseName}-${format.id}${suffix}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Export image : page courante
  const handleExportImage = async () => {
    if (!menuRef.current) return
    setIsExporting(true)
    try {
      await exportSinglePage(menuRef.current, currentPageIdx + 1)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Export toutes les pages (carousel)
  const handleExportAll = async () => {
    setIsExporting(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const baseName = restaurantInfo.name?.replace(/\s+/g, '-').toLowerCase() || 'restaurant'

      // Creer un container hors-ecran pour rendre chaque page
      const offscreen = document.createElement('div')
      offscreen.style.position = 'fixed'
      offscreen.style.left = '-9999px'
      offscreen.style.top = '0'
      document.body.appendChild(offscreen)

      for (let i = 0; i < totalPages; i++) {
        // Cloner le template du menu avec les categories de cette page
        const pageDiv = document.createElement('div')
        offscreen.appendChild(pageDiv)

        // On va temporairement changer la page affichee et capturer
        setCurrentPageIdx(i)
        // Attendre le re-render
        await new Promise(r => setTimeout(r, 200))

        if (menuRef.current) {
          const canvas = await html2canvas(menuRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: template.bgColor,
            width: format.width,
            height: format.height === 'auto' ? undefined : format.height,
          })

          const link = document.createElement('a')
          link.download = `menu-${baseName}-${format.id}-${i + 1}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()

          // Petit delai entre les telechargements
          await new Promise(r => setTimeout(r, 500))
        }
      }

      document.body.removeChild(offscreen)
    } catch (error) {
      console.error('Export all error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Taille d'affichage a l'ecran (reduit pour l'apercu)
  const getPreviewStyle = (): React.CSSProperties => {
    if (selectedFormat === 'a4') {
      return { maxWidth: '210mm' }
    }
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
      overflow: 'hidden',
    }
  }

  // Tailles de police adaptees
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

  // Header compact pour pages 2+
  const miniHeaderPadY = isBanner ? 'py-1' : isCompact ? 'py-2' : 'py-4'
  const miniTitleSize = isBanner ? 'text-base' : isCompact ? 'text-lg' : 'text-2xl'

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
        <p className="text-sm font-medium mb-2">Format d&apos;export</p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFormatChange(f.id)}
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

      {/* Indicateur multi-pages */}
      {isMultiPage && (
        <div className="print:hidden text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Menu long : {totalPages} images (carousel)
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))}
              disabled={currentPageIdx === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {currentPageIdx + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPageIdx(Math.min(totalPages - 1, currentPageIdx + 1))}
              disabled={currentPageIdx === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Points de navigation */}
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPageIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentPageIdx
                    ? 'w-6 bg-orange-500'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

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
            {isFirstPage || !isSocialFormat ? (
              // Header complet (page 1 ou A4)
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
            ) : (
              // Header compact (pages 2+ en social)
              <div
                className={`${padX} ${miniHeaderPadY} text-center`}
                style={{ background: headerBg }}
              >
                <h1
                  className={`${miniTitleSize} font-bold tracking-wide`}
                  style={{
                    fontFamily: template.titleFont,
                    color: isLightHeader ? template.textColor : '#FFFFFF',
                    textShadow: isLightHeader ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {restaurantInfo.name}
                </h1>
              </div>
            )}

            {/* Corps du menu */}
            <div className={`${padX} ${padY} ${spacing}`} style={{ flex: 1 }}>
              {currentCategories.map((category, catIdx) => (
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

            {/* Indicateur de page dans l'image */}
            {isMultiPage && (
              <div className="text-center py-1" style={{ opacity: 0.5 }}>
                <span className="text-xs" style={{ color: template.textColor }}>
                  {currentPageIdx + 1} / {totalPages}
                </span>
              </div>
            )}

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
              {/* Footer complet page 1 / A4, reduit pages suivantes */}
              {isFirstPage || !isSocialFormat ? (
                <>
                  {restaurantInfo.address && <p>{restaurantInfo.address}</p>}
                  {restaurantInfo.phone && <p>Tel : {restaurantInfo.phone}</p>}
                  {!isCompact && restaurantInfo.hours && (
                    <p className="whitespace-pre-line">{restaurantInfo.hours}</p>
                  )}
                </>
              ) : (
                <>
                  {restaurantInfo.phone && <p>Tel : {restaurantInfo.phone}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Boutons export (masque a l'impression) */}
      <div className="text-center print:hidden space-y-3">
        {selectedFormat === 'a4' ? (
          <Button onClick={handlePrint} size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Download className="h-5 w-5" />
            Telecharger en PDF
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3">
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
                  {isMultiPage
                    ? `Telecharger page ${currentPageIdx + 1}`
                    : `Telecharger pour ${format.name}`}
                </>
              )}
            </Button>

            {isMultiPage && (
              <Button
                onClick={handleExportAll}
                disabled={isExporting}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Export de {totalPages} images...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Telecharger les {totalPages} images (carousel)
                  </>
                )}
              </Button>
            )}
          </div>
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
