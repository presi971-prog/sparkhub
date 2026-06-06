'use client'

/**
 * Bloc "Changer mon mot de passe" pour la page Profil.
 *
 * Pourquoi : la seule page de changement de mot de passe (/connexion/update-
 * password) redirige les utilisateurs DÉJÀ connectés vers le tableau de bord →
 * impossible de définir un mot de passe quand on est connecté. Ce bloc comble
 * le manque : un user connecté choisit lui-même son mot de passe (R0 : c'est
 * l'utilisateur qui définit son mot de passe).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ChangePasswordCard() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      toast.error('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Mot de passe mis à jour ! Tu peux te connecter avec partout.')
      setPassword('')
      setConfirm('')
    } catch {
      toast.error('Impossible de mettre à jour le mot de passe. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mot de passe</CardTitle>
        <CardDescription>
          Choisis un mot de passe que tu retiendras. Il marche partout (ordi et
          version en ligne).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="np">Nouveau mot de passe</Label>
            <Input
              id="np"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp">Confirmer</Label>
            <Input
              id="cp"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mise à jour…
              </>
            ) : (
              'Changer mon mot de passe'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
