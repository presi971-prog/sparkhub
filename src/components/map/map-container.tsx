'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MapPin, Filter, Menu, X } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface Livreur {
  id: string
  vehicle_type: string
  is_available: boolean
  bio: string | null
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    points: number
    tiers: {
      name: string
      emoji: string
      display_name: string
    } | null
  }
  zones: Array<{
    commune: {
      id: string
      name: string
      latitude: number
      longitude: number
      zone: string
    }
  }>
  geolocalisation: Array<{
    latitude: number
    longitude: number
    timestamp: string
  }>
}

interface Commune {
  id: string
  name: string
  latitude: number
  longitude: number
  zone: string
}

interface Props {
  livreurs: Livreur[]
  communes: Commune[]
}

const GUADELOUPE_CENTER: [number, number] = [-61.55, 16.25]
const GUADELOUPE_ZOOM = 10

export function MapContainer({ livreurs, communes }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const mapboxgl = useRef<any>(null)
  const initialized = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState('Initialisation...')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Filter livreurs safely
  const filteredLivreurs = livreurs.filter((livreur) => {
    if (!livreur?.profile) return false
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    const nameMatch = livreur.profile.full_name?.toLowerCase().includes(query) || false
    return nameMatch
  })

  // Initialize map
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    setDebugInfo('useEffect lancé')

    if (!mapContainer.current) {
      setDebugInfo('Pas de mapContainer.current')
      return
    }
    if (!MAPBOX_TOKEN) {
      setDebugInfo('Token: ' + (MAPBOX_TOKEN ? 'présent' : 'absent'))
      setMapError('Token Mapbox non configuré')
      return
    }

    setDebugInfo('Token OK, ajout CSS...')

    // Add CSS only once
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link')
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }

    setDebugInfo('CSS ajouté, import mapbox-gl...')

    // Load mapbox
    import('mapbox-gl')
      .then((module) => {
        if (map.current) return // Already initialized

        setDebugInfo('Mapbox importé, création carte...')
        const mb = module.default
        mapboxgl.current = mb
        mb.accessToken = MAPBOX_TOKEN

        const newMap = new mb.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: GUADELOUPE_CENTER,
          zoom: GUADELOUPE_ZOOM,
        })

        map.current = newMap
        setDebugInfo('Carte créée, attente load...')

        newMap.on('load', () => {
          setDebugInfo('Carte chargée!')
          setMapReady(true)
        })

        newMap.on('error', (e: any) => {
          setDebugInfo('Erreur carte: ' + JSON.stringify(e))
          setMapError(e.error?.message || 'Erreur de chargement de la carte')
        })
      })
      .catch((err) => {
        setDebugInfo('Erreur import: ' + err.message)
        setMapError('Impossible de charger Mapbox: ' + err.message)
      })
  }, [])

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}>
      {/* Map container */}
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: '#e5e7eb' }} />

      {/* Error message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{mapError}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-5">
          <p>Chargement de la carte...</p>
        </div>
      )}

      {/* Mobile toggle button */}
      <Button
        variant="default"
        size="icon"
        className="absolute top-3 left-3 z-20 md:hidden shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar - hidden on mobile unless open */}
      <div className={`absolute top-3 left-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-72 md:w-80 max-w-[320px] flex flex-col gap-3 z-10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] md:translate-x-0'}`}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un livreur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredLivreurs.length} livreur{filteredLivreurs.length !== 1 ? 's' : ''}
            </Badge>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Livreurs disponibles</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-4rem)]">
            <CardContent className="space-y-2 pb-4">
              {filteredLivreurs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun livreur trouvé
                </p>
              ) : (
                filteredLivreurs.map((livreur) => (
                  <div
                    key={livreur.id}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        {livreur.profile?.tiers?.emoji || '🚚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {livreur.profile?.full_name || 'Sans nom'}
                        </span>
                        <div className="text-sm text-muted-foreground">
                          {livreur.vehicle_type}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-[5] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
