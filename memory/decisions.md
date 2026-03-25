# Decisões Técnicas

## Infraestrutura

### 2026-03-25 — Stack do Projeto
- **Frontend**: React + TypeScript (Vite) em `/client`
- **Backend**: Node.js + tRPC em `/server` e Vercel Functions em `/api`
- **Banco**: Supabase (PostgreSQL) + Drizzle ORM
- **Deploy**: Vercel (frontend + serverless functions)
- **Autenticação**: Supabase Auth

### 2026-03-25 — Segurança do Painel Admin
- Painel admin usa URL obscura com token: `/panel-{ADMIN_ROUTE_TOKEN}`
- Múltiplas camadas de segurança em `api/_security.ts`:
  1. Anti-scraping (burst + rate limit)
  2. IP whitelist (`ADMIN_ALLOWED_IPS`)
  3. Geo-blocking (`BLOCKED_COUNTRIES`)
  4. Route token (`ADMIN_ROUTE_TOKEN` / `VITE_ADMIN_ROUTE_TOKEN`)
  5. Brute force (3 tentativas → bloqueio 24h em `admin_login_attempts`)
  6. Email whitelist (`ADMIN_EMAILS`)
  7. TOTP/MFA (Google Authenticator) — opcional se `TOTP_ENCRYPTION_KEY` estiver setado
  8. Admin session token (30 min, em `sessionStorage._as`)

### 2026-03-25 — Problema do Admin Bloqueado (RESOLVIDO)
- **Causa**: `ADMIN_EMAILS` vazia no Vercel → todos os usuários bloqueados
- **Solução**: Setar `ADMIN_EMAILS=botecoconta84@gmail.com` no Vercel + limpar `admin_login_attempts`

## Pagamentos
- Gateway padrão: PIX via múltiplos provedores
- Taxa de plataforma: 20% por transação (`platformFeeInCents`)
- Suporte a: PushinPay, Blackout, Novaplex
