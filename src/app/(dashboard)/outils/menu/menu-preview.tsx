'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, RefreshCw } from 'lucide-react'
import { type MenuTemplate } from './menu-templates'

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
  creditsRemaining: number
  onBack: () => void
  onReset: () => void
}

export function MenuPreview({
  categories,
  restaurantInfo,
  template,
  creditsRemaining,
  onBack,
  onReset,
}: MenuPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return ''
    return `${price.toFixed(2).replace('.', ',')} EUR`
  }

  return (
    <div className="space-y-6">
      {/* Actions (masque a l'impression) */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Nouveau menu
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Download className="h-4 w-4" />
            Telecharger en PDF
          </Button>
        </div>
      </div>

      {/* Info credits (masque a l'impression) */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        3 credits utilises — {creditsRemaining} credits restants
      </div>

      {/* Zone imprimable */}
      <div
        ref={printRef}
        id="menu-printable"
        className="mx-auto max-w-[210mm] shadow-2xl print:shadow-none print:max-w-none"
        style={{
          backgroundColor: template.bgColor,
          color: template.textColor,
          fontFamily: template.bodyFont,
        }}
      >
        {/* Header du menu */}
        <div
          className="px-8 py-10 text-center"
          style={{ background: template.headerBg }}
        >
          {restaurantInfo.logoUrl && (
            <img
              src={restaurantInfo.logoUrl}
              alt="Logo"
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover border-2"
              style={{ borderColor: template.accentColor }}
            />
          )}
          <h1
            className="text-4xl font-bold tracking-wide"
            style={{
              fontFamily: template.titleFont,
              color: template.id === 'moderne_epure' ? template.textColor : '#FFFFFF',
              textShadow: template.id === 'moderne_epure' ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {restaurantInfo.name}
          </h1>
          {restaurantInfo.slogan && (
            <p
              className="mt-2 text-lg italic opacity-90"
              style={{
                color: template.id === 'moderne_epure' ? template.accentColor : '#FFFFFF',
              }}
            >
              {restaurantInfo.slogan}
            </p>
          )}
        </div>

        {/* Corps du menu */}
        <div className="px-8 py-8 space-y-8">
          {categories.map((category, catIdx) => (
            <div key={catIdx} className="break-inside-avoid">
              {/* Titre categorie */}
              <div
                className="px-4 py-3 mb-4 text-center"
                style={{
                  backgroundColor: template.categoryBg,
                  borderLeft: `4px solid ${template.accentColor}`,
                  borderRight: `4px solid ${template.accentColor}`,
                }}
              >
                <h2
                  className="text-2xl font-bold uppercase tracking-widest"
                  style={{
                    fontFamily: template.titleFont,
                    color: template.categoryColor,
                  }}
                >
                  {category.name}
                </h2>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {category.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="px-4 py-2"
                    style={{
                      borderBottom: template.itemBorder,
                    }}
                  >
                    <div className="flex justify-between items-baseline gap-4">
                      <span
                        className="font-semibold text-lg"
                        style={{ color: template.textColor }}
                      >
                        {item.name}
                      </span>
                      {item.price !== null && item.price !== undefined && (
                        <span
                          className="font-bold text-lg whitespace-nowrap"
                          style={{ color: template.priceColor }}
                        >
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p
                        className="mt-1 text-sm italic opacity-75"
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
        {(restaurantInfo.address || restaurantInfo.phone || restaurantInfo.hours) && (
          <div
            className="px-8 py-6 text-center text-sm space-y-1"
            style={{
              borderTop: `2px solid ${template.accentColor}`,
              opacity: 0.8,
            }}
          >
            {restaurantInfo.address && <p>{restaurantInfo.address}</p>}
            {restaurantInfo.phone && <p>Tel : {restaurantInfo.phone}</p>}
            {restaurantInfo.hours && (
              <p className="whitespace-pre-line">{restaurantInfo.hours}</p>
            )}
          </div>
        )}
      </div>

      {/* Bouton en bas (masque a l'impression) */}
      <div className="text-center print:hidden">
        <Button onClick={handlePrint} size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Download className="h-5 w-5" />
          Telecharger en PDF
        </Button>
      </div>

      {/* CSS d'impression */}
      <style>{`
        @media print {
          /* Masquer tout sauf le menu */
          body > *:not(#__next),
          header, nav, aside, footer,
          [class*="sidebar"],
          [class*="print\\:hidden"] {
            display: none !important;
          }

          /* Forcer les couleurs */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Format A4 */
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
          }

          /* Page breaks entre categories si besoin */
          .break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
