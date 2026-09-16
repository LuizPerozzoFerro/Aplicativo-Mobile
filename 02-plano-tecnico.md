# 02 — Plano Técnico e Plano de Ação

> **Status:** rascunho v0.2 · **Última atualização:** 15/09/2026
> **Documento base:** `01-visao-e-escopo-mvp.md` (v0.2)
> Este documento define **como** o app será construído e **em que ordem**. Itens marcados como *proposta* ou *a decidir* ainda podem mudar, principalmente após o protótipo técnico (Fase 1).

---

## 1. Ambiente de desenvolvimento

### 1.1 Equipamentos disponíveis

| Equipamento | Uso |
|---|---|
| Computador Windows | Desenvolvimento, Claude Code, emulador Android |
| iPhone | Testes reais de iOS, incluindo Screen Time API (não funciona em simulador) |
| Celular Android antigo | Testes reais de Android desde o protótipo (confirmar compatibilidade da versão do Android com o Expo) |

### 1.2 Lacunas e como contornar

| Lacuna | Impacto | Solução |
|---|---|---|
| **Sem Mac** | Não é possível usar o Xcode localmente; depurar código nativo Swift e extensões do Screen Time fica mais lento | Compilar iOS na nuvem com **EAS Build**. Se a iteração nativa ficar lenta demais na Fase 1, alugar um Mac na nuvem por hora ou adquirir um Mac mini usado |
| **Android antigo** | Pode não refletir comportamento de bateria e restrições de aparelhos atuais | Usar aparelho antigo + emulador com versão recente do Android; avaliar um aparelho mais novo antes da Fase 8 (beta) |

---

## 2. Stack tecnológica

| Camada | Escolha | Status |
|---|---|---|
| Linguagem | TypeScript | Proposta |
| Framework | React Native com **Expo** (development builds, não Expo Go) | Proposta |
| Navegação | Expo Router (barra inferior com 4 abas) | Proposta |
| Código nativo iOS | Swift, via Expo Modules + config plugins para extensões | Proposta |
| Código nativo Android | Kotlin, via Expo Modules | Proposta |
| Banco local | SQLite (`expo-sqlite`) com camada de acesso tipada | Proposta |
| Estado da interface | Biblioteca leve de estado (ex.: Zustand) | A decidir |
| Internacionalização | i18next + `expo-localization` | Proposta |
| Notificações locais | `expo-notifications` | Proposta |
| Assinaturas | **RevenueCat** (`react-native-purchases`) | Proposta |
| Conteúdo remoto (calendários, marcos, metadados de vídeos) | **Supabase** | Proposta |
| Hospedagem de vídeos | Serviço de streaming de vídeo (ex.: Cloudflare Stream, Mux ou Bunny Stream) | A decidir |
| Monitoramento de erros | Sentry | Proposta |
| Analytics de produto | Ferramenta com foco em privacidade, **sem eventos contendo dados sensíveis** | A decidir |
| Build e publicação | EAS Build e EAS Submit | Proposta |
| Testes | Jest + React Native Testing Library (unitários e componentes); Maestro (fluxos ponta a ponta) | Proposta |
| Repositório | GitHub (privado) | Proposta |

**Justificativa do framework:** TypeScript é uma linguagem em que o Claude Code é particularmente produtivo, aproveita a experiência prévia em frontend web e o Expo facilita builds na nuvem a partir do Windows. O monitoramento exigirá código nativo com qualquer framework multiplataforma.

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
│  ├── iOS: Family Controls · Device Activity · Managed Settings + extensões      │
│  └── Android: Usage Stats · serviço em primeiro plano · sobreposição · VPN local│
│                                                                                │
└──────────────┬──────────────────────────────┬──────────────────────────────────┘
               │ somente leitura               │ status da assinatura
               ▼                               ▼
     Supabase (conteúdo)               RevenueCat ⇄ App Store / Google Play
     Streaming de vídeo
```

### 3.2 Regras de arquitetura
- **Dados pessoais nunca saem do aparelho no MVP**: compulsões escolhidas, gatilhos, motivação, check-ins, recaídas, uso de apps e estatísticas.
- O servidor fornece apenas **conteúdo público** (calendários, marcos, vídeos) e não recebe identificação do usuário.
- **Sem login no MVP.** Assinatura vinculada à conta da loja via RevenueCat (identificador anônimo).
- Troca de aparelho perde o histórico no MVP; backup opcional fica para fase futura.
- **Compulsão como entidade genérica** (ver doc 01, seção 3): novas compulsões entram como configuração e conteúdo, não como reescrita.
- **Nenhum texto fixo no código**: tudo em arquivos de tradução ou conteúdo remoto.
- Módulos nativos expõem uma **interface comum** em TypeScript; diferenças entre plataformas ficam isoladas atrás dela.

### 3.3 Organização do código (proposta)

```
app/                    # rotas e telas (Expo Router)
src/
  domain/               # regras de negócio puras (streak, alertas, gatilhos) — sem dependência de UI
  data/                 # banco local, repositórios, sincronização de conteúdo
  features/             # módulos por funcionalidade (onboarding, emergencia, progresso...)
  monitoring/           # interface comum de monitoramento em TypeScript
  subscription/         # integração RevenueCat e regras de acesso premium
  i18n/                 # configuração e arquivos de tradução (pt-BR)
  ui/                   # design system e componentes compartilhados
modules/
  monitoring-ios/       # Swift + extensões do Screen Time
  monitoring-android/   # Kotlin
docs/
  01-visao-e-escopo-mvp.md
  02-plano-tecnico.md
  specs/                # uma spec por funcionalidade
CLAUDE.md
```

---

## 4. Monitoramento por plataforma

| Capacidade | iOS | Android |
|---|---|---|
| Seleção dos apps monitorados | Usuário escolhe no seletor da Apple (`FamilyActivityPicker`); o app recebe identificadores opacos | App lista os apps instalados e o usuário escolhe |
| Tempo de uso por app | Eventos ao atingir limites definidos (`DeviceActivityMonitor`) | `UsageStatsManager` |
| Detecção de conteúdo adulto | Filtro nativo de conteúdo adulto **bloqueia**; alertar sem bloquear é incerto | VPN local com lista de domínios adultos (detecta e alerta) |
| Tela de interrupção | Tela de proteção personalizada (`ManagedSettings` + extensões de configuração e ação) | Sobreposição ou tela própria acionada ao detectar o app em primeiro plano |
| Exibir minutos de uso no app | Restrito: dados de uso só podem ser exibidos por extensão de relatório isolada | Livre |
| Autorização especial | **Entitlement Family Controls** para distribuição, solicitado à Apple | Permissões de uso, sobreposição e VPN; **declarações no Google Play** |
| Funciona em simulador/emulador | Não | Parcialmente |

### Implicações para o produto (a confirmar na Fase 1)
- No iOS, o onboarding deve usar o seletor da Apple para escolher apps; o app não consegue pré-selecionar "Instagram" sozinho.
- No iOS, os cards e estatísticas de tempo de uso podem precisar ser renderizados via extensão de relatório, com limitações de design e sem uso desses dados em outras partes do app.
- Pornografia no iOS pode exigir uma abordagem diferente de "alerta sem bloqueio" (ver R2 no doc 01).
- No Android, restrições de bateria de alguns fabricantes podem interromper o monitoramento em segundo plano.

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
| `CompulsaoUsuario` | Compulsões ativas, data de início, limite diário, apps monitorados |
| `Gatilho` | Tipo (horário, dia, emoção), valor, compulsão relacionada |
| `Motivacao` | Texto pessoal do usuário |
| `EventoUso` | Registros de uso/limite atingido vindos do monitoramento |
| `Alerta` | Nível (notificação/interrupção), resposta do usuário, horário |
| `CheckIn` | Data, resposta, origem (notificação, app, pós-alerta) |
| `Recaida` | Data, compulsão |
| `SessaoEmergencia` | Início, fim, "a vontade passou?" |
| `MarcoDesbloqueado` | Marco, data (nunca apagado em recaída) |
| `Configuracoes` | Notificações, limite global de alertas, preferências |

> A **streak** é calculada a partir de check-ins, recaídas e eventos de uso, e não armazenada como número fixo.

---

## 6. Privacidade, segurança e conformidade

- Dados sensíveis somente no aparelho; banco local protegido pelos mecanismos de armazenamento seguro do sistema.
- Analytics e Sentry **não podem** registrar compulsões escolhidas, gatilhos, motivação, nomes de apps monitorados ou domínios acessados. Revisão obrigatória de cada evento.
- Lista de domínios adultos (Android) processada localmente; nenhum domínio acessado é enviado ao servidor.
- Notificações com textos neutros na tela bloqueada.
- Nome do app, ícone, nome do desenvolvedor e descrição de cobrança neutros.
- Política de privacidade e termos de uso antes do beta.
- Preenchimento correto dos rótulos de privacidade da App Store e da seção de segurança de dados do Google Play.
- Função "apagar todos os meus dados" no Perfil.

---

## 7. Forma de trabalho com Claude Code

1. **Este chat** gera documentos de visão, plano e specs por funcionalidade.
2. Documentos vivem em `docs/` no repositório e são versionados.
3. O **`CLAUDE.md`** reúne regras permanentes: stack, organização de pastas, padrões de código, i18n obrigatório, regras de privacidade, comandos de build e teste.
4. Cada funcionalidade tem uma spec em `docs/specs/` com: objetivo, telas, fluxos, regras de negócio, estados de erro, critérios de aceite e itens fora do escopo.
5. Uma **branch por funcionalidade**; o Claude Code implementa com testes; revisão manual no aparelho antes de integrar.
6. Mudanças de decisão voltam para os documentos antes (ou junto) do código.

---

## 8. Plano de ação

O plano é organizado por **fases com critérios de saída**, não por datas fixas. A Fase 0 corre em paralelo às Fases 1 e 2.

### Fase 0 — Fundamentos (paralela)
**Objetivo:** remover bloqueios burocráticos que levam semanas.

**Estratégia de contas Apple (decidida):**
- **Conta pessoal** (Apple Developer Program, pessoa física): usada **somente para builds de desenvolvimento** instalados no iPhone do desenvolvedor, com o entitlement Family Controls (Development), que não exige aprovação. Usar bundle ID provisório (ex.: sufixo `.dev`). **Não** usar TestFlight nem solicitar entitlement de distribuição nessa conta.
- **Conta da empresa:** criar o bundle ID definitivo do app e de cada extensão do Screen Time, solicitar o **Family Controls (Distribution) para cada um** assim que a conta existir, e fazer TestFlight e publicação por ela.
- Alternativa a avaliar com o suporte da Apple: converter a conta pessoal em conta de organização.

- [ ] Conversar com contador: CNAE, regime, receita das lojas vinda do exterior, Fator R
- [ ] Abrir a Microempresa (ex.: SLU) com nome neutro
- [ ] Solicitar número D-U-N-S
- [ ] Criar conta Apple Developer Program pessoal (desenvolvimento)
- [ ] Criar conta Apple Developer Program da empresa (publicação)
- [ ] Criar conta Google Play Console (organização)
- [ ] Solicitar à Apple o entitlement **Family Controls (Distribution)** para o app **e para cada extensão** (pedidos separados por bundle ID; aprovação pode levar semanas)
- [ ] Aderir aos programas de comissão reduzida das lojas
- [ ] Criar repositório no GitHub e contas: Expo, Supabase, RevenueCat, Sentry

**Critério de saída:** empresa aberta, contas de desenvolvedor da empresa ativas, pedidos de entitlement enviados. (A conta pessoal deve ser criada no início, para liberar a Fase 1 no iOS.)

### Fase 1 — Protótipo técnico de monitoramento
**Objetivo:** validar os riscos R1 a R5 antes de construir o app. Código descartável permitido.
- [ ] Projeto Expo mínimo com development build rodando no iPhone (via EAS, conta pessoal) e no Android antigo/emulador
- [ ] **Android:** ler tempo de uso por app; disparar notificação ao atingir limite; exibir tela de interrupção; VPN local detectando domínio adulto de teste
- [ ] **iOS:** autorização Family Controls; seletor de apps; evento ao atingir limite; tela de proteção personalizada com "continuar mesmo assim"; testar filtro de conteúdo adulto e possibilidades de alerta
- [ ] Testar exibição de minutos de uso no iOS (extensão de relatório)
- [ ] Documentar consumo de bateria e comportamento em segundo plano
- [ ] Verificar se eventos do Device Activity disparam corretamente em build de desenvolvimento com o iPhone desconectado do computador (há relatos de limitações sem o entitlement de distribuição)
- [ ] **Relatório de viabilidade** com o que funciona, o que não funciona e alternativas

**Critério de saída:** relatório concluído e docs 01 e 02 atualizados com as decisões.

### Fase 2 — Fundação do app
- [ ] Projeto definitivo, estrutura de pastas e `CLAUDE.md`
- [ ] Navegação com 4 abas e fluxo de onboarding vazio
- [ ] i18n configurado (pt-BR), sem textos fixos
- [ ] Banco local com migrações e repositórios
- [ ] Design system básico (cores, tipografia, componentes)
- [ ] Sentry, testes automatizados e builds EAS configurados

**Critério de saída:** app navegável instalado no iPhone e no emulador, com testes rodando.

### Fase 3 — Onboarding e núcleo
- [ ] Onboarding completo (compulsões, configuração, gatilhos, motivação, permissões, resumo)
- [ ] Modelo genérico de compulsão com pornografia e vídeos curtos
- [ ] Streak por mecânica, check-in e registro de recaída
- [ ] Tela Início com cards por compulsão
- [ ] Perfil: editar compulsões, gatilhos e motivação; apagar dados

**Critério de saída:** usuário configura o app e acompanha streaks com check-in manual.

### Fase 4 — Monitoramento, alertas e emergência
- [ ] Módulos nativos definitivos (a partir do protótipo) atrás da interface comum
- [ ] Alertas em dois níveis e regras de janela de gatilho
- [ ] Notificações preventivas por gatilho e coordenação/limite global
- [ ] Apps de risco da pornografia (alerta preventivo)
- [ ] Botão de emergência completo
- [ ] Funcionamento degradado sem permissões

**Critério de saída:** fluxo proativo completo funcionando no iPhone e no emulador.

### Fase 5 — Progresso, estatísticas e conteúdo remoto
- [ ] Supabase com esquema de conteúdo e cache offline
- [ ] Aba Progresso: calendário, marcos e desbloqueios
- [ ] Player de vídeo com streaming
- [ ] Aba Estatísticas (respeitando limites do iOS)

**Critério de saída:** jornada completa com conteúdo de teste.

### Fase 6 — Monetização
- [ ] Produtos e preços configurados nas lojas e no RevenueCat
- [ ] Tela de assinatura (anual em destaque, informações de cobrança claras)
- [ ] Teste invertido de 7 dias sem cartão
- [ ] Regras de acesso gratuito vs. premium e transição ao fim do teste
- [ ] Restaurar compras

**Critério de saída:** compras funcionando em ambiente de testes (sandbox) nas duas lojas.

### Fase 7 — Conteúdo e conformidade
- [ ] Calendários com marcos e referências científicas (pesquisa do responsável do produto)
- [ ] Roteiros e produção dos vídeos com IA, com registro de origem
- [ ] Revisão de todos os textos em português
- [ ] Política de privacidade, termos de uso e avisos de saúde
- [ ] Nome, ícone, capturas de tela e descrições para as lojas
- [ ] Rótulos de privacidade e declarações de permissões nas lojas

**Critério de saída:** conteúdo final carregado e materiais das lojas prontos.

### Fase 8 — Beta
- [ ] Avaliar necessidade de um Android mais recente para testes
- [ ] Beta iOS via TestFlight
- [ ] Teste fechado no Google Play
- [ ] Recrutar testadores do público-alvo, com canal de feedback
- [ ] Corrigir problemas de estabilidade, bateria e experiência

**Critério de saída:** sem falhas críticas, feedback positivo sobre o fluxo principal, métricas de retenção da primeira semana coletadas.

### Fase 9 — Publicação
- [ ] Submissão à App Store e ao Google Play
- [ ] Responder a eventuais rejeições
- [ ] Monitorar erros, avaliações e conversão nas primeiras semanas
- [ ] Planejar ajustes de preço e oferta

---

## 9. Custos previstos

| Item | Custo | Recorrência |
|---|---|---|
| Apple Developer Program | US$ 99 por conta (pessoal + empresa enquanto coexistirem) | Anual |
| Google Play Console | US$ 25 | Único |
| Contador e custos da empresa | A orçar | Mensal |
| Supabase | Plano gratuito inicialmente | Mensal conforme uso |
| Streaming de vídeo | A orçar | Mensal conforme uso |
| RevenueCat | Gratuito até certo faturamento, depois percentual | Conforme receita |
| Sentry / analytics | Planos gratuitos inicialmente | Mensal conforme uso |
| Ferramenta de IA para vídeos (plano comercial) | A orçar | Mensal durante produção |
| Domínio e página do app (política de privacidade) | A orçar | Anual |
| Celular Android mais recente (opcional) | A orçar | Único, se necessário |
| Mac na nuvem ou Mac mini usado (contingência) | A orçar | Se necessário |
| EAS Build | Plano gratuito pode bastar no início; plano pago se a fila de builds atrasar | Mensal se necessário |

---

## 10. Riscos técnicos adicionais

Complementam os riscos R1–R9 do doc 01.

| # | Risco | Mitigação |
|---|---|---|
| T1 | Depuração nativa de iOS lenta sem Mac | EAS Build; contingência de Mac na nuvem |
| T2 | Demora ou recusa do entitlement Family Controls (Distribution), que é exigido para TestFlight e App Store, por bundle ID e por extensão | Solicitar assim que a conta da empresa existir; desenvolver com entitlement de desenvolvimento enquanto isso |
| T7 | Eventos do Screen Time limitados em builds de desenvolvimento fora do Xcode | Validar na Fase 1; se confirmado, antecipar pedido de distribuição ou usar Mac na nuvem para depuração |
| T3 | Limitações do iOS para exibir tempo de uso fora da extensão de relatório | Validar na Fase 1; adaptar design de cards e estatísticas |
| T4 | Monitoramento interrompido por economia de bateria no Android | Orientar usuário na configuração; testar em aparelho real |
| T5 | Bibliotecas de terceiros para Screen Time com manutenção incerta | Avaliar na Fase 1; manter módulo próprio se necessário |
| T6 | Vazamento acidental de dados sensíveis em logs ou analytics | Regra no `CLAUDE.md` e revisão de eventos |

---

## 11. Decisões em aberto

- [ ] Biblioteca de estado da interface
- [ ] Serviço de streaming de vídeo
- [ ] Ferramenta de analytics
- [ ] Uso de biblioteca pronta ou módulo próprio para Screen Time
- [ ] Solução de pornografia no iOS (após Fase 1)

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 15/09/2026 | Primeira versão |
| 0.2 | 15/09/2026 | Android antigo disponível para testes; estratégia de contas Apple (pessoal para desenvolvimento, empresa para distribuição); riscos T2 e T7 |
