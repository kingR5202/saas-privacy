# CLAUDE.md — Instruções do Agente de IA

> Este arquivo instrui o assistente de IA a carregar o contexto do projeto no início de cada sessão e a atualizar os arquivos de memória ao final.

## 📖 No Início de Cada Sessão

Leia **obrigatoriamente** os seguintes arquivos antes de qualquer ação:

1. [`memory/user.md`](./memory/user.md) — Perfil do usuário, credenciais, objetivo
2. [`memory/decisions.md`](./memory/decisions.md) — Decisões técnicas já tomadas
3. [`memory/preferences.md`](./memory/preferences.md) — Preferências de código e design
4. [`memory/people.md`](./memory/people.md) — Pessoas e contas envolvidas

## ✏️ Ao Final de Cada Sessão

Atualize os arquivos de memória com novas informações relevantes:

- **Nova decisão técnica tomada?** → Adicione em `memory/decisions.md`
- **Nova preferência identificada?** → Adicione em `memory/preferences.md`
- **Novo dado do usuário?** → Atualize `memory/user.md`
- **Nova pessoa/conta mencionada?** → Atualize `memory/people.md`

## 🏗️ Contexto do Projeto

- **Projeto**: SaaS Privacy — plataforma de criadores com pagamento via PIX
- **Site**: https://www.privacybrasil.blog
- **Workspace**: `c:\Users\Ronni\Documents\sites privacy\Saas Privacy`
- **Stack**: React + TypeScript (Vite) + Node.js + Supabase + Vercel
- **Admin email**: botecoconta84@gmail.com
- **Supabase URL**: https://qcvrmbqyawmgezifunkh.supabase.co

## ⚠️ Regras Importantes

- Sempre usar **Português Brasileiro** com o usuário
- Não fazer build de produção a menos que solicitado
- Usar `shadcn/ui` para componentes UI
- O painel admin está em `/panel-{ADMIN_ROUTE_TOKEN}` (token em `.env`)
- **Nunca commitar** `.env` — usar `.env.example` como referência
