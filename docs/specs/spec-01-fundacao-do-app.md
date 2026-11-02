# Spec 01 — Fundação do App (Fase 2)

> **Status:** rascunho v0.1 · **Última atualização:** 01/11/2026
> **Documentos base:** `docs/01-visao-e-escopo-mvp.md` (v0.4) · `docs/02-plano-tecnico.md` (v0.4) · `docs/relatorios/01-viabilidade-monitoramento.md` (v0.2)
> **Tipo:** código definitivo. Diferente do protótipo, **tudo aqui fica no produto**: qualidade, testes e i18n são obrigatórios.

---

## 1. Objetivo

Criar o esqueleto do app **Quedo** sobre o qual todas as funcionalidades serão construídas: projeto, estrutura de pastas, navegação, i18n, banco local, design system básico, variantes de build, testes e monitoramento de erros.

Ao final, o app abre no Galaxy S22, passa por um onboarding de telas vazias e chega às 4 abas, sem nenhuma regra de negócio implementada.

---

## 2. Escopo

### 2.1 Dentro do escopo
- Projeto Expo definitivo na **raiz do repositório**, convivendo com `prototype/` sem misturar dependências.
- Identificadores definitivos e nome visível "Quedo".
- Navegação: fluxo de onboarding (telas vazias) e barra inferior com 4 abas.
- i18n configurado em pt-BR, com regra automática contra texto fixo.
- Banco local com sistema de migrações, migração inicial e repositórios testados.
- Tipos de domínio básicos (compulsões e mecânicas).
- Interface comum de monitoramento em TypeScript com uma **implementação falsa** para desenvolvimento.
- Design system básico (tokens e componentes iniciais).
- Variantes de build: ambiente (desenvolvimento, preview, produção) e VPN (com e sem).
- Qualidade: TypeScript estrito, lint, formatação, testes unitários, um fluxo ponta a ponta e CI no GitHub.
- Sentry com filtro de privacidade.
- Tela "Sobre" com versão e variante.

### 2.2 Fora do escopo
- Conteúdo real do onboarding, streak, check-in, alertas, emergência, progresso, estatísticas (Fases 3 a 5).
- Módulo nativo de monitoramento definitivo e a VPN (Fase 4). O código do protótipo **não** é importado nesta fase.
- Supabase, vídeos, RevenueCat e regras de plano (Fases 5 e 6).
- Identidade visual final e ícone definitivo (ainda em aberto no doc 01).
- iOS: nada é testado no iOS nesta fase, mas nada deve ser feito que impeça o iOS depois (ver 4.3).

---

## 3. Ambiente

| Item | Configuração |
|---|---|
| Computador | Windows, com Claude Code |
| Aparelho | Samsung Galaxy S22, Android 16 (via cabo/adb) |
| Emulador | Opcional. Só disponível se o responsável ligar a virtualização na BIOS |
| Build Android | **Local** (Gradle) para desenvolvimento, como no protótipo. EAS configurado para builds de loja |
| Expo | Versão estável atual do Expo SDK. Conferir antes de começar; se for mais nova que a do protótipo (SDK 57), registrar em `NOTAS-APP.md` as diferenças relevantes para o módulo nativo |
| Conta Google Play | Ativa (pessoa física). **Nenhum envio à loja nesta fase** |

---

## 4. Requisitos

### 4.1 Projeto e estrutura
- Estrutura de pastas do doc 02, seção 3.3:

```
app/                    # rotas (Expo Router)
src/
  domain/               # regras puras, sem dependência de UI
  data/                 # banco, migrações, repositórios
  features/             # por funcionalidade (onboarding, inicio, estatisticas, progresso, perfil, sobre)
  monitoring/           # interface comum + implementação falsa
  subscription/         # vazio nesta fase (só um README do que virá)
  i18n/                 # configuração e pt-BR
  ui/                   # tokens e componentes
modules/                # vazio nesta fase (módulo Android entra na Fase 4)
prototype/              # protótipo da Fase 1 — não alterar, não importar
docs/
```

- `prototype/` fica **fora** do TypeScript, do lint, dos testes e do Metro do app (exclusões explícitas).
- Alias de importação (ex.: `@/domain/...`) configurado no TypeScript, no Metro e no Jest.

### 4.2 Identificadores e nome

| Variante de ambiente | Package (Android) | Nome visível |
|---|---|---|
| `development` | `br.com.quedo.app.dev` | Quedo Dev |
| `preview` | `br.com.quedo.app.preview` | Quedo Preview |
| `production` | `br.com.quedo.app` | Quedo |

- O sufixo permite ter o build de desenvolvimento e o de produção instalados ao mesmo tempo, e convive com o protótipo (que usa identificador próprio).
- **`br.com.quedo.app` não pode mudar depois do primeiro envio ao Google Play.** Conferir antes de qualquer build `production`.
- Bundle ID do iOS: reservar os mesmos valores no `app.config.ts`, sem testar.
- Ícone e splash **provisórios e neutros** (forma simples, sem letra que lembre o tema).

### 4.3 Variantes de build
Duas dimensões, controladas por variáveis de ambiente lidas no `app.config.ts`:

1. **Ambiente:** `development`, `preview`, `production` (tabela 4.2).
2. **VPN:** `withVpn` (padrão) e `noVpn` (plano B, doc 02 seção 3.4).

Requisitos:
- O JS lê a configuração por um único módulo (ex.: `src/config/variant.ts`), com `environment` e `features.vpn`.
- Na variante `noVpn`, o manifesto Android final **não pode conter** serviço de VPN nem a permissão `BIND_VPN_SERVICE`. Nesta fase ainda não há VPN, então a exigência é deixar o ponto de extensão pronto (config plugin ou equivalente) e um teste ou script que verifique o manifesto gerado.
- As duas variantes usam o mesmo package da tabela 4.2. Elas substituem uma à outra na loja, nunca convivem lá.
- Perfis equivalentes no `eas.json`.
- Nada de `if (vpn)` espalhado pelas telas: quem precisar consulta `features.vpn`.
- O código deve continuar compilável para iOS em princípio (sem APIs só de Android fora de módulos nativos isolados), mesmo sem teste nesta fase.

### 4.4 Navegação
- **Expo Router.**
- Fluxo inicial:
  - Sem onboarding concluído → grupo de rotas do onboarding.
  - Com onboarding concluído → abas.
  - O estado vem do banco (`Configuracoes.onboardingConcluido`).
- **Onboarding (telas vazias, na ordem do doc 01, seção 4.2):**
  1. Boas-vindas e confirmação de idade
  2. Escolha das compulsões
  3. Configuração por compulsão
  4. Gatilhos
  5. Motivação pessoal
  6. Permissões
  7. Resumo do plano

  Cada tela tem título, um texto provisório e os botões "Voltar"/"Continuar". A última grava `onboardingConcluido = true` e leva às abas.
- **Abas, nesta ordem:** Início, Estatísticas, Progresso, Perfil. Cada uma com título e estado vazio.
- No Perfil, uma entrada "Sobre o app" e, **só em `development`**, uma entrada "Refazer onboarding", que zera a flag.
- Voltar do Android: comportamento padrão do Expo Router, sem sair do app no meio do onboarding sem confirmação.

### 4.5 Internacionalização
- `i18next` + `react-i18next` + `expo-localization`, idioma fixo **pt-BR** por enquanto (a estrutura permite outros).
- Arquivos por funcionalidade (namespaces), ex.: `src/i18n/pt-BR/onboarding.json`, `abas.json`, `comum.json`.
- Chaves em inglês e semânticas (`onboarding.welcome.title`); textos em português impecável (P5).
- **Regra de lint que impede texto fixo em JSX** (ex.: `react-native/no-raw-text` ou `eslint-plugin-i18next`).
- Chaves tipadas: chave inexistente quebra a verificação de tipos.
- Datas e números formatados por utilitário único que usa o idioma ativo.
- Um teste que confere se todas as chaves usadas existem no pt-BR.

### 4.6 Banco local
- `expo-sqlite` com camada de acesso tipada. Pode ser um ORM leve (ex.: Drizzle) ou SQL com tipos; **explicar a escolha e pedir confirmação** antes de instalar (CLAUDE.md, seção 4).
- **Migrações versionadas**, aplicadas na abertura do app, em ordem, uma única vez, e cobertas por teste.
- **Migração 001**, com as tabelas que a Fase 3 vai precisar (nomes de colunas em inglês, conforme o doc 02 seção 5):

| Tabela | Campos mínimos |
|---|---|
| `settings` (Configuracoes) | `onboarding_completed`, `age_confirmed_at`, `proactive_notification_daily_limit` (padrão 6), `created_at` |
| `user_compulsions` (CompulsaoUsuario) | `id`, `type` (`pornography` \| `short_videos`), `status` (`active` \| `paused`), `started_at`, `daily_limit_minutes` (nulo em abstinência) |
| `monitored_apps` (AppMonitorado) | `id`, `compulsion_id`, `package_name`, `role` (`short_video` \| `risk`), `declared_consumption` (só em `risk`) |
| `triggers` (Gatilho) | `id`, `compulsion_id` (nulo = todas), `kind` (`time` \| `weekday` \| `emotion`), `value` |
| `motivation` (Motivacao) | `id`, `text`, `updated_at` |

- As demais tabelas do doc 02 entram nas fases que as usam, por novas migrações.
- **Repositórios** em `src/data/` com interface explícita (a UI nunca escreve SQL), testados em Jest. Se o `expo-sqlite` não rodar no Jest, usar um adaptador SQLite para Node atrás da mesma interface.
- Função `deleteAllData()` já disponível no repositório (usada pelo Perfil na Fase 3).
- Dados no armazenamento privado do app. Sem backup automático do sistema para o banco (`allowBackup` desligado ou regra de exclusão), porque os dados são sensíveis e não devem ir para a nuvem do Google sem decisão.

### 4.7 Domínio
Em `src/domain/`, sem dependência de React ou do banco:
- Tipos e constantes de compulsão: `CompulsionType`, `Mechanic` (`abstinence` \| `moderation`), definição das duas compulsões do MVP (mecânica, papéis de app permitidos).
- Utilitário de **borda do dia** (início e fim do dia no fuso do aparelho), com testes incluindo troca de horário e virada de meia-noite. Ele será a base de streak e limites.
- Nada de regra de streak, alerta ou reprovação do dia nesta fase.

### 4.8 Interface de monitoramento
- Em `src/monitoring/`, a interface comum baseada na spec 00 (seção 5.2) e no relatório (seção 7). Seleção de alvos **opaca**, e funções sem suporte respondem `'unsupported'`.
- Uma implementação **falsa** (`FakeMonitoringModule`) que simula estado de permissões e uso, para as telas das próximas fases serem desenvolvidas sem o módulo nativo.
- Ponto único de obtenção do módulo (ex.: `getMonitoring()`), que nesta fase sempre devolve o falso e na Fase 4 devolverá o nativo no Android.

### 4.9 Design system básico
- Tokens em `src/ui/tokens`: cores (com **tema claro e escuro**, seguindo o sistema), tipografia, espaçamento, raios e sombras. Paleta **provisória e neutra**, fácil de trocar quando a identidade visual for definida.
- Componentes iniciais: `Screen` (área segura e rolagem), `Text` (variantes tipográficas), `Button` (primário, secundário, texto), `Card`, `EmptyState`, `ListItem`.
- Acessibilidade desde já: rótulos, área de toque mínima de 48 dp, contraste adequado nos dois temas, e respeito ao tamanho de fonte do sistema.
- Ícones da barra inferior de uma biblioteca já incluída no Expo, neutros.

### 4.10 Qualidade
- TypeScript **estrito**.
- ESLint e Prettier com scripts `lint`, `format`, `typecheck` e `test`.
- **Jest + React Native Testing Library:** testes de migrações, repositórios, borda do dia, i18n e da navegação inicial (onboarding versus abas).
- **Maestro:** um fluxo ponta a ponta no S22 (abrir o app, percorrer o onboarding, chegar ao Início, trocar de aba). Se o Maestro não funcionar bem no Windows, registrar em `NOTAS-APP.md` e propor uma alternativa antes de gastar mais de uma sessão.
- **CI no GitHub Actions:** `lint`, `typecheck` e `test` em todo push e pull request. Sem build nativo no CI nesta fase.

### 4.11 Monitoramento de erros (Sentry)
- Configurar `@sentry/react-native` **só se o responsável criar a conta**. Sem DSN, o Sentry fica desligado e o app funciona normalmente.
- DSN por variável de ambiente, nunca commitado.
- **Filtro de privacidade obrigatório** (`beforeSend` e `beforeBreadcrumb`): sem breadcrumbs de navegação com parâmetros, sem console, sem dados do usuário, sem nomes de apps ou domínios. Um teste prova que o filtro remove esses campos.
- Desligado em `development` por padrão.

### 4.12 Tela "Sobre o app"
- Nome, versão, número do build, ambiente e variante VPN.
- Link de privacidade como placeholder (a política vem na Fase 7).

---

## 5. Privacidade nesta fase
- Nenhum dado do usuário sai do aparelho. As únicas saídas de rede permitidas são relatórios de erro filtrados do Sentry (se configurado) e o servidor de desenvolvimento local.
- Nenhum analytics.
- Textos provisórios também seguem a discrição: nada de termos explícitos, nem em placeholders.

---

## 6. Ordem de execução

1. **Preparação:** confirmar a versão atual do Expo SDK, `.gitignore` e exclusão do `prototype/`. Criar `NOTAS-APP.md` na raiz.
2. **Projeto e variantes:** criar o projeto, configurar `app.config.ts`, identificadores e variantes (4.1 a 4.3). Primeiro build local no S22.
3. **Qualidade:** TypeScript estrito, lint, Prettier, Jest e CI (4.10, exceto Maestro).
4. **i18n** (4.5).
5. **Design system** (4.9).
6. **Navegação** com onboarding vazio e abas (4.4).
7. **Banco** com migrações e repositórios (4.6), ligado à flag do onboarding.
8. **Domínio e interface de monitoramento** (4.7 e 4.8).
9. **Tela "Sobre"** (4.12) e **Sentry** (4.11), se houver conta.
10. **Maestro** e roteiro manual (seção 7).

---

## 7. Roteiro de verificação manual (no S22)

| # | Roteiro | Esperado |
|---|---|---|
| V1 | Instalar o build `development` com o protótipo ainda instalado | Os dois apps coexistem, com nomes "Quedo Dev" e o do protótipo |
| V2 | Abrir pela primeira vez | Começa no onboarding, tela de boas-vindas |
| V3 | Percorrer as 7 telas, voltar duas e avançar de novo | Ordem correta; voltar funciona; nada em inglês |
| V4 | Concluir, fechar o app pelo multitarefa e reabrir | Abre direto no Início |
| V5 | Trocar entre as 4 abas | Ordem Início, Estatísticas, Progresso, Perfil |
| V6 | Perfil → Refazer onboarding (development) | Volta às boas-vindas |
| V7 | Ligar o tema escuro do sistema | App muda de tema, tudo legível |
| V8 | Aumentar a fonte do sistema ao máximo | Nenhum texto cortado nas telas principais |
| V9 | Perfil → Sobre o app | Versão, build, ambiente e variante VPN corretos |
| V10 | Gerar a variante `noVpn` e conferir o manifesto | Sem serviço de VPN nem `BIND_VPN_SERVICE` |

---

## 8. Critérios de aceite

- [ ] App instalado no S22 a partir de build local, com os identificadores da seção 4.2.
- [ ] Onboarding vazio e 4 abas funcionando, com a flag persistida no banco.
- [ ] Nenhum texto fixo: lint passa com a regra de texto bruto ativa.
- [ ] Migração 001 aplicada e coberta por teste; repositórios testados; `deleteAllData()` existe.
- [ ] Utilitário de borda do dia testado.
- [ ] Interface de monitoramento com implementação falsa.
- [ ] Tokens e componentes básicos, com tema claro e escuro.
- [ ] Variantes de ambiente e VPN geradas, com o manifesto `noVpn` verificado.
- [ ] `lint`, `typecheck` e `test` passando localmente e no CI.
- [ ] Fluxo Maestro rodando no S22, ou alternativa registrada e aprovada.
- [ ] Sentry com filtro testado, ou registrado como pendente por falta de conta.
- [ ] Roteiro V1 a V10 executado com o responsável.
- [ ] `NOTAS-APP.md` com decisões, bibliotecas justificadas e comandos.
- [ ] Tabela de comandos do `CLAUDE.md` (seção 10) preenchida.

---

## 9. Instruções para o Claude Code

- Ler o `CLAUDE.md` inteiro e esta spec antes de começar.
- Seguir a ordem da seção 6, um passo por vez, com **commits pequenos em português** numa branch por grupo (ex.: `fase2/projeto`, `fase2/i18n`, `fase2/banco`), integrando na `main` por pull request depois da revisão do responsável.
- **Consultar a documentação oficial atual** do Expo, do Expo Router, do `expo-sqlite`, do i18next e do Sentry antes de configurar. Versões mudam.
- Antes de instalar biblioteca com código nativo ou criar conta em serviço, **explicar as opções e pedir confirmação**.
- Explicar em português simples o que o responsável precisa fazer no aparelho em cada verificação.
- Não alterar `prototype/`, `docs/01` e `docs/02`. Divergências vão para `NOTAS-APP.md` e são levadas ao chat de planejamento.
- Nunca afirmar que algo funciona sem evidência (saída de teste, de build ou confirmação no aparelho).

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 01/11/2026 | Primeira versão |
