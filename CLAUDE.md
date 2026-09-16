# CLAUDE.md

Instruções permanentes para o Claude Code neste repositório. Leia este arquivo inteiro no início de cada sessão.

---

## 1. Projeto

App mobile (iOS e Android) por assinatura que ajuda pessoas a se livrarem de compulsões digitais. No MVP: **pornografia** (abstinência) e **vídeos curtos/redes sociais** (moderação). O diferencial é ser **proativo**: monitorar o uso do aparelho e **alertar** o usuário no momento de risco, sem bloquear.

Nome do app: **a definir** (usar nomes provisórios neutros, nunca referências ao tema).

## 2. Fase atual

**Fase 1 — Protótipo técnico de monitoramento.**
Código descartável é permitido. O objetivo é validar o que é possível em iOS e Android e produzir um relatório de viabilidade. **Não construir funcionalidades do app definitivo nesta fase.**

## 3. Documentos (leia antes de trabalhar)

| Documento | Quando ler |
|---|---|
| `docs/specs/spec-00-prototipo-monitoramento.md` | **Sempre, nesta fase.** Define experimentos, ordem, critérios e relatório |
| `docs/01-visao-e-escopo-mvp.md` | Para entender o produto e as regras de negócio |
| `docs/02-plano-tecnico.md` | Para stack, arquitetura, riscos e fases |
| `prototype/NOTAS.md` | Início de cada sessão: decisões, problemas e comandos já descobertos |

Os documentos em `docs/` são a fonte da verdade. **Não altere `docs/01` e `docs/02`**: se algo neles estiver errado ou inviável, registre em `prototype/NOTAS.md` e no relatório. Mudanças nesses documentos são decididas fora do Claude Code.

## 4. Sobre o responsável e a comunicação

- Comunique-se **sempre em português do Brasil**, de forma clara e direta.
- O responsável tem base em programação e frontend web, mas **não é especialista em desenvolvimento mobile nativo**. Explique conceitos de iOS/Android quando forem relevantes para uma decisão.
- Quando um teste depender de ação no aparelho, dê **instruções passo a passo** (onde tocar, que permissão conceder, o que observar).
- Antes de decisões com impacto relevante (instalar biblioteca nativa, mudar abordagem de um experimento, gastar com serviço pago), **explique as opções e peça confirmação**.
- Nunca afirme que algo funciona **sem evidência**: log do app, saída de build ou confirmação do responsável no aparelho.

## 5. Ambiente

| Item | Detalhe |
|---|---|
| Sistema | **Windows** (sem Mac, sem Xcode) |
| iOS | iPhone físico; conta Apple Developer **pessoal**; entitlement **Family Controls (Development)** apenas |
| Android | Samsung Galaxy S22 + emulador Android recente |
| Builds | **EAS Build** na nuvem, perfil de development build. **Não usar Expo Go** (não suporta módulos nativos) |
| Identificadores | Provisórios, ex.: `com.<provisorio>.lab.dev`. Nunca usar o identificador definitivo do app |

Consequências de não ter Mac:
- Não é possível ver logs do sistema iOS nem depurar extensões diretamente.
- **Todo componente nativo (extensões iOS, serviços Android) deve registrar eventos no log compartilhado** exibido na tela de laboratório (spec, seção 5.3).
- Erros de compilação iOS são investigados pelos logs do EAS Build.

## 6. Stack

- TypeScript (modo estrito) · React Native · Expo (development builds) · Expo Router
- Módulos nativos: Swift (iOS) e Kotlin (Android) via Expo Modules
- Extensões iOS do Screen Time compiladas via config plugin compatível com EAS
- Proibido nesta fase: backend, Supabase, RevenueCat, analytics, Sentry ou qualquer serviço externo

## 7. Estrutura

```
docs/
  01-visao-e-escopo-mvp.md
  02-plano-tecnico.md
  specs/
    spec-00-prototipo-monitoramento.md
  relatorios/
    01-viabilidade-monitoramento.md   # entregável da Fase 1
prototype/
  NOTAS.md                            # diário técnico do protótipo
  ...                                 # projeto Expo do protótipo
CLAUDE.md
```

## 8. Regras de trabalho

### 8.1 Método
- Siga a **ordem de execução** da spec (seção 8). Trabalhe **um experimento por vez**.
- Ao concluir cada experimento, registre em `prototype/NOTAS.md`: ID, resultado (✅/⚠️/❌), evidência, limitações e tentativas malsucedidas.
- Respeite o **timebox**: se um experimento travar por mais de 2 sessões sem progresso, registre o bloqueio e siga para o próximo.
- **Consulte a documentação oficial atual** (Apple Developer, Android Developers, Expo, políticas do Google Play e da App Store) antes de implementar APIs de Screen Time, uso de apps, VPN, sobreposição e notificações. Não confie apenas em conhecimento prévio: essas APIs e políticas mudam com frequência.
- Prefira a solução mais simples que responda à pergunta do experimento.

### 8.2 Dependências
- Antes de adicionar qualquer biblioteca, verifique: manutenção recente, compatibilidade com a versão do Expo em uso e necessidade real.
- Justifique cada biblioteca nativa em `prototype/NOTAS.md`.

### 8.3 Código
- Código, nomes de variáveis, funções e arquivos **em inglês**.
- Comentários, documentação, notas e mensagens de commit **em português**.
- Textos de interface podem ser fixos **apenas no protótipo** (no app definitivo, i18n será obrigatório).
- Diferenças entre plataformas ficam isoladas nos módulos nativos, atrás da interface comum da spec (seção 5.2). Funções impossíveis em uma plataforma retornam `'unsupported'` ou erro explícito, nunca falham silenciosamente.

### 8.4 Git
- Branch por grupo de experimentos, ex.: `prototype/android-usage`, `prototype/ios-shield`.
- Commits pequenos e descritivos em português, ex.: `A2: detecção de limite com serviço em primeiro plano`.
- Nunca commitar credenciais, certificados, chaves ou arquivos `.env`.

## 9. Privacidade (regras inegociáveis)

Mesmo no protótipo:
- **Nenhum dado sai do aparelho.** Nada de chamadas de rede para servidores próprios ou de terceiros, exceto o necessário para builds e para a própria VPN local funcionar.
- O log registra **apenas domínios**, nunca URLs completas, e nunca conteúdo de telas.
- Nos testes de conteúdo adulto, use a **lista configurável de domínios de teste inofensivos**, salvo instrução contrária do responsável.
- Textos de notificação devem ser **neutros**: nada que exponha o tema na tela bloqueada.

## 10. Comandos úteis

Preencher e manter atualizado conforme o projeto for configurado.

| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` (dentro de `prototype/`) |
| Registrar iPhone para builds internos | `eas device:create` |
| Build de desenvolvimento Android | `eas build --profile development --platform android` |
| Build de desenvolvimento iOS | `eas build --profile development --platform ios` |
| Iniciar servidor de desenvolvimento | `npx expo start --dev-client` |
| Verificar tipos | *a definir* |
| Lint | *a definir* |

## 11. Ao final da Fase 1

1. Executar os roteiros de teste T1–T10 com o responsável.
2. Escrever `docs/relatorios/01-viabilidade-monitoramento.md` seguindo **exatamente** a estrutura da spec (seção 9).
3. Avisar o responsável que o relatório está pronto para revisão no chat de planejamento.

---

*Este arquivo será reescrito no início da Fase 2 com as regras do app definitivo (arquitetura, i18n obrigatório, testes, design system).*
