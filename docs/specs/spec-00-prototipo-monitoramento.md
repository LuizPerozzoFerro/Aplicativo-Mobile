# Spec 00 — Protótipo Técnico de Monitoramento (Fase 1)

> **Status:** rascunho v0.1 · **Última atualização:** 16/09/2026
> **Documentos base:** `docs/01-visao-e-escopo-mvp.md` (v0.2) · `docs/02-plano-tecnico.md` (v0.2)
> **Tipo:** protótipo de validação. **Código descartável é permitido.** O objetivo é gerar conhecimento, não produto.

---

## 1. Objetivo

Descobrir, em aparelhos reais, **o que é tecnicamente possível** fazer em iOS e Android para cumprir a proposta do app: monitorar uso, detectar acesso a conteúdo adulto e interromper o usuário com alertas, **sem bloquear definitivamente**.

O resultado principal é um **relatório de viabilidade** (seção 9) que permitirá atualizar os documentos 01 e 02 antes de construir o app definitivo.

---

## 2. Perguntas que o protótipo precisa responder

| ID | Pergunta | Riscos relacionados |
|---|---|---|
| Q1 | Conseguimos detectar tempo de uso de apps escolhidos e agir ao atingir um limite, com o app fechado? | R1 |
| Q2 | Conseguimos detectar acesso a conteúdo adulto e **alertar sem bloquear**? | R2, R3 |
| Q3 | Conseguimos exibir uma tela de interrupção com a motivação do usuário e a opção "continuar mesmo assim"? | R4 |
| Q4 | Conseguimos monitorar o uso das mesmas redes pelo **navegador** (ex.: instagram.com)? | R5 |
| Q5 | Conseguimos **mostrar minutos de uso** por app dentro da nossa interface? | T3 |
| Q6 | O monitoramento sobrevive em segundo plano, após reiniciar o aparelho e com economia de bateria? | T4 |
| Q7 | Build de desenvolvimento no iPhone, sem Mac e desconectado do computador, dispara os eventos do Screen Time? | T7 |
| Q8 | Vale usar biblioteca pronta ou construir módulo nativo próprio? | T5 |
| Q9 | Quais permissões e declarações cada abordagem exige nas lojas, e qual o risco de rejeição? | R3, R6 |

---

## 3. Escopo

### 3.1 Dentro do escopo
- App Expo mínimo com development build em iOS e Android.
- Módulos nativos experimentais (Swift e Kotlin).
- Uma **tela de laboratório** para executar e observar cada experimento.
- **Log de eventos local** visível no app.
- Relatório de viabilidade.

### 3.2 Fora do escopo
- Design, identidade visual e textos finais.
- Onboarding, streak, calendário, vídeos, estatísticas, assinatura.
- Backend, Supabase, RevenueCat, analytics.
- i18n (textos do laboratório podem ser fixos **apenas neste protótipo**).
- Testes automatizados (não obrigatórios; testes manuais roteirizados na seção 7).
- Otimização de código e arquitetura definitiva.

---

## 4. Ambiente

| Item | Configuração |
|---|---|
| Computador | Windows, com Claude Code |
| Build | EAS Build (nuvem), **development build** (não Expo Go) |
| iPhone | Registrado no EAS para distribuição interna; conta Apple Developer **pessoal** |
| Android | Samsung Galaxy S22 atualizado + emulador Android com versão recente |
| Bundle ID / package provisório | Ex.: `com.<nomeprovisorio>.lab.dev` (não usar o identificador definitivo do app) |
| Repositório | Pasta `prototype/` no repositório do projeto, ou repositório separado |
| Entitlement iOS | **Family Controls (Development)** apenas |

### 4.1 Restrição importante: sem Mac
Não há Xcode para ver logs do sistema ou depurar extensões. Por isso:
- **Toda extensão iOS e todo serviço Android deve gravar eventos no log compartilhado** (seção 5.3), que o app exibe na tela de laboratório.
- Erros de build nativo serão investigados pelos logs do EAS Build.
- Se a iteração nativa do iOS ficar inviável, registrar no relatório e avaliar Mac na nuvem.

---

## 5. Estrutura do protótipo

### 5.1 Tela de laboratório
Uma única tela (ou poucas) com:
- Seções por plataforma e por experimento (ex.: "A2 — Limite de uso").
- Botões para pedir permissões, configurar e iniciar cada experimento.
- Campo de **motivação de teste** (texto livre) usado nas telas de interrupção.
- Campo de **limite em minutos** (permitir valores baixos, ex.: 1 a 2 minutos, para testar rápido).
- Status das permissões concedidas.
- **Visualizador de log** com botão para limpar e para copiar/exportar o conteúdo.

### 5.2 Interface comum de monitoramento (esboço)
Mesmo sendo protótipo, os módulos nativos devem expor funções equivalentes, para testar se uma interface única é viável:

```ts
interface MonitoringModule {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;

  // Seleção de apps/sites (iOS: seletor da Apple; Android: lista própria)
  selectTargets(): Promise<SelectionSummary>;

  // Limite de uso: ao atingir, disparar alerta nível 1 e depois nível 2
  startUsageLimit(config: { minutes: number; motivation: string }): Promise<void>;
  stopUsageLimit(): Promise<void>;

  // Conteúdo adulto: modo alerta (preferido) ou bloqueio (fallback)
  startAdultContentWatch(config: { mode: 'alert' | 'block' }): Promise<void>;
  stopAdultContentWatch(): Promise<void>;

  // Leitura de uso (pode não ser suportado no iOS)
  getUsageToday(): Promise<UsageEntry[] | 'unsupported'>;

  getLog(): Promise<LogEvent[]>;
  clearLog(): Promise<void>;
}
```

Os tipos podem ser ajustados. Qualquer função impossível em uma plataforma deve retornar erro ou `'unsupported'` explícito, e isso deve constar no relatório.

### 5.3 Log compartilhado
Formato mínimo de cada evento:

```ts
type LogEvent = {
  timestamp: string;      // ISO 8601
  platform: 'ios' | 'android';
  source: string;         // ex.: 'app', 'DeviceActivityMonitor', 'ShieldAction', 'VpnService'
  experiment: string;     // ex.: 'I3', 'A4'
  event: string;          // ex.: 'threshold_reached', 'notification_sent', 'continue_tapped'
  details?: string;
};
```

- iOS: gravar em armazenamento compartilhado entre app e extensões (App Group).
- Android: gravar em armazenamento local acessível pelo app e pelos serviços.

### 5.4 Privacidade, mesmo no protótipo
- Nenhum dado sai do aparelho. Sem backend, analytics ou serviços de erro.
- Nos testes de conteúdo adulto, **preferir domínios de teste inofensivos** configuráveis numa lista (ex.: um domínio neutro qualquer tratado como "adulto" para o teste). Testes com o filtro nativo do iOS podem exigir um site real classificado como adulto; isso fica a critério do responsável.
- O log não deve registrar URLs completas, apenas o domínio.

---

## 6. Experimentos

Cada experimento deve ter seu resultado registrado como **✅ Funciona**, **⚠️ Funciona com limitações** ou **❌ Não funciona**, com evidências do log.

> **Regra de timebox:** se um experimento travar por muito tempo sem progresso (ex.: mais de 2 sessões de trabalho), registrar o bloqueio, as tentativas feitas e seguir para o próximo. O relatório é mais valioso que insistir num único ponto.

### 6.1 Setup comum

| ID | Experimento | Critério de sucesso |
|---|---|---|
| S1 | Projeto Expo com development build instalado no S22 e no emulador | App abre e mostra tela de laboratório |
| S2 | Development build instalado no iPhone via EAS, com conta pessoal | App abre no iPhone |
| S3 | Extensões iOS do Screen Time compiladas via EAS, sem Mac (avaliar config plugin para targets/extensões) | Build conclui e extensões são instaladas junto com o app |
| S4 | Log compartilhado funcionando entre app e componentes nativos | Evento gravado por componente nativo aparece na tela |

### 6.2 Android

| ID | Experimento | Abordagem sugerida | Critério de sucesso |
|---|---|---|---|
| A1 | Permissão e leitura de tempo de uso por app | Permissão de acesso ao uso + `UsageStatsManager` | Lista com minutos de hoje por app escolhido |
| A2 | Detecção de limite com app fechado | Serviço em primeiro plano ou verificação periódica; avaliar precisão e bateria | Ao passar do limite no Instagram, evento `threshold_reached` registrado com o protótipo fechado |
| A3 | Alerta nível 1 | Notificação local com texto neutro e ação "Emergência" | Notificação aparece segundos após o limite |
| A4 | Alerta nível 2: tela de interrupção | Avaliar: (a) sobreposição sobre outros apps; (b) abrir tela própria do protótipo. Registrar prós, contras e permissões | Tela aparece sobre o app monitorado, mostra motivação, "continuar mesmo assim" retorna ao app e registra `continue_tapped` |
| A5 | Pausa após "continuar mesmo assim" | Silenciar alertas por X minutos configuráveis | Sem novo alerta durante a pausa; alerta volta depois |
| A6 | Detecção de domínio adulto em modo alerta | VPN local analisando consultas DNS contra lista local de domínios, **sem bloquear** | Ao abrir domínio da lista no navegador, `adult_domain_detected` + notificação; navegação continua funcionando |
| A7 | Navegador: uso de instagram.com | Mesma VPN local detectando domínio de rede social | Evento registrado ao acessar instagram.com pelo navegador |
| A8 | Impacto da VPN local | Testar navegação geral, apps de banco, outras VPNs e consumo de bateria | Registrar se algo quebra ou conflita |
| A9 | Sobrevivência em segundo plano | Testar: app fechado por horas, reinício do aparelho, economia de bateria da Samsung ativa | Monitoramento continua ou volta sozinho; registrar instruções necessárias ao usuário |
| A10 | Pesquisa de políticas do Google Play | Documental: acesso ao uso, serviço em primeiro plano (tipo adequado), sobreposição, VPN, declarações exigidas | Tabela no relatório com cada permissão, exigência e risco |

### 6.3 iOS

| ID | Experimento | Abordagem sugerida | Critério de sucesso |
|---|---|---|---|
| I1 | Autorização do Screen Time para o próprio usuário | Family Controls, autorização individual | Autorização concedida e status lido pelo app |
| I2 | Seleção de apps e sites | Seletor de atividades da Apple; persistir seleção no armazenamento compartilhado | Seleção salva e reutilizada após fechar e reabrir o app |
| I3 | Limite de uso com app fechado | Agendamento de monitoramento com evento de limite; extensão Device Activity Monitor grava log | `threshold_reached` registrado pela extensão com o protótipo fechado |
| I4 | Alerta nível 1 a partir da extensão | Notificação local disparada pela extensão ao atingir o limite | Notificação aparece no momento do limite |
| I5 | Alerta nível 2: tela de proteção personalizada | Aplicar proteção ao atingir limite; extensões de configuração (visual + motivação) e de ação (botões) | Tela mostra motivação; "continuar mesmo assim" remove a proteção e registra `continue_tapped` |
| I6 | Pausa após "continuar" | Remover proteção e reagendar novo limite/alerta após X minutos | Usuário usa o app normalmente durante a pausa; alerta volta depois |
| I7 | Navegador: instagram.com | Incluir domínio web na seleção e no monitoramento | Evento registrado ao usar instagram.com no Safari |
| I8 | Conteúdo adulto: filtro nativo | Ativar filtro de conteúdo adulto do sistema via Managed Settings | Registrar se bloqueia e **se existe qualquer forma de detectar ou alertar** |
| I9 | Conteúdo adulto: alternativas de alerta | Investigar: proteção personalizada sobre lista de domínios (verificar limites de quantidade), monitoramento de domínios selecionados, outras abordagens | Listar opções viáveis com limitações, ou concluir que no iOS só é possível bloquear |
| I10 | Apps de risco (X, Reddit) | Mesmo mecanismo do I3/I4 com mensagem de alerta preventivo | Alerta preventivo disparado sem registrar recaída |
| I11 | Exibir minutos de uso | Extensão de relatório de atividade embutida na tela | Registrar o que é possível exibir, se o visual é customizável e se algum dado pode ser usado fora da extensão |
| I12 | Build de desenvolvimento desconectado | Repetir I3, I4 e I5 com iPhone desconectado do computador, após horas e após reinício | Registrar se eventos disparam de forma confiável |
| I13 | Biblioteca pronta vs. módulo próprio | Avaliar ao menos uma biblioteca React Native para Screen Time: manutenção, compatibilidade com Expo/EAS, cobertura dos experimentos | Recomendação justificada no relatório |
| I14 | Pesquisa sobre o pedido de distribuição | Documental: requisitos do Family Controls (Distribution), bundle IDs de extensões, casos de rejeição | Checklist para o pedido na conta da empresa |

### 6.4 Comum

| ID | Experimento | Critério de sucesso |
|---|---|---|
| C1 | Viabilidade da interface comum (5.2) | Relatório indica quais funções são equivalentes, parciais ou impossíveis por plataforma |
| C2 | Textos neutros em notificações | Confirmar que nada sensível aparece na tela bloqueada (conteúdo da notificação configurável) |

---

## 7. Roteiros de teste manual

Executar em aparelho real e registrar resultado e evidência (trecho do log ou captura de tela).

| # | Roteiro | Plataformas |
|---|---|---|
| T1 | Configurar limite de 2 min no Instagram → fechar protótipo → usar Instagram por 3 min → verificar notificação e tela de interrupção | iOS, Android |
| T2 | Na tela de interrupção tocar "continuar mesmo assim" → usar por mais 5 min → verificar pausa e retorno do alerta | iOS, Android |
| T3 | Acessar instagram.com no navegador com limite ativo | iOS, Android |
| T4 | Acessar domínio de teste "adulto" com monitoramento em modo alerta | iOS, Android |
| T5 | Configurar monitoramento → reiniciar aparelho → repetir T1 sem abrir o protótipo | iOS, Android |
| T6 | Deixar monitoramento ativo por um dia normal de uso → registrar consumo de bateria e falhas | iOS, Android |
| T7 | Ativar economia de bateria da Samsung → repetir T1 | Android |
| T8 | Ativar outra VPN (se disponível) → verificar conflito com a VPN local | Android |
| T9 | Repetir T1 com iPhone desconectado do computador | iOS |
| T10 | Revogar permissões pelo sistema → verificar se o protótipo detecta e informa | iOS, Android |

---

## 8. Ordem de execução

1. **Setup:** S1, S4 (Android primeiro, por não depender de conta Apple).
2. **Android:** A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9, com A10 em paralelo.
3. **Setup iOS:** S2, S3 (assim que a conta Apple pessoal estiver ativa; pode começar antes do fim do Android).
4. **iOS:** I1 → I2 → I3 → I4 → I5 → I6 → I7 → I10 → I8 → I9 → I11 → I12, com I13 e I14 em paralelo.
5. **Comum:** C1, C2.
6. **Roteiros de teste** T1 a T10.
7. **Relatório de viabilidade.**

---

## 9. Entregável: relatório de viabilidade

Arquivo: `docs/relatorios/01-viabilidade-monitoramento.md`

### Estrutura obrigatória

```markdown
# Relatório de Viabilidade — Monitoramento

## 1. Resumo executivo
(5 a 10 linhas: o que funciona, o que não funciona, principais impactos no produto)

## 2. Respostas às perguntas Q1–Q9
| ID | Resposta iOS | Resposta Android | Impacto no produto |

## 3. Resultados dos experimentos
| ID | Resultado (✅/⚠️/❌) | Evidência | Observações |

## 4. Resultados dos roteiros de teste T1–T10

## 5. Permissões e requisitos das lojas
| Plataforma | Permissão/recurso | Exigência na loja | Risco de rejeição |

## 6. Bateria e confiabilidade

## 7. Recomendação técnica
- Biblioteca pronta ou módulo próprio (por plataforma)
- Abordagem recomendada para: limite de uso, conteúdo adulto, tela de interrupção, navegador, exibição de minutos
- Viabilidade da interface comum

## 8. Impactos nos documentos 01 e 02
(lista objetiva do que precisa mudar em funcionalidades, onboarding, telas, planos gratuito/premium, riscos e fases)

## 9. Pendências e dúvidas
```

---

## 10. Critérios de conclusão da Fase 1

- [ ] Todos os experimentos com resultado registrado (inclusive ❌ e bloqueios por timebox).
- [ ] Roteiros T1 a T10 executados nos aparelhos reais.
- [ ] Q1 a Q9 respondidas para as duas plataformas.
- [ ] Relatório de viabilidade completo.
- [ ] Revisão do relatório neste chat de planejamento e atualização dos documentos 01 e 02.

---

## 11. Instruções para o Claude Code

- Trabalhar **um experimento por vez**, na ordem da seção 8, e registrar o resultado antes de avançar.
- Antes de implementar cada experimento, **consultar a documentação oficial atual** (Apple, Android, Expo) — APIs de Screen Time e políticas das lojas mudam com frequência.
- Explicar ao responsável, em português e de forma simples, **o que precisa ser feito no aparelho** para cada teste (permissões, configurações, passos).
- Nunca afirmar que algo funciona sem evidência no log ou confirmação do responsável no aparelho.
- Registrar limitações e tentativas malsucedidas; elas são resultado válido.
- Não gerar funcionalidades fora do escopo (seção 3.2).
- Manter um arquivo `prototype/NOTAS.md` com decisões, problemas encontrados e comandos úteis de build.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 16/09/2026 | Primeira versão |
