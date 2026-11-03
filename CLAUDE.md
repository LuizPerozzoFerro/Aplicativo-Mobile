# CLAUDE.md

Instruções permanentes para o Claude Code neste repositório. Leia este arquivo inteiro no início de cada sessão.

---

## 1. Projeto

**Quedo** é um app mobile por assinatura que ajuda pessoas a se livrarem de compulsões digitais. No MVP: **pornografia** (abstinência) e **vídeos curtos/redes sociais** (moderação). O diferencial é ser **proativo**: monitorar o uso do aparelho e **alertar** o usuário no momento de risco, sem bloquear.

- **Android primeiro.** O iOS vem depois da primeira versão Android publicada (Fase 10). Não teste nem configure iOS agora, mas não faça nada que impeça o iOS depois.
- **Primeira versão sem VPN** (decisão D6, doc 01 seção 3.2). Não implementar nada da VPN nem declarar suas permissões.
- Público adulto (18+), Brasil, 100% em português no lançamento.

## 2. Fase atual

**Fase 3 — Onboarding e núcleo.** Spec: `docs/specs/spec-02-onboarding-e-nucleo.md`.

A Fase 2 (fundação do app, spec 01) terminou em 02/11/2026. **O código é definitivo**: qualidade, testes e i18n são obrigatórios. O protótipo em `prototype/` é **só referência**: não altere e não importe código dele sem a spec pedir (o módulo Kotlin entra na Fase 4).

## 3. Documentos (leia antes de trabalhar)

| Documento | Quando ler |
|---|---|
| Spec da fase atual em `docs/specs/` | **Sempre.** Define escopo, ordem, critérios de aceite |
| `docs/01-visao-e-escopo-mvp.md` | Produto e regras de negócio |
| `docs/02-plano-tecnico.md` | Stack, arquitetura, modelo de dados, riscos e fases |
| `docs/relatorios/01-viabilidade-monitoramento.md` | Antes de mexer em monitoramento: o que foi medido e as correções obrigatórias |
| `NOTAS-APP.md` | Início de cada sessão: decisões, problemas e comandos já descobertos |
| `prototype/NOTAS.md` | Quando precisar de detalhes do protótipo |

Os documentos em `docs/` são a fonte da verdade. **Não altere `docs/01`, `docs/02` nem as specs**: se algo estiver errado, inviável ou ambíguo, registre em `NOTAS-APP.md` e avise o responsável. Mudanças nesses documentos são decididas no chat de planejamento.

## 4. Sobre o responsável e a comunicação

- Comunique-se **sempre em português do Brasil**, de forma clara e direta.
- O responsável tem base em programação e frontend web, mas **não é especialista em desenvolvimento mobile nativo**. Explique conceitos de Android quando forem relevantes para uma decisão.
- Quando algo depender de ação no aparelho, dê **instruções passo a passo** (onde tocar, que permissão conceder, o que observar).
- Antes de decisões com impacto relevante (instalar biblioteca com código nativo, criar conta ou gastar com serviço, mudar algo previsto na spec), **explique as opções e peça confirmação**.
- Nunca afirme que algo funciona **sem evidência**: saída de teste, de build, log do app ou confirmação do responsável no aparelho.

## 5. Ambiente

| Item | Detalhe |
|---|---|
| Sistema | **Windows** (sem Mac, sem Xcode) |
| Android | Samsung Galaxy S22, Android 16 / One UI 8. Emulador disponível (virtualização ligada) |
| Builds | **Build local** do Android para desenvolvimento (development build, **nunca Expo Go**). EAS para builds de loja |
| Identificadores | `br.com.quedo.app` (produção), `.dev` (desenvolvimento), `.preview` (preview). **O de produção não pode mudar depois do primeiro envio ao Google Play** |
| Conta Google Play | Pessoa física, ativa. Não enviar nada à loja sem pedido do responsável |

## 6. Stack

- TypeScript (modo estrito) · React Native · Expo (development builds) · Expo Router
- i18next + react-i18next + expo-localization
- expo-sqlite com camada tipada e migrações
- Módulos nativos: Kotlin (Android) via Expo Modules; Swift (iOS) na Fase 10
- Jest + React Native Testing Library; Maestro para fluxos ponta a ponta
- Sentry (com filtro de privacidade) antes do teste fechado (Fase 8). Não instalar antes
- Supabase (Fase 5) e RevenueCat sobre o Google Play Billing (Fase 6). **Não adicionar antes da fase correspondente**
- Proibido: analytics, qualquer SDK que envie dados do usuário, e bibliotecas não justificadas

## 7. Estrutura

```
app/                    # rotas (Expo Router)
src/
  domain/               # regras puras, sem React nem banco
  data/                 # banco, migrações, repositórios
  features/             # por funcionalidade
  monitoring/           # interface comum (+ implementação falsa)
  subscription/         # regras de plano (Fase 6)
  i18n/                 # configuração e pt-BR
  ui/                   # tokens e componentes
  config/               # variante de build
modules/
  monitoring-android/   # Kotlin (Fase 4)
prototype/              # protótipo da Fase 1 — só referência
docs/
  01-visao-e-escopo-mvp.md
  02-plano-tecnico.md
  relatorios/
  specs/
NOTAS-APP.md            # diário técnico do app
CLAUDE.md
```

## 8. Regras de trabalho

### 8.1 Método
- Siga a **ordem de execução** da spec. Um passo por vez, com o critério de aceite verificado antes de seguir.
- Registre em `NOTAS-APP.md`: decisões, bibliotecas e por quê, problemas, tentativas malsucedidas e comandos úteis.
- **Consulte a documentação oficial atual** (Expo, Android Developers, políticas do Google Play) antes de configurar bibliotecas e APIs do sistema. Não confie só em conhecimento prévio.
- Se algo travar por mais de 2 sessões sem progresso, registre o bloqueio e traga opções ao responsável.

### 8.2 Dependências
- Antes de adicionar qualquer biblioteca: manutenção recente, compatibilidade com a versão do Expo, necessidade real. Justifique em `NOTAS-APP.md`.
- Bibliotecas com código nativo exigem confirmação do responsável.

### 8.3 Código
- Código, nomes de variáveis, funções, arquivos, tabelas e colunas **em inglês**.
- Comentários, documentação, notas e mensagens de commit **em português**.
- **i18n obrigatório:** nenhum texto visível fixo no código. Tudo em `src/i18n/pt-BR/`. O lint bloqueia texto bruto em JSX.
- Regras de negócio ficam em `src/domain/`, puras e testadas. A UI nunca escreve SQL.
- Diferenças entre plataformas ficam nos módulos nativos, atrás da interface comum em `src/monitoring/`. Funções sem suporte retornam `'unsupported'` ou erro explícito, nunca falham em silêncio.
- Toda funcionalidade nova vem com testes. `lint`, `typecheck` e `test` precisam passar antes de cada commit integrado.

### 8.4 Git
- Branch por grupo de trabalho (ex.: `fase2/i18n`), integrada na `main` por pull request depois da revisão do responsável.
- Commits pequenos e descritivos em português.
- Nunca commitar credenciais, keystores, certificados, DSNs ou arquivos `.env`.

## 9. Privacidade e discrição (regras inegociáveis)

- **Dados pessoais nunca saem do aparelho**: compulsões, gatilhos, motivação, check-ins, recaídas, uso de apps, domínios e estatísticas.
- O servidor (quando existir) só fornece conteúdo público e não recebe identificação do usuário.
- Logs e relatórios de erro **nunca** contêm compulsões, gatilhos, motivação, nomes de apps monitorados, domínios ou URLs. Todo evento do Sentry passa pelo filtro de privacidade.
- Banco local fora do backup automático do sistema.
- Textos de notificação neutros: nada que exponha o tema na tela bloqueada.
- Nenhum termo explícito em textos, placeholders, nomes de arquivos, commits ou dados de teste. Use domínios de teste inofensivos.

## 10. Comandos úteis

Preencher e manter atualizado na Fase 2.

| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` (novas bibliotecas: `npx expo install <pacote>`) |
| Gerar o projeto Android (`android/`) | `npm run android:prebuild` (com `APP_ENV=preview` ou `production` para as outras variantes) |
| Build local de desenvolvimento (Android) | `npm run android:install` (exige caminhos longos ligados e CMake 3.31.6 no SDK: `NOTAS-APP.md`, AP1) |
| Iniciar servidor de desenvolvimento | `npx expo start --dev-client --port 8081`, desacoplado, e depois `adb reverse tcp:8081 tcp:8081` (refazer após reinstalar ou reiniciar) |
| Abrir o app no Metro pelo cabo | `adb shell am start -a android.intent.action.VIEW -d "quedo-dev://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" br.com.quedo.app.dev` |
| Verificar tipos | `npm run typecheck` |
| Lint | `npm run lint` (inclui a formatação do Prettier) |
| Formatação | `npm run format` (aplica) · `npm run format:check` (só confere, como no CI) |
| Testes | `npm test` |
| Gerar migração do banco (depois de mudar `src/data/schema/`) | `npm run db:generate` |
| Ler o banco do app de desenvolvimento no aparelho | `adb exec-out run-as br.com.quedo.app.dev cat files/SQLite/app.db > app.db` |
| Fluxo Maestro (ponta a ponta no S22) | `npm run e2e`, com o Metro ligado e o `adb reverse` feito. Apaga os dados do app de desenvolvimento. Maestro em `C:\Users\User\tools\maestro` (`NOTAS-APP.md`, passo 10) |
| Verificar permissões proibidas no manifesto | `npm run check:manifest` (depois de um build) |

## 11. Ao final de cada fase

1. Conferir todos os critérios de aceite da spec, com evidência.
2. Executar o roteiro manual da spec com o responsável.
3. Atualizar `NOTAS-APP.md` e a tabela de comandos acima.
4. Avisar o responsável que a fase está pronta para revisão no chat de planejamento.
