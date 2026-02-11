'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  Store, Clock, Utensils, HelpCircle, Power, PowerOff, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Commerce, CommerceItem, CommerceFaq, CommerceType } from '@/types/database'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const COMMERCE_TYPES: { value: CommerceType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'beaute', label: 'Salon de beauté' },
  { value: 'commerce', label: 'Commerce' },
]

interface ItemForm {
  id?: string
  categorie: string
  nom: string
  prix: string
  description: string
}

interface FaqForm {
  id?: string
  question: string
  reponse: string
}

export default function ConfigPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Commerce
  const [commerceId, setCommerceId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [type, setType] = useState<CommerceType>('commerce')
  const [description, setDescription] = useState('')
  const [adresse, setAdresse] = useState('')
  const [telephone, setTelephone] = useState('')
  const [horaires, setHoraires] = useState<Record<string, string>>({})
  const [isActive, setIsActive] = useState(false)

  // Items (menu/services)
  const [items, setItems] = useState<ItemForm[]>([])
  const [newCategory, setNewCategory] = useState('')

  // FAQ
  const [faqs, setFaqs] = useState<FaqForm[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: commerce } = await supabase
      .from('commerces')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    if (commerce) {
      setCommerceId(commerce.id)
      setNom(commerce.nom)
      setType(commerce.type)
      setDescription(commerce.description || '')
      setAdresse(commerce.adresse || '')
      setTelephone(commerce.telephone || '')
      setHoraires(commerce.horaires || {})
      setIsActive(commerce.is_active)

      // Charger items
      const { data: itemsData } = await supabase
        .from('commerce_items')
        .select('*')
        .eq('commerce_id', commerce.id)
        .order('ordre')

      if (itemsData) {
        setItems(
          itemsData.map((item: CommerceItem) => ({
            id: item.id,
            categorie: item.categorie,
            nom: item.nom,
            prix: item.prix?.toString() || '',
            description: item.description || '',
          }))
        )
      }

      // Charger FAQ
      const { data: faqData } = await supabase
        .from('commerce_faq')
        .select('*')
        .eq('commerce_id', commerce.id)

      if (faqData) {
        setFaqs(
          faqData.map((f: CommerceFaq) => ({
            id: f.id,
            question: f.question,
            reponse: f.reponse,
          }))
        )
      }
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!nom.trim()) {
      toast.error('Le nom du commerce est obligatoire')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const commerceData = {
        profile_id: user.id,
        nom: nom.trim(),
        type,
        description: description.trim() || null,
        adresse: adresse.trim() || null,
        telephone: telephone.trim() || null,
        horaires,
        is_active: isActive,
      }

      let savedCommerceId = commerceId

      if (commerceId) {
        // Update
        const { error } = await supabase
          .from('commerces')
          .update(commerceData)
          .eq('id', commerceId)
        if (error) throw error
      } else {
        // Insert
        const { data, error } = await supabase
          .from('commerces')
          .insert(commerceData)
          .select()
          .single()
        if (error) throw error
        savedCommerceId = data.id
        setCommerceId(data.id)
      }

      if (!savedCommerceId) throw new Error('Commerce ID manquant')

      // Sauvegarder les items : supprimer les anciens et réinsérer
      await supabase.from('commerce_items').delete().eq('commerce_id', savedCommerceId)

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          commerce_id: savedCommerceId,
          categorie: item.categorie,
          nom: item.nom,
          prix: item.prix ? parseFloat(item.prix) : null,
          description: item.description || null,
          ordre: index,
        }))

        const { error: itemsError } = await supabase
          .from('commerce_items')
          .insert(itemsToInsert)
        if (itemsError) throw itemsError
      }

      // Sauvegarder les FAQ
      await supabase.from('commerce_faq').delete().eq('commerce_id', savedCommerceId)

      if (faqs.length > 0) {
        const faqsToInsert = faqs
          .filter((f) => f.question.trim() && f.reponse.trim())
          .map((f) => ({
            commerce_id: savedCommerceId,
            question: f.question,
            reponse: f.reponse,
          }))

        if (faqsToInsert.length > 0) {
          const { error: faqError } = await supabase
            .from('commerce_faq')
            .insert(faqsToInsert)
          if (faqError) throw faqError
        }
      }

      toast.success('Configuration sauvegardée !')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  function addItem() {
    setItems([...items, { categorie: newCategory || 'Général', nom: '', prix: '', description: '' }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function addFaq() {
    setFaqs([...faqs, { question: '', reponse: '' }])
  }

  function removeFaq(index: number) {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  function updateFaq(index: number, field: keyof FaqForm, value: string) {
    const updated = [...faqs]
    updated[index] = { ...updated[index], [field]: value }
    setFaqs(updated)
  }

  // Catégories uniques pour le menu
  const categories = [...new Set(items.map((i) => i.categorie))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/outils/assistant-whatsapp">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configuration</h1>
            <p className="text-muted-foreground text-sm">
              Renseignez les informations de votre commerce
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      {/* Statut bot */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {isActive ? (
              <Power className="h-5 w-5 text-green-500" />
            ) : (
              <PowerOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                Assistant {isActive ? 'actif' : 'inactif'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'Votre commerce apparait dans la liste WhatsApp'
                  : 'Activez pour que les clients vous trouvent'}
              </p>
            </div>
          </div>
          <Button
            variant={isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? 'Désactiver' : 'Activer'}
          </Button>
        </CardContent>
      </Card>

      {/* Infos commerce */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Informations du commerce
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du commerce *</Label>
              <Input
                id="nom"
                placeholder="Ex: Chez Maman Doudou"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as CommerceType)}
              >
                {COMMERCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description courte</Label>
            <Input
              id="description"
              placeholder="Ex: Restaurant créole en plein coeur de Pointe-à-Pitre"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                placeholder="Ex: 12 rue de Nozières, Pointe-à-Pitre"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                placeholder="Ex: 0590 12 34 56"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horaires d'ouverture
          </CardTitle>
          <CardDescription>
            Laissez vide pour les jours de fermeture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {JOURS.map((jour) => (
            <div key={jour} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{jour}</span>
              <Input
                className="flex-1"
                placeholder="Ex: 11h-14h, 18h-22h"
                value={horaires[jour] || ''}
                onChange={(e) =>
                  setHoraires({ ...horaires, [jour]: e.target.value })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Menu / Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            {type === 'restaurant' ? 'Menu' : 'Services / Tarifs'}
          </CardTitle>
          <CardDescription>
            Ajoutez vos {type === 'restaurant' ? 'plats et boissons' : 'services et tarifs'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length > 0 &&
            categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cat}</Badge>
                </div>
                {items
                  .map((item, index) => ({ item, index }))
                  .filter(({ item }) => item.categorie === cat)
                  .map(({ item, index }) => (
                    <div key={index} className="flex items-start gap-2 pl-4">
                      <GripVertical className="h-4 w-4 mt-3 text-muted-foreground" />
                      <Input
                        className="flex-1"
                        placeholder="Nom"
                        value={item.nom}
                        onChange={(e) => updateItem(index, 'nom', e.target.value)}
                      />
                      <Input
                        className="w-24"
                        placeholder="Prix €"
                        type="number"
                        step="0.01"
                        value={item.prix}
                        onChange={(e) => updateItem(index, 'prix', e.target.value)}
                      />
                      <Input
                        className="flex-1"
                        placeholder="Description (optionnel)"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ))}

          <div className="flex items-center gap-2 pt-2">
            <Input
              placeholder="Catégorie (ex: Entrées, Plats, Boissons)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            FAQ personnalisées
          </CardTitle>
          <CardDescription>
            Ajoutez des questions/réponses pour aider le bot à mieux répondre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="flex items-start gap-2 p-3 rounded-lg border">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Question (ex: Vous livrez ?)"
                  value={faq.question}
                  onChange={(e) => updateFaq(index, 'question', e.target.value)}
                />
                <Input
                  placeholder="Réponse (ex: Oui, via Cobeone dans un rayon de 10km)"
                  value={faq.reponse}
                  onChange={(e) => updateFaq(index, 'reponse', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFaq(index)}
                className="text-destructive mt-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addFaq}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une question
          </Button>
        </CardContent>
      </Card>

      {/* Bouton save en bas */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder les modifications
        </Button>
      </div>
    </div>
  )
}
