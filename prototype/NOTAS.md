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

### D4 — `queryAndAggregateUsageStats` em vez de `queryUsageStats`
Para os minutos de hoje.

**Motivo:** `queryUsageStats(INTERVAL_DAILY, ...)` devolve os baldes de intervalo
que o próprio sistema montou, e as bordas desses baldes não coincidem com "hoje".
`queryAndAggregateUsageStats(início, agora)` agrega exatamente o intervalo pedido.
Se os números divergirem do Bem-estar digital, o plano B é `queryEvents`, que dá os
eventos brutos de entrada e saída de primeiro plano — e que provavelmente será
necessário de qualquer forma no A2.

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
| S1 | ⏳ compila | `BUILD SUCCESSFUL in 8m 12s`, `app-debug.apk` (131,5 MB) gerado em 16/09/2026. Falta instalar e abrir num aparelho |
| S4 | ⏳ em andamento | código escrito e compilando; falta ver o evento nativo aparecer na tela |
| A1 | ⏳ em andamento | código escrito e compilando; falta rodar com o acesso concedido |

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

---

## Ajustes em `android/gradle.properties`

Esse arquivo é regerado por `expo prebuild --clean`. Depois de cada regeração,
reaplicar se quiser builds mais rápidos:

```
reactNativeArchitectures=arm64-v8a,x86_64
```

O padrão inclui também `armeabi-v7a` e `x86`, que não servem nem ao S22 (arm64)
nem ao emulador (x86_64) e só fazem o build demorar mais.
