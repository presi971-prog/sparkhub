'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Check, X, Clock,
  User, Phone, Users, Loader2, MessageCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Reservation, ReservationStatus } from '@/types/database'

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  confirmed: { label: 'Confirmée', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  cancelled: { label: 'Annulée', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
}

export default function ReservationsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')

  useEffect(() => {
    loadReservations()
  }, [])

  async function loadReservations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: commerce } = await supabase
      .from('commerces')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!commerce) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('commerce_id', commerce.id)
      .order('date', { ascending: false })
      .order('heure', { ascending: false })

    setReservations((data as Reservation[]) || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
      return
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    )
    toast.success(status === 'confirmed' ? 'Réservation confirmée' : 'Réservation annulée')
  }

  const filtered = filter === 'all'
    ? reservations
    : reservations.filter((r) => r.status === filter)

  // Séparer futures et passées
  const today = new Date().toISOString().split('T')[0]
  const upcoming = filtered.filter((r) => r.date >= today)
  const past = filtered.filter((r) => r.date < today)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/outils/assistant-whatsapp">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-muted-foreground text-sm">
            Réservations reçues via WhatsApp
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Toutes ({reservations.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          En attente ({reservations.filter((r) => r.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('confirmed')}
        >
          Confirmées ({reservations.filter((r) => r.status === 'confirmed').length})
        </Button>
        <Button
          variant={filter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('cancelled')}
        >
          Annulées ({reservations.filter((r) => r.status === 'cancelled').length})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-1">Aucune réservation</h2>
            <p className="text-muted-foreground text-sm">
              Les réservations faites via WhatsApp apparaitront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Réservations à venir */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">A venir</h2>
              {upcoming.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onConfirm={() => updateStatus(reservation.id, 'confirmed')}
                  onCancel={() => updateStatus(reservation.id, 'cancelled')}
                />
              ))}
            </div>
          )}

          {/* Réservations passées */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Passées</h2>
              {past.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onConfirm={() => updateStatus(reservation.id, 'confirmed')}
                  onCancel={() => updateStatus(reservation.id, 'cancelled')}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReservationCard({
  reservation,
  onConfirm,
  onCancel,
}: {
  reservation: Reservation
  onConfirm: () => void
  onCancel: () => void
}) {
  const config = STATUS_CONFIG[reservation.status]

  const dateFormatted = new Date(reservation.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {dateFormatted}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {reservation.heure}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {reservation.client_name && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {reservation.client_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {reservation.client_phone}
              </span>
              {reservation.nombre_personnes && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {reservation.nombre_personnes} pers.
                </span>
              )}
            </div>

            {reservation.note && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <MessageCircle className="h-4 w-4 mt-0.5" />
                {reservation.note}
              </p>
            )}
          </div>

          {reservation.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onConfirm}>
                <Check className="h-4 w-4 mr-1" />
                Confirmer
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
