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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Plus, Search, MoreVertical } from 'lucide-react'
import Link from 'next/link'

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function getInitials(profile: { firstname?: string | null; realname?: string | null; username: string }) {
  const first = profile.firstname?.[0] || profile.realname?.[0] || profile.username[0]
  const last = profile.realname?.split(' ').pop()?.[0] || ''
  return (first + last).toUpperCase()
}

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_roles (
        id,
        role:roles (id, name)
      )
    `)
    .order('username')

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Erro</h1>
        <p className="text-destructive">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerenciar usuários do sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Usuários
          </CardTitle>
          <CardDescription>
            {profiles?.length || 0} usuário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles && profiles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(profile)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {profile.firstname} {profile.realname || profile.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{profile.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{profile.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.user_roles?.map((ur: { id: string; role: { id: string; name: string } | null }) => (
                          <Badge key={ur.id} variant="secondary">
                            {ur.role?.name || 'N/A'}
                          </Badge>
                        ))}
                        {(!profile.user_roles || profile.user_roles.length === 0) && (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                        {profile.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(profile.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/users/${profile.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
