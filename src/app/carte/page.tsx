import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { MapContainer } from '@/components/map/map-container'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Carte des Livreurs',
  description: 'Trouvez les livreurs disponibles en Guadeloupe sur notre carte interactive.',
}

export default async function CartePage() {
  const supabase = await createClient()

  // Fetch user
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single()
    userProfile = data
  }

  // Fetch verified livreurs with their zones and positions
  const { data: livreursData } = await supabase
    .from('livreurs')
    .select(`
      id,
      vehicle_type,
      is_available,
      bio,
      profile:profiles(
        id,
        full_name,
        avatar_url,
        points,
        tiers(name, emoji, display_name)
      ),
      zones:zones_livraison(
        commune:communes(id, name, latitude, longitude, zone)
      ),
      geolocalisation:geolocalisations(
        latitude,
        longitude,
        timestamp
      )
    `)
    .eq('is_verified', true)
    .eq('is_available', true)

  // Transform data to match expected interface (Supabase returns arrays for joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livreurs = (livreursData || []).map((l: any) => ({
    ...l,
    profile: Array.isArray(l.profile) ? l.profile[0] : l.profile,
    zones: (l.zones || []).map((z: any) => ({
      ...z,
      commune: Array.isArray(z.commune) ? z.commune[0] : z.commune,
    })),
  })).filter((l: any) => l.profile) // Filter out livreurs without profiles

  // Fetch communes
  const { data: communes } = await supabase
    .from('communes')
    .select('id, name, latitude, longitude, zone')
    .order('zone')
    .order('name')

  return (
    <>
      <Header user={userProfile} />
      <main style={{ height: 'calc(100vh - 64px)', position: 'relative' }}>
        <MapContainer
          livreurs={livreurs || []}
          communes={communes || []}
        />
      </main>
    </>
  )
}
