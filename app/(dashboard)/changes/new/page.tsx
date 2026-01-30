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
import { Loader2, ArrowLeft, GitBranch } from 'lucide-react'
import Link from 'next/link'

export default function NewChangePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    urgency: '3',
    impact: '3',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

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

      const { data: change, error: insertError } = await supabase
        .from('changes')
        .insert({
          name: formData.name,
          content: formData.content,
          urgency: parseInt(formData.urgency),
          impact: parseInt(formData.impact),
          status: 1,
          entity_id: entityId,
          requester_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      router.push(`/changes/${change.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar mudança')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/changes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Mudança</h1>
          <p className="text-muted-foreground">
            Registrar uma nova mudança - Change Management
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Informações da Mudança
          </CardTitle>
          <CardDescription>
            Preencha os dados para registrar uma nova mudança
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
                placeholder="Resumo da mudança"
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
                placeholder="Descreva a mudança, justificativa, impacto esperado..."
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                  'Criar Mudança'
                )}
              </Button>
              <Button type="button" variant="outline" asChild disabled={isLoading}>
                <Link href="/changes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
