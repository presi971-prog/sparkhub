'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Ressource } from '@/types/database'
import { Plus, Pencil, Loader2 } from 'lucide-react'

const categories = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'gestion', label: 'Gestion' },
  { value: 'formation', label: 'Formation' },
  { value: 'outils', label: 'Outils' },
  { value: 'autre', label: 'Autre' },
]

const ressourceSchema = z.object({
  title: z.string().min(2, 'Titre requis'),
  description: z.string().optional(),
  details: z.string().optional(),
  image_url: z.string().url('URL invalide').optional().or(z.literal('')),
  url: z.string().url('URL invalide'),
  category: z.string().min(1, 'Catégorie requise'),
  credit_cost: z.coerce.number().min(0, 'Coût doit être positif'),
  is_active: z.boolean(),
  order_index: z.coerce.number().min(0),
})

type RessourceFormData = {
  title: string
  description?: string
  details?: string
  image_url?: string
  url: string
  category: string
  credit_cost: number
  is_active: boolean
  order_index: number
}

interface Props {
  mode: 'create' | 'edit'
  ressource?: Ressource
}

export function RessourceForm({ mode, ressource }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RessourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ressourceSchema) as any,
    defaultValues: ressource ? {
      title: ressource.title,
      description: ressource.description || '',
      details: (ressource as any).details || '',
      image_url: ressource.image_url || '',
      url: ressource.url,
      category: ressource.category,
      credit_cost: ressource.credit_cost,
      is_active: ressource.is_active,
      order_index: ressource.order_index,
    } : {
      is_active: true,
      credit_cost: 0,
      order_index: 0,
      details: '',
    },
  })

  async function onSubmit(data: RessourceFormData) {
    setIsLoading(true)

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('ressources').insert({
          title: data.title,
          description: data.description || null,
          details: data.details || null,
          image_url: data.image_url || null,
          url: data.url,
          category: data.category,
          credit_cost: data.credit_cost,
          is_active: data.is_active,
          order_index: data.order_index,
        })

        if (error) throw error
        toast.success('Ressource créée avec succès')
        reset()
      } else if (ressource) {
        const { error } = await supabase
          .from('ressources')
          .update({
            title: data.title,
            description: data.description || null,
            details: data.details || null,
            image_url: data.image_url || null,
            url: data.url,
            category: data.category,
            credit_cost: data.credit_cost,
            is_active: data.is_active,
            order_index: data.order_index,
          })
          .eq('id', ressource.id)

        if (error) throw error
        toast.success('Ressource mise à jour')
      }

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving ressource:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle ressource' : 'Modifier la ressource'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Ajoutez une nouvelle ressource ou outil à la plateforme.'
              : 'Modifiez les informations de cette ressource.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Community Manager IA"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description courte</Label>
            <Textarea
              id="description"
              placeholder="Brève description visible sur la carte..."
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Détails (affiché au clic sur "En savoir plus")</Label>
            <Textarea
              id="details"
              placeholder="Explication détaillée : comment ça marche, pour qui, quels résultats attendre..."
              rows={3}
              {...register('details')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL de l'outil *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://tools.sparkhub.pro/..."
              {...register('url')}
            />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de l'image</Label>
            <Input
              id="image_url"
              type="url"
              placeholder="https://..."
              {...register('image_url')}
            />
            {errors.image_url && (
              <p className="text-sm text-destructive">{errors.image_url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_cost">Coût (crédits)</Label>
              <Input
                id="credit_cost"
                type="number"
                min="0"
                {...register('credit_cost')}
              />
              <p className="text-xs text-muted-foreground">
                0 = gratuit
              </p>
            </div>
          </div>

          {/* Guide des tarifs recommandés */}
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Tarifs recommandés :</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Post/Légende IA</span><span className="text-right">2 crédits</span>
              <span>Photo Standard</span><span className="text-right">3 crédits</span>
              <span>Photo Pro 4K</span><span className="text-right">10 crédits</span>
              <span>Vidéo Kling 5s</span><span className="text-right">5 crédits</span>
              <span>Vidéo Hailuo 5s</span><span className="text-right">15 crédits</span>
              <span>Vidéo Sora 5s</span><span className="text-right">30 crédits</span>
              <span>Vidéo Veo 3 5s</span><span className="text-right">60 crédits</span>
              <span>Vidéo Sora Pro 5s</span><span className="text-right">80 crédits</span>
              <span>Vidéo Veo 3 + Audio</span><span className="text-right">100 crédits</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="is_active" className="cursor-pointer">
                Ressource active
              </Label>
              <p className="text-sm text-muted-foreground">
                Les ressources inactives ne sont pas visibles
              </p>
            </div>
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Créer' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
