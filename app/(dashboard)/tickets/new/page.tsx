'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Ticket } from 'lucide-react'
import Link from 'next/link'

export default function NewTicketPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    type: '1', // 1 = Incidente, 2 = Requisição
    urgency: '3',
    impact: '3',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuário não autenticado')
        setIsLoading(false)
        return
      }

      // Obter entidade padrão do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_entity_id')
        .eq('id', user.id)
        .single()

      // Buscar primeira entidade disponível se não houver padrão
      let entityId = profile?.default_entity_id
      if (!entityId) {
        const { data: entities } = await supabase
          .from('entities')
          .select('id')
          .limit(1)
          .single()
        entityId = entities?.id
      }

      if (!entityId) {
        setError('Nenhuma entidade configurada')
        setIsLoading(false)
        return
      }

      // Criar ticket
      const { data: ticket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          name: formData.name,
          content: formData.content,
          type: parseInt(formData.type),
          urgency: parseInt(formData.urgency),
          impact: parseInt(formData.impact),
          status: 1, // Novo
          entity_id: entityId,
          requester_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Redirecionar para o ticket criado
      router.push(`/tickets/${ticket.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ticket')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Ticket</h1>
          <p className="text-muted-foreground">
            Abrir um novo chamado de suporte
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Informações do Ticket
          </CardTitle>
          <CardDescription>
            Preencha os dados para abrir um novo chamado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Título *</Label>
              <Input
                id="name"
                placeholder="Resumo do problema ou solicitação"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Descrição *</Label>
              <Textarea
                id="content"
                placeholder="Descreva detalhadamente o problema ou solicitação..."
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Incidente</SelectItem>
                    <SelectItem value="2">Requisição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgência</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Muito baixa</SelectItem>
                    <SelectItem value="2">Baixa</SelectItem>
                    <SelectItem value="3">Média</SelectItem>
                    <SelectItem value="4">Alta</SelectItem>
                    <SelectItem value="5">Muito alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact">Impacto</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value) => setFormData({ ...formData, impact: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Muito baixo</SelectItem>
                    <SelectItem value="2">Baixo</SelectItem>
                    <SelectItem value="3">Médio</SelectItem>
                    <SelectItem value="4">Alto</SelectItem>
                    <SelectItem value="5">Muito alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Ticket'
                )}
              </Button>
              <Button type="button" variant="outline" asChild disabled={isLoading}>
                <Link href="/tickets">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
