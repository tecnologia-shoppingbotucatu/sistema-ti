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
import { Loader2, ArrowLeft, Monitor } from 'lucide-react'
import Link from 'next/link'

export default function NewAssetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'computer',
    serial: '',
    otherserial: '',
    ip: '',
    mac: '',
    contact: '',
    contact_num: '',
    comment: '',
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

      const { data: asset, error: insertError } = await supabase
        .from('assets')
        .insert({
          name: formData.name,
          asset_type: formData.asset_type,
          serial: formData.serial || null,
          otherserial: formData.otherserial || null,
          ip: formData.ip || null,
          mac: formData.mac || null,
          contact: formData.contact || null,
          contact_num: formData.contact_num || null,
          comment: formData.comment || null,
          entity_id: entityId,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      router.push(`/assets/${asset.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ativo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Ativo</h1>
          <p className="text-muted-foreground">
            Cadastrar um novo ativo de TI no inventário
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Informações do Ativo
          </CardTitle>
          <CardDescription>
            Preencha os dados para cadastrar um novo ativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do equipamento"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset_type">Tipo *</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">Computador</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="printer">Impressora</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="peripheral">Periférico</SelectItem>
                    <SelectItem value="network_equipment">Equipamento de Rede</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serial">Número de Série</Label>
                <Input
                  id="serial"
                  placeholder="S/N do fabricante"
                  value={formData.serial}
                  onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherserial">Número de Inventário</Label>
                <Input
                  id="otherserial"
                  placeholder="Etiqueta patrimonial"
                  value={formData.otherserial}
                  onChange={(e) => setFormData({ ...formData, otherserial: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ip">Endereço IP</Label>
                <Input
                  id="ip"
                  placeholder="192.168.0.100"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mac">MAC Address</Label>
                <Input
                  id="mac"
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={formData.mac}
                  onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact">Contato</Label>
                <Input
                  id="contact"
                  placeholder="Nome do responsável"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_num">Telefone</Label>
                <Input
                  id="contact_num"
                  placeholder="(11) 99999-9999"
                  value={formData.contact_num}
                  onChange={(e) => setFormData({ ...formData, contact_num: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Observações</Label>
              <Textarea
                id="comment"
                placeholder="Informações adicionais sobre o equipamento..."
                rows={3}
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar Ativo'
                )}
              </Button>
              <Button type="button" variant="outline" asChild disabled={isLoading}>
                <Link href="/assets">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
