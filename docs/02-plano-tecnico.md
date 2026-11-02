# 02 — Plano Técnico e Plano de Ação

> **Status:** rascunho v0.5 · **Última atualização:** 01/11/2026
> **Documentos base:** `01-visao-e-escopo-mvp.md` (v0.5) · `relatorios/01-viabilidade-monitoramento.md` (v0.4, Fase 1 no Android)
> **Decisão D6 (25/10/2026):** a primeira versão publicada sai **sem a VPN local**. Tudo o que depende dela neste documento vale para uma versão posterior.
> Este documento define **como** o app será construído e **em que ordem**. Itens marcados como *proposta* ou *a decidir* ainda podem mudar. As decisões sobre o Android já se apoiam no protótipo; as do iOS continuam hipóteses até a fase iOS.

---

## 1. Ambiente de desenvolvimento

### 1.1 Equipamentos disponíveis

| Equipamento | Uso |
|---|---|
| Computador Windows | Desenvolvimento, Claude Code, build local do Android |
| Samsung Galaxy S22 (SM-S901E), Android 16 / One UI 8.0 | Aparelho principal de testes desde a Fase 1. Também é o aparelho verificado na conta do Google Play |
| iPhone | Testes reais de iOS na fase iOS, incluindo Screen Time API (não funciona em simulador) |

### 1.2 Lacunas e como contornar

| Lacuna | Impacto | Solução |
|---|---|---|
| **Sem Mac** | Não é possível usar o Xcode localmente; depurar código nativo Swift e extensões do Screen Time fica mais lento | Compilar iOS na nuvem com **EAS Build**. Se a iteração nativa ficar lenta demais na fase iOS, alugar um Mac na nuvem por hora ou adquirir um Mac mini usado |
| **Emulador Android** | Era bloqueado pela virtualização desligada na BIOS | **Resolvido em 01/11/2026:** virtualização ligada; o emulador pode ser usado como segundo ambiente de teste (outra versão do Android) |
| **Um único aparelho Android** | Um fabricante e uma versão de Android; restrições de bateria de outros fabricantes não validadas | Testar em aparelho de outro fabricante antes ou durante o beta (Fase 8); pode ser aparelho de um testador |

---

## 2. Stack tecnológica

| Camada | Escolha | Status |
|---|---|---|
| Linguagem | TypeScript | Proposta |
| Framework | React Native com **Expo** (development builds, não Expo Go). Protótipo: Expo SDK 57, React Native 0.86.3 | Validado no Android |
| Navegação | Expo Router (barra inferior com 4 abas) | Proposta |
| Código nativo Android | Kotlin, via Expo Modules — **módulo próprio** (serviço, notificação, sobreposição e log; VPN numa versão posterior) | **Decidido** (Fase 1) |
| Código nativo iOS | Swift, via Expo Modules + config plugins para extensões. Biblioteca pronta ou módulo próprio a avaliar na fase iOS | Proposta |
| Banco local | SQLite (`expo-sqlite`) com **Drizzle ORM** (esquema em TypeScript e migrações geradas pelo drizzle-kit) | Recomendado em 01/11/2026; confirmar no passo 7 da spec 01 |
| Estado da interface | Biblioteca leve de estado (ex.: Zustand) | A decidir |
| Internacionalização | i18next + `expo-localization` | Proposta |
| Notificações locais | `expo-notifications` para as agendadas; alertas de monitoramento disparados pelo Kotlin | Proposta |
| Assinaturas | **RevenueCat** (`react-native-purchases`) sobre o **Google Play Billing** (obrigatório) | Proposta |
| Conteúdo remoto (calendários, marcos, metadados de vídeos) | **Supabase** | Proposta |
| Hospedagem de vídeos | Serviço de streaming de vídeo (ex.: Cloudflare Stream, Mux ou Bunny Stream) | A decidir |
| Monitoramento de erros | Sentry, configurado **antes do teste fechado** (Fase 8), com filtro de privacidade | Proposta |
| Analytics de produto | Ferramenta com foco em privacidade, **sem eventos contendo dados sensíveis** | A decidir |
| Build Android | **Build local** no Windows durante o desenvolvimento (32 s incrementais no protótipo); EAS para builds de loja se convier | Validado no protótipo |
| Build iOS e publicação | EAS Build e EAS Submit | Proposta |
| Testes | Jest + React Native Testing Library (unitários e componentes); Maestro (fluxos ponta a ponta) | Proposta |
| Repositório | GitHub (`Aplicativo-Mobile`) | Em uso |

**Justificativa do framework:** TypeScript é uma linguagem em que o Claude Code é particularmente produtivo, aproveita a experiência prévia em frontend web e o Expo facilita builds na nuvem a partir do Windows. O monitoramento exige código nativo com qualquer framework multiplataforma.

---

## 3. Arquitetura

### 3.1 Princípio: local-first

```
┌───────────────────────────── Aparelho do usuário ─────────────────────────────┐
│                                                                                │
│  App React Native (TypeScript)                                                 │
│  ├── Telas: Início · Estatísticas · Progresso · Perfil · Onboarding            │
│  ├── Domínio: compulsões, streaks, gatilhos, check-ins, alertas, emergência     │
│  ├── Banco local SQLite  ← todos os dados pessoais e sensíveis ficam aqui       │
│  └── Cache de conteúdo remoto (funciona offline)                               │
│                                                                                │
│  Módulos nativos de monitoramento                                              │
│  ├── Android: eventos de uso · serviço em primeiro plano (specialUse) ·        │
│  │            sobreposição + tela própria · VPN local de DNS (versão posterior)│
│  └── iOS: Family Controls · Device Activity · Managed Settings + extensões      │
│           (fase iOS)                                                           │
│                                                                                │
└──────────────┬──────────────────────────────┬──────────────────────────────────┘
               │ somente leitura               │ status da assinatura
               ▼                               ▼
     Supabase (conteúdo)               RevenueCat ⇄ Google Play (depois App Store)
     Streaming de vídeo
```

### 3.2 Regras de arquitetura
- **Dados pessoais nunca saem do aparelho no MVP**: compulsões escolhidas, gatilhos, motivação, check-ins, recaídas, uso de apps, domínios detectados e estatísticas.
- O servidor fornece apenas **conteúdo público** (calendários, marcos, vídeos) e não recebe identificação do usuário.
- **Sem login no MVP.** Assinatura vinculada à conta da loja via RevenueCat (identificador anônimo).
- Troca de aparelho perde o histórico no MVP; backup opcional fica para fase futura.
- **Sem VPN na primeira versão (D6).** Quando voltar, a VPN será local e só observará consultas de DNS, salvo decisão futura de criar uma função de servidor real.
- **Compulsão como entidade genérica** (ver doc 01, seção 3): novas compulsões entram como configuração e conteúdo, não como reescrita.
- **Nenhum texto fixo no código**: tudo em arquivos de tradução ou conteúdo remoto.
- Módulos nativos expõem uma **interface comum** em TypeScript; diferenças entre plataformas ficam isoladas atrás dela. A seleção de alvos é **opaca** (no iOS o app recebe identificadores opacos; o nome legível do app é detalhe do Android). Funções sem suporte respondem `'unsupported'`.
- **Todo estado do monitoramento fica em disco**: o processo pode morrer a qualquer momento (ex.: atualização do WebView) e o sistema recria os serviços em segundos.

### 3.3 Organização do código (proposta)

```
app/                    # rotas e telas (Expo Router)
src/
  domain/               # regras de negócio puras (streak, alertas, gatilhos, reprovação do dia) — sem dependência de UI
  data/                 # banco local, repositórios, sincronização de conteúdo
  features/             # módulos por funcionalidade (onboarding, emergencia, progresso...)
  monitoring/           # interface comum de monitoramento em TypeScript
  subscription/         # integração RevenueCat e regras de acesso premium
  i18n/                 # configuração e arquivos de tradução (pt-BR)
  ui/                   # design system e componentes compartilhados
modules/
  monitoring-android/   # Kotlin (base: módulo do protótipo)
  monitoring-ios/       # Swift + extensões do Screen Time (fase iOS)
prototype/              # protótipo da Fase 1 e NOTAS.md (referência)
NOTAS-APP.md            # diário técnico do app definitivo
docs/
  01-visao-e-escopo-mvp.md
  02-plano-tecnico.md
  relatorios/           # relatórios de viabilidade e evidências
  rascunhos/            # rascunhos de loja e privacidade (Fase 7)
  specs/                # uma spec por funcionalidade
CLAUDE.md
```

### 3.4 Build publicado e VPN
- **Um único build, sem VPN** (D6, 25/10/2026). Não há variante "com VPN" por enquanto; a ideia de duas variantes (decisão de 24/09) foi substituída.
- A detecção de domínios fica atrás de uma **flag de configuração** (`features.domainMonitoring = false`), lida por um único módulo. A interface de monitoramento responde `'unsupported'` para ela.
- O manifesto publicado **não pode conter** `BIND_VPN_SERVICE` (nem serviço de VPN), `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` e `HIDE_OVERLAY_WINDOWS`, que só serviam à VPN e a um experimento do protótipo. Uma verificação automática do manifesto garante isso, principalmente a partir da Fase 4, quando o módulo do protótipo for portado.
- A justificativa do serviço `specialUse` no manifesto fica **em inglês** (é lida por revisor do Google). Rascunhos em `docs/rascunhos/play-console-justificativas.md`.
- Quando a VPN voltar, decidir se ela entra como atualização do mesmo app (provável) e reler a política antes.

---

## 4. Monitoramento por plataforma

| Capacidade | Android (validado na Fase 1) | iOS (não validado) |
|---|---|---|
| Seleção dos apps monitorados | App lista os apps instalados (consulta MAIN/LAUNCHER) e o usuário escolhe | Usuário escolhe no seletor da Apple (`FamilyActivityPicker`); o app recebe identificadores opacos |
| Tempo de uso por app | ✅ Leitura por eventos (`UsageStatsManager`), coincide com o sistema no mesmo minuto | Eventos ao atingir limites definidos (`DeviceActivityMonitor`) |
| Detecção do limite com o app fechado | ✅ Serviço em primeiro plano com verificação a cada ~20 s; detecção em 3 a 9 s. Não existe API pública de aviso de limite | A validar |
| Detecção de conteúdo adulto (versão posterior, D6) | ⚠️ VPN local só de DNS, modo alerta: detecção e notificação em 10 a 15 ms, página carrega normalmente. É indício, não prova | Filtro nativo **bloqueia**; alertar sem bloquear é incerto |
| Tela de interrupção | ⚠️ Sobreposição como principal; tela própria como reserva. Qualquer app pode esconder a sobreposição | Tela de proteção personalizada (`ManagedSettings` + extensões) |
| Navegador | ⚠️ Acesso detectado e atribuído ao navegador; tempo só por estimativa (erro alto). Usado só como alerta | A validar |
| Exibir minutos de uso no app | ✅ Livre | Restrito: só por extensão de relatório isolada |
| Bateria | ✅ 1,1 a 1,6 mAh/dia medidos (0,15% a 0,3% do consumo), sem wakelock; dia leve e build de desenvolvimento | A validar |
| Sobrevivência | ✅ Horas desconectado, dias parado, economia de energia ligada. ⚠️ Janela cega após reinício; VPN não volta após o boot | A validar (inclui T9: build de desenvolvimento desconectado) |
| Autorização especial | Permissões de uso e sobreposição; **declaração do serviço em primeiro plano** no Google Play (VpnService só quando a VPN voltar) | **Entitlement Family Controls** para distribuição, por bundle ID e por extensão |

### 4.1 Correções obrigatórias no módulo Android (vindas da Fase 1)

| Área | Correção |
|---|---|
| Limite de uso | Acumular incrementalmente em vez de reler o dia inteiro a cada verificação; borda do dia explícita; filtrar lançadores; descontar o tempo diante da tela de interrupção; contador de verificações no serviço |
| VPN (versão posterior) | Detectar DNS privado estrito antes de ligar e enquanto estiver ligada; **religar após o boot**; perceber revogação por outra VPN e avisar; repasse concorrente com nova tentativa curta |
| Tela de interrupção | Fundo opaco; gesto de voltar tratado explicitamente e testado com o voltar preditivo; tela própria isolada da pilha do app e fixa em retrato; conferir visibilidade, descartar em 20 s e recuar progressivamente (1, 2, 5, 15 min) quando escondida; notificação como rede de segurança |
| Permissões | Vigilância ativa: conferir periodicamente e avisar quando perder alguma (hoje o maior buraco do protótipo) |
| Reinício | Aceitar a janela cega de ~2,5 min (só após o primeiro desbloqueio) e garantir que o serviço volte (e a VPN, quando existir) |
| Estado | Todo estado em disco, para sobreviver à morte do processo |

### 4.2 Pendências de medição no Android
- Um dia de **uso pesado**, com bateria medida num build **sem o cliente de desenvolvimento** (os números atuais são teto).
- Chamada recebida com a sobreposição na tela.
- Voltar preditivo ligado.
- Força-parada pelo usuário (desliga o religamento automático).
- Troca de Wi-Fi para dados móveis com a VPN ligada (quando a VPN voltar).
- Aparelho de outro fabricante e outra versão de Android.
- Apps de aposta e de banco com proteção contra sobreposição (para a segunda etapa do produto). **Primeira rodada feita em 25/10/2026:** 7 apps, o Nubank esconde a nossa sobreposição e a Bet365 não. Falta ampliar a amostra (bancos tradicionais, outras carteiras e ao menos 3 casas de aposta, inclusive depois do login).

---

## 5. Modelo de dados (visão inicial)

**Conteúdo remoto (Supabase, público, multilíngue)**

| Entidade | Descrição |
|---|---|
| `DefinicaoCompulsao` | Tipo de mecânica, apps/domínios sugeridos, textos padrão |
| `Marco` | Compulsão, dia, título, descrição, referência científica, gratuito/premium |
| `Video` | Marco relacionado, URL de streaming, duração, selo de IA |

**Dados locais (SQLite, privados)**

| Entidade | Descrição |
|---|---|
| `CompulsaoUsuario` | Compulsões ativas, data de início, situação (ativa/pausada no plano gratuito), limite diário, apps monitorados |
| `AppMonitorado` | Compulsão, identificador do app, papel (app de vídeo curto ou app de risco) e, em app de risco, se o usuário declarou consumir o conteúdo nele (define se há tela de interrupção) |
| `Gatilho` | Tipo (horário, dia, emoção), valor, compulsão relacionada |
| `Motivacao` | Texto pessoal do usuário |
| `EventoUso` | Uso acumulado e limite atingido, vindos do monitoramento (sem minutos de navegador) |
| `DeteccaoDominio` | Data, categoria (adulto, rede social), origem (navegador/app). Só o domínio, nunca a URL; nunca enviado ao servidor |
| `Alerta` | Nível (notificação/interrupção), compulsão, horário, se a tela foi de fato exibida |
| `RespostaInterrupcao` | Alerta, resposta (`emergencia`, `tela_inicial`, `continuar`, `ignorar_hoje`), horário |
| `EstadoDia` | Por compulsão e dia: interrupções, "continuar" usados, pausa ativa até, alertas encerrados até a meia-noite, dia reprovado e motivo |
| `NotificacaoEnviada` | Tipo (proativa ou alerta), compulsão, horário; usada para respeitar o limite de 6 proativas por dia e o intervalo dos alertas de domínio |
| `CheckIn` | Data, resposta, origem (notificação, app, pós-alerta) |
| `Recaida` | Data, compulsão |
| `SessaoEmergencia` | Início, fim, "a vontade passou?" |
| `MarcoDesbloqueado` | Marco, data (nunca apagado em recaída) |
| `Configuracoes` | Onboarding concluído, idade confirmada (18+), notificações, limite global (6 proativas por dia), preferências |

> A **streak** é calculada a partir de check-ins, recaídas, eventos de uso e `EstadoDia`, e não armazenada como número fixo. O estado do monitoramento (permissões, serviço, VPN) é lido em tempo real, não persistido como dado do usuário.

---

## 6. Privacidade, segurança e conformidade

- Dados sensíveis somente no aparelho; banco local protegido pelos mecanismos de armazenamento seguro do sistema.
- Sentry (e analytics, se um dia houver) **não podem** registrar compulsões escolhidas, gatilhos, motivação, nomes de apps monitorados ou domínios acessados. Revisão obrigatória de cada evento.
- Lista de domínios (Android) processada localmente; nenhum domínio acessado é enviado ao servidor.
- **Segurança de dados do Google Play:** o app **tem coleta**, ainda que pequena (RevenueCat e Sentry). O que nunca sai do aparelho (uso de apps, lista de apps, limites, gatilhos, motivação) fica fora da declaração enquanto nenhuma ferramenta externa o receber. Rascunho em `docs/rascunhos/privacidade-e-seguranca-de-dados.md`.
- Notificações com textos neutros na tela bloqueada (validado: o cartão mostra só título e texto, sem o nome do app monitorado).
- Nome do app (Quedo), ícone e descrição de cobrança neutros. Nome do desenvolvedor: pessoal na fase de validação (doc 01, seção 7.4).
- Política de privacidade e termos de uso antes do teste fechado.
- **Divulgação destacada** dentro do app antes de pedir acesso a dados de uso (e antes da VPN, quando existir).
- Declarações no Play Console: serviço em primeiro plano (`specialUse`, com justificativa em inglês no manifesto), recursos financeiros (sem recursos), questionário de classificação (IARC) e, se aplicável, apps de saúde.
- Função "apagar todos os meus dados" no Perfil.

---

## 7. Forma de trabalho com Claude Code

1. O **chat de planejamento** (Project "Aplicativo Mobile" no claude.ai) gera documentos de visão, plano e specs por funcionalidade, e é onde os docs 01 e 02 são alterados.
2. Documentos vivem em `docs/` no repositório e são versionados. O relatório de viabilidade tem versão de trabalho num Doc do Project; a oficial fica em `docs/relatorios/`.
3. O **`CLAUDE.md`** reúne regras permanentes: stack, organização de pastas, padrões de código, i18n obrigatório, regras de privacidade, comandos de build e teste. O Claude Code não altera os docs 01 e 02.
4. Cada funcionalidade tem uma spec em `docs/specs/` com: objetivo, telas, fluxos, regras de negócio, estados de erro, critérios de aceite e itens fora do escopo.
5. Uma **branch por funcionalidade**; o Claude Code implementa com testes; revisão manual no aparelho antes de integrar.
6. Mudanças de decisão voltam para os documentos antes (ou junto) do código.

---

## 8. Plano de ação

O plano é organizado por **fases com critérios de saída**, não por datas fixas. A Fase 0 corre em paralelo. As Fases 2 a 9 são **só Android**; o iOS vem na Fase 10, depois da publicação Android.

### Fase 0 — Fundamentos (paralela)
**Objetivo:** remover bloqueios burocráticos que levam semanas.

**Estratégia de contas (decidida em 24/09/2026):**
- **Pessoa física nas duas lojas** durante a fase de validação.
- Sem divulgação do app enquanto estiver na conta pessoal; assinaturas apenas de teste.
- CNPJ só ao iniciar a divulgação (ver Marco de transição, abaixo).
- Na Apple, a conta individual serve para desenvolvimento, TestFlight e publicação, e depois pode ser convertida em organização. O entitlement **Family Controls (Distribution)** é pedido nessa conta, por bundle ID (app e cada extensão), quando a fase iOS se aproximar.

Itens:
- [x] Repositório no GitHub e conta no Expo
- [x] Nome do app: Quedo
- [x] **Conta Google Play Console (pessoa física)** — verificação concluída (01/11/2026)
- [x] **Package name** definitivo do Android: `br.com.quedo.app`; builds de desenvolvimento usam `br.com.quedo.app.dev` (01/11/2026)
- [ ] Conta Apple Developer (pessoa física) — **adiada para perto da Fase 10** (01/11/2026). O nome "Quedo" é reservado no App Store Connect quando a conta for criada
- [ ] Domínio quedo.com.br e depósito da marca no INPI (responsável, ver documento de decisão do nome)
- [x] Conta Expo (já existia; projeto EAS novo para o app na Fase 2)
- [ ] Contas: Supabase (Fase 5), RevenueCat (Fase 6), Sentry (antes da Fase 8)
- [x] Virtualização ligada na BIOS (emulador Android) (01/11/2026)

**Critério de saída:** conta do Google Play ativa e package name definido. **Cumprido em 01/11/2026.** Os itens restantes seguem em paralelo.

### Fase 1 — Protótipo técnico de monitoramento
**Situação:** **concluída no Android** (relatório v0.4, 31/10/2026, com o I-25 medido no Nubank e a D6). Os experimentos iOS (S2, S3, I1–I14, C1, T9) saem do critério desta fase e passam para a Fase 10.
- [x] Experimentos Android S1, S4, A1–A10, C2 e roteiros T1–T8 e T10
- [x] Relatório de viabilidade escrito
- [x] Decisões de produto tomadas (24/09/2026)
- [x] Docs 01 e 02 atualizados (v0.3)
- [x] Relatório, evidências, protótipo e rascunhos de loja sincronizados no repositório (01/11/2026)

**Critério de saída:** itens acima concluídos, só para Android.

### Fase 2 — Fundação do app
**Spec:** `docs/specs/spec-01-fundacao-do-app.md`.
- [ ] Projeto definitivo, estrutura de pastas e `CLAUDE.md` reescrito para o app definitivo
- [ ] Navegação com 4 abas e fluxo de onboarding vazio
- [ ] i18n configurado (pt-BR), sem textos fixos
- [ ] Banco local com migrações e repositórios
- [ ] Design system básico (cores, tipografia, componentes)
- [ ] Variantes de ambiente (dev, preview, produção) e verificação automática do manifesto (seção 3.4)
- [ ] Testes automatizados, CI e builds configurados

**Critério de saída:** app navegável instalado no S22, com testes rodando.

### Fase 3 — Onboarding e núcleo
- [ ] Onboarding completo (compulsões, configuração, gatilhos, motivação, permissões com divulgação destacada, resumo)
- [ ] Modelo genérico de compulsão com pornografia e vídeos curtos
- [ ] Streak por mecânica, check-in e registro de recaída
- [ ] Tela Início com cards por compulsão
- [ ] Perfil: editar compulsões, gatilhos e motivação; apagar dados

**Critério de saída:** usuário configura o app e acompanha streaks com check-in manual.

### Fase 4 — Monitoramento, alertas e emergência
- [ ] Módulo nativo Android definitivo (a partir do protótipo) atrás da interface comum, com as correções da seção 4.1
- [ ] Alertas em dois níveis, tela de interrupção com quatro botões, pausa de 5 min, reprovação do dia e janelas de gatilho
- [ ] Notificação de recomeço no dia seguinte à quebra de streak
- [ ] Notificações preventivas por gatilho e coordenação/limite global
- [ ] Apps de risco da pornografia (alerta preventivo e, onde declarado, tela de interrupção)
- [ ] Botão de emergência completo
- [ ] Vigilância de permissões, tela de estado do monitoramento e modo degradado

**Critério de saída:** fluxo proativo completo funcionando no S22, inclusive após reinício, e manifesto sem as permissões proibidas da seção 3.4.

### Fase 5 — Progresso, estatísticas e conteúdo remoto
- [ ] Supabase com esquema de conteúdo e cache offline
- [ ] Aba Progresso: calendário, marcos e desbloqueios
- [ ] Player de vídeo com streaming
- [ ] Aba Estatísticas (sem minutos de navegador; descontando interrupções)

**Critério de saída:** jornada completa com conteúdo de teste.

### Fase 6 — Monetização
- [ ] Produtos e preços no Google Play e no RevenueCat
- [ ] Tela de assinatura (anual em destaque, informações de cobrança claras)
- [ ] Teste invertido de 7 dias sem cartão
- [ ] Regras de acesso gratuito vs. premium e transição ao fim do teste, desligando o serviço e pausando vídeos curtos
- [ ] Restaurar compras

**Critério de saída:** compras funcionando em ambiente de testes do Google Play.

### Fase 7 — Conteúdo e conformidade
- [ ] Calendários com marcos e referências científicas (pesquisa do responsável do produto)
- [ ] Roteiros e produção dos vídeos com IA, com registro de origem
- [ ] Revisão de todos os textos em português
- [ ] Política de privacidade, termos de uso e avisos de saúde
- [ ] Ícone, capturas de tela e descrição da ficha (sem termos explícitos nem nomes de sites)
- [ ] Segurança de dados (com a coleta de RevenueCat e Sentry), questionário de classificação (18+), declaração de recursos financeiros e, se aplicável, de apps de saúde
- [ ] **Vídeo de declaração do serviço em primeiro plano**, gravado no build definitivo (roteiro em `docs/rascunhos/roteiro-video-servico-primeiro-plano.md`). Os dois vídeos da VPN só quando ela voltar
- [ ] Justificativa do serviço `specialUse` no manifesto (em inglês) e no Play Console
- [ ] Revisar os rascunhos de `docs/rascunhos/` (política de privacidade, segurança de dados, justificativas) com o nome Quedo e a pessoa física

**Critério de saída:** conteúdo final carregado e materiais da loja prontos.

### Fase 8 — Beta (teste fechado no Google Play)
- [ ] Sentry configurado, com filtro de privacidade testado, antes de entrar o primeiro testador
- [ ] Recrutar **14 a 15 testadores** (responsável, quando o desenvolvimento pedir) e rodar o teste fechado com no mínimo 12 ativos por 14 dias seguidos
- [ ] Canal de feedback com os testadores
- [ ] Teste em aparelho de outro fabricante
- [ ] Um dia de uso pesado com medição de bateria em build de loja
- [ ] Reavaliar canal de notificação de importância mínima para o monitoramento
- [ ] Corrigir problemas de estabilidade, bateria e experiência

**Critério de saída:** 14 dias de teste fechado cumpridos, sem falhas críticas, feedback positivo sobre o fluxo principal, retenção da primeira semana medida.

### Fase 9 — Publicação Android
- [ ] Submissão ao Google Play **sem VPN** (D6), com a declaração do serviço em primeiro plano
- [ ] Responder a eventuais rejeições
- [ ] Monitorar erros, avaliações e conversão nas primeiras semanas

**Critério de saída:** app publicado no Google Play.

### Fase 10 — iOS
- [ ] Conta Apple ativa; pedido do Family Controls (Distribution) para o app e cada extensão
- [ ] Protótipo iOS: S2, S3, I1–I14, C1 e T9 da spec 00; atualizar o relatório de viabilidade
- [ ] Decidir biblioteca pronta ou módulo próprio, e a solução de pornografia no iOS
- [ ] Atualizar docs 01 e 02 com as diferenças do iOS
- [ ] Portar o app (módulo iOS atrás da interface comum), TestFlight e publicação na App Store

### Evolução — Detecção de domínios (VPN local)
Depois da primeira versão publicada, em ordem a definir com a Fase 10:
- [ ] Reler a política de `VpnService` e decidir se existe função de servidor real que justifique a VPN
- [ ] Portar a VPN do protótipo com as correções da seção 4.1
- [ ] Declaração de VpnService no Play Console, com os dois vídeos de até 90 s
- [ ] Ativar no produto as regras marcadas como "versão posterior, D6" no doc 01

### Marco de transição — CNPJ e divulgação
Quando o responsável decidir iniciar a divulgação:
- [ ] Conversar com contador (CNAE, Simples Nacional, receita das lojas, Fator R) e abrir a Microempresa
- [ ] Solicitar o número D-U-N-S
- [ ] Apple: converter a conta individual em organização
- [ ] Google Play: criar conta de organização e transferir o app (grupos de teste fechado não são transferidos)
- [ ] Aderir aos programas de comissão reduzida e ativar a cobrança real

---

## 9. Custos previstos

| Item | Custo | Recorrência |
|---|---|---|
| Google Play Console | US$ 25 | Único |
| Apple Developer Program (pessoa física, convertida depois) | US$ 99, a partir de perto da Fase 10 | Anual |
| Comissão das lojas sobre assinaturas | 15% no Google Play (Brasil); conferir a da Apple | Sobre a receita (só após a cobrança real) |
| Domínio quedo.com.br (e quedo.app, se registrado) | A orçar | Anual |
| Depósito de marca no INPI | A orçar (por classe) | Único, mais manutenção |
| Supabase | Plano gratuito inicialmente | Mensal conforme uso |
| Streaming de vídeo | A orçar | Mensal conforme uso |
| RevenueCat | Gratuito até certo faturamento, depois percentual | Conforme receita |
| Sentry / analytics | Planos gratuitos inicialmente | Mensal conforme uso |
| Ferramenta de IA para vídeos (plano comercial) | A orçar | Mensal durante produção |
| Página do app (política de privacidade) | A orçar | Anual |
| Aparelho Android de outro fabricante (opcional) | A orçar | Único, se necessário |
| Mac na nuvem ou Mac mini usado (contingência iOS) | A orçar | Se necessário |
| EAS Build | Plano gratuito pode bastar; plano pago se a fila atrasar | Mensal se necessário |
| Contador e custos da empresa | A orçar | Mensal, só após o CNPJ |

---

## 10. Riscos técnicos adicionais

Complementam os riscos R1–R12 do doc 01.

| # | Risco | Situação / mitigação |
|---|---|---|
| T1 | Depuração nativa de iOS lenta sem Mac | Fase 10. EAS Build; contingência de Mac na nuvem |
| T2 | Demora ou recusa do entitlement Family Controls (Distribution), por bundle ID e por extensão | Fase 10. Pedir assim que a conta Apple estiver ativa e a fase iOS se aproximar |
| T3 | Limitações do iOS para exibir tempo de uso fora da extensão de relatório | Fase 10. A interface comum já prevê `'unsupported'` |
| T4 | Monitoramento interrompido por economia de bateria no Android | **Rebaixado.** 0,16% do consumo num dia, sem falhas no S22. Falta dia pesado e outros fabricantes |
| T5 | Bibliotecas de terceiros para Screen Time com manutenção incerta | Android resolvido (módulo próprio). iOS avaliado na Fase 10 |
| T6 | Vazamento acidental de dados sensíveis em logs ou analytics | Regra no `CLAUDE.md` e revisão de eventos |
| T7 | Eventos do Screen Time limitados em builds de desenvolvimento fora do Xcode | Fase 10 (T9 da spec 00) |
| T8 | Justificativa do serviço `specialUse` recusada (o critério "rodar só o necessário" pesa contra um serviço de dia inteiro) | Os outros quatro critérios dão defesa: o usuário liga, a notificação é visível, ele desliga quando quiser, e adiar significa não avisar na hora do risco. Desligar no fim do teste reforça |
| T9 | Recusa da VPN local | **Evitado na primeira versão pela D6.** Volta a valer na evolução de detecção de domínios |
| T10 | Falhas silenciosas: permissão revogada, serviço parado; com a VPN (versão posterior): VPN não volta após boot, outra VPN derruba a nossa, DNS privado estrito | Correções da seção 4.1 e tela de estado do monitoramento |
| T11 | Números de bateria inflados pelo build de desenvolvimento | Medir de novo em build de loja na Fase 8 |
| T12 | Testadores inativos no teste fechado levam o Google a pedir mais teste | Recrutar com folga e acompanhar o uso real |

---

## 11. Decisões em aberto

**Técnicas (podem ser propostas pelo Claude Code com justificativa)**
- [ ] Biblioteca de estado da interface
- [ ] Serviço de streaming de vídeo
- [ ] Ferramenta de analytics (recomendação: nenhuma no MVP)

**Do responsável, antes da Fase 2**
- [x] Package name: `br.com.quedo.app` (01/11/2026)
- [x] Conta Apple: só perto da Fase 10 (01/11/2026)
- [x] Sincronizar protótipo e relatório no repositório (01/11/2026)
- [ ] Banco: Drizzle ORM (recomendado) ou SQL tipado à mão

**Para depois da primeira versão**
- [ ] Quando e como a detecção de domínios (VPN) volta

**Para a Fase 10 (iOS)**
- [ ] Biblioteca pronta ou módulo próprio para Screen Time
- [ ] Solução de pornografia no iOS

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 15/09/2026 | Primeira versão |
| 0.2 | 15/09/2026 | Android antigo disponível para testes; estratégia de contas Apple (pessoal para desenvolvimento, empresa para distribuição); riscos T2 e T7 |
| 0.3 | 01/11/2026 | Resultados da Fase 1 (Android): módulo próprio em Kotlin, build local, tabela de monitoramento com dados medidos, correções obrigatórias e pendências de medição; variantes de build com e sem VPN; modelo de dados com interrupções e estado do dia; contas como pessoa física e marco de transição para CNPJ; plano reorganizado em Android primeiro (Fases 2 a 9) e iOS na Fase 10; Fase 1 concluída no Android; teste fechado com 12 testadores por 14 dias; custos e riscos T8 a T12 |
| 0.4 | 01/11/2026 | Conta Google Play verificada; package name `br.com.quedo.app` (dev: `.dev`); conta Apple adiada para perto da Fase 10; recrutamento de testadores movido para a Fase 8; modelo de dados com `AppMonitorado`, `NotificacaoEnviada`, compulsão pausada e idade confirmada; Fase 2 aponta para a spec 01 |
| 0.5 | 01/11/2026 | Decisão D6: build único sem VPN, flag `domainMonitoring` e verificação de permissões proibidas no manifesto (seção 3.4); VPN movida para a evolução pós-lançamento; I-25 no Nubank; segurança de dados com coleta (RevenueCat e Sentry); Sentry antes da Fase 8; Drizzle recomendado; emulador liberado; relatório v0.4 e rascunhos de loja referenciados |
