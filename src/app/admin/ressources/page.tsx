import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RessourceForm } from '@/components/admin/ressource-form'
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Coins } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gestion des Ressources',
  description: 'Gérez les ressources et outils de la plateforme',
}

export default async function AdminRessourcesPage() {
  const supabase = await createClient()

  // Fetch all ressources
  const { data: ressourcesData } = await supabase
    .from('ressources')
    .select('*')
    .order('order_index')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ressources = ressourcesData as any[] | null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Ressources</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les outils et ressources disponibles sur la plateforme.
          </p>
        </div>
        <RessourceForm mode="create" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total ressources</CardDescription>
            <CardTitle className="text-3xl">{ressources?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actives</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {ressources?.filter(r => r.is_active).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactives</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">
              {ressources?.filter(r => !r.is_active).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des ressources</CardTitle>
          <CardDescription>
            Cliquez sur une ressource pour la modifier. Glissez pour réorganiser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Coût</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ressources && ressources.length > 0 ? (
                ressources.map((ressource) => (
                  <TableRow key={ressource.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ressource.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {ressource.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ressource.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {ressource.credit_cost > 0 ? (
                        <span className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          {ressource.credit_cost}
                        </span>
                      ) : (
                        <Badge variant="secondary">Gratuit</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {ressource.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RessourceForm mode="edit" ressource={ressource} />
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucune ressource pour le moment. Cliquez sur "Ajouter" pour créer la première.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
