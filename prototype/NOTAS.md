# NOTAS — Diário técnico do protótipo

> Fase 1. Registro de decisões, problemas e comandos. Uma entrada por experimento,
> com resultado (✅ / ⚠️ / ❌) e evidência.

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

A leitura passa a ser por `queryEvents`, somando os intervalos entre
`ACTIVITY_RESUMED` e `ACTIVITY_PAUSED`, **indexados por activity e não por
pacote** (ver achado A1 — indexar por pacote causou um erro de 63 minutos).

O método agregado continua no código como termo de comparação. Ele não está
"quebrado": para um total do dia sem urgência, funciona.

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
| A1 | ⚠️ Funciona com limitações | Lista de minutos por app funciona, mas só pelo caminho de eventos. Ver achado abaixo |

### Achado A1 — precisão da leitura de uso

O critério da spec ("lista com minutos de hoje por app") é atendido. Mas chegar
a números confiáveis exigiu duas correções, e uma delas foi um erro nosso.

#### O que funciona

`queryEvents`, somando os intervalos entre `ACTIVITY_RESUMED` e
`ACTIVITY_PAUSED`. Validação independente em 17/09/2026: para o app Config., o
nosso número (7 min) bateu **exatamente** com o do Bem-estar digital da Samsung
(7 m).

#### Erro cometido e corrigido

A primeira versão tratava `ACTIVITY_STOPPED` como fim de intervalo. Está errado:
esse evento fala do ciclo de vida de **uma instância** de activity, e numa
recriação o `STOPPED` da instância antiga chega depois do `RESUMED` da nova.
Trecho real do log do sistema:

```
12:13:18  ACTIVITY_RESUMED
12:13:51  ACTIVITY_PAUSED
12:13:51  ACTIVITY_RESUMED    <- instância nova assume
12:13:51  ACTIVITY_STOPPED    <- instância antiga sendo destruída
13:17:04  ACTIVITY_PAUSED
```

Como o índice era por pacote, aquele `STOPPED` das 12:13:51 fechou um intervalo
que estava vivo, e o app ficou 63 minutos em primeiro plano sem ser contado: a
leitura dava 6 min onde o correto era 1 h 10.

**Correção:** indexar por activity (`pacote|classe`) e fechar intervalo apenas em
`ACTIVITY_PAUSED`. Depois disso o número passou a bater com o do sistema.

#### Erro de método (importante)

A conclusão anterior registrada aqui — "o `totalTimeInForeground` conta tela
apagada" — **foi retirada**. Ela vinha de um teste mal controlado: houve 67
minutos entre duas leituras, e presumiu-se que o aparelho estivera bloqueado
esse tempo todo. O responsável apontou que não foi isso. O log do sistema
confirmou:

```
13:17:10  SCREEN_NON_INTERACTIVE
13:21:18  SCREEN_INTERACTIVE
```

A tela ficou apagada **4 minutos**, não 67. Nos outros 63 ela esteve acesa com o
app à frente (a opção "Permanecer ativo" estava ligada e o aparelho carregando).
Ou seja, o agregado estava certo e a nossa leitura é que estava quebrada — o
oposto do que se concluiu.

**Lição para os próximos experimentos:** não inferir o estado do aparelho a
partir do relógio. O `dumpsys usagestats` dá o histórico com carimbo de tempo,
incluindo tela ligando e desligando, e deve ser coletado junto de cada medição.

#### Limitação confirmada: atraso do método agregado

Leituras às 12:03 e 12:06 devolveram valores idênticos, com o app em uso no
intervalo; às 12:14 já haviam mudado. O caminho agregado atualiza em lotes, com
atraso de vários minutos. Isso basta para descartá-lo como gatilho de alerta em
tempo real, que é o que o A2 precisa.

#### Em aberto

- **Divergência residual.** Às 13:38, Norte Lab: agregado 1 h 25, eventos 1 h 10.
  Do intervalo de 15 min, 4 min correspondem à janela de tela apagada; o restante
  não está explicado.
- **O agregado conta tela apagada?** Não sabemos. A pergunta segue aberta e
  precisa de um teste controlado: registrar hora de início, bloquear por um tempo
  conhecido, e conferir contra o `dumpsys` antes de concluir.
- **Galeria** aparece no agregado (3 min) e some nos eventos, mesmo após a
  correção. Investigar no A2.

#### Impacto no produto

- Usar `queryEvents` para medir uso e para detectar limite.
- A tela inicial do sistema aparece na lista e precisa ser filtrada.
- Antes de prometer precisão de minuto em estatísticas, validar em mais de um
  aparelho: a diferença entre métodos no mesmo app chegou a 15 minutos.
### Outros achados do dia

- **Intent direcionado funciona no One UI 8.** `ACTION_USAGE_ACCESS_SETTINGS` com
  `Uri.fromParts("package", ...)` abre direto a tela do próprio app, com um único
  interruptor, em vez da lista com dezenas de apps. Registrado no log como
  `rota: targeted`. Bom para o onboarding do app definitivo.
- **`<queries>` MAIN/LAUNCHER basta.** Os nomes dos apps foram resolvidos
  corretamente sem `QUERY_ALL_PACKAGES`.
- **`AppState` detecta o retorno dos Ajustes.** O status da permissão virou de
  "negado" para "concedido" sozinho quando o app voltou ao primeiro plano.
- **O log persiste entre reinstalações.** Relevante para o A9.

**Evidência do merge de manifesto (A1).** No manifesto final gerado pelo build,
`android/app/build/intermediates/merged_manifest/debug/.../AndroidManifest.xml`:

- `<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />` presente;
- o `<intent>` MAIN/LAUNCHER presente dentro do bloco `<queries>`;
- `QUERY_ALL_PACKAGES` ausente.

Confirma a decisão D3: o manifesto do módulo é mesclado ao do app sem config plugin.

Observação para o A4: o template do Expo já declara `SYSTEM_ALERT_WINDOW` por
padrão. A permissão de sobreposição talvez não precise ser adicionada, só
solicitada em tempo de execução.

### Roteiro da próxima sessão — Galaxy S22

Decidido em 16/09/2026: seguimos pelo **cabo USB**, não pelo emulador. O caminho
do emulador continua disponível se a virtualização for ativada um dia (ver P2).

**Preparação do aparelho (antes da sessão):**

1. Ter um cabo **USB-A → USB-C de dados**. Cabos de carregamento baratos muitas
   vezes não têm os fios de dados: o aparelho carrega e o `adb` nunca o enxerga.
2. Ajustes → Sobre o telefone → Informações do software → tocar **7 vezes** em
   "Número da versão". Aparece "Você agora é um desenvolvedor".
3. Ajustes → Opções do desenvolvedor → ativar **Depuração USB** e
   **Instalar via USB** (o segundo é específico da Samsung; sem ele a instalação
   falha sem mensagem clara).
4. Conectar ao PC e **autorizar a chave RSA** no aviso que aparece no aparelho,
   marcando "Sempre permitir".
5. Usar Instagram ou YouTube por alguns minutos no dia do teste, para existir
   uso real a ser lido.

**Na sessão:**

| Passo | Como |
|---|---|
| Confirmar que o PC vê o aparelho | `adb devices` |
| Compilar e instalar | `npm run android` |
| Conceder o acesso | botão na tela, ou Configurações → Apps → ⋮ → **Acesso especial** → **Acesso a dados de uso** |
| Ler o uso | botão "Ler uso de hoje" |
| Conferir | comparar com Ajustes → **Bem-estar digital e controles parentais** |

Se o Windows não reconhecer o S22, pode ser necessário o driver USB da Samsung.

### Pendências de aparelho
O Galaxy S22 ainda não foi conectado (falta o cabo) e o emulador não dá boot
(P2). Enquanto nenhum dos dois rodar, nada pode ser marcado como ✅: o critério é
evidência no log ou confirmação do responsável no aparelho.

O que já está provado sem aparelho: o projeto compila, o módulo nativo compila e
o manifesto é mesclado corretamente. O que não está provado: se o
`UsageStatsManager` devolve números corretos, se o log escrito pelo Kotlin
aparece na tela, e se o intent abre a tela de Ajustes certa no One UI.

### Campos adiados
A spec §5.1 prevê campos de motivação de teste e de limite em minutos na tela de
laboratório. Ficaram para o A2, quando passam a ter efeito — antes disso seriam
campos sem função.

---

## Comandos

| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Verificar tipos | `npm run typecheck` |
| Lint | `npm run lint` |
| Compilar e instalar no aparelho/emulador | `npm run android` |
| Servidor de desenvolvimento | `npx expo start --dev-client` |
| Regerar o projeto nativo | `npx expo prebuild --platform android --clean` |
| Compilar só o APK | `cd android && .\gradlew.bat assembleDebug` |
| Ver aparelhos conectados | `adb devices` |
| Iniciar o emulador | `emulator -avd lab_android16` |
| Listar emuladores | `emulator -list-avds` |

Após `prebuild --clean`, recriar `android/local.properties` com a linha
`sdk.dir=C\:\\Users\\User\\AppData\\Local\\Android\\Sdk`.

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

## Tentativas malsucedidas

- `--enable-native-access=ALL-UNNAMED` no `org.gradle.jvmargs` para contornar o P1
  (não alcança o processo certo).
- Somar tempo de uso fechando intervalo em `ACTIVITY_STOPPED`, indexado por
  pacote. Perdeu 63 minutos de uso real. Ver achado A1.
- Concluir sobre o comportamento do `totalTimeInForeground` a partir do tempo
  decorrido entre duas leituras, sem verificar o estado do aparelho. Levou a uma
  conclusão invertida, corrigida depois pelo `dumpsys usagestats`.

---

## Ajustes em `android/gradle.properties`

Esse arquivo é regerado por `expo prebuild --clean`. Depois de cada regeração,
reaplicar se quiser builds mais rápidos:

```
reactNativeArchitectures=arm64-v8a,x86_64
```

O padrão inclui também `armeabi-v7a` e `x86`, que não servem nem ao S22 (arm64)
nem ao emulador (x86_64) e só fazem o build demorar mais.
