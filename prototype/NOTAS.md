# NOTAS — Diário técnico do protótipo

> Fase 1. Registro de decisões, problemas e comandos. Uma entrada por experimento,
> com resultado (✅ / ⚠️ / ❌) e evidência.

---

## Estado atual e próximo passo

> Seção de passagem entre sessões. **Ler primeiro.** Atualizada em 18/09/2026.

**Branch:** `prototype/android-usage`. Tudo commitado.

**Placar do Android:**

| ID | Resultado |
|---|---|
| S1 · S4 · A1 · A2 | ✅ |
| A3 · A9 | ⚠️ com limitações documentadas |
| A4 | ⏳ parcial — sobreposição apareceu sobre o Instagram e "Emergência" funcionou; faltam 4 verificações |
| A5 · A6 · A7 · A8 · A10 | não iniciados |
| S2 · S3 · iOS | não iniciados — dependem da conta Apple Developer pessoal |

**Próximo passo: fechar o A4.** São quatro verificações, listadas no fim do
"Achado A4": tocar em "Continuar mesmo assim", testar o botão Voltar, conferir se
as barras do sistema ficam cobertas e repetir com a abordagem (b), tela própria.
Nenhuma exige código novo. Só então seguir para o A5.

**Para rearmar o teste:** o limite de hoje já disparou (`firedAt` e `escalatedAt`
gravados), então o serviço não interrompe de novo até ser reconfigurado. Na tela
de laboratório, escolher o modo na seção A4 e tocar em "Iniciar limite" na A2 —
isso limpa os dois campos. Lembrar que o limite conta o uso do dia inteiro: o
Instagram já tem uso em 18/09, então o valor precisa ficar acima dele.

**Estado do aparelho ao fim da sessão de 18/09/2026:** serviço em primeiro plano
ativo, limite de 2 min no Instagram já disparado, modo sobreposição, todas as
permissões concedidas (acesso a dados de uso, notificação, sobreposição). Metro
desligado.

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
| A4 | ⏳ Parcial | Abordagem (a), sobreposição: apareceu sobre o Instagram com o app fechado, 20 s após a notificação; "Emergência" registrou `emergency_tapped`. O Instagram continua em primeiro plano por baixo. **Faltam:** "continuar mesmo assim", botão Voltar, cobertura das barras e a abordagem (b) |
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

### Achado A4 (parcial) — tela de interrupção por sobreposição funciona

**Resultado: ⏳ parcial.** A abordagem (a), sobreposição, apareceu por cima do
Instagram com o protótipo fechado, e o botão "Emergência" funcionou. Mas o
critério da spec inclui o "continuar mesmo assim", que ainda não foi exercitado,
e a abordagem (b) não foi testada.

#### Sequência medida em 18/09/2026

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

#### O app monitorado continua "em uso" por baixo da sobreposição

O Instagram **não** recebeu `ACTIVITY_PAUSED` quando a sobreposição apareceu:
ficou em primeiro plano, por baixo dela, até 13:24:58. É a vantagem esperada da
abordagem (a) — o app de trás não é interrompido, e o "continuar" só precisa
remover a janela. Mas tem um efeito colateral: **o tempo olhando a tela de
interrupção conta como uso do Instagram**. Relevante para o A5 e para as
estatísticas do produto.

#### Permissão

As duas abordagens dependem de `SYSTEM_ALERT_WINDOW` ("Aparecer sobre outros
apps"), concedida manualmente nos Ajustes. O intent
`ACTION_MANAGE_OVERLAY_PERMISSION` com o pacote abriu a lista geral já rolada
até o Norte Lab.

A documentação do Android lista essa permissão como uma das exceções que deixam
um app em segundo plano iniciar uma activity — e, na mesma página, descreve como
abuso "um app em segundo plano inicia uma atividade sobre o app com que o usuário
está interagindo". Tecnicamente é o que fazemos. Risco a levar para o A10.

#### Pendente para fechar o A4

1. Tocar em **"Continuar mesmo assim"** e confirmar `continue_tapped` e o retorno
   ao Instagram no mesmo ponto.
2. Testar o **botão Voltar** do sistema sobre a sobreposição. Se ele a dispensa,
   decidir se é aceitável — o princípio P4 ("alertar, não bloquear") pode até
   preferir que sim.
3. Conferir se a sobreposição cobre as **barras de status e de navegação**.
4. Repetir tudo com a **abordagem (b)**, tela própria (botão "Tela própria" na
   seção A4 do laboratório), e comparar.

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
  `BroadcastReceiver` de `BOOT_COMPLETED`. Não implementado ainda.
  sem uso do app.
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
| 6 | Ler o log sem abrir o app | `adb shell run-as com.norte.lab.dev cat files/lab-events.jsonl` |
| 7 | Encerrar | matar o Metro no fim da sessão (P4) |

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
| I-10 | Com a sobreposição, o app monitorado continua em primeiro plano por baixo: o tempo diante da tela de interrupção conta como uso dele | Doc 01 §6.2 e §6.8 | Descontar esse tempo das estatísticas e da streak de moderação |
| I-9 | Custo medido do monitoramento: 0,138% de CPU e 0,65% do consumo do aparelho, incluindo ruído do ambiente de desenvolvimento | Doc 02 riscos (bateria) | O risco de bateria parece baixo; confirmar no roteiro T6 |

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
| Porta 8081 ocupada? | `netstat -ano \| grep :8081` e `taskkill //PID <pid> //F` |
| Emulador (bloqueado por P2) | `emulator -avd lab_android16` |

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

---

## Ajustes em `android/gradle.properties`

Esse arquivo é regerado por `expo prebuild --clean`. Depois de cada regeração,
reaplicar se quiser builds mais rápidos:

```
reactNativeArchitectures=arm64-v8a,x86_64
```

O padrão inclui também `armeabi-v7a` e `x86`, que não servem nem ao S22 (arm64)
nem ao emulador (x86_64) e só fazem o build demorar mais.
