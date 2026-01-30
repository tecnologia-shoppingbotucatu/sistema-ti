# Sistema TI

Sistema de Gestão de TI baseado em ITIL, desenvolvido com Next.js 16 e Supabase.

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI
- **Deploy**: Vercel (Edge Functions + Cron Jobs)

## Funcionalidades

### ITIL Service Desk
- **Tickets**: Abertura, acompanhamento e resolução de chamados
- **Changes**: Gestão de mudanças com workflow de aprovação
- **Problems**: Análise de causa raiz e gestão de problemas

### Gestão de Ativos
- Inventário de hardware e software
- Controle de licenças
- Histórico de manutenções

### Administração
- Multi-entidade (filiais/departamentos)
- RBAC (Role-Based Access Control)
- Auditoria de ações

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Lint
npm run lint
```

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

## Deploy na Vercel

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push na main

### Cron Jobs (requer Vercel Pro)
- `/api/cron/notifications` - A cada 5 minutos
- `/api/cron/cleanup` - A cada hora
- `/api/cron/sla` - A cada 10 minutos

## Licença

Proprietário - Shopping Botucatu
