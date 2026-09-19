# NOTAS — Diário técnico do protótipo

> Fase 1. Registro de decisões, problemas e comandos. Uma entrada por experimento,
> com resultado (✅ / ⚠️ / ❌) e evidência.

---

## Estado atual e próximo passo

> Seção de passagem entre sessões. **Ler primeiro.** Atualizada em 18/09/2026, 22:45.

**Branch:** `prototype/android-usage`. Tudo commitado.

**Placar do Android:**

| ID | Resultado |
|---|---|
| S1 · S4 · A1 · A2 · A5 | ✅ |
| A3 · A4 · A9 | ⚠️ com limitações documentadas |
| A6 · A7 · A8 · A10 | não iniciados |
| S2 · S3 · iOS | não iniciados — dependem da conta Apple Developer pessoal |

**Feito na sessão da noite de 18/09/2026:**
- **A4, complemento:** instrumentação corrigida (retorno conferido depois do
  "Continuar", um `interruption_shown` por interrupção, voltar e início na tela
  própria registrados) e botão "Ir para a tela inicial" nas duas abordagens.
  Validado nas rodadas O1–O3 e T1–T5 (ver "Achado A4 → Instrumentação").
- Achado no caminho: a detecção do app em primeiro plano só olhava 5 minutos para
  trás. Corrigido para 24 h; afetaria a escalada do A4 e o retorno do alerta no A5.
- **A5 ✅**, pausa depois do "Continuar", na sobreposição (ver "Achado A5"). Regras
  decididas pelo responsável: só o "Continuar" pausa; a tela inicial e a emergência
  não; no fim da pausa vem a notificação e, se o uso continuar, a tela.

**Próximo passo: A6**, detecção de domínio adulto em modo alerta por VPN local,
sem bloquear (spec §6.2). Antes de implementar: consultar a documentação oficial
atual de `VpnService` e a política do Google Play para VPN (`CLAUDE.md` §8.1),
explicar as opções ao responsável (é o primeiro serviço novo no manifesto desde o
A2) e usar a lista configurável de domínios de teste inofensivos (§9).

**Para testar a interrupção de novo:** o limite no aparelho está em **600 min**
(ver o estado abaixo). Baixar para 2 min na seção A2 e tocar em "Iniciar limite":
o Instagram já passa de 20 min em 18/09, então o limite estoura no ciclo seguinte.
Desde o A5, **cada** abertura do Instagram acima do limite e fora da pausa
interrompe de novo. Ao terminar, subir o limite outra vez, para não atrapalhar o
uso normal do aparelho.

**Estado do aparelho em 18/09/2026, 22:40:** serviço em primeiro plano ativo
(religado pelo `MY_PACKAGE_REPLACED` na reinstalação das 22:34), **limite de 600
min** no Instagram (acima do uso diário: o serviço segue rodando sem interromper),
modo **sobreposição**, pausa de 2 min. Todas as permissões concedidas (acesso a
dados de uso, notificação, sobreposição). Rotação automática ligada. Metro
desligado. O relógio do PC estava ~2 s adiantado em relação ao do aparelho.

**Atenção ao abrir o laboratório:** o serviço mantém o processo vivo, e com ele o
JavaScript antigo na memória. Subir o Metro não basta (P6): com o laboratório na
frente, `adb shell input keyevent 46 46` recarrega.

**Recomendação de trabalho:** abrir uma sessão nova do Claude Code a partir
daqui, em vez de continuar a anterior — este arquivo é a passagem.

**Pendências que dependem de tempo, e podem correr em paralelo:**
- A9: "Apps em suspensão" da Samsung — dias sem abrir o protótipo.
- T6: um dia inteiro de uso normal com o monitoramento ligado.

**Antes de trabalhar:** seguir o "Procedimento de início de sessão" mais abaixo.

---

## Ambiente

| Item | Versão / caminho |
|---|---|
| Node | v24.19.0 |
| npm | 11.17.0 |
| Git | 2.55.0.3 |
| JDK | **Temurin 17.0.20.1** em `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot` (ver P1) |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` — build-tools 36.0.0, platform android-37.0 |
| Expo SDK | 57.0.23 |
| React Native | 0.86.3 |
| Gradle | 9.3.1 |

Variáveis de ambiente definidas no escopo do usuário em 16/09/2026:
`ANDROID_HOME`, `JAVA_HOME`, e `platform-tools` + `emulator` no `Path`.

O `android/local.properties` aponta para o SDK. Ele fica dentro de `android/`,
que é ignorado pelo git (o projeto nativo é regerado por `expo prebuild`).

---

## Decisões

### D1 — Build Android local em vez de EAS Build
O `CLAUDE.md` previa EAS Build para as duas plataformas. Para o Android da Fase 1
compilamos na máquina (`npx expo run:android`).

**Motivo:** o plano gratuito do EAS dá 15 builds Android por mês, com fila que
passa de uma hora em horário de pico. Os experimentos A1 a A9 são todos em Kotlin,
e alteração em código nativo exige recompilar o app inteiro — não recarrega como
JavaScript. A cota acabaria em um dia de trabalho.

O iOS continua obrigatoriamente no EAS Build (não há Mac).

**Medido em 16/09/2026:** build limpo 8 min 12 s; build incremental após alterar
o Kotlin, **32 s**. É a comprovação da decisão — no EAS cada uma dessas iterações
custaria um dos 15 builds mensais mais a fila.

### D2 — Módulo nativo próprio em vez de biblioteca pronta
Criado `modules/lab-monitoring` (Kotlin + esqueleto Swift) em vez de usar
`@brighthustle/react-native-usage-stats-manager`.

**Motivo:** a biblioteca cobre só o A1. Os experimentos seguintes precisam de
serviço em primeiro plano (A2), notificação disparada pelo nativo (A3),
sobreposição (A4) e VPN local (A6/A7), todos no mesmo módulo e todos escrevendo
no log compartilhado do S4. A comparação entre as duas abordagens é insumo direto
para as perguntas Q8 e I13 do relatório.

### D3 — `<queries>` MAIN/LAUNCHER em vez de `QUERY_ALL_PACKAGES`
Para listar os apps que o usuário pode escolher monitorar, o módulo declara a
intenção MAIN/LAUNCHER no seu próprio `AndroidManifest.xml` (o merge do Android
junta esse manifesto ao do app — não foi preciso config plugin).

**Motivo:** desde o Android 11 um app vê uma lista filtrada dos demais. A
alternativa, `QUERY_ALL_PACKAGES`, é classificada pelo Google Play como permissão
sensível, restrita a lançadores, antivírus e gerenciadores de arquivos, e seu uso
sem justificativa é motivo de remoção. A declaração `<queries>` mostra só apps com
ícone na gaveta, que é exatamente o que a tela precisa. **Registrar no A10.**

### D4 — ~~`queryAndAggregateUsageStats`~~ → **`queryEvents`** (revisada em 17/09/2026)
A decisão original era usar `queryAndAggregateUsageStats` para os minutos de hoje,
com `queryEvents` como plano B. O teste no aparelho promoveu o plano B.

**Motivo:** o método agregado atualiza em lotes, com atraso de vários minutos, o
que o inviabiliza como gatilho de alerta em tempo real (A2). O método por eventos
reflete o uso imediatamente e, depois de corrigido, bateu exatamente com o número
do Bem-estar digital da Samsung para o mesmo app.

**Motivo 2:** o agregado devolve uso do dia anterior como se fosse de hoje,
porque agrega baldes cujas bordas não coincidem com a meia-noite.

A leitura passa a ser por `queryEvents`, com chave `pacote|classe` e contagem de
`STOPPED` pendentes (ver achado A1 — o tratamento ingênuo do `STOPPED` custou dois
erros, de 63 e de 15 minutos).

O método agregado continua no código apenas como termo de comparação e evidência
para o relatório.

---

## Estrutura

```
prototype/
  src/app/index.tsx              # tela de laboratório
  src/app/_layout.tsx
  src/monitoring/types.ts        # interface comum da spec §5.2
  src/monitoring/index.ts        # fachada sobre o módulo nativo
  modules/lab-monitoring/
    android/src/main/AndroidManifest.xml   # PACKAGE_USAGE_STATS + <queries>
    android/.../EventLog.kt                # log compartilhado (S4)
    android/.../UsageReader.kt             # UsageStatsManager (A1)
    android/.../UsageLimitService.kt       # serviço em primeiro plano (A2)
    android/.../LimitConfig.kt             # configuração do limite em disco (A2)
    android/.../BootReceiver.kt            # religa o serviço após reinício (A9)
    android/.../Notifier.kt                # canais e notificação de alerta (A3)
    android/.../Notifications.kt           # permissão de notificação (A3)
    android/.../NotificationActionReceiver.kt  # botão "Emergência" (A3)
    android/.../InterruptionOverlay.kt     # tela de interrupção por sobreposição (A4a)
    android/.../InterruptionActivity.kt    # tela de interrupção como activity (A4b)
    android/.../InterruptionExits.kt       # saídas comuns (tela inicial, emergência, retorno) e pausa (A4, A5)
    android/.../LabMonitoringModule.kt     # fachada Expo Modules
    ios/LabMonitoringModule.swift          # esqueleto: tudo 'unsupported'
```

O log compartilhado é um arquivo JSONL em `filesDir`. Todo componente do app roda
sob o mesmo UID, então o serviço em primeiro plano (A2) e a VPN local (A6) vão
escrever no mesmo arquivo, cada um com seu próprio `source`.

---

## Experimentos

| ID | Resultado | Evidência |
|---|---|---|
| S1 | ✅ Funciona | App instalado e aberto no Galaxy S22 (SM-S901E, Android 16 / API 36 / One UI 8.0) em 17/09/2026. Tela de laboratório renderizada, capturas em `docs/relatorios/evidencias/` |
| S4 | ✅ Funciona | Evento gravado pelo Kotlin apareceu na tela com `source: UsageReader`. Arquivo lido direto do aparelho com `adb shell run-as com.norte.lab.dev cat files/lab-events.jsonl`. O log **sobreviveu à reinstalação do app** |
| A1 | ✅ Funciona | Leitura por `queryEvents` coincidiu com a contabilidade do sistema no mesmo minuto (`1:41:10`), 17/09/2026. O caminho agregado foi descartado por dois defeitos medidos. Ver achado abaixo |
| A2 | ✅ Funciona | `threshold_reached` registrado às 16:36:44 com o protótipo fechado, 9 s após o Instagram cruzar o limite de 2 min. Serviço em primeiro plano `specialUse` sobreviveu ao app ser arrastado para fora dos recentes. Segunda rodada após 2 h de Doze: latência de 3 s |
| A3 | ⚠️ Funciona com limitações | Notificação disparada pelo Kotlin com o app fechado, **14 ms** após a detecção (~6 s do limite real até o alerta). Apareceu **flutuando por cima do Instagram**, texto neutro e configurável. **Mas o botão "Emergência" só aparece se a notificação for expandida** — dois toques até a emergência |
| A4 | ⚠️ Funciona com limitações | As duas abordagens cumprem o critério: a tela aparece sobre o Instagram com o protótipo fechado, mostra a motivação, e "Continuar" registra `continue_tapped` e volta **ao mesmo post**. **Sobreposição:** o voltar é ignorado, ela continua por cima da tela inicial, não cobre as barras, e o sistema publica "Norte Lab exibido sobre outros apps". **Tela própria:** o voltar a fecha sem escolha. Ambas dependem de `SYSTEM_ALERT_WINDOW`. Em 18/09 à noite: instrumentação corrigida e botão "Ir para a tela inicial" nas duas, validados no aparelho. Ver achado abaixo |
| A5 | ✅ Funciona | Pausa de 2 min depois do "Continuar", na sobreposição: nenhum alerta em 6 verificações, com a pessoa no Instagram e saindo e voltando. No fim, a notificação e, 20 s depois, a tela. O fim da pausa é notado com até 20 s de atraso (medido: 14 s). Tela inicial e emergência não pausam: reabrir o Instagram interrompe de novo em ~7 s. A pausa sobreviveu à recriação do serviço. Ver achado abaixo |
| A9 | ⚠️ Funciona com limitações | Sobreviveu a 2 h 05 min desconectado (~114 min em Doze profundo) e continuou detectando com 3 s de latência. Volta sozinho após reinício via `BOOT_COMPLETED`, mas só **~2,5 min depois do boot e só depois do usuário desbloquear a tela** — há uma janela cega. Custo: **0,138%** de CPU, 0,476 de 73,2 mAh, e esse número inclui ruído do dev client. Faltam "Apps em suspensão" da Samsung (precisa de dias) e o roteiro T6 |

### Achado A1 — como medir tempo de uso por app, e o que não funciona

**Resultado: funciona.** Em 17/09/2026, às 16:12, a leitura do protótipo e a
contabilidade interna do Android coincidiram no mesmo minuto:

```
sistema (dumpsys usagestats):  totalTimeUsed = 1:41:10
protótipo (queryEvents):       1 h 41 min
```

Também coincidiram `com.samsung.android.forest` (8 min), `com.android.settings`
(7 min) e `com.sec.android.app.launcher` (2 min), conferidos contra um cálculo
independente feito em `awk` sobre o log do sistema.

#### A regra que funciona

Reconstruir o uso a partir de `queryEvents`, com chave `pacote|classe`:

| Evento | Ação |
|---|---|
| `ACTIVITY_RESUMED` | abre intervalo |
| `ACTIVITY_PAUSED` | fecha intervalo **e** marca um `STOPPED` pendente |
| `ACTIVITY_STOPPED` | se houver pendência, apenas consome a pendência; senão, fecha |
| `SCREEN_NON_INTERACTIVE` | fecha tudo o que estiver aberto |

O tratamento do `STOPPED` é o ponto delicado, e custou dois erros até acertar.

#### Por que o `STOPPED` é ambíguo

Ele aparece em três situações que exigem respostas diferentes:

**1. Recriação da activity.** Os eventos se cruzam no mesmo segundo:
```
12:13:51 PAUSED   instanceId=112733363   (instância velha)
12:13:51 RESUMED  instanceId=264872490   (instância nova)
12:13:51 STOPPED  instanceId=112733363   (velha, chega por último)
```
Deixar esse `STOPPED` fechar o intervalo perdeu **63 minutos** de uso real.

**2. App morto sem `PAUSED`** (reinstalação, por exemplo):
```
13:21:19 RESUMED
13:36:42 STOPPED    <- único sinal de que o uso terminou
```
Ignorar o `STOPPED` aqui perdeu outros **15 minutos**.

**3. Uso de duração zero.** O Android Auto abriu e fechou no mesmo segundo
(`RESUMED, PAUSED, STOPPED` às 15:04:39) e o sistema contabiliza `00:00`.

A contagem de pendências resolve os três: no caso 1 o `PAUSED` já fechou e deixou
a pendência, então o `STOPPED` é ignorado; no caso 2 não há pendência, então ele
fecha; no caso 3 o `PAUSED` fecha com zero e o `STOPPED` é consumido.

> O `instanceId` desambiguaria diretamente, e aparece no `dumpsys`, mas
> `getInstanceId()` **não é API pública** — não compila. Daí a contagem de
> pendências.

#### O que NÃO funciona: `queryAndAggregateUsageStats`

Dois defeitos independentes, ambos medidos:

**Vaza uso do dia anterior.** A Galeria apareceu com 3 min "de hoje" sem ter
nenhum evento de primeiro plano hoje. A linha do sistema explica:
```
package=com.sec.android.gallery3d totalTimeUsed="02:50"
   lastTimeUsed="2026-09-16 17:16:29"
```
São 3 minutos de **ontem**. O método agrega os baldes do sistema, cujas bordas não
coincidem com a meia-noite, e devolve o balde inteiro para qualquer consulta que o
intercepte. O mesmo efeito explica o `Config.` marcando 10 min no agregado contra
7 min reais de hoje.

**Atrasa vários minutos.** Leituras às 12:03 e 12:06 devolveram valores idênticos
com o app em uso no intervalo; às 12:14 já haviam mudado. Sozinho isso o
inviabiliza como gatilho de alerta no momento do risco, que é o que o A2 precisa.

#### Resposta à dúvida sobre tela apagada

**Não se aplica.** Quando a tela apaga, o app recebe `ACTIVITY_PAUSED` no mesmo
segundo:
```
13:17:10 SCREEN_NON_INTERACTIVE
13:17:10 ACTIVITY_PAUSED
```
Não existe "primeiro plano com tela apagada" neste aparelho, então nenhum dos dois
métodos conta esse tempo. A hipótese anterior de que o agregado contava tela
apagada estava errada e foi retirada; o fechamento em `SCREEN_NON_INTERACTIVE`
ficou no código apenas como rede de segurança para fabricantes que se comportem
de outra forma.

#### Erro de método, registrado para não repetir

A conclusão errada nasceu de inferir o estado do aparelho a partir do relógio:
houve 67 minutos entre duas leituras e presumiu-se bloqueio nesse período. O
responsável apontou que não foi assim, e o `dumpsys usagestats` mostrou 4 minutos
de tela apagada, não 67.

**Regra daqui em diante:** toda medição de uso vem acompanhada do recorte do
`dumpsys usagestats` do mesmo período. O relógio não é evidência.

#### Impacto no produto

- Usar `queryEvents` com a regra acima. Nunca `totalTimeInForeground`.
- Filtrar a tela inicial do sistema, que aparece na lista como se fosse um app.
- A borda do dia precisa de atenção no app definitivo: "hoje" para o usuário
  começa à meia-noite, e o sistema não organiza os dados assim.
- Validado em um aparelho. Repetir no emulador e, antes do beta, num segundo
  aparelho físico.

### Achado A2 — detecção de limite com o app fechado

**Resultado: funciona.** Teste em 17/09/2026 no Galaxy S22, com o protótipo
arrastado para fora dos apps recentes e o Instagram (zero uso no dia até então)
como alvo, limite de 2 minutos:

```
16:32:43  service_started      limite 2 min, intervalo 20s
16:36:44  threshold_reached    2 min de uso para limite de 2 min
```

| Medida | Valor |
|---|---|
| Uso cruzou 120 s em | 16:36:35 (reconstruído do `dumpsys`) |
| Detectado em | 16:36:44 |
| **Atraso** | **9 s** (intervalo de verificação: 20 s) |

O serviço sobreviveu ao app ser fechado: `isForeground=true`, `createTime=-8m`,
sem recriação. Arrastar para fora dos recentes **não** derrubou o serviço em
primeiro plano neste aparelho.

#### Não existe API de notificação de limite

O Android tem `UsageStatsManager.registerAppUsageObserver`, que avisa o app
quando um grupo de pacotes ultrapassa um tempo — é o que o Bem-estar digital usa
nos temporizadores. Verificado na referência oficial em 17/09/2026: **não faz
parte da API pública**. O sistema reserva essa eficiência para si.

Consequências para nós:
- Só resta *perguntar* periodicamente, o que custa bateria.
- `WorkManager` não serve: o mínimo para trabalho periódico é 15 minutos, grosso
  demais para limites de poucos minutos.
- Sobra o serviço em primeiro plano, com notificação permanente visível ao
  usuário. Não é escolha nossa: é a única porta aberta.

#### Tipo de serviço: `specialUse`, e o risco que vem junto

Nenhum dos tipos catalogados pelo Android descreve "observar o uso de outros
apps". `dataSync` seria o mais próximo, mas desde o Android 15 tem teto de **6
horas por dia**, o que inviabiliza monitoramento contínuo.

Resta `specialUse`, que exige uma `<property>` no manifesto com a justificativa
em texto livre, **lida por um revisor humano do Google Play**. Confirmado no
manifesto final: `types=0x40000000` = `FOREGROUND_SERVICE_TYPE_SPECIAL_USE`.

**Risco a registrar no A10:** a aprovação depende de revisão manual, e o texto da
justificativa passa a ser parte do produto.

#### Custo da abordagem

Cada verificação percorre todos os eventos do dia. A 20 s de intervalo são 4.320
varreduras por dia, e cada uma fica mais cara conforme o dia avança. Para o
protótipo está bom, porque reaproveita a função já validada no A1. No app
definitivo, o caminho é acumular incrementalmente, consultando só os eventos
desde a última verificação.

**Bateria ainda não medida.** Fica para o A9 e o roteiro T6.

#### Em aberto para o A9

- Sobrevivência após horas, após reinício do aparelho e com a economia de bateria
  da Samsung ligada. O app **não** está na lista de isenção de otimização —
  deixado assim de propósito, por ser a condição de um usuário comum.
- O intervalo de 20 s foi escolhido sem medição. Calibrar contra bateria.



### Achado A3 — alerta de nível 1 funciona, mas o botão fica escondido

**Resultado: ⚠️ funciona com limitações.** A notificação é disparada pelo código
nativo com o protótipo fechado, quase instantaneamente após a detecção, e
aparece **flutuando por cima do app monitorado** — o canal em IMPORTANCE_HIGH
entrega a interrupção pretendida. Mas o
botão de ação — que no produto leva ao botão de emergência — **não fica visível
sem o usuário expandir a notificação**.

#### Latência

```
23:49:32      uso do Instagram cruzou 13 min (reconstruído do dumpsys)
23:49:37.888  threshold_reached
23:49:37.902  notification_sent      (14 ms depois)
```

Total de ~6 s entre o limite real e o alerta na mão do usuário. Praticamente
todo esse tempo é a detecção do A2 (limitada pelo intervalo de 20 s); postar a
notificação em si custou 14 milissegundos.

O critério da spec ("notificação aparece segundos após o limite") é atendido com
folga.

#### O problema: o botão "Emergência" exige dois toques

Relato do responsável no aparelho: na gaveta do One UI, o botão de ação **não
aparece** com a notificação recolhida. É preciso tocar na seta para expandir
antes de o botão surgir.

Isso colide com o princípio **P3** do documento 01 — "registrar algo deve custar
no máximo um toque". Num momento de vulnerabilidade, dois toques e uma descoberta
de interface são muito.

**Implicações a levar para o produto:**
- O alerta de nível 1 sozinho não entrega o botão de emergência de forma
  acessível no Samsung, que é justamente a marca mais popular do Brasil.
- Reforça a importância do **A4** (tela de interrupção): é lá que a emergência
  pode ficar a um toque.
- Vale testar `setFullScreenIntent`, que transforma a notificação em algo mais
  intrusivo — mas isso tem restrição própria de permissão desde o Android 14 e
  precisa ser verificado antes de ser prometido.

#### Texto neutro e configurável (adianta o C2)

O texto vem da configuração, não do código, e é editável na tela de laboratório.
Padrão: título "Momento de pausa", corpo "Você atingiu o tempo que definiu para
hoje." Nada no título, no corpo ou no nome dos canais ("Monitoramento",
"Alertas") revela o tema do app.

#### Notificação permanente: aparece, com ~10 s de atraso

O Android adia a exibição da notificação de serviço em primeiro plano por cerca
de 10 segundos após o serviço subir. Verificado: ausente aos 7 s, presente aos
30 s.

Antes disso houve uma confusão que vale registrar: enquanto a permissão de
notificação estava negada, o serviço rodava normalmente (`isForeground=true`) mas
sua notificação **não era exibida**. Conceder a permissão depois não a republica
— é preciso reiniciar o serviço.

#### Permissão de notificação

Diferente do acesso a dados de uso do A1, esta é permissão de runtime comum, com
pop-up do sistema. Concedida em 23:35:54. Sem ela o serviço roda, mas nenhum
alerta chega ao usuário — o que tornaria o produto inútil sem avisar.

### Achado A4 — tela de interrupção: as duas abordagens funcionam, com comportamentos opostos

**Resultado: ⚠️ funciona com limitações.** O critério da spec foi cumprido nas
duas abordagens: a tela aparece sobre o Instagram com o protótipo fechado, mostra
a motivação, e "Continuar mesmo assim" registra `continue_tapped` e devolve o
usuário **ao mesmo post**. As limitações estão no que acontece fora dos botões, e
cada abordagem falha num ponto diferente.

Testado em 18/09/2026: uma sessão às 13:24 (sobreposição, "Emergência") e cinco
rodadas, de A a E, entre 16:37 e 17:16. Evidência completa em
`docs/relatorios/evidencias/a4-tela-de-interrupcao.txt`.

#### Como foi medido

O log compartilhado não enxerga tudo: a tela própria some pelo voltar sem gerar
evento, por exemplo. Em cada rodada, um vigia no computador (script Bash sobre
`adb`) registrava a **janela com foco** (`dumpsys window`, `mCurrentFocus`) a
cada ~1,5 s. Quando a interrupção aparecia, ele guardava também a tela, as
janelas e as tarefas. O `logcat` do sistema, filtrado pelo pacote, mostrou o
resto: a exceção que liberou o início em segundo plano, os gestos de voltar
entregues a cada janela e as recriações. Nenhuma dessas medições exige código no
app.

#### Comparação

| | (a) Sobreposição | (b) Tela própria |
|---|---|---|
| Aparece sobre o app monitorado | ✅ | ✅ O início em segundo plano foi liberado por `BAL_ALLOW_SAW_PERMISSION` |
| "Continuar" volta ao mesmo ponto | ✅ Trivial: o Instagram nunca saiu da tela, e a janela dele é a mesma antes e depois | ✅ Reabre o Instagram pelo intent de lançamento, e o sistema traz a tarefa existente à frente (`result code=2`) |
| Gesto de voltar | **Ignorado.** 5 tentativas, todas entregues à sobreposição | **Fecha a tela**, sem evento no nosso log |
| Destino do voltar | — | Com o app fechado: Instagram, mesmo post. Com o app nos recentes: **tela do Norte Lab** |
| Gesto de início | **A sobreposição continua** por cima da tela inicial, e nenhum app abre até o toque num botão | não testado |
| Barras de status e navegação | Não cobre, e não pode (ver abaixo). Gaveta e gestos seguem funcionando | Ocupa a tela inteira (ponta a ponta), e as barras são desenhadas por cima |
| Conteúdo do app de trás | Legível através do fundo, que é 95% opaco no protótipo | Invisível |
| Ciclo de vida do app de trás | Segue `RESUMED`: o tempo na tela **conta como uso** (I-10) | Recebe `PAUSED`: o tempo **não** conta |
| Efeito colateral | Notificação do sistema "Norte Lab exibido sobre outros apps." | Splash screen do app antes da tela; recriação a cada giro |
| Permissão | `SYSTEM_ALERT_WINDOW` | A mesma: é ela que libera o início em segundo plano |

#### (a) Sobreposição: pede uma escolha antes de qualquer outro uso

- **Voltar:** o gesto chega à sobreposição (`startBackNavigation` com o callback
  da nossa janela), que não o trata. Não passa para o Instagram, então o usuário
  precisa escolher um dos botões.
- **Início:** a sobreposição não pertence a app nenhum, então continua na tela
  quando o usuário vai para a tela inicial. Nenhum app pode ser aberto, nem os
  recentes, que abrem por baixo dela. Depois do "Continuar", o usuário fica onde
  estava, no caso a tela inicial, e não no Instagram.
- **Barras:** a janela ocupa `[0,81]–[1080,2295]` e fica **abaixo** da barra de
  status, da gaveta, da barra de navegação e do detector do gesto de voltar. É
  regra do Android, não escolha nossa: a referência de `TYPE_APPLICATION_OVERLAY`
  diz que essas janelas ficam abaixo das janelas críticas do sistema. A mesma
  página avisa que o sistema pode mudar a posição, o tamanho ou a visibilidade
  delas a qualquer momento.
- **Notificação do sistema:** 87 ms depois de a sobreposição aparecer, o próprio
  Android publica "Norte Lab exibido sobre outros apps.", com um toque para abrir
  as configurações e desativar a permissão. Tem importância mínima (sem som nem
  destaque), fica enquanto a janela existir, e o app não pode suprimi-la. Duas
  consequências: o **nome do app** aparece na gaveta durante a interrupção, e
  desligar a proteção fica **a um toque** justamente no momento de
  vulnerabilidade.
- A sessão das 13:24 e a rodada A confirmaram de novo o I-10: o Instagram não
  recebeu nenhum `PAUSED` enquanto a sobreposição estava na tela.

#### (b) Tela própria: uma tela comum, que o voltar dispensa

- **Início em segundo plano:** nas três rodadas, o sistema registrou
  `START ... InterruptionActivity ... (BAL_ALLOW_SAW_PERMISSION) result code=0`.
  Isso prova que a exceção usada é exatamente a da permissão de sobreposição. Sem
  ela, o início seria bloqueado **em silêncio**, sem exceção no app.
- **A tela entra na tarefa do próprio app.** Com o laboratório nos recentes, ela
  foi criada na tarefa dele (#22), por cima da tela do laboratório. O voltar a
  fechou e revelou **a tela do Norte Lab**. Com o laboratório fechado, cada
  interrupção ganhou uma tarefa própria (#29, #32), e o voltar levou ao
  Instagram. No app definitivo, `android:taskAffinity=""` isola a tela em
  qualquer caso.
- **O voltar dispensa sem escolha e sem registro:** o sistema grava
  `wm_finish_activity ... app-request`, e com o app fechado o usuário volta
  direto ao Instagram.
- **Um giro recria a tela.** O Instagram e o laboratório pedem retrato. A tela de
  interrupção não declara orientação e segue o sensor, com a rotação automática
  ligada. Na rodada C ela girou para paisagem e voltou em 0,7 s. Foi recriada
  duas vezes e gravou três `interruption_shown` para uma única interrupção.
  Corrigir fixando retrato.
- **Splash screen:** antes da tela, o sistema mostra a splash do Norte Lab. O
  primeiro quadro vem de 75 a 280 ms depois, e a splash sai numa animação de
  ~0,5 s. É curto, mas mostra o ícone do app.

#### O comportamento do voltar depende de uma desativação temporária

O template do Expo põe `android:enableOnBackInvokedCallback="false"` no
manifesto. A página oficial de mudanças do Android 16 (consultada em 18/09/2026)
diz que, com `targetSdk` 36, o voltar preditivo vem ligado por padrão,
`onBackPressed` não é chamado e `KEYCODE_BACK` não é enviado. Ela trata esse
atributo como desativação **temporária**. Tudo o que medimos sobre o voltar passou
pelo caminho antigo. No app definitivo, o voltar precisa ser tratado de forma
explícita (`OnBackInvokedCallback` na sobreposição e na activity) e testado de novo
com o voltar preditivo ligado.

#### Instrumentação: corrigida antes do A5 (18/09/2026, 17:50–18:03)

As rodadas A–E deixaram três pontos em que o log não contava a verdade. Todos
foram corrigidos e validados no S22, com toques e gestos injetados pelo `adb`
(ver "Comandos"); só os giros da rodada T1 foram feitos à mão. Evidência:
`docs/relatorios/evidencias/a4-instrumentacao-e-botao-inicio.txt`.

| # | Problema | Correção | Validação |
|---|---|---|---|
| 1 | `returned_to_app` gravado a cada "Continuar" na sobreposição, mesmo com o usuário na tela inicial (rodada B) | 1,5 s depois do toque, o app lê o que está em primeiro plano: `returned_to_app` se for o app interrompido; senão, `not_returned_to_app` com o que está na tela. Vale para as duas abordagens | ✅ O1 e T4: Instagram. O2, a rodada B repetida: `not_returned_to_app`, primeiro plano: lançador |
| 2 | `interruption_shown` da tela própria gravado de novo a cada recriação | Gravado só quando o `onCreate` chega sem estado salvo | ✅ T1 (22:12, giros feitos pelo responsável): duas recriações (`wm_relaunch_resume_activity`), um único `interruption_shown`, nenhuma dispensa falsa, e o retorno ao Instagram depois do "Continuar" |
| 3 | A dispensa da tela própria sem botão não gerava evento | `interruption_dismissed` no `onDestroy`, se nenhum botão foi tocado e não é recriação. O motivo vem de `onBackPressed` ("voltar") ou de `onUserLeaveHint` ("inicio ou recentes"); fora isso, "outro" | ✅ T5: voltar. T2: início |

O item 3 depende do `noHistory`: é ele que faz o sistema encerrar a tela quando o
usuário vai para o início (`wm_finish_activity ... stop-no-history`). Sem ele, a
tela ficaria parada na tarefa e o evento só sairia quando o processo morresse.
O motivo "voltar" depende do caminho antigo do voltar (I-14): com o voltar
preditivo ligado, o `onBackPressed` não é chamado e o motivo sairia "outro".

**Dois defeitos latentes, achados no caminho e corrigidos:**

- **`currentForegroundPackage` só olhava os últimos 5 minutos de eventos.** Um app
  sem nenhum `ACTIVITY_RESUMED` nesse intervalo, como o Instagram usado sem trocar
  de activity, dava `null`. A escalada para a tela de interrupção não aconteceria
  para quem já estava no app havia mais de 5 minutos quando o limite estourou. O A5
  seria afetado em cheio: depois de uma pausa de 5 minutos ou mais, o alerta não
  voltaria. As rodadas do A4 não pegaram isso porque o Instagram era sempre aberto
  segundos antes. Janela ampliada para 24 h. **Achado lendo o código, não
  observado em teste.**
- **O botão "Fechar interrupção (se travar)" removia a janela fora da thread
  principal:** a `AsyncFunction` do Expo roda numa fila própria. Nenhuma falha foi
  observada, mas uma falha ali seria engolida pelo `runCatching`. Agora roda na
  fila principal (`runOnQueue(Queues.MAIN)`). Os fechamentos por código passaram a
  gravar `interruption_closed` com o motivo, e uma falha na remoção vira
  `interruption_close_failed`. Não validado no aparelho.

**Com isso, toda `interruption_shown` termina num evento de saída:**
`continue_tapped`, `emergency_tapped`, `home_tapped`, `interruption_dismissed`
(tela própria) ou `interruption_closed` (sobreposição fechada por código). É o que
o A5 precisa para contar interrupções e respostas.

#### Recomendação preliminar, para o relatório

**Sobreposição.** É a única abordagem em que "continuar" é de fato uma escolha,
porque o voltar não escapa dela, e ela não mexe no ciclo de vida nem na pilha do
app monitorado. Com quatro condições: fundo opaco (ou decisão consciente de deixar
o conteúdo visível), voltar tratado de forma explícita, desconto do tempo de
interrupção nas estatísticas (I-10) e justificativa sólida para
`SYSTEM_ALERT_WINDOW` na loja (I-7). A tela própria fica como alternativa, caso a
sobreposição seja restringida, com `taskAffinity=""`, retrato fixo e voltar
interceptado.

**Leitura do princípio P4 do documento 01, esclarecida pelo responsável em
18/09/2026.** "Alertar, não bloquear" significa nunca impedir o usuário de seguir
em frente com o app monitorado. A §6.5 diz que o app nunca bloqueia
*definitivamente* o acesso. A sobreposição cumpre o princípio: pede uma escolha,
mas "Continuar" está sempre a um toque. Ela não bloqueia o usuário.

**Terceiro botão, sugerido pelo responsável:** além de "Emergência" e "Continuar
mesmo assim", um botão **"Ir para a tela inicial"**, que fecha a interrupção e
leva à tela inicial do aparelho. É a saída que respeita o limite sem passar pelo
fluxo de emergência. A §6.5 do documento 01 prevê só as duas opções (I-15). Evitar
o rótulo "Início", que é o nome de uma aba do app (§6.1).

**Implementado e validado em 18/09/2026** nas duas abordagens, como terceiro botão,
com o evento `home_tapped` (rodadas O3 e T3 da evidência acima). O botão abre o
lançador pelo intent de HOME:

- **Sobreposição:** o lançador é aberto **antes** de a sobreposição sair, para o
  Instagram não reaparecer entre uma coisa e outra. O sistema liberou o início por
  `BAL_ALLOW_NON_APP_VISIBLE_WINDOW`, ou seja, pela própria sobreposição visível, e
  não pela permissão. Do `home_tapped` ao lançador na frente: 65 ms.
- **Tela própria:** liberado por `BAL_ALLOW_VISIBLE_WINDOW`, a própria activity.

Um início de activity barrado pelo sistema **não gera exceção**, só uma linha no
logcat (documentação oficial de restrições de início em segundo plano, consultada
em 18/09/2026). O `home_tapped` prova o toque, não a chegada à tela inicial; a
prova de chegada veio do sistema.

#### Ainda não testado

- Botão "Emergência" na tela própria. (O gesto de início foi testado em 18/09,
  rodada T2: o sistema encerra a tela por causa do `noHistory`.)
- Tela própria com o aparelho bloqueado: **testado sem querer** em 18/09. A tela
  foi apagada pelo botão liga/desliga com a interrupção aberta, às 18:09. A
  `InterruptionActivity` passou 4 h atrás da tela de bloqueio e **reapareceu 11 ms
  depois do desbloqueio**, às 22:07. Coerente com a regra do Android de não
  encerrar uma activity `noHistory` enquanto o aparelho dorme.
- **Chamada recebida com a sobreposição na tela.** A tela de chamada é uma
  activity e, pela regra de camadas, ficaria por baixo da sobreposição. É
  hipótese, a testar antes do beta: trata-se de segurança.
- Tela bloqueada com a sobreposição aberta. O protótipo usa
  `FLAG_KEEP_SCREEN_ON`, que impede a tela de apagar sozinha enquanto a janela
  existir. Se o usuário largar o aparelho, isso custa bateria.
- Todo o comportamento de voltar com o voltar preditivo ligado.

#### Latência, medida na sessão das 13:24 (fluxo real)

```
13:24:08      uso do Instagram cruza 2 min (reconstruído do dumpsys)
13:24:16.864  threshold_reached        +8,9 s
13:24:16.974  notification_sent        +110 ms       (nível 1)
13:24:37.135  interruption_shown       +20,2 s       (nível 2, sobreposição)
13:24:41.872  emergency_tapped
```

O intervalo de ~20 s entre a notificação e a tela não é acaso: a escalada acontece
no ciclo seguinte do serviço, se o usuário ainda estiver no app monitorado. Esse
intervalo passa a ser um parâmetro do produto — quanto tempo o usuário tem para
reagir ao aviso antes de ser interrompido.

#### Permissão

As duas abordagens dependem de `SYSTEM_ALERT_WINDOW` ("Aparecer sobre outros
apps"), concedida manualmente nos Ajustes. O intent
`ACTION_MANAGE_OVERLAY_PERMISSION` com o pacote abriu a lista geral já rolada
até o Norte Lab.

A documentação do Android lista essa permissão como uma das exceções que deixam
um app em segundo plano iniciar uma activity. Na mesma página, descreve como
abuso "um app em segundo plano inicia uma atividade sobre o app com que o usuário
está interagindo". Tecnicamente é o que fazemos na abordagem (b), e o
`BAL_ALLOW_SAW_PERMISSION` do log confirma. Risco a levar para o A10.

### Achado A5 — pausa depois do "continuar mesmo assim"

**Resultado: ✅ funciona.** Teste em 18/09/2026, das 22:26 às 22:35, na
abordagem sobreposição, com pausa de 2 minutos. Durante a pausa não saiu alerta
nenhum, nem com a pessoa parada no Instagram, nem saindo e voltando. No fim veio a
notificação e, 20 s depois, a tela de interrupção. Evidência:
`docs/relatorios/evidencias/a5-pausa.txt`.

#### Regras, decididas pelo responsável antes da implementação

| Saída da interrupção | Pausa? | Depois |
|---|---|---|
| "Continuar mesmo assim" | sim, pelos minutos configurados (2 no teste) | no fim, a notificação; se o uso continuar, a tela no ciclo seguinte |
| "Ir para a tela inicial" | não | reabrir o app monitorado interrompe de novo |
| "Emergência" | não | abre o laboratório, no lugar do fluxo de emergência (§6.7); reabrir o app interrompe de novo |

Com isso, a tela de interrupção deixou de aparecer uma única vez por limite: ela
volta sempre que o app monitorado estiver na frente, acima do limite e fora da
pausa.

#### Medidas

| Medida | Valor |
|---|---|
| Alertas durante a pausa | nenhum, em 6 verificações (uma a cada 20 s), com a pessoa no Instagram e depois de sair e voltar |
| Atraso para notar o fim da pausa | 14 s (vai de 0 a 20 s: o fim só é notado na verificação seguinte) |
| Da notificação à tela | 20,1 s (um ciclo) |
| Reinterrupção ao reabrir o app, sem pausa | 6,9 s e 7,0 s (vai de 0 a 20 s) |
| Tela inicial e laboratório, depois das saídas sem pausa | 46 s em cada, nenhum alerta |

#### Como foi feito

- A pausa fica em disco (`pausedUntil`), como o resto da configuração. Uma
  reinstalação a 3 s do fim da pausa recriou o serviço, e a instância nova a
  encerrou sozinha, com a notificação e a tela em seguida.
- O "Continuar" grava a pausa **antes** de a sobreposição sair. O serviço roda em
  outra thread e, sem essa ordem, poderia ver o Instagram na tela e interromper
  de novo.
- **Carência de 3 s depois de qualquer saída.** A troca de app só entra no
  histórico de uso quando o sistema conclui a transição (25 a 65 ms na rodada O3
  do A4). Uma verificação nessa janela veria o Instagram ainda na frente e
  reabriria a sobreposição sobre a tela inicial. Não foi observado; é prevenção.
- "Ir para a tela inicial" e "Emergência" abrem o destino antes de a sobreposição
  sair. Os dois inícios foram liberados por `BAL_ALLOW_NON_APP_VISIBLE_WINDOW`, a
  própria sobreposição visível.
- O `pause_ended` informa o atraso e quantas verificações rodaram durante a pausa:
  é a prova de que o serviço seguiu vivo enquanto estava calado.

#### Limitações e o que não foi testado

- O fim da pausa atrasa até um intervalo do serviço (20 s). Se a precisão
  importar, agendar uma verificação para o instante exato do fim.
- Só na sobreposição. A tela própria usa o mesmo código de pausa, mas não entrou
  no teste.
- Pausa com a tela apagada ou em Doze: o agendamento por `Handler` não acorda o
  aparelho (A9), então o fim seria notado só na primeira verificação depois de
  acordar. Não testado.
- O roteiro T2 da spec pede 5 min de uso depois do "Continuar"; aqui foram ~2,5
  min, com pausa de 2. Executar o T2 completo na bateria final de roteiros.

### Achado A9 (parcial) — sobrevivência em segundo plano e custo

**Resultado: sobrevive, e o custo é baixo.** Teste em 17/09/2026: aparelho
desconectado da energia, parado sobre a mesa, protótipo fechado, das 17:23:20 às
19:28:38 — **2 h 05 min**.

#### O aparelho realmente dormiu

```
17:25:24  device_idle=full      (2 min após desconectar)
18:25:25  device_idle=off
18:29:19  device_idle=full
19:23:17  device_idle=off       (responsável pegou o aparelho)
```

Cerca de **114 dos 125 minutos em Doze profundo**. O teste não foi de aparelho
ocioso "de mentira".

#### Sobreviveu e continua funcionando

| Verificação | Resultado |
|---|---|
| Serviço vivo | `Foreground services: 2h 5m 18s realtime (running)` |
| Recriado pelo sistema? | não — `createTime` contínuo desde as 16:32 (4 h 30 min na última leitura) |
| Ainda detecta? | sim — `threshold_reached` às 19:25:49 |
| Latência da detecção | **3 s** (uso cruzou 8 min às 19:25:46) |

Sobreviver como processo e continuar detectando são coisas diferentes; o teste
final com o Instagram cobre a segunda.

#### Custo

```
Total cpu time:  u=7s992ms  s=2s368ms   =  10,36 s em 7518 s
UID u0a162:      0,476 mAh  (bg 0,194 + fgs 0,282)
Consumo total do aparelho na janela: 73,2 mAh
```

| Métrica | Valor |
|---|---|
| Ciclo de trabalho de CPU | **0,138%** |
| Participação no consumo do aparelho | **0,65%** |
| Projeção | ~5,5 mAh/dia ≈ **0,16%** de uma bateria de 3370 mAh |

A métrica principal é **tempo de CPU**, não porcentagem de bateria: a bateria
deste aparelho está desgastada, e porcentagem depende da capacidade real. O
sistema reporta Capacity 3370 contra Rated 3590 — cerca de 94% de saúde, menos
degradada do que se supunha.

#### Ressalva sobre a contagem de verificações

O agendamento usa `Handler.postDelayed`, que não segura wakelock nem acorda o
aparelho suspenso. Em Doze profundo as verificações ficam adiadas. A aritmética é
compatível com as 376 previstas (27,5 ms cada), mas estes dados **não provam**
quantas rodaram — faltaria um contador no serviço.

Provavelmente é o comportamento desejável: em Doze ninguém está usando app algum,
e não há o que detectar. Na prática, o custo medido é um **piso**.

#### Bucket de standby

Passou de 10 (ACTIVE) para 30 (FREQUENT) durante a sessão, com o serviço rodando.
O bucket governa throttling de jobs e alarmes, não de serviços em primeiro plano,
então não deve nos afetar — mas é o indicador a acompanhar num teste de dias,
quando o app pode cair para RARE ou RESTRICTED.


#### Reinício do aparelho: volta sozinho, mas com uma janela cega

Implementado o `BootReceiver`, que religa o serviço ao receber `BOOT_COMPLETED`
ou `MY_PACKAGE_REPLACED`. Testado com reinício real em 17/09/2026:

```
23:17:11  boot do aparelho (aproximado)
23:19:46  service_restarted — acao: BOOT_COMPLETED
```

O serviço voltou **sem o app ser aberto**. Mas há duas lacunas a registrar:

1. **~2 min 35 s** entre o boot e o religamento. O `BOOT_COMPLETED` é enviado
   tarde no processo de inicialização.
2. Em aparelhos com bloqueio de tela, esse broadcast só chega **depois do
   primeiro desbloqueio** — antes disso o armazenamento do app nem está
   acessível. Se o usuário reiniciar e deixar o celular bloqueado, o
   monitoramento fica parado por tempo indefinido.

**Para o produto:** existe uma janela cega após cada reinício. Não dá para
eliminá-la sem tornar o app *direct boot aware*, o que traz outras complicações.

> A restrição do Android 15 que proíbe receptores de `BOOT_COMPLETED` de iniciar
> serviços em primeiro plano vale para `dataSync`, `camera`, `mediaPlayback`,
> `phoneCall`, `mediaProjection` e `microphone`. **`specialUse` não está na
> lista** (verificado na documentação oficial), e o teste confirmou.

> Não foi possível simular com `adb shell am broadcast -a BOOT_COMPLETED`, como a
> documentação sugere: neste aparelho é broadcast protegido e o shell recebe
> `SecurityException`. Só reinício real serve.

#### Ressalva importante sobre o custo medido

Durante as 2 h desconectadas, o **dev client do Expo ficou tentando reconectar ao
Metro**, inalcançável sem o cabo. Medido depois: ~12 consultas DNS por 25 s sem
`adb reverse`, contra 1 com ele religado.

Os 0,138% de CPU e 0,476 mAh, portanto, **incluem ruído de desenvolvimento que
não existirá em produção**. O custo do serviço em si é menor que o medido.

#### Sobreviveu a uma noite inteira

Na noite de 17 para 18/09/2026 o serviço ficou armado sem que o protótipo fosse
aberto. Às 13:19 do dia seguinte: `isForeground=true`, `createTime=-13h14m` — a
mesma instância, nunca recriada pelo sistema. Não houve instrumentação de
bateria nessa janela; o dado vale só como sobrevivência.

#### Ainda não testado

- **"Apps em suspensão" da Samsung** e rebaixamento para bucket RARE/RESTRICTED:
  precisam de dias sem uso do app.
- **Um dia inteiro de uso normal** (roteiro T6).
- **Força-parada pelo usuário.** É comportamento conhecido do Android que um app
  força-parado deixa de receber broadcasts até ser aberto de novo — o que
  desligaria o religamento automático. Não testado aqui; exigiria outro reinício.

### Outros achados do dia

- **Intent direcionado funciona no One UI 8.** `ACTION_USAGE_ACCESS_SETTINGS` com
  `Uri.fromParts("package", ...)` abre direto a tela do próprio app, com um único
  interruptor, em vez da lista com dezenas de apps. Registrado no log como
  `rota: targeted`. Bom para o onboarding do app definitivo.
- **`<queries>` MAIN/LAUNCHER basta.** Os nomes dos apps foram resolvidos
  corretamente sem `QUERY_ALL_PACKAGES` — 202 apps visíveis no S22.
- **`AppState` detecta o retorno dos Ajustes.** O status da permissão virou de
  "negado" para "concedido" sozinho quando o app voltou ao primeiro plano.
- **O log persiste entre reinstalações.** Relevante para o A9.
- **Merge de manifesto sem config plugin (D3).** Conferido no manifesto final:
  `PACKAGE_USAGE_STATS` e o `<intent>` MAIN/LAUNCHER presentes,
  `QUERY_ALL_PACKAGES` ausente.
- **`SYSTEM_ALERT_WINDOW` já vem declarada pelo template do Expo.** No A4 bastou
  pedir ao usuário que a concedesse; não foi preciso adicioná-la ao manifesto.

---

## Procedimento de início de sessão

O aparelho de teste é o Galaxy S22 pelo cabo USB. O emulador está bloqueado
pela BIOS (P2).

| # | Passo | Comando / ação |
|---|---|---|
| 1 | Conectar o S22 e confirmar | `adb devices` deve listar `RQCT305RZ3Y device` |
| 2 | Conferir o JDK | `JAVA_HOME` precisa apontar para o Temurin 17 (P1) |
| 3 | Subir o Metro desacoplado | ver "Comandos" abaixo — **não** usar `npm run android` em segundo plano (P4) |
| 4 | Redirecionar a porta pelo cabo | `adb reverse tcp:8081 tcp:8081` — refazer após **toda** reinstalação e reinício (P3) |
| 5 | Compilar e instalar (só se mudou Kotlin) | `cd android && ./gradlew.bat installDebug` |
| 6 | Garantir o JavaScript atual | com o laboratório na frente, `adb shell input keyevent 46 46`; conferir `Android Bundled` no `metro.log` (P6) |
| 7 | Ler o log sem abrir o app | `adb shell run-as com.norte.lab.dev cat files/lab-events.jsonl` |
| 8 | Encerrar | matar o Metro no fim da sessão (P4) |

**Regra de evidência (desde o A1):** toda medição de uso vem acompanhada do
recorte do `dumpsys usagestats` do mesmo período. O relógio não é evidência.

**Regra de privacidade:** não versionar capturas da gaveta de notificações nem o
`dumpsys` completo — ambos mostram dados pessoais do aparelho. Guardar apenas
recortes com os eventos de tela e os do próprio protótipo.

**Coordenadas de toque:** a tela do S22 tem 1080×2340; as capturas lidas pelo
Claude chegam reduzidas em 1,17×. Multiplicar por 1,17 antes do `adb shell input tap`.

---

## Dependências

Justificativa exigida pelo `CLAUDE.md` §8.2. Todas são pacotes oficiais do Expo,
na versão do SDK 57.

| Pacote | Versão | Por quê | Nativo? |
|---|---|---|---|
| `expo-dev-client` | ~57.0.19 | Sem ele o app pedia `/index.bundle` e o Metro do SDK 57 só serve o entry virtual do Expo Router — 404 e crash. É o que torna o build um *development build* de fato, e dá um launcher para escolher o servidor. Aprovado pelo responsável em 17/09/2026 (ver P5) | sim |
| `expo-clipboard` | ~57.0.2 | Botão "Copiar" do log, exigido pela spec §5.1 | sim |

O módulo `lab-monitoring` é código próprio (D2) e não usa bibliotecas de
terceiros.

---

## Impactos nos documentos 01 e 02

Insumo para a seção 8 do relatório de viabilidade. **Os documentos 01 e 02 não
são alterados aqui** (`CLAUDE.md` §3); a lista abaixo é o que precisa ser
decidido fora do Claude Code.

| # | Achado | Afeta | O que precisa ser decidido |
|---|---|---|---|
| I-1 | O Android não expõe API de aviso de limite (`registerAppUsageObserver` é reservada ao sistema). Monitorar exige serviço em primeiro plano com **notificação permanente** | Doc 01 P7 (discrição) | Como tratar o ícone e o nome do app visíveis na barra de status o dia inteiro |
| I-2 | O serviço é do tipo `specialUse`, aprovado por **revisão humana** do Google Play a partir de uma justificativa em texto livre | Doc 02 riscos, fase 9 | O texto da justificativa passa a ser parte do produto; risco de rejeição |
| I-3 | No One UI o botão de ação da notificação **só aparece expandindo-a** — dois toques até a emergência | Doc 01 P3 ("no máximo um toque"), §6.7 | A emergência pela notificação não cumpre P3 no Samsung; depende da tela de interrupção |
| I-4 | "Hoje" do sistema não coincide com a meia-noite: o método agregado atribui uso de ontem ao dia seguinte (confirmado duas vezes) | Doc 01 §6.2 e §6.8 | Streak de moderação e estatísticas diárias precisam calcular a borda do dia explicitamente |
| I-5 | Após reiniciar o aparelho, o monitoramento só volta **~2,5 min depois do boot e só após o primeiro desbloqueio** | Doc 01 §6.5 (P2 proativo) | Declarar a janela cega ou aceitá-la |
| I-6 | Sem a permissão de notificação o serviço roda, mas nenhum alerta chega — e nada avisa o usuário | Doc 01 §6.9, onboarding | O app precisa detectar e explicar o modo degradado |
| I-7 | A tela de interrupção depende de `SYSTEM_ALERT_WINDOW`, e a documentação do Android enquadra "atividade sobre o app em uso" como **sequestro de interface** | Doc 02 riscos, A10 | Risco de loja para a tela de interrupção; justificar no pedido |
| I-8 | A tela inicial do sistema aparece na lista de uso como se fosse um app | Doc 01 §6.8 | Filtrar lançadores das estatísticas |
| I-9 | Custo medido do monitoramento: 0,138% de CPU e 0,65% do consumo do aparelho, incluindo ruído do ambiente de desenvolvimento | Doc 02 riscos (bateria) | O risco de bateria parece baixo; confirmar no roteiro T6 |
| I-10 | Com a sobreposição, o app monitorado continua em primeiro plano por baixo: o tempo diante da tela de interrupção conta como uso dele | Doc 01 §6.2 e §6.8 | Descontar esse tempo das estatísticas e da streak de moderação |
| I-11 | Enquanto a sobreposição está na tela, o Android publica "<nome do app> exibido sobre outros apps", com um toque para desativar a permissão. O app não pode suprimir | Doc 01 P7 (discrição), §6.5 | O nome do app aparece na gaveta durante a interrupção, e desligar a proteção fica a um toque no momento de vulnerabilidade |
| I-12 | A sobreposição pede uma escolha antes de qualquer outro uso do aparelho: o voltar é ignorado, e ela continua por cima da tela inicial e de qualquer app | Doc 01 §6.5 | Não fere o princípio P4 ("Continuar" está sempre a um toque; leitura confirmada pelo responsável em 18/09/2026). Falta testar uma chamada recebida com a sobreposição na tela |
| I-13 | Na tela própria, o voltar fecha a interrupção sem escolha, e com o app fechado devolve o usuário direto ao app monitorado. (Desde 18/09 o protótipo ao menos registra a saída, como `interruption_dismissed`) | Doc 01 §6.5 | Se a tela própria for usada, interceptar o voltar ou tratá-lo como "continuar" e registrá-lo |
| I-14 | Todo o comportamento de voltar medido depende de uma desativação que o Android 16 chama de temporária (`enableOnBackInvokedCallback="false"`) | Doc 02 riscos | Tratar o voltar de forma explícita no app definitivo e testar com o voltar preditivo ligado |
| I-15 | Sugestão do responsável: um terceiro botão na tela de interrupção, "Ir para a tela inicial", como saída que respeita o limite sem passar pela emergência | Doc 01 §6.5, que prevê só "Emergência" e "Continuar mesmo assim" | Incluir a opção no documento 01; definir se ela conta como vitória nas estatísticas (§6.8). No protótipo (decisão de 18/09) ela não pausa: reabrir o app monitorado interrompe de novo |
| I-16 | Só o "Continuar" pausa (A5). Acima do limite e fora da pausa, **cada reabertura** do app monitorado gera uma nova interrupção, em até 20 s | Doc 01 §6.5, que não fala de pausa nem de reinterrupção; risco R7 (excesso de alertas) | Definir no documento 01 a duração da pausa, quais saídas pausam, o que volta no fim dela (no protótipo: notificação e, se o uso continuar, a tela) e se há teto diário de interrupções |

## Comandos

Rodar dentro de `prototype/`. Os exemplos usam Git Bash; `adb` fica em
`$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`.

| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Verificar tipos | `npm run typecheck` |
| Lint | `npm run lint` |
| Subir o Metro desacoplado | `nohup npx expo start --dev-client --port 8081 > metro.log 2>&1 & disown` |
| Redirecionar porta pelo cabo | `adb reverse tcp:8081 tcp:8081` |
| Compilar e instalar (Kotlin mudou) | `cd android && ./gradlew.bat installDebug` |
| Regerar o projeto nativo | `npx expo prebuild --platform android --clean` (ver "Ajustes" no fim) |
| Abrir o app | `adb shell monkey -p com.norte.lab.dev -c android.intent.category.LAUNCHER 1` |
| Ler o log compartilhado | `adb shell run-as com.norte.lab.dev cat files/lab-events.jsonl` |
| Ler a configuração do limite | `adb shell run-as com.norte.lab.dev cat shared_prefs/lab-limit.xml` |
| Estado do serviço | `adb shell dumpsys activity services com.norte.lab.dev` |
| Histórico de uso do sistema | `adb shell dumpsys usagestats` (dados pessoais — não versionar inteiro) |
| Consumo por app | `adb shell dumpsys batterystats` (zerar antes com `--reset`) |
| Estado do Doze | `adb shell dumpsys deviceidle` |
| Notificações ativas | `adb shell dumpsys notification --noredact` |
| Bucket de standby | `adb shell am get-standby-bucket com.norte.lab.dev` |
| Capturar a tela | `adb exec-out screencap -p > tela.png` |
| Recarregar o JavaScript | `adb shell input keyevent 46 46`, com o laboratório na frente (P6) |
| Janela com foco agora | `adb shell dumpsys window \| grep mCurrentFocus` |
| Inícios de activity e exceção de BAL | `adb logcat -d -b system \| grep "START u0"` |
| Ler os textos da tela | `adb shell uiautomator dump /sdcard/ui.xml` e `adb shell cat /sdcard/ui.xml` (posições já em pixels reais) |
| Tocar num ponto | `adb shell input tap <x> <y>` |
| Gesto de início | `adb shell input swipe 540 2320 540 1500 200` (passa pelo lançador como o dedo) |
| Gesto de voltar | `adb shell input swipe 3 1200 500 1200 180` (passa por `startBackNavigation` como o dedo) |
| Log do sistema desde uma hora | `adb logcat -d -b system,events -v time -T "09-18 17:54:40.000"` |
| Por que a tela apagou | `adb shell dumpsys power \| grep mLastSleepReason` |
| Diferença de relógio PC × aparelho | `date +%s%3N; adb shell date +%s%3N` — em 18/09 o PC estava ~2 s adiantado; horários lidos no PC (como o foco) não se comparam ao milissegundo com os do log |
| Porta 8081 ocupada? | `netstat -ano \| grep :8081` e `taskkill //PID <pid> //F` |
| Emulador (bloqueado por P2) | `emulator -avd lab_android16` |

No Git Bash, argumentos que começam com `/` (como `/sdcard/ui.xml`) são
convertidos em caminhos do Windows antes de chegar ao `adb`. Prefixar o comando
com `MSYS_NO_PATHCONV=1`.

Após `prebuild --clean`, recriar `android/local.properties` com
`sdk.dir=C:/Users/User/AppData/Local/Android/Sdk` — **com barras normais**. A
forma com barras invertidas escapadas é frágil e o `printf` do Bash a corrompe.

---

## Problemas encontrados

### P1 — O JDK do Android Studio (25) quebra a compilação de C++
**Sintoma:** `Execution failed for task ':react-native-worklets:configureCMakeDebug[arm64-v8a]'`
→ `WARNING: A restricted method in java.lang.System has been called`. O mesmo em
`react-native-screens`. Todo o resto do build passa; só as tasks de CMake caem.

**Causa:** o Android Studio traz um JBR 25. A partir do JDK 24, chamadas a
métodos nativos restritos (`System.load`) emitem aviso, e o passo de configuração
do CMake trata essa saída como falha. O React Native 0.86 compila para bytecode
Java 17 (`JdkConfiguratorUtils.kt` fixa `JavaVersion.VERSION_17`).

**Tentativa que não funcionou:** acrescentar `--enable-native-access=ALL-UNNAMED`
ao `org.gradle.jvmargs`. O aviso não vem do daemon do Gradle e sim do processo
que a task de CMake dispara, então o flag não o alcança. Revertido.

**Solução:** instalado o Temurin JDK 17 e `JAVA_HOME` apontado para ele. O JBR do
Android Studio continua lá, mas não é mais usado pela linha de comando.

**Atenção:** se o Android Studio for aberto para compilar, ele usa o próprio JBR
e vai falhar do mesmo jeito. Em Settings → Build → Build Tools → Gradle, apontar
o Gradle JDK para o Temurin 17.

### P2 — Emulador bloqueado: virtualização desativada na BIOS
**Sintoma:** `emulator -accel-check` responde
`Android Emulator hypervisor driver is not installed on this machine`.

**Causa:** o `systeminfo` mostra **"Virtualização Habilitada no Firmware: Não"**.
O processador (Intel i5-9400F) suporta VT-x, mas o recurso está desligado na
BIOS. Sem ele nenhum hipervisor funciona — nem o WHPX do Windows, nem o driver
próprio do emulador do Android.

**Solução:** depende de ação do responsável, em duas etapas com reinício:
1. Na BIOS/UEFI, ativar *Intel Virtualization Technology* (VT-x), normalmente em
   Advanced → CPU Configuration.
2. No Windows, ativar **Plataforma do Hipervisor do Windows** em "Ativar ou
   desativar recursos do Windows".

**Status:** bloqueado, mas com tudo pronto do lado do software. A imagem
`system-images;android-36;google_apis;x86_64` está instalada e o emulador
**`lab_android16`** (perfil Pixel 7, Android 16) já foi criado. Assim que a
virtualização for ativada, basta `npm run android`.

Detalhe do ferramental: o `sdkmanager` foi substituído pelo CLI `android`
(`android.exe sdk install ...`). Ele termina com código de saída 9 mesmo quando
dá certo — conferir o resultado pelo que foi realmente instalado, não pelo código.

---

### P3 — `adb reverse` se perde em toda reinstalação e reinício
**Sintoma:** o app abre em branco ou quebra com "Unable to load script" depois de
um `installDebug`, embora o Metro esteja no ar.

**Causa:** o redirecionamento de porta não sobrevive à reinstalação do pacote nem
ao reinício do aparelho.

**Solução:** refazer `adb reverse tcp:8081 tcp:8081` depois de cada uma dessas
operações. Consta no procedimento de início de sessão.

### P4 — Metro órfão segurando a porta 8081
**Sintoma:** `Port 8081 is being used by another process`, mas o servidor não
responde (`HTTP 000`).

**Causa:** `npx expo run:android` rodado em segundo plano pela ferramenta
encerra ao terminar a instalação, e o processo filho do Metro fica órfão, travado
e ocupando a porta — com ~1 GB de memória.

**Solução:** não usar `run:android` em segundo plano. Compilar com
`gradlew installDebug` e subir o Metro à parte, desacoplado (`nohup ... & disown`).
Se a porta estiver presa, identificar o PID com `netstat` e encerrá-lo. No fim
da sessão, matar o Metro: em 17/09/2026 ele ficou rodando por quase 13 horas.

### P5 — App e Metro discordavam do caminho do bundle
**Sintoma:** `Unable to load script` mesmo com a rede funcionando pelas duas
rotas (cabo e Wi-Fi retornavam HTTP 200 no `/status`).

**Causa:** sem `expo-dev-client`, o app pedia `/index.bundle` (404), enquanto o
Metro do SDK 57 só serve o entry virtual do Expo Router
(`/.expo/.virtual-metro-entry.bundle`, 200 com 6,3 MB).

**Solução:** instalar `expo-dev-client`, com aprovação do responsável.

### P6 — O laboratório roda JavaScript antigo mesmo com o Metro no ar
**Sintoma:** uma mudança em `src/` não aparece no aparelho, e o `metro.log` não
registra nenhum `Android Bundled`.

**Causa:** o serviço em primeiro plano mantém o processo vivo por dias (A9), e o
React Native guarda o bundle carregado na memória do processo. Abrir o
laboratório só recria a tela, com o JavaScript de quando o processo nasceu —
servido por um Metro de outra sessão, que já não existe. A conexão de recarga com
o Metro também não se refaz.

**Solução:** com o laboratório na frente, `adb shell input keyevent 46 46`, o
"R R" do React Native. Conferir o `Android Bundled` no `metro.log`. Consta no
procedimento de início de sessão.

## Tentativas malsucedidas

- `--enable-native-access=ALL-UNNAMED` no `org.gradle.jvmargs` para contornar o P1
  (não alcança o processo certo).
- Somar tempo de uso fechando intervalo em `ACTIVITY_STOPPED`, indexado por
  pacote. Perdeu 63 minutos de uso real. Ver achado A1.
- Concluir sobre o comportamento do `totalTimeInForeground` a partir do tempo
  decorrido entre duas leituras, sem verificar o estado do aparelho. Levou a uma
  conclusão invertida, corrigida depois pelo `dumpsys usagestats`.
- Ignorar `ACTIVITY_STOPPED` por completo, para corrigir o erro acima. Perdeu 15
  minutos quando o app foi morto sem `PAUSED`. A regra certa é a de pendências.
- Usar `getInstanceId()` para desambiguar instâncias de activity: aparece no
  `dumpsys`, mas não é API pública e não compila.
- Ordenar eventos do mesmo segundo pondo os de fechamento antes dos de abertura:
  deixava abertos para sempre os usos de duração zero (Android Auto, +56 min).
- Simular `BOOT_COMPLETED` com `adb shell am broadcast`, como a documentação
  sugere: broadcast protegido no S22, `SecurityException`.
- Rodar `npx expo run:android` em segundo plano: deixa o Metro órfão (P4).
- Presumir que a notificação permanente não era exibida: ela é adiada ~10 s pelo
  sistema, e antes estava invisível porque a permissão tinha sido negada.
- Recarregar o JavaScript mandando `reload` pelo socket `/message` do Metro: o
  app, com um bundle de sessão anterior, não estava conectado a ele (P6).

---

## Ajustes em `android/gradle.properties`

Esse arquivo é regerado por `expo prebuild --clean`. Depois de cada regeração,
reaplicar se quiser builds mais rápidos:

```
reactNativeArchitectures=arm64-v8a,x86_64
```

O padrão inclui também `armeabi-v7a` e `x86`, que não servem nem ao S22 (arm64)
nem ao emulador (x86_64) e só fazem o build demorar mais.
