# Privacy SaaS MVP - TODO

## Fase 1: Autenticação e Multi-tenancy
- [x] Sistema de autenticação com Manus OAuth
- [x] Suporte a multi-tenancy com rotas dinâmicas [username]
- [x] Proteção de rotas e contexto de usuário

## Fase 2: Banco de Dados e Schema
- [x] Esquema Drizzle com tabelas de usuários, perfis, conteúdo, assinaturas
- [x] Migrations e configuração Supabase
- [ ] Seeders para dados de teste

## Fase 3: Dashboard do Criador
- [x] Layout base com sidebar navigation
- [x] Gráficos de vendas com Recharts
- [x] Métricas de saldo, assinantes e taxa de conversão
- [x] Gerenciador de perfis (criar, editar, deletar)
- [x] Edição de identidade (nome, username, bio)
- [ ] Upload de foto de perfil e banner

## Fase 4: Gestão de Conteúdo
- [x] Sistema de upload de fotos/vídeos
- [x] Grade de conteúdo no dashboard
- [x] Controle de visibilidade (gratuito vs exclusivo)
- [ ] Edição e deleção de conteúdo
- [ ] Pré-visualização de conteúdo

## Fase 5: Planos de Assinatura
- [ ] Criação de planos de assinatura por perfil
- [ ] Configuração de valores personalizáveis
- [ ] Edição e deleção de planos
- [ ] Listagem de planos no dashboard

## Fase 6: Página Pública do Perfil
- [x] Layout mobile-first baseado no Privacy
- [x] Exibição de banner e foto de perfil
- [x] Bio e estatísticas (posts, vídeos, conteúdo exclusivo)
- [x] Grade de conteúdo público
- [x] Botão de assinatura com redirecionamento
- [x] Abas de conteúdo (posts, mídia)

## Fase 7: Integração de Pagamentos
- [ ] Integração com Novaplex
- [ ] Integração com Blackout
- [ ] Integração com Pushinpay
- [ ] Webhooks para atualizar status de assinatura
- [ ] Tokens e autenticação com gateways
- [ ] Checkout modal/página

## Fase 8: Painel Administrativo Master
- [x] Dashboard admin com métricas globais
- [x] Total transacionado e lucro da plataforma
- [x] Monitoramento de criadores ativos
- [x] Listagem de transações com status
- [ ] Filtros e busca de transações
- [ ] Relatórios e exportação de dados

## Fase 9: Testes e Deployment
- [ ] Testes unitários com Vitest
- [ ] Testes de integração de webhooks
- [ ] Testes de fluxo de pagamento
- [ ] Validação de multi-tenancy
- [ ] Performance mobile
- [ ] Checkpoint final e deployment
