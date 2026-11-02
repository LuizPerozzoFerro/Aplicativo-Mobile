# NOTAS-APP — diário técnico do app definitivo

Decisões, problemas, tentativas e comandos do app da Fase 2 em diante. O diário
do protótipo continua em `prototype/NOTAS.md`.

---

## Divergências a levar ao chat de planejamento

### DV1 · Docs 01, 02 e spec 01 citam o relatório v0.2 e não incorporam a D6 (01/11/2026)

- O relatório no repositório é a **v0.4 (31/10/2026)**, mantida por decisão do
  responsável em 01/11/2026. A cópia exportada do Doc de trabalho era a v0.2
  (24/09/2026).
- Os docs 01 e 02 (v0.4) e a spec 01 citam `relatorios/01-viabilidade-monitoramento.md`
  como **v0.2**.
- A v0.4 traz a **decisão D6 (25/10/2026)**: a primeira versão publicada sai
  **sem a VPN** (A6, A7 e A8 ficam para uma versão posterior). Os docs ainda
  seguem a direção de 24/09:
  - doc 01, risco R3: "submeter a VPN declarada, com uma variante de build sem
    VPN como plano B";
  - doc 02: "Variantes de build com e sem VPN" (Fase 2), "Se a VPN for recusada:
    avaliar recurso e, se preciso, publicar a variante sem VPN" e risco T9.
- A v0.4 também registra o **I-25 medido em app real** (o Nubank apaga a nossa
  sobreposição), que não aparece nos docs.
- **Status:** **resolvida em 01/11/2026** no chat de planejamento. Docs 01 e 02
  passaram à v0.5 e a spec 01 à v0.3, todos citando o relatório v0.4: a D6 está
  no doc 01 (seção 3.2) e no doc 02 (seção 3.4, build único sem VPN); não há
  variante de VPN, só a flag `features.domainMonitoring` (sempre `false`) e a
  verificação do manifesto contra `BIND_VPN_SERVICE`,
  `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` e `HIDE_OVERLAY_WINDOWS` (spec 4.3).

## Passo 1 · Preparação (01/11/2026)

### Versão do Expo: SDK 58

- `npm view expo dist-tags`: `latest` = **58.0.22** (31/10/2026). O SDK 58.0.0
  saiu em 29/09/2026. O protótipo usa o SDK 57 (`expo ~57.0.23`, RN 0.86.3).
- O template `blank-typescript@sdk-58` traz: `expo ~58.0.22`, `react-native
  0.88.1`, `react 19.3.0`, `typescript ~6.0.3`.
- Fonte: <https://expo.dev/changelog/sdk-58>. Atenção: durante a transição,
  `create-expo-app@latest` **sem** `--template` ainda cria um projeto SDK 57.

**Diferenças do SDK 58 relevantes para o módulo nativo (Fase 4):**

- **Expo Modules 2.0 em beta**: permite anotar classes Kotlin comuns em vez da
  DSL `ModuleDefinition`. A DSL usada no protótipo continua funcionando, e não
  há mudança incompatível listada para módulos Kotlin. Portar com a DSL e só
  avaliar a 2.0 quando sair do beta.
- **R8 ligado por padrão no build de release**
  (`android.enableMinifyInReleaseBuilds=true`). Código que use reflexão pode
  precisar de regras `keep`. Na Fase 4, testar o módulo num build **release**,
  não só no debug.
- `expo-modules-core` passa a vir com `.so` pré-compilados para as 4 ABIs
  (compilar do código-fonte só com `android.buildExpoModulesCoreFromSource`).
- Ferramentas de módulo compatíveis com o AGP 9.
- RN 0.87+: a API estrita de TypeScript é o padrão, e importações profundas de
  `react-native/Libraries/*` viram erro de tipo. `InteractionManager` foi
  removido.
- A Expo CLI define `NODE_ENV` conforme o comando, o que muda qual `.env` é
  carregado.
- `expo-sqlite`: suporte a libSQL removido (não usamos).
- `expo-router`: núcleo de navegação reescrito. Importações de
  `expo-router/react-navigation` e navegadores próprios podem quebrar, e
  `withLayoutContext` foi substituído por `integrateWithRouter`.

### Ambiente conferido

| Ferramenta | Versão | Observação |
|---|---|---|
| Node | 24.19.0 | O SDK 58 exige 22.13+, 24.3+ ou 26+ (sem versões ímpares) |
| npm | 11.17.0 | |
| JDK | Temurin 17.0.20 (`JAVA_HOME`) | |
| Android SDK | `C:\Users\User\AppData\Local\Android\Sdk` (`ANDROID_HOME`) | |

### Exclusão do `prototype/`

O `prototype/` tem o próprio `package.json` e o próprio `node_modules`. A
exclusão é explícita em cada ferramenta: `tsconfig.json` (`exclude`), ESLint
(`ignores`), Jest (`testPathIgnorePatterns` e `modulePathIgnorePatterns`) e
Metro (`resolver.blockList`). O `.gitignore` da raiz cobre o repositório
inteiro.

## Passo 2 · Projeto e variantes (01/11/2026)

### Como o projeto foi criado

`create-expo-app` não cria projeto em pasta com arquivos, e a raiz já tem
`docs/` e `prototype/`. O projeto foi gerado numa pasta temporária com
`npx create-expo-app@latest quedo --template blank-typescript@sdk-58 --no-install`,
e só `package.json` e `tsconfig.json` vieram para a raiz. `App.tsx`, `index.ts`,
`AGENTS.md`, `LICENSE` e os ícones com a marca do Expo ficaram de fora.

### Bibliotecas adicionadas

Todas pelo `npx expo install`, que escolhe as versões compatíveis com o SDK 58.

| Biblioteca | Versão | Código nativo | Por quê |
|---|---|---|---|
| `expo-router` | ~58.0.29 | sim | Navegação, prevista na stack (CLAUDE.md §6) |
| `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-constants` | — | sim | Dependências obrigatórias do Expo Router, segundo a instalação manual em <https://docs.expo.dev/router/installation/>. O `expo-constants` também é como o JS lê a variante |
| `expo-dev-client` | ~58.0.18 | sim | Development build (CLAUDE.md §5, "nunca Expo Go"). Sem ele, o app pede `/index.bundle` e o Metro do Router não responde (P5 do protótipo) |
| `expo-status-bar` | ~58.0.4 | não | Já vem no template |

### Variantes (spec 4.2 e 4.3)

- `APP_ENV` (`development`, `preview` ou `production`) é lido no `app.config.ts`. Sem a variável, vale
  `development`; um valor inválido derruba a avaliação da config com erro
  explícito. Conferido com `npx expo config --type public`:

  | `APP_ENV` | nome | package | scheme |
  |---|---|---|---|
  | (vazio) | Quedo Dev | `br.com.quedo.app.dev` | `quedo-dev` |
  | `preview` | Quedo Preview | `br.com.quedo.app.preview` | `quedo-preview` |
  | `production` | Quedo | `br.com.quedo.app` | `quedo` |
  | `bogus` | erro: "APP_ENV inválido" | | |

- O JS lê a variante só por `src/config/variant.ts` (`variant.environment`,
  `variant.features.domainMonitoring`, sempre `false`). O valor chega por
  `expoConfig.extra.environment`.
- **Cuidado:** num build de desenvolvimento, a config vem do Metro. O ambiente
  mostrado é, portanto, o do processo do Metro, não o do build. Nos builds
  `preview` e `production`, a config fica embutida no momento do build.
- `allowBackup: false` já no `app.config.ts` (spec 4.6).
- `blockedPermissions`: `READ_EXTERNAL_STORAGE` e `WRITE_EXTERNAL_STORAGE`, que
  o template declara e o app não usa. Elas saem do manifesto com
  `tools:node="remove"`.
- `SYSTEM_ALERT_WINDOW` e `VIBRATE` vêm do template e ficaram. A sobreposição
  vai ser necessária na Fase 4.

### Ícone provisório

`scripts/generate-placeholder-icons.mjs` gera, só com o Node, um círculo claro
sobre fundo azul-acinzentado (`#3F5A66`): `icon.png` e as camadas do ícone
adaptativo (frente e monocromática). Não tem letra nem símbolo.

### Pendências que dependem do responsável

- **Splash:** o plugin `expo-splash-screen` não vem com o Expo e tem código
  nativo. Sem ele, o Android 12+ mostra o ícone do app sobre o fundo da janela
  na abertura, o que já é neutro. Instalar só com confirmação.
- **Tema escuro nativo:** o prebuild avisa que `userInterfaceStyle` no Android
  exige `expo-system-ui` (código nativo). Decidir no passo 5 (design system),
  junto com o V7.

### Verificação do manifesto (spec 4.3, V10)

`node scripts/check-manifest.js` confere os manifestos **mesclados** em
`android/app/build/intermediates`, que é o que vai no APK e inclui as
permissões das bibliotecas, contra `BIND_VPN_SERVICE` (inclusive um `<service>`
que a exija ou responda a `android.net.VpnService`),
`FOREGROUND_SERVICE_SYSTEM_EXEMPTED` e `HIDE_OVERLAY_WINDOWS`. Também aceita
caminhos como argumento. Controle positivo: contra o manifesto do módulo do
protótipo, acusa as três (código de saída 1). Sem build, sai com código 2.

### Primeiro build no S22 (critério do passo 2)

- `br.com.quedo.app.dev` instalado ao lado do protótipo (`com.norte.lab.dev`):
  saída de `adb shell pm list packages --user 0`.
- Metro: `Android Bundled 21404ms node_modules\expo-router\entry.js (1279
  modules)`. `topResumedActivity = br.com.quedo.app.dev/.MainActivity`.
- Captura de tela: "development" na tela, "Quedo Dev" e o ícone neutro no
  menu do dev client. A captura não foi versionada, porque a barra de status
  mostra notificações pessoais.
- `adb shell pm list packages` sem `--user 0` falha no S22 com "Shell does not
  have permission to access user 150" (perfil da Pasta Segura).

### Manifesto mesclado do build de desenvolvimento

`node scripts/check-manifest.js`: **OK** nos 3 manifestos mesclados do debug.
Permissões finais: `INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`,
`ACCESS_NETWORK_STATE`, `ACCESS_LOCAL_NETWORK`, `CHANGE_WIFI_MULTICAST_STATE`
e a `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` do próprio app. As duas de rede
local devem vir do dev client (descoberta do Metro na rede). Conferir no build
de produção (V10) que elas não vão junto.

### EAS

`eas.json` com os perfis `development` (apk, dev client), `preview` (apk) e
`production` (aab, `autoIncrement`), cada um com o seu `APP_ENV`. Usa
`appVersionSource: "remote"`. A versão atual do `eas-cli` é a 27.2.0.

**Projeto EAS (02/11/2026):** depois do login do responsável, rodei
`npx eas-cli@latest init --account luizperozzoferro --non-interactive`, que
criou `@luizperozzoferro/quedo` (<https://expo.dev/accounts/luizperozzoferro/projects/quedo>).
A conta também tem a organização `luizperozzoferros-team`; ficou a conta
pessoal, coerente com a conta de desenvolvedor como pessoa física. Com config
dinâmica, o `eas init` não grava sozinho: `owner` e `extra.eas.projectId`
foram postos à mão no `app.config.ts`. O ID não é segredo. Rodando de novo, o
`eas init` responde "Project already linked". O `eas build:configure
--platform android` aceitou o `eas.json` sem mudanças. Nenhum build na nuvem
foi rodado.

## Passo 3 · Qualidade (02/11/2026)

### Ferramentas

| Biblioteca | Versão | Por quê |
|---|---|---|
| `eslint` + `eslint-config-expo` | 9.39 / ~58.0.4 | Lint em formato flat, como no guia do Expo: <https://docs.expo.dev/guides/using-eslint/> |
| `prettier` + `eslint-config-prettier` + `eslint-plugin-prettier` | 3.9 / 10.1 / 5.5 | Formatação conferida pelo próprio lint (`prettier/prettier` como erro) |
| `jest` + `jest-expo` + `@types/jest` | 30.5 / ~58.0.13 / 30.0 | O `jest-expo` do SDK 58 exige Jest 30: <https://docs.expo.dev/develop/unit-testing/> |
| `@testing-library/react-native` | 14.1 | O guia pede a versão 14+ para testar o Expo Router. O `react-test-renderer` está obsoleto no React 19 |

Todas são só de desenvolvimento, sem código nativo.

### Configuração

- **Scripts:** `lint` (`expo lint`), `format`, `format:check`, `typecheck`
  (`tsc --noEmit`), `test` (`jest`) e `check:manifest`.
- **TypeScript:** `strict` e `noUncheckedIndexedAccess`. `types: ["jest",
  "node"]`, porque o TypeScript 6 não inclui mais os `@types` automaticamente.
- **Jest:** preset `jest-expo`, alias `@/` para `src/`
  (`moduleNameMapper`), `prototype/` e `android/` fora
  (`testPathIgnorePatterns` e `modulePathIgnorePatterns`).
  - O `jest.setup.ts` simula o `expo-constants` com `environment:
    'development'`, porque o `src/config/variant.ts` lança erro sem a config.
- **ESLint:** `globalIgnores` para `prototype/`, `android/`, `ios/`, `.expo/`,
  `dist/` e `coverage/`. Analisa 12 arquivos. Sonda: um arquivo com aspas
  duplas e sem ponto e vírgula deu 2 erros do `prettier/prettier`.
- **Prettier:** aspas simples, vírgula final e 100 colunas. O `.prettierignore`
  deixa de fora `docs/`, os `.md` e o `prototype/`.
- **Quebras de linha:** `.gitattributes` com `* text=auto eol=lf`. O git
  deste Windows usa `core.autocrlf=true` e converte para CRLF no checkout, e o
  Prettier acusaria todas as linhas. O `git add --renormalize .` não mudou
  conteúdo: o índice já estava em LF.
- **Node 24** fixado em `.nvmrc` (lido pelo CI) e em `engines` (`>=24.3 <25`,
  mínimo do SDK 58 na linha 24).
- **`react-dom` fixado em 19.3.0** por `overrides`. O `expo-router` traz
  componentes web (Radix) que pedem `react-dom`. O npm escolhia a 19.3.1, que
  exige `react` 19.3.1, e o SDK 58 fixa `react` 19.3.0
  (`expo/bundledNativeModules.json` indica `react-dom` 19.3.0). Sem o
  override, `npm install` de qualquer pacote novo falhava com `ERESOLVE`.
- **`expo install` com `-- --save-dev`** pôs 4 pacotes em `dependencies`. Eles
  foram movidos à mão para `devDependencies`.

### Testes

- `src/config/variant.test.ts`: os três ambientes; flag `domainMonitoring`
  sempre `false`; erro com config ausente ou inválida; leitura pelo
  `expo-constants` simulado.
- `scripts/check-manifest.test.ts`: `findForbidden` com um manifesto limpo
  (inclusive `SYSTEM_ALERT_WINDOW` e serviço `specialUse`, permitidos) e um com
  as três proibições, mais casos de `BIND_VPN_SERVICE` como `uses-permission`
  e de serviço que responde a `android.net.VpnService`.
- **Mutação de controle:** sem `HIDE_OVERLAY_WINDOWS` na lista, 1 teste falha.
  Restaurada a lista, os 4 passam.
- Resultado: `Test Suites: 2 passed`, `Tests: 14 passed`.

### CI

`.github/workflows/ci.yml` roda em todo push e pull request: `npm ci`, `lint`,
`format:check`, `typecheck` e `test --ci`. Usa `actions/checkout@v7` e
`actions/setup-node@v7` (versões mais recentes em 02/11/2026), com Node do
`.nvmrc` e cache do npm. Sem build nativo nesta fase.

### Ferramentas da máquina

- **GitHub CLI 2.103.3** instalado com `winget install --id GitHub.cli` e
  logado pelo responsável. Fica em `C:\Program Files\GitHub CLI\gh.exe`; shells
  abertos antes da instalação não o têm no `PATH`.

## Problemas

### AP1 · Build Android falha no C++ do `react-native-worklets` (caminho longo)

**Sintoma:** `gradlew installDebug` cai após ~10 min em
`:react-native-worklets:buildCMakeDebug[arm64-v8a]` com
`ninja: error: mkdir(CMakeFiles/worklets.dir/C_/Users/User/Documents/GitHub/Aplicativo-Mobile/node_modules/react-native-worklets/Common/cpp/...): No such file or directory`.

**Causa:** o worklets 0.13.1 vem obrigatoriamente com o SDK 58 (dependência
do `expo-router` e do `expo-modules-core`; o protótipo usava a 0.10.1). O
CMake monta o caminho dos objetos repetindo o caminho absoluto do projeto, e o
mais longo chega a **308 caracteres**. O Windows está com caminhos longos
desligados (`LongPathsEnabled = 0`), e o ninja do SDK (CMake 3.22.1, ninja
1.10.2) não lida com caminhos longos. O guia de build no Windows da Software
Mansion cita o mesmo erro e pede ninja 1.12+ e caminhos longos ligados:
<https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows>.

**Tentativa que não funcionou:** `subst Q:` apontando para o projeto.
1. Na raiz da unidade (`Q:\`), o `expo-modules-autolinking` não acha o
   `package.json` e o `settings.gradle` falha.
2. Com `Q:` na pasta `GitHub` (`Q:\Aplicativo-Mobile`), o autolinking funciona,
   mas devolve as bibliotecas pelo caminho real (`C:\Users\...`). O worklets
   seria compilado pelo caminho longo do mesmo jeito.

Unidade removida (`subst Q: /d`).

**Solução (01/11/2026, escolhida pelo responsável entre esta e mover o
repositório para `C:\dev\quedo`):**

1. O responsável ligou `LongPathsEnabled = 1` (PowerShell como administrador):
   `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force`
2. CMake **3.31.6** (com **ninja 1.12.1**) instalado no SDK com
   `android.exe sdk install cmake/3.31.6`. O `sdkmanager.bat` responde "Package
   not found" porque o CLI novo usa `cmake/3.31.6`, com barra. Ficou na série
   3.x porque o CMake 4 recusa `cmake_minimum_required` abaixo de 3.5.
3. Nenhuma biblioteca fixa a versão do CMake. O config plugin
   `plugins/with-local-cmake.js` grava `cmake.dir` no `android/local.properties`
   a cada prebuild, e só age se o CMake 3.31.6 existir no SDK da máquina.
   Conferido no `CMakeCache.txt` do worklets: `CMAKE_COMMAND` e
   `CMAKE_MAKE_PROGRAM` apontam para `cmake/3.31.6`.
4. `gradlew --stop` e remoção dos `.cxx` das bibliotecas antes de recompilar.

**Resultado:** `BUILD SUCCESSFUL in 20m 12s` (build limpo), `Installed on 1
device`. **Status:** resolvido.

**Atenção:** o Android Studio, se usado para compilar, também precisa do
Gradle JDK apontado para o Temurin 17 (P1 do protótipo).

## Decisões do responsável (01/11/2026)

- Pontos 4 a 7 da leitura da spec aprovados e incorporados na spec v0.3
  (`src/config/`, voltar do Android no onboarding, `age_confirmed_at` nulo até a
  Fase 3, enums técnicos nunca em logs).
- **Sentry:** fica para antes da Fase 8. Não instalar agora.
- **Banco:** Drizzle ORM sobre `expo-sqlite`, com o teste de duas migrações no
  aparelho (V11).

## Decisões do responsável (02/11/2026)

- PR #1 (passos 1 e 2) revisado e integrado na `main`.
- **`expo-system-ui` aprovado** para o passo 5 (tema escuro nativo, V7).
- **`expo-splash-screen` adiado** até haver identidade visual. Até lá, o
  Android 12+ mostra o ícone sobre o fundo da janela.
- **Voltar preditivo:** o template do SDK 58 traz
  `android.predictiveBackGestureEnabled: false`, mantido no `app.config.ts`.
  Com ele desligado, o Android não mostra a animação de prévia do gesto de
  voltar. **Precisa ser testado ligado na Fase 4**, junto com a tela de
  interrupção e o tratamento do voltar.
- Teste do `findForbidden`, simulação do `expo-constants` e Node 24 fixado
  (inclusive no CI) foram pedidos para o passo 3 e estão feitos.
