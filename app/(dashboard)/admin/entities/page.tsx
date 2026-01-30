import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building, Plus, ChevronRight, FolderTree } from 'lucide-react'
import Link from 'next/link'

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

export default async function EntitiesPage() {
  const supabase = await createClient()

  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .order('level')
    .order('name')

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Erro</h1>
        <p className="text-destructive">{error.message}</p>
      </div>
    )
  }

  // Organizar entidades em árvore
  const entityMap = new Map()
  entities?.forEach(entity => {
    entityMap.set(entity.id, { ...entity, children: [] })
  })

  const rootEntities: typeof entities = []
  entities?.forEach(entity => {
    if (entity.parent_id && entityMap.has(entity.parent_id)) {
      entityMap.get(entity.parent_id).children.push(entityMap.get(entity.id))
    } else {
      rootEntities.push(entityMap.get(entity.id))
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entidades</h1>
          <p className="text-muted-foreground">
            Gerenciar estrutura organizacional
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/entities/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Entidade
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Árvore de Entidades
          </CardTitle>
          <CardDescription>
            {entities?.length || 0} entidade(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entities && entities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Recursiva</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entity.level > 0 && (
                          <span className="text-muted-foreground">
                            {'└'.padStart(entity.level * 2, ' ')}
                          </span>
                        )}
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{entity.name}</p>
                          {entity.completename && entity.completename !== entity.name && (
                            <p className="text-xs text-muted-foreground">
                              {entity.completename}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Nível {entity.level}</Badge>
                    </TableCell>
                    <TableCell>
                      {entity.is_recursive ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(entity.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/entities/${entity.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma entidade encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
