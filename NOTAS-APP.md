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

**CI no GitHub:** o PR #2 passou nas execuções de push e de pull request
(`gh run list`: `completed success`, cerca de 1m50s).

## Passo 4 · Internacionalização (02/11/2026)

### Bibliotecas

| Biblioteca | Versão | Código nativo | Por quê |
|---|---|---|---|
| `i18next` | ^26.7.1 | não | Prevista na stack (CLAUDE.md §6). Atualizada em 01/11/2026; aceita TypeScript 5 a 7 |
| `react-i18next` | ^17.1.11 | não | Prevista na stack. Exige `i18next` >= 26.2 |
| `expo-localization` | ~58.0.5 | sim | Prevista na stack: lê os idiomas do aparelho. Versão do SDK 58 pelo `expo install` |
| `eslint-plugin-i18next` | ^6.1.5 (dev) | não | Regra contra texto fixo em JSX. Atualizado em 06/2026. O alternativo `eslint-plugin-react-native` (`no-raw-text`) está sem atualização desde 12/2024 |

### Estrutura

- `src/i18n/pt-BR/{common,onboarding,tabs}.json`: um arquivo por
  funcionalidade (namespace). As chaves são em inglês; os textos, em português.
- `src/i18n/resources.ts`: recursos por idioma, `DEFAULT_LANGUAGE = 'pt-BR'`,
  `DEFAULT_NAMESPACE = 'common'`.
- `src/i18n/index.ts`: inicialização única, importada pelo `app/_layout.tsx`.
  É síncrona (`initAsync: false`), com os recursos embutidos.
- `src/i18n/language.ts`: `resolveLanguage(idiomas do aparelho)`. Escolhe o
  primeiro suportado (exato ou pelo idioma base); senão, pt-BR. Hoje o
  resultado é sempre pt-BR.
- `src/i18n/format.ts`: `formatDate`, `formatTime` e `formatNumber`, sempre no
  idioma ativo (`Intl`). Nenhuma tela chama `Intl` ou `toLocaleString` direto.
- `src/i18n/i18next.d.ts`: `CustomTypeOptions` com os recursos do pt-BR. Uma
  chave inexistente quebra o typecheck. Conferido: `t('foundation.dayz')` deu
  `Type '"foundation.dayz"' is not assignable`.

### Convenção de uso

- Cada componente declara o namespace: `const { t } = useTranslation('onboarding')`,
  com chaves sem prefixo (`t('welcome.title')`).
- O prefixo `ns:chave` funciona em tempo de execução, mas a tipagem do i18next
  26 recusa o prefixo em plurais e em algumas interpolações. Por isso, a forma
  com namespace no `useTranslation` é a padrão.
- Chaves sempre literais: o teste de chaves recusa `t(variavel)` e template
  com `${}`.
- **Plural com zero (decisão do responsável, 02/11/2026):** toda chave com
  contagem que pode ser zero tem a forma **`_zero`** além de `_one` e
  `_other`. Pelo CLDR, `Intl.PluralRules('pt-BR').select(0)` é `"one"`, então
  sem `_zero` o i18next escreve "0 dia". Conferido com `i18next` puro: sem
  `_zero`, `0 dia | 1 dia | 2 dias`; com `_zero`, `0 dias | 1 dia | 2 dias`.
  - O `keys.test.ts` **falha** se houver plural sem `_zero`. A única saída é
    listar a chave em `PLURALS_WITHOUT_ZERO`, para contagens que nunca chegam
    a zero. A falha, em vez de aviso no console, faz de cada exceção uma
    decisão registrada no código.
  - Mutação de controle: sem `days_zero`, falham o teste de plurais e o
    "0 dias" do componente.

### Regra de lint contra texto fixo (spec 4.5)

`i18next/no-literal-string` como **erro**, modo `jsx-only`, com
`should-validate-template`. A checagem de atributos fica restrita a
`accessibilityLabel`, `accessibilityHint`, `aria-label`, `placeholder`,
`title`, `label` e `alt`. Arquivos de teste ficam de fora.

Testado com um arquivo de sonda (removido):

| Caso | `jsx-text-only` (padrão) | Configuração adotada |
|---|---|---|
| `<Text>Texto fixo</Text>` | erro | erro |
| `<Text>{'literal'}</Text>` | passa | erro |
| `` <Text>{`template`}</Text> `` | passa | erro |
| `'a' + 'b'` em JSX | passa | erro |
| `accessibilityLabel="…"`, `placeholder="…"` | passa | erro |
| `testID`, `nativeID`, `style` | passa | passa |
| `{label}` (variável) | passa | passa |

O modo `jsx-only` sem a restrição de atributos também acusava `testID`.

### Textos fora do JSX (pedido do responsável para o passo 6)

A regra do i18next só enxerga JSX. Opções de navegação (`options={{ title }}`),
`Alert.alert` e conteúdo de notificação também são texto visível. Em
`eslint.config.js`, `no-restricted-syntax` (regra nativa do ESLint, sem
dependência nova) dá **erro** para:

- texto literal ou template como valor das propriedades `title`,
  `headerTitle`, `headerBackTitle`, `tabBarLabel`, `tabBarAccessibilityLabel`,
  `drawerLabel`, `accessibilityLabel`, `accessibilityHint`, `placeholder`,
  `label`, `text`, `message`, `description`, `subtitle` e `body`, em
  **qualquer objeto**;
- argumentos literais ou template de `Alert.alert`, `Alert.prompt` e
  `ToastAndroid.show*`.

Sonda (removida): acusou `Alert.alert('…', `…`, [{ text: 'OK' }])`,
`ToastAndroid.show('…')`, `{ title: 'Lembrete', body: `Hora de ${…}` }` e
`options={{ title: 'Início', tabBarLabel: 'Início' }}`. Deixou passar
`testID`, `variant`, `channelId`, `href`, `headerShown` e valores vindos do
`t()`. O projeto inteiro passou sem falso positivo. A config do Expo não usa
`no-restricted-syntax`, então nada dela foi substituído.

**Cuidados que o lint não cobre (revisar à mão):**

- Texto guardado numa constante e passado depois:
  `const msg = 'Olá'; Alert.alert(msg)`. A regra só vê o literal no lugar de
  uso.
- Propriedades de texto com nomes fora da lista. Ao usar uma API nova que
  mostra texto, acrescentar a propriedade em `TEXT_PROPERTIES`.
- Um nome da lista usado para algo técnico, com valor literal (ex.:
  `{ label: 'debug' }` num log). Nesse caso, desligar a regra na linha
  (`eslint-disable-next-line no-restricted-syntax`) com comentário dizendo o
  porquê.
- **Textos no Kotlin (Fase 4):** notificações e a tela de interrupção montadas
  no nativo não passam pelo ESLint. Elas devem receber o texto já traduzido
  do JS ou usar `strings.xml`, com a mesma discrição da tela bloqueada
  (CLAUDE.md §9).

### Testes

- `keys.test.ts`: varre `app/` e `src/` e confere que **toda chave usada
  existe no pt-BR** (texto ou plural `_one`/`_other`), que a varredura não está
  vazia e que não há chave dinâmica. Inclui testes da própria varredura:
  namespace do `useTranslation`, prefixo explícito, comentários ignorados e
  `format(`/`i18n.t(` não confundidos com `t(`.
  - Mutação de controle: com `t('foundation.titel')` na tela, 2 testes falham
    e apontam `app/index.tsx: common:foundation.titel`.
- `language.test.ts`: pt-BR, pt-PT pelo idioma base, e idiomas não suportados
  caindo no pt-BR.
- `format.test.ts`: data por extenso (`2 de março de 2026`), `02/03/2026`,
  `14:05`, `1.234,5`, `26%` e `en-US` explícito.
- `i18n.test.tsx`: inicialização síncrona em pt-BR, interpolação, outro
  namespace (`tabs:home`) e plural num componente renderizado (`1 dia`,
  `3 dias`).
- Resultado: 6 suítes, 36 testes passando (com os de plural no zero). Lint sem avisos.
- `import/no-named-as-default-member` acusava `i18n.use(...)` e `i18n.t(...)`.
  É um falso positivo com a instância padrão do i18next. No `index.ts`, a regra
  foi desligada só naquela linha, com comentário; no teste, foi usado o `t`
  importado pelo nome.

### No aparelho (S22)

O `expo-localization` tem código nativo, então foi preciso rodar o prebuild e
reinstalar. Metro: `Android Bundled ... (1316 modules)`. Com o app aberto, a
captura de tela mostra, nesta ordem: "Quedo em construção", "Ambiente:
development", "Hoje é 2 de novembro de 2026", "Exemplo de número: 1.234,5", "1
dia" e "2 dias". A interpolação, a data e o número em pt-BR e o plural
(`Intl.PluralRules`) funcionam no Hermes do aparelho, sem polyfill. O
`logcat` (`ReactNativeJS`) não registrou erro nem aviso. A captura não foi
versionada, porque a barra de status mostra notificações pessoais.

## Passo 5 · Design system (02/11/2026)

### Bibliotecas

| Biblioteca | Versão | Código nativo | Por quê |
|---|---|---|---|
| `expo-system-ui` | ~58.0.7 | sim | **Aprovado pelo responsável em 02/11/2026.** Faz o `userInterfaceStyle: 'automatic'` valer no Android (o prebuild avisava que ele era ignorado sem esta biblioteca) e permite pintar o fundo nativo da janela no tema (`SystemUI.setBackgroundColorAsync`). Plugin `expo-system-ui` registrado no `app.config.ts`, como pede <https://docs.expo.dev/versions/latest/sdk/system-ui/> |

Os componentes não usam nenhuma outra biblioteca nova. A área segura vem do
`react-native-safe-area-context`, que já veio com o Expo Router.

**Ícones da barra de abas (spec 4.9) ficam para o passo 6.** No SDK 58, o
`@expo/vector-icons` não vem mais junto com o `expo`: não está no
`node_modules`, e o `bundledNativeModules.json` indica `^15.0.2`. É só
JavaScript, e as fontes de ícone carregam pelo `expo-font`, que já vem com o
`expo`. Decidir e instalar com as abas.

### Tokens (`src/ui/tokens/`)

- **Cores** (`colors.ts`): paletas `light` e `dark` provisórias e neutras,
  derivadas do azul-acinzentado do ícone. Os nomes são semânticos
  (`background`, `surface`, `surfaceMuted`, `text`, `textMuted`, `primary`,
  `onPrimary`, `divider`, `outline`, `danger`, `onDanger`); nenhum componente
  usa hexadecimal direto.
- **Contraste** (`contrast.ts`): razão WCAG 2.x. O teste confere 14 pares em
  cada tema (eram 11; os 3 últimos da tabela entraram no passo 6, a pedido do
  responsável): texto com 4,5:1; contorno de controle com 3:1. Valores:

  | Par | Claro | Escuro |
  |---|---|---|
  | text / background | 15,3 | 15,6 |
  | text / surfaceMuted | 13,8 | 11,4 |
  | textMuted / surface | 7,0 | 7,5 |
  | primary / background (botão de texto) | 7,2 | 9,4 |
  | onPrimary / primary (botão principal) | 7,8 | 9,4 |
  | onDanger / danger | 6,9 | 7,7 |
  | outline / surface (botão secundário) | 4,1 | 5,0 |
  | textMuted / surfaceMuted | 5,9 | 6,2 |
  | danger / background (texto de erro) | 6,4 | 7,7 |
  | danger / surface | 6,9 | 6,9 |

  **Cuidado (responsável, 02/11/2026):** todo par de cores novo usado por um
  componente entra na lista `PAIRS` do `contrast.test.ts`.

- **Tipografia**: fonte do sistema; variantes `display`, `title`, `heading`,
  `body`, `bodyStrong`, `caption` e `label`. Nenhum componente desliga o
  `allowFontScaling` nem usa `maxFontSizeMultiplier`, então o texto acompanha
  a fonte do sistema (V8).
- **Espaços** (escala de 4 dp), **raios** e **sombras** (`boxShadow`, do RN
  0.76+; mais forte no escuro). `MIN_TOUCH_TARGET = 48`.

### Tema (`src/ui/theme.ts`)

`getTheme(scheme)` é puro e `useTheme()` segue o `useColorScheme()` do
sistema. No layout raiz:
- `SystemUI.setBackgroundColorAsync` pinta o fundo nativo da janela;
- `contentStyle` do Stack usa o fundo do tema;
- a barra de status inverte a cor dos ícones no escuro.

### Componentes (`src/ui/components/`)

| Componente | O que faz | Acessibilidade |
|---|---|---|
| `Screen` | Fundo do tema, área segura (`edges`) e rolagem (padrão ligado, para fonte grande não cortar texto) | — |
| `Text` | Variante tipográfica e cor do tema | `display`, `title` e `heading` viram `accessibilityRole="header"` |
| `Button` | `primary`, `secondary` (com contorno) e `text` | Papel de botão, rótulo, estado `disabled`, mínimo de 48×48 dp |
| `Card` | Superfície com raio e sombra | — |
| `EmptyState` | Título, descrição e ação opcional | Título como cabeçalho |
| `ListItem` | Título, subtítulo, elemento à direita e `onPress` opcional | Mínimo de 48 dp; com `onPress`, botão que lê "título, subtítulo" |

Os textos chegam prontos pelas props (`label`, `title`, `description`), já
traduzidos. As regras de lint do passo 4 acusam literais nesses atributos e
propriedades.

### Lint: falso positivo do token de cor

O token `text: '#13212A'` caiu na regra de texto fora do JSX (propriedade
`text`). O seletor passou a ignorar strings que são só uma cor hexadecimal
(`'#RGB'` a `'#RRGGBBAA'`). Sonda: `text: '#FFF'` passa; `title: 'Olá'` e
`body: '#cafe é bom'` continuam dando erro.

### Testes

- `contrast.test.ts`: 22 pares da paleta (11 por tema), mais preto e branco
  (21:1) e simetria.
- `components.test.tsx`:
  - botão chama `onPress`; desabilitado não chama e anuncia o estado;
  - 48×48 dp nas três variantes;
  - cores do tema; variante e cor do `Text`; títulos como cabeçalho;
  - fonte do sistema não desligada;
  - `ListItem` com e sem `onPress`; `EmptyState` com e sem ação;
  - `Card` e `Screen` com e sem rolagem.
- `theme.test.tsx`: com o sistema simulado no escuro, o botão usa
  `colors.dark`. Mutação de controle: com `useTheme` sempre claro, o teste
  falha.
- A Testing Library 14 não tem mais `UNSAFE_getByType`. A rolagem é
  conferida procurando `RCTScrollView` no `toJSON()`.
- Total: 78 testes.

### No aparelho (S22)

- O prebuild gravou
  `expo_system_ui_user_interface_style = automatic` no `strings.xml`: o plugin
  está agindo.
- Metro: `Android Bundled ... (1328 modules)`.
- O S22 estava no modo escuro (`adb shell cmd uimode night` → `Night mode:
  yes`), e a tela provisória apareceu toda no tema escuro:
  - fundo `#0E1518`, cartões em `surface`, barra de status com ícones claros;
  - botões principal, secundário (com contorno), de texto e desabilitado;
  - item de lista e estado vazio;
  - plural "0 dias · 1 dia · 2 dias".
- **Modo claro e fonte no máximo: conferidos pelo responsável no S22 em
  02/11/2026** ("Conferi, está ok"), na tela provisória com todos os
  componentes. Não alterei configurações do aparelho. O V7 e o V8 completos
  continuam no roteiro do passo 10, já com as telas reais da navegação.

### Cuidado para a Fase 3: teclado na `Screen`

**Responsável, 02/11/2026.** Quando entrar o campo de texto da motivação
pessoal (onboarding, Fase 3), a `Screen` precisa tratar o teclado: o campo e o
botão "Continuar" não podem ficar escondidos atrás dele.
- Avaliar o `KeyboardAvoidingView` do React Native e o comportamento do
  Android 15+ (o app desenha de ponta a ponta, e o redimensionamento da janela
  pelo teclado mudou).
- Conferir no S22 com a fonte no máximo.
- Ao tocar fora do campo, o teclado deve fechar
  (`keyboardShouldPersistTaps="handled"` no `ScrollView`).

## Passo 6 · Navegação (02/11/2026)

### Ícones das abas: `expo-symbols` (decisão do responsável)

O responsável pediu "a opção oficial do Expo, sem código nativo novo, com
ícones genéricos e neutros". Opções levantadas, abrindo cada pacote
(`npm pack --dry-run`):

| Opção | Oficial Expo | Código nativo no Android | Situação |
|---|---|---|---|
| **`expo-symbols` ~58.0.4** (escolhida) | sim, listada no SDK 58 | **nenhum**: só tem Swift para iOS; no Android desenha Material Symbols por uma fonte do `expo-font` | Atual. Empacota só o peso regular (~0,8 MB); `symbols.json` com os nomes (~100 KB) |
| `@expo/vector-icons` ^15 | sim | nenhum (as fontes vão pelo `expo-font`) | **O guia de ícones do Expo diz que será descontinuado e não é recomendado** |
| `@react-native-vector-icons/*` 14 | não (comunidade) | sim: pacote Kotlin por família de ícones | Descartada |

- Conferido com `expo-modules-autolinking resolve --platform android`: o
  `expo-symbols` **não entra** no build nativo do Android.
- Ícones: Início `home`, Estatísticas `bar_chart`, Progresso `flag`, Perfil
  `person` (no iOS: `house`, `chart.bar`, `flag` e `person`). Cor do tema:
  `primary` ativo e `textMuted` inativo.

### `expo-asset` instalado na raiz

No preset Android do Jest, o `expo-symbols` carrega o `expo-font`, que não
achava o `expo-asset`. O npm tinha deixado o `expo-asset` aninhado em
`node_modules/expo/node_modules`. O Metro no aparelho cairia no mesmo erro ao
abrir as abas. Solução: `npx expo install expo-asset` (~58.0.19, a versão
indicada pelo SDK). O código nativo dele **já estava** no app, como dependência
do `expo` (o autolinking já o listava), então não é código nativo novo.

### Rotas (`app/`)

- `_layout.tsx`: `Stack.Protected` (com `redirectTo`, do SDK 58).
  - Sem onboarding concluído, só o grupo `(onboarding)`; tentar `/stats` ou
    `/about` leva a `/welcome`.
  - Concluído, só `(tabs)` e `about`; tentar `/welcome` leva a `/`.
  - A troca apaga o histórico, então não se volta ao onboarding pelo "voltar".
- `(onboarding)/`: `welcome`, `compulsions`, `setup`, `triggers`,
  `motivation`, `permissions` e `summary`, na ordem do doc 01 (§4.2).
  - Cada tela usa `OnboardingStepScreen`, com título, texto provisório,
    "Continuar" e "Voltar".
  - A última grava "concluído" e as rotas protegidas levam às abas.
- Voltar do Android: na primeira tela, `BackHandler` + `Alert.alert`
  confirmam ("Sair do app?", "Continuar aqui"/"Sair"); nas demais, volta uma
  tela. O botão "Voltar" da primeira tela também confirma.
- `(tabs)/`: `index` (Início), `stats`, `progress` e `profile`, com título e
  estado vazio. O Perfil tem "Sobre o app" e, **só em `development`**,
  "Refazer onboarding", que zera a flag.
- `about.tsx`: provisória até o passo 9.
- Namespace novo de textos: `about`. As chaves provisórias `foundation.*`
  saíram; o teste do i18n usa um pacote de textos próprio para plural e
  interpolação.

### Estado do onboarding: em memória até o passo 7

`src/features/onboarding/onboardingStatus.ts` (`isCompleted`, `setCompleted`
e `subscribe`, lidos com `useSyncExternalStore`). Por enquanto o estado fica em
memória. **O V4 (fechar e reabrir direto no Início) só passa no passo 7**,
quando esta interface passar a ler e gravar `settings.onboarding_completed`.

### Rotas tipadas no typecheck

O `.expo/types/router.d.ts` só é regerado quando o Metro sobe. Com rotas
novas, o `tsc` acusava `/about` e `/welcome` como inválidas. O guia de rotas
tipadas manda rodar `npx expo customize tsconfig.json` antes do `tsc`, inclusive
no CI. Script `typegen` criado, e `typecheck` passou a ser
`npm run typegen && tsc --noEmit`. O `tsconfig.json` não muda.

### Testes da navegação (`__tests__/navigation.test.tsx`)

`renderRouter('./app')` do `expo-router/testing-library`, sobre as **rotas
reais**. Cobre:
- abre em `/welcome` sem onboarding concluído; link direto para as abas é
  barrado;
- as 7 telas em ordem, voltar duas e avançar de novo (V3);
- a última leva a `/` sem volta (V4, parte da navegação);
- "Voltar" na primeira tela pede confirmação;
- com o onboarding concluído: abre no Início e barra `/welcome`; as 4 abas em
  ordem e a troca entre elas (V5); Perfil leva a `/about`; "Refazer
  onboarding" volta às boas-vindas (V6).

Mutação de controle: com a proteção das abas desligada (`guard={true}`), 5
testes falham.

**Problemas encontrados nos testes:**
- O caminho deve ser conferido com `waitFor`, porque a navegação é
  assíncrona. Os toques usam `findByRole`.
- `act(...)` sem `await` no `beforeEach` estragava o ambiente dos testes
  seguintes (o caminho ficava em `/`). Entre testes não há tela montada, então
  o estado muda direto, sem `act`.
- `userEvent` vem de `@testing-library/react-native`: o
  `expo-router/testing-library` só o exporta como tipo.
- **Preset do Jest trocado para `jest-expo/android`.** O padrão simula iOS.
  No iOS, a barra de abas recebe papel `button` e um rótulo em inglês gerado
  pela biblioteca ("Início, tab, 1 of 4"). No Android, recebe papel `tab` e o
  nome vem do próprio texto. Os testes passam a simular a plataforma-alvo.
- Total: 10 suítes, 94 testes, sem aviso no console.

### Pontos para a Fase 3 (responsável, 02/11/2026)

1. **Salvar a etapa e as respostas do onboarding.** O alerta de saída diz "Você
   pode continuar a configuração depois", mas hoje o progresso não é
   guardado: ao reabrir, tudo recomeça nas boas-vindas. Avaliar gravar no
   banco a etapa atual e as respostas já dadas, e retomar dali, ou ajustar o
   texto do alerta.
2. **Esconder o botão "Voltar" na primeira tela do onboarding.** Fica só a
   confirmação no Voltar do Android (`BackHandler`). Ajustar o teste "Voltar
   na primeira tela pede confirmação" para usar o Voltar do Android em vez do
   botão.

### Cuidado para a Fase 10 (iOS)

A barra de abas do Expo Router gera no iOS o rótulo de acessibilidade em
inglês `"<label>, tab, N of M"` quando `tabBarAccessibilityLabel` não é
definido (`BottomTabBar.js`). Na Fase 10, definir
`tabBarAccessibilityLabel` com `t()` em cada aba. A regra de lint já exige que
o valor venha do `t()`.

### No aparelho (S22)

Só JavaScript mudou para o Android, então não houve recompilação: Metro com
`--clear` e `Android Bundled ... (1366 modules)`. Pelo `adb` (toques só dentro
do app):
- abriu em "Boas-vindas" (tema claro), com "Continuar" e "Voltar";
- 7 toques em "Continuar" levaram ao Início, com a barra de 4 abas e ícones
  Material Symbols;
- Perfil → "Refazer onboarding" voltou a "Boas-vindas";
- o Voltar do Android abriu "Sair do app?" ("Você pode continuar a
  configuração depois.", "CONTINUAR AQUI"/"SAIR"); "Continuar aqui" manteve o
  app aberto;
- `logcat` (`ReactNativeJS`) sem aviso nem erro durante o percurso.

## Passo 7 · Banco local (02/11/2026)

### Bibliotecas

| Biblioteca | Versão | Código nativo | Por quê |
|---|---|---|---|
| `expo-sqlite` | ~58.0.15 | sim | Prevista na stack (CLAUDE.md §6); versão do SDK 58 |
| `drizzle-orm` | ^0.45.4 | não | **Decisão do responsável (01/11/2026).** ORM leve, com esquema em TypeScript e tipos inferidos |
| `drizzle-kit` (dev) | ^0.31.11 | não | Gera as migrações SQL a partir do esquema |
| `babel-plugin-inline-import` (dev) | ^3.0.0 | não | Embute os `.sql` no bundle, como pede o guia do Drizzle para Expo |
| `sql.js` + `@types/sql.js` (dev) | ^1.15.2 | não | SQLite em WebAssembly para os testes no Node, sem compilar nada nativo (o `better-sqlite3` exigiria node-gyp no Windows) |
| `babel-preset-expo` (dev) | ~58.0.23 | não | Exigido na raiz pelo `babel.config.js` novo. Mesma versão que o `expo` usa; o npm o deixava aninhado em `node_modules/expo` |

- **Versão do Drizzle:** a página do Drizzle para Expo usa `drizzle-orm@rc`
  (1.0.0-rc.5). Ficou a **estável** 0.45.4 (`latest` no npm). A API de
  migrações para Expo (`drizzle/migrations.js` + `migrate`) é a mesma. Avaliar
  a 1.0 quando sair do rc.
- Guia: <https://orm.drizzle.team/docs/connect-expo-sqlite>.

### Estrutura

- `drizzle.config.ts`: `dialect: 'sqlite'`, `driver: 'expo'`, esquema em
  `src/data/schema/index.ts`, saída em `drizzle/`.
- `babel.config.js` (`babel-preset-expo` + `inline-import` para `.sql`) e
  `metro.config.js` com `sourceExts.push('sql')`.
- `src/domain/compulsion.ts`: enums das compulsões, mecânicas e gatilhos,
  puros. O esquema os usa nas colunas e nas restrições `CHECK`.
- `src/data/schema/`: as 5 tabelas da spec 4.6, em inglês e `snake_case`:
  - datas em milissegundos (`timestamp_ms`);
  - `settings` com uma linha só (`CHECK id = 1`);
  - `UNIQUE` em `user_compulsions.type` e em (`compulsion_id`,
    `package_name`) de `monitored_apps`;
  - `CHECK` em todos os enums, para o banco também recusar valores fora da
    lista;
  - cascata nas chaves estrangeiras.
- `drizzle/0000_initial_schema.sql`: a "migração 001" da spec (o Drizzle
  numera a partir de 0000). Gerar a próxima com `npm run db:generate`.
- `src/data/repositories.ts`: interfaces explícitas (`SettingsRepository`,
  `CompulsionRepository`, `MonitoredAppRepository`, `TriggerRepository`,
  `MotivationRepository`) e `deleteAllData()`.
  - API **síncrona** do Drizzle, comum ao `expo-sqlite` e ao `sql.js`.
  - Tipo comum: `AppDatabase = BaseSQLiteDatabase<'sync', unknown, schema>`.
  - `declaredConsumption` só é gravado em app de risco.
- `src/data/migrations.ts`: `runMigrations(db)` usa o `migrate` do Drizzle
  para Expo. Ele só depende do dialeto e da sessão, então o mesmo código roda
  no app e nos testes.
- `src/data/bootstrap.ts` (só no app), em `initializeDatabase()`:
  - abre `app.db`, nome neutro, no armazenamento privado;
  - liga `PRAGMA foreign_keys = ON`;
  - aplica as migrações e conecta a flag do onboarding ao banco;
  - `getRepositories()` dá acesso aos repositórios depois disso (lança erro
    se o banco ainda não foi aberto).
- O layout raiz só desenha a navegação com o banco pronto (sem piscar o
  onboarding antes das abas). Se a abertura ou as migrações falharem, mostra
  "Não foi possível abrir seus dados" (texto do i18n). O erro técnico vai
  para o console, sem dados do usuário.
- **Abertura dentro do tratamento de erro (pedido do responsável,
  02/11/2026, feito no início do passo 8):** na primeira versão, o
  `openDatabaseSync` e o `PRAGMA` rodavam na importação do módulo. Uma falha
  ali (arquivo corrompido, disco cheio) lançaria erro antes do React montar e
  fecharia o app. Agora rodam dentro de `initializeDatabase()`, no mesmo
  `catch` das migrações. Testado em `bootstrap.test.ts` (falha na abertura,
  no `PRAGMA` e nas migrações → tela de erro; sucesso → flag ligada ao banco).
  Mutação de controle: com a abertura de volta na importação, a suíte inteira
  quebra ao carregar.
- `onboardingStatus.connect(storage)`: a flag é lida do banco na abertura e
  gravada a cada mudança. A gravação vem **antes** de mudar a tela: se falhar,
  a navegação não muda.
- O banco fica fora do backup do sistema (`allowBackup: false`, desde o
  passo 2).

### Testes (Jest + sql.js)

- `migrations.test.ts`:
  - o `drizzle/migrations.js` embutido tem todas as migrações do índice;
  - a 001 cria as 5 tabelas;
  - rodar de novo não reaplica;
  - **duas migrações sobre um banco com dados**: aplica só a nova e preserva
    a flag e a motivação;
  - banco novo com as duas, em ordem: a 002 de teste altera uma tabela da 001.
- Restrições: o banco recusa tipo, situação e gatilho fora da lista, uma
  segunda linha em `settings` e app de compulsão inexistente.
- `repositories.test.ts`:
  - valores padrão de `settings`; flag e idade;
  - compulsões (limite nulo na abstinência; sem duplicar o tipo);
  - "consumo declarado" só em app de risco; cascata de apps e gatilhos;
  - motivação substituída; `deleteAllData()`;
  - flag do onboarding ligada ao banco, inclusive a falha de gravação.
- Nos testes, as migrações são lidas **do disco**. O cache do Jest não
  percebe mudança no `.sql` embutido pelo Babel quando o `migrations.js` não
  muda. O teste "migrations.js tem todas as migrações" garante que o arquivo
  embutido no app não fique para trás.
- Mutação de controle: com `PRAGMA foreign_keys = OFF`, falham o teste de
  cascata e o de chave estrangeira.
- Navegação: o `bootstrap` é simulado (o `expo-sqlite` nativo não roda no
  Jest). Dois testes novos: nada aparece enquanto as migrações rodam, e a
  tela de erro aparece se elas falharem.
- Total: 12 suítes, 116 testes.

### No aparelho (S22): V4 e V11

O `expo-sqlite` exigiu prebuild e recompilação (12m37s). O `adb` travou de
novo antes da instalação (AP3); a solução foi reiniciá-lo e usar
`adb install -r`. Para ler o banco do aparelho:
`adb exec-out run-as br.com.quedo.app.dev cat files/SQLite/app.db > app.db`
(funciona só no build de desenvolvimento). Depois, um script com `sql.js` lê
só estrutura e flags.

1. Primeira abertura: o banco foi criado em `files/SQLite/app.db` e o app
   abriu em "Boas-vindas".
2. Onboarding concluído pelos 7 "Continuar".
3. **V4:** `am force-stop` e reabertura → **abriu direto no Início**. No
   banco: 1 migração aplicada e `settings` = `[1, 1, 6]` (onboarding
   concluído).
4. **V11:** gerada uma migração 002 de teste (coluna `probe` em
   `motivation`, só `ALTER TABLE`), e o app reaberto com o JavaScript novo
   sobre o banco existente. **O app abriu no Início, sem tela de erro e sem
   erro no `logcat`.** No banco: **2 migrações aplicadas**, coluna `probe`
   presente e `settings` = `[1, 1, 6]` (dados preservados).
5. A 002 foi descartada: `git checkout -- src/data/schema/index.ts drizzle`,
   `git clean -f drizzle`, e o `drizzle-kit generate` respondeu "No schema
   changes". Os dados do **app de desenvolvimento** foram limpos
   (`adb shell pm clear br.com.quedo.app.dev`), porque o banco dele ficou com
   a coluna de teste. Reaberto, o app recriou o banco só com a 001 e o
   onboarding pendente.

**Os "relatos antigos de falha no Android com mais de uma migração" (spec
4.6) não se confirmaram** com `drizzle-orm` 0.45.4 e `expo-sqlite` 58.

### Cuidados

- `__drizzle_migrations.id` fica nulo no SQLite (a coluna é `SERIAL`, que o
  SQLite não autoincrementa). O controle é pelo `created_at`, que é o `when`
  do índice. Não depender do `id`.
- Uma migração de teste aplicada num aparelho e depois descartada deixa o
  banco desse aparelho fora do esquema. Sempre limpar os dados do app de
  desenvolvimento depois (`pm clear`).
- Depois de `npm run db:generate`, rodar o app e os testes. O Jest lê os
  `.sql` do disco; o Metro reconstrói o bundle porque o `migrations.js` muda.

### Pontos para as próximas fases (responsável, 02/11/2026)

1. **Fase 3 · "Apagar meus dados" também zera o onboarding.** O
   `deleteAllData()` apaga as tabelas, mas o `onboardingStatus` fica em
   memória com `completed = true`, e o app continuaria nas abas. A ação
   precisa chamar `onboardingStatus.setCompleted(false)` (que grava no banco
   e troca a navegação), voltando às boas-vindas. Testar as duas coisas: banco
   vazio e tela de boas-vindas.
2. **Fase 7 · decisão pendente: criptografar o banco ou não.** Opções:
   - **SQLCipher:** o `expo-sqlite` tem a opção `useSQLCipher` no plugin de
     configuração. Protege o arquivo mesmo com acesso de root ou de backup de
     fábrica. Custos: biblioteca nativa maior, guardar a chave (Android
     Keystore, via `expo-secure-store`), migração do banco já existente nos
     aparelhos e o que fazer se a chave se perder;
   - **proteção do Android:** o banco já fica no armazenamento privado do
     app, inacessível a outros apps, com a criptografia de disco do sistema e
     fora do backup (`allowBackup: false`).
   A decisão é do chat de planejamento.

## Passo 8 · Domínio e interface de monitoramento (02/11/2026)

Nenhuma biblioteca nova.

### Domínio (`src/domain/`)

- `compulsion.ts`: `Mechanic` (`abstinence` | `moderation`) e
  `COMPULSION_DEFINITIONS`, com a mecânica e os papéis de app permitidos:
  pornografia → abstinência, só `risk`; vídeos curtos → moderação, só
  `short_video`. Helpers `getCompulsionDefinition` e `isAppRoleAllowed`.
  **Para a Fase 3:** usar `isAppRoleAllowed` ao gravar apps monitorados (o
  repositório ainda não confere o papel).
- `day.ts`, a borda do dia:
  - `startOfDay`, `startOfNextDay`, `getDayBounds` (intervalo `[start, end)`),
    `isSameDay`, `toDayKey` (`AAAA-MM-DD`) e `calendarDaysBetween`;
  - usa o horário local do `Date`, que segue o fuso do aparelho;
  - o dia seguinte vem do calendário, nunca de "+24 h": com horário de verão
    o dia tem 23 ou 25 horas.
- Nada de streak, alerta ou reprovação do dia (spec 4.7).

### Fuso fixo nos testes

- Trocar `process.env.TZ` dentro de um teste **não tem efeito** no Jest
  (testado). O `jest.global-setup.js` fixa `America/Sao_Paulo` antes dos
  workers, então o resultado é o mesmo no computador e no CI (que roda em
  UTC). Conferido com `TZ=UTC npx jest src/domain/day.test.ts`.
- São Paulo teve horário de verão até 2019, **com a troca à meia-noite**, o
  caso mais difícil:
  - 04/11/2018: a meia-noite não existiu; o dia começou à 01:00 e teve 23 h;
  - 16/02/2019: a hora 23:00–24:00 se repetiu; o dia teve 25 h.
- Um teste confere o fuso e falha se o global setup não for aplicado.
- Mutação de controle: com o dia seguinte calculado como "início + 24 h",
  falham os testes de 23 e 25 horas.

### Cuidado para a Fase 4

O JS do app roda no Hermes, e o módulo Kotlin calcula a própria borda do dia
(correção I-4). Conferir no aparelho que os dois concordam, e que o Hermes
resolve a meia-noite inexistente como o motor V8 do Node, onde rodam os testes
(para o primeiro instante do dia).
Hoje o Brasil não tem horário de verão, mas o app deve funcionar se voltar.

### Interface de monitoramento (`src/monitoring/`)

- `types.ts`: `MonitoringModule`, baseada na spec 00 §5.2 e no relatório §7:
  - permissões `usageAccess`, `notifications` e `overlay` (sem VPN, D6);
    `overlay` é `unsupported` no iOS;
  - **seleção opaca:** `TargetId` é uma string com marca de tipo; no Android
    é o pacote, no iOS será o token da Apple. `listTargets()` (lista
    própria, Android) e `pickTargets()` (seletor da Apple, iOS); cada uma
    responde `unsupported` na outra plataforma. O nome do app é opcional
    (`label`, nulo no iOS);
  - limite por **regras** (`UsageRule`): apps, minutos por dia e se mostra
    tela de interrupção. Uma regra por app ou uma para vários: quem monta
    decide. **Resolvido no doc 01 v0.6 (02/11/2026):** na Fase 4, vídeos
    curtos vira **uma regra com todos os apps escolhidos** (limite somado) e
    cada app de risco da pornografia, **uma regra própria** de 10 minutos;
  - `getUsageToday()` é `unsupported` no iOS;
  - `startDomainWatch`/`stopDomainWatch` respondem `unsupported` (flag
    `domainMonitoring` desligada). O nome é neutro de propósito;
  - log de eventos (`limit_reached`, `notification_sent`,
    `interruption_shown`, `permission_lost`) lido por `getEvents()`;
  - `MonitoringError` com `code` (`permission_required`, `invalid_config`)
    para erros explícitos.
- `FakeMonitoringModule`: tudo em memória, com `platform` `android` ou `ios`
  para simular as respostas de cada um. Por fora da interface:
  `simulatePermission` (perder permissão grava `permission_lost`) e
  `simulateUsage` (grava `limit_reached` uma vez por dia por regra; o uso
  zera na virada do dia, pela `getDayBounds`).
  - Apps de exemplo `com.example.*`, nomes inofensivos. O lint acusou o
    `label` como texto visível; desligado só nessa lista, com o motivo no
    comentário (é nome de app, vem do sistema no aparelho).
- `getMonitoring()` (`index.ts`): instância única; nesta fase sempre o falso.
- O formato pode mudar na Fase 4, quando o módulo nativo (base: protótipo)
  for portado. Textos da notificação e da tela de interrupção ainda não estão
  na configuração: entram com o nativo.

### Testes

- `compulsion.test.ts`, `day.test.ts` (12 testes) e
  `FakeMonitoringModule.test.ts` (20 testes): permissões nas duas
  plataformas, seleção opaca, regras inválidas, `limit_reached` uma vez,
  virada da meia-noite, `unsupported` dos domínios e `getMonitoring()`.
- `bootstrap.test.ts` (abertura do banco no tratamento de erro, ver passo 7).
- Total: 16 suítes, 156 testes.

## Passo 9 · Tela "Sobre o app" (02/11/2026)

### Biblioteca

| Biblioteca | Versão | Código nativo | Por quê |
|---|---|---|---|
| `expo-application` | ~58.1.2 | sim | **Escolha do responsável (02/11/2026).** Versão e build lidos do pacote instalado |

- Alternativa descartada: `Constants.expoConfig` (`expo-constants`, já
  instalado). Ele lê o `app.config.ts` embutido no bundle. Nos builds de loja,
  o EAS incrementa o build no servidor (`appVersionSource: remote` +
  `autoIncrement`), e a tela mostraria o `versionCode` do `app.config.ts` (1),
  não o real. O campo está marcado como obsoleto e a documentação indica o
  `expo-application`.
- Usamos só `applicationName`, `nativeApplicationVersion` e
  `nativeBuildVersion`. **Não usar** `getAndroidId()` nem
  `getInstallReferrerAsync()`: são identificador do aparelho e origem da
  instalação, que o app não precisa (CLAUDE.md, seção 9).

### Tela (`app/about.tsx`)

- `src/config/appInfo.ts`: `getAppInfo()` junta nome, versão, build (do
  pacote instalado) e ambiente (da variante).
- Linhas sem toque: nome, versão, número do build e ambiente
  ("Desenvolvimento", "Prévia", "Produção"). Dado que o sistema não fornecer
  aparece como "Indisponível", nunca vazio.
- Política de privacidade: linha com "Disponível em breve", **sem ser link**
  até a Fase 7.
- Nome do ambiente por mapa com chaves literais e `satisfies
  Record<Environment, string>`: o teste de chaves recusa chave montada
  (`` t(`environments.${env}`) ``), e o `satisfies` obriga a cobrir todos os
  ambientes.

### Testes

- `__tests__/about.test.tsx` (4 testes): `getAppInfo`, os quatro dados na
  tela (V9), a política como marcador sem botão e "Indisponível" quando falta
  um dado. O `expo-application` é simulado (não há pacote instalado no Jest).
- Total: 17 suítes, 160 testes.

### No aparelho (S22): V9

- Código nativo novo: `npm run android:prebuild` + `gradlew assembleDebug`
  (13m35s) e `adb install -r` (o `adb` reiniciado antes, por causa do AP3).
- Na primeira abertura depois da reinstalação, o menu de desenvolvimento do
  Expo abre sozinho ("Continue" e "Close" o fecham). É do `expo-dev-client`,
  não do app.
- Onboarding pelos 7 "Continuar" → Perfil → Sobre o app. A tela mostrou
  `Quedo Dev`, `1.0.0`, build `1` e `Desenvolvimento`, iguais ao
  `dumpsys package br.com.quedo.app.dev` (`versionName=1.0.0`,
  `versionCode=1`). "Política de privacidade" com "Disponível em breve".
- `logcat` (`ReactNativeJS`) sem erro nem aviso.
- `npm run check:manifest`: OK nos três manifestos mesclados.

### Permissão nova trazida pelo `expo-application`

O manifesto mesclado passou a declarar
`com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`. Ela
vem da biblioteca `com.android.installreferrer` (usada só por
`getInstallReferrerAsync()`, que o app não chama) e serve para ler de onde o
app foi instalado. Não estava entre as proibidas da spec 4.3.

**Decisão do responsável (02/11/2026): bloquear.**
- `app.config.ts`: incluída em `android.blockedPermissions`. O Expo gera
  `<uses-permission ... tools:node="remove" />` no manifesto do app, e o
  Gradle a tira do manifesto mesclado.
- `scripts/check-manifest.js`: incluída em `FORBIDDEN_PERMISSIONS`, para não
  voltar numa atualização de biblioteca. O script passou a ler cada
  `<uses-permission>` inteiro e a **ignorar os que têm
  `tools:node="remove"`** (são o bloqueio, não uma declaração). Dois testes
  novos: acusa a permissão e não acusa o bloqueio.
- Antes de recompilar, o script acusou a permissão nos três manifestos do
  build anterior (prova de que a verificação pega o caso real).
- Recompilado (15m04s): `check:manifest` OK nos três mesclados, que não
  listam mais a permissão. O manifesto do app (`src/main`) tem a linha com
  `tools:node="remove"`, e o script também o aprova. No S22, `dumpsys
  package` sem a permissão; a tela Sobre mostrou os mesmos dados (`Quedo
  Dev`, `1.0.0`, build `1`, `Desenvolvimento`), e os dados do app ficaram
  preservados na reinstalação (abriu no Início).

### Cuidado: encerrar o Metro inteiro

O `npx expo start` abre um processo `node` filho, que é o servidor. Encerrar
só o processo pai deixa a porta 8081 ocupada, e o próximo `expo start` falha
com "Port 8081 is being used by another process". Encerrar todos os `node`
cuja linha de comando tenha `expo` e `start`:
`Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'expo.*start' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
Um aviso "Error: undefined ... URL: localhost:8081" no `logcat` logo antes de
reinstalar é do processo antigo do app perdendo o Metro (reinício do `adb`),
não do build novo.

## Passo 10 · Maestro e roteiro manual (02/11/2026)

### Instalação do Maestro (aprovada pelo responsável)

- **Maestro CLI 2.12.0** (26/10/2026). A 2.12.1 foi pulada por ter saído no
  mesmo dia.
- Origem: `maestro.zip` (349.408.958 bytes) baixado do GitHub oficial
  (`mobile-dev-inc/Maestro`, releases).
  - SHA-256 `a6044a84…63ec5e`, igual ao do GitHub e ao `checksums_sha256.txt`.
- Instalação nativa no Windows, como na documentação oficial
  (<https://docs.maestro.dev/getting-started/installing-maestro/windows>):
  - extraído em `C:\Users\User\tools\maestro`, fora do repositório;
  - usa o Java 17 (Temurin) já instalado;
  - **sem mexer no PATH**: o `scripts/run-maestro.js` acha o executável.
- **Analytics do Maestro desligado**: o script sempre define
  `MAESTRO_CLI_NO_ANALYTICS`, `MAESTRO_CLI_NO_UPDATE_CHECK` e
  `MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED`.
- **Funcionou no Windows com o S22 físico.** A documentação só descreve
  emuladores, mas não foi preciso nada além do `adb` já configurado. Os apps
  auxiliares do Maestro não ficaram instalados no aparelho.

### Fluxo (`.maestro/onboarding-e-abas.yaml`)

- `npm run e2e` (`scripts/run-maestro.js`, com testes) roda tudo em
  `.maestro/`.
  - Procura o Maestro em `MAESTRO_HOME`, depois em `~/tools/maestro`, depois
    no PATH.
  - No Windows, chama o `.bat` pelo `cmd.exe` direto: com `shell: true`, o
    Node avisa que os argumentos não são escapados (DEP0190).
- Antes de rodar: build de desenvolvimento instalado, Metro ligado e
  `adb reverse tcp:8081 tcp:8081`.
- **O fluxo apaga os dados do app de desenvolvimento** (`clearState`).
- O que o fluxo faz:
  - abre o app pelo link do dev client e fecha o menu do dev client se ele
    aparecer;
  - percorre as 7 telas, volta duas (pelo botão "Voltar" e pelo Voltar do
    Android) e avança de novo;
  - chega ao Início e troca as 4 abas;
  - fecha e reabre o app (abre no Início);
  - abre o "Sobre";
  - "Refazer onboarding" volta às boas-vindas.
- Tentativa malsucedida: `launchApp` antes do `openLink`. O link chegou
  enquanto o dev client abria e foi ignorado: o app ficou na tela inicial do
  dev client e o fluxo falhou esperando "Boas-vindas". Sem o `launchApp`, o
  próprio link abre o app.
- Execuções no S22, todas aprovadas:
  - fluxo curto (onboarding e abas): 3 vezes, ~1 min cada;
  - fluxo completo: 1m40s.
- A falha da primeira tentativa mostrou que o fluxo acusa quando a tela
  esperada não aparece.
- No PowerShell, a saída do Maestro mostra os acentos trocados ("In�cio").
  É só a codificação do console: as verificações acham os textos.

### Roteiro V1 a V11 (spec, seção 7)

| # | Como foi verificado | Resultado |
|---|---|---|
| V1 | `pm list packages --user 0`: `br.com.quedo.app.dev` e o protótipo `com.norte.lab.dev` ("Norte Lab") instalados juntos; nomes no lançador conferidos pelo responsável | ✅ |
| V2 | Maestro: `clearState` → abre em "Boas-vindas" | ✅ |
| V3 | Maestro: 7 telas na ordem, volta duas, avança de novo; Jest (`navigation.test.tsx`) | ✅ |
| V4 | Maestro: `stopApp` e reabertura → Início. Passo 7: `am force-stop` e reabertura, com a flag no banco. Fechamento pelo multitarefa conferido pelo responsável | ✅ |
| V5 | Maestro e Jest: Início, Estatísticas, Progresso, Perfil | ✅ |
| V6 | Maestro e Jest: Perfil → Refazer onboarding → boas-vindas | ✅ |
| V7 | Responsável no S22: escuro e claro nas 4 abas e no Sobre (passo 5: componentes) | ✅ |
| V8 | Responsável no S22: fonte no máximo nas 4 abas, no Sobre e no onboarding (passo 5: componentes) | ✅ |
| V9 | Passo 9: `Quedo Dev`, `1.0.0`, build `1`, `Desenvolvimento`, iguais ao `dumpsys package`; Maestro confere a tela | ✅ |
| V10 | Build de produção (abaixo): `check:manifest` OK | ✅ |
| V11 | Passo 7: migração 002 de teste sobre banco existente, 2 migrações aplicadas e dados preservados | ✅ |

V1, V4 (multitarefa), V7 e V8 **conferidos pelo responsável no S22 em
02/11/2026** ("Conferi, está ok"), com as instruções passo a passo. Não
alterei configurações do aparelho: tema e fonte foram trocados pelo
responsável.

### Critérios de aceite da Fase 2 (spec, seção 8)

| Critério | Evidência | |
|---|---|---|
| App instalado no S22 por build local, com os identificadores da 4.2 | Builds locais (Gradle) nos passos 2, 7 e 9; `br.com.quedo.app.dev` instalado; `expo config` dá `.dev`, `.preview` e o de produção (abaixo) | ✅ |
| Onboarding vazio e 4 abas, com a flag persistida no banco | Passo 6 (navegação) e 7 (V4 com `settings` lido do aparelho); Maestro | ✅ |
| Nenhum texto fixo: lint com a regra de texto bruto | `npm run lint` sem erro; regras do passo 4 (JSX e objetos) | ✅ |
| Migração 001 com teste; repositórios testados; `deleteAllData()` | `migrations.test.ts`, `repositories.test.ts`; V11 | ✅ |
| Borda do dia testada | `day.test.ts` (meia-noite e as duas trocas de horário de verão), com mutação de controle | ✅ |
| Interface de monitoramento com implementação falsa | `src/monitoring/` e `FakeMonitoringModule.test.ts` | ✅ |
| Tokens e componentes, tema claro e escuro | Passo 5; contraste testado; V7 | ✅ |
| Variantes; `domainMonitoring` desligada; verificação do manifesto | `expo config` nas três variantes (refeito no fim da fase); `variant.test.ts`; `check:manifest` com testes e V10 | ✅ |
| `lint`, `typecheck` e `test` locais e no CI | Local: 18 suítes, 166 testes. CI verde nos PRs #8, #9 e #10 e na `main` | ✅ |
| Fluxo Maestro no S22 | `npm run e2e`, aprovado no S22 | ✅ |
| Roteiro V1 a V11 com o responsável | Tabela acima | ✅ |
| `NOTAS-APP.md` com decisões, bibliotecas e comandos | Este arquivo | ✅ |
| Tabela de comandos do `CLAUDE.md` preenchida | Seção 10, inclusive Maestro | ✅ |

Variantes conferidas no fim da fase (`npx expo config --type public`):

| `APP_ENV` | nome | package | scheme | `extra.environment` |
|---|---|---|---|---|
| (vazio) | Quedo Dev | `br.com.quedo.app.dev` | `quedo-dev` | `development` |
| `preview` | Quedo Preview | `br.com.quedo.app.preview` | `quedo-preview` | `preview` |
| `production` | Quedo | `br.com.quedo.app` | `quedo` | `production` |

**Fase 2 pronta para revisão no chat de planejamento.** Pontos já
registrados para as próximas fases:
- Fase 3: salvar o progresso do onboarding; esconder o "Voltar" da primeira
  tela; teclado na `Screen`; "Apagar meus dados" zera o onboarding;
  `isAppRoleAllowed` ao gravar apps.
- Fase 4: voltar preditivo; borda do dia no Kotlin e no Hermes; regras de
  limite (vídeos curtos somado, apps de risco um por app).
- Fase 7: decisão sobre SQLCipher.
- Fase 10: rótulo das abas no iOS.

### V10: build de produção

- Comando: `APP_ENV=production npm run android:prebuild` e
  `gradlew assembleRelease`. Levou **23m11s**: compilação do zero, JS
  embutido e C++ para 4 arquiteturas. Não foi instalado no aparelho.
- `npm run check:manifest`: **OK** nos três manifestos mesclados do release.
- Manifesto final:
  - `package="br.com.quedo.app"` e `allowBackup="false"`;
  - permissões: `INTERNET`, `SYSTEM_ALERT_WINDOW`, `VIBRATE` e a
    `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` do próprio app.
- **As permissões de rede local do dev client** (`ACCESS_LOCAL_NETWORK`,
  `CHANGE_WIFI_MULTICAST_STATE`) e `ACCESS_NETWORK_STATE` **não vão para
  produção**. Era o ponto em aberto do passo 2.
- Depois, `npm run android:prebuild` sem `APP_ENV` voltou o `android/` para
  `br.com.quedo.app.dev`. **Cuidado:** um `prebuild` com `APP_ENV=production`
  deixa o `android/` na variante de produção até o próximo `prebuild`.

## Fase 3 · Leitura da spec 02 (02/11/2026)

Spec: `docs/specs/spec-02-onboarding-e-nucleo.md`. Documentos de partida
(PR #11): spec 02 v0.2, doc 01 v0.7 e doc 02 v0.6.

Oito pontos ambíguos levantados na leitura da v0.1. O responsável aprovou as
oito recomendações e as incorporou na **spec 02 v0.2**:

| # | Ponto | Decisão | Onde na spec |
|---|---|---|---|
| 1 | Quando a streak começa | Dia em que o usuário toca em "Começar" (não o dia em que respondeu a etapa); "há N dias" conta a partir dele. Compulsão adicionada pelo Perfil começa no dia em que é adicionada | 4.3 |
| 2 | Check-in antes do horário | Oferecido o dia todo nesta fase; o horário escolhido só vale na Fase 4, com a notificação. "Registrar recaída" substitui um "Sem recaída" do mesmo dia | 4.3 |
| 3 | O que se desfaz | Tudo o que foi **registrado hoje**, até o fim do dia, inclusive recaída marcada para ontem por engano | 4.3 |
| 4 | Recaída "ontem" antes do início | "Ontem" só é oferecido quando ontem já está no período acompanhado | 4.3 |
| 5 | Tela de bloqueio de idade | Tem "Voltar" para as boas-vindas, para corrigir um toque errado | 4.4, etapa 1 |
| 6 | "Faixas agrupadas" no resumo | Vizinhas e sobrepostas viram um intervalo só no resumo (20h–22h + 22h–24h + 23:30–01:00 = 20h–01h); o banco guarda as faixas como marcadas; faixa personalizada igual a uma fixa não duplica | 4.3 |
| 7 | Declaração por app de risco | Obrigatória para cada app marcado, sem resposta pré-marcada | 4.4, etapa 3 |
| 8 | App nas duas listas / Início sem compulsão | Mesmo app pode estar nas duas compulsões (em qual a interrupção conta fica para a Fase 4). Sem compulsão (onboarding vazio da Fase 2): estado vazio com atalho para "Adicionar compulsão" no Perfil | 4.4 e 4.5 |

Também registrados na leitura, sem mudança de escopo:
- **Seletor de horário (passo 3):** dá para fazer em JavaScript puro (hora e
  minuto de 5 em 5) ou com `@react-native-community/datetimepicker`, que tem
  código nativo. As opções serão apresentadas ao responsável antes do passo 3.
- **Permissões do `FakeMonitoringModule`:** ficam só na memória; ao reabrir o
  app voltam a "não concedidas". Esperado até a Fase 4 (spec 02 v0.2, 4.7).
- **R10:** o app de desenvolvimento no S22 terminou o último fluxo Maestro com
  o onboarding desfeito ("Refazer onboarding"). Antes do passo 2, concluir o
  onboarding no build da Fase 2 para testar a migração 002 sobre um banco com
  a flag gravada.

## Fase 3 · Passo 1 · Domínio (02/11/2026)

Nenhuma biblioteca nova. Tudo em `src/domain/`, sem React nem banco.

| Arquivo | Conteúdo |
|---|---|
| `day.ts` | Novos: `fromDayKey` (AAAA-MM-DD → início do dia local; null para chave inválida ou data inexistente) e `addCalendarDays` (dias de calendário, nunca "N × 24 h") |
| `streak.ts` | `MILESTONE_DAYS` (lista provisória, único lugar), `getStreakBase`, `getStreakDays`, `getNextMilestone`, `getAbstinenceStart` (do dia do "Começar" menos N) e `isValidDaysAlreadyWithoutRelapse` (1 a 3650) |
| `checkIn.ts` | Enums `CHECK_IN_ANSWERS` e `CHECK_IN_SOURCES`, `DEFAULT_CHECK_IN_MINUTES` (1260), `isValidCheckInMinutes`, `getTodayCheckInStatus`, `getRelapseDayOptions` ("ontem" só com início antes de hoje), `getRelapseDayKey` e `canUndo` (pelo dia do registro, não pelo dia a que se refere) |
| `timeRange.ts` | `TimeRange` em minutos, `parseTimeRange`/`formatTimeRange` (`HH:MM-HH:MM`), `PRESET_TIME_RANGES` (as 12 de 2 horas), `isWithinTimeRange` (início incluso, fim excluso, atravessando a meia-noite), `addTimeRange` (sem duplicata) e `mergeTimeRanges` para o resumo (vizinhas e sobrepostas unidas, inclusive através da meia-noite; `ALL_DAY` quando cobrem as 24 horas) |
| `triggers.ts` | `EMOTIONS`, `WEEKDAYS` (domingo = 0, como `Date.getDay()`), atalhos "Dias úteis"/"Fim de semana" com `toggleWeekdayShortcut` e `isValidTriggerValue` por `kind` |
| `onboarding.ts` | `ONBOARDING_STEPS` (os nomes das rotas, futuro `settings.onboarding_step`), etapa seguinte e anterior, limite diário (opções, padrão 60, 5 a 600) e motivação (3 a 280 caracteres sem os espaços das pontas; emoji conta 1) |
| `suggestedApps.ts` | Pacotes pré-marcados por papel (TikTok com os dois pacotes) e `getPreselectedPackages` |

Regras escolhidas na implementação, dentro da spec:
- A streak nunca é negativa: início no futuro ou hoje reprovado dão 0. Na
  moderação, um dia reprovado põe a base no dia seguinte, então hoje
  reprovado e ontem reprovado dão 0 hoje.
- Eventos com chave inválida ou em dia futuro são ignorados no cálculo.
- Toque num atalho de dias: com todos os dias dele marcados, desmarca esses
  dias; senão, marca os que faltam. Os outros dias não mudam.
- O `isAppRoleAllowed` ao gravar apps fica para o passo 2 (repositórios).
- A lista do `FakeMonitoringModule` com os pacotes sugeridos fica para o
  onboarding (passo 4), onde a pré-marcação é usada.

### Testes

121 testes no domínio (271 no total), com virada de dia, mês e ano e o horário
de verão de São Paulo (dia de 23 horas sem meia-noite, dia de 25 horas).

Mutação de controle, cada uma derrubando ao menos um teste:

| # | Mutação | Falhas |
|---|---|---|
| M1 | Moderação sem "dia seguinte ao reprovado" | 3 |
| M2 | "Há N dias" como N × 24 h | 1 (depois do teste novo) |
| M3 | Faixas vizinhas não se juntam | 4 |
| M4 | Faixa que atravessa a meia-noite com `&&` | 3 |
| M5 | Sem junção através da meia-noite | 5 |
| M6 | "Ontem" oferecido no dia do início | 1 |
| M7 | Desfazer por 24 horas em vez de "registrado hoje" | 1 |
| M8 | Eventos futuros contam | 2 |

**M2 sobreviveu na primeira rodada:** o teste de 120 dias atravessava as duas
trocas do horário de verão, e a hora a menos e a hora a mais se anulavam.
Entrou um caso que atravessa só o início (10 dias antes de 10/11/2018).

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

### AP2 · Arquivo travado no build do Windows (02/11/2026)

**Sintomas, em dois builds seguidos depois do prebuild do passo 4:**
1. `:react-native-worklets:buildCMakeDebug` falhou com `Unable to delete
   directory ...\intermediates\cxx\Debug\...\obj\arm64-v8a`, no arquivo
   `libc++_shared.so` ("a process has files open").
2. Depois de `gradlew --stop` e da remoção dessa pasta, o C++ recompilou
   (12m48s), mas o `:app:packageDebug` falhou em
   `PackageAndroidArtifact$IncrementalSplitterRunnable`, sem mais detalhe.

**Solução:** rodar `gradlew installDebug` de novo. Passou em 1m58s, sem
nenhuma mudança. Tudo indica arquivos presos por um processo (daemon antigo
do Gradle/Kotlin ou o antivírus), não erro de configuração. Se repetir:
`gradlew --stop`, apagar a pasta citada e tentar de novo antes de investigar
mais a fundo.

### AP3 · `installDebug` parado: `adb` travado (02/11/2026)

**Sintoma:** o build empacotou o APK às 14:29 e ficou 20 minutos parado em
`> Task :app:installDebug`. `adb devices` e `adb shell echo ok` não
respondiam (`timeout` com código 124). É o mesmo P7 do protótipo.

**Solução:**
1. Encerrar o build.
2. Matar o `adb.exe` (`Stop-Process` no PowerShell; o `adb kill-server` também
   trava nesse estado).
3. `adb start-server` e `adb devices`.
4. Instalar o APK já compilado:
   `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
   (`Success`). Não é preciso recompilar.
5. Refazer o `adb reverse tcp:8081 tcp:8081`.

**Prevenção:** antes de um build longo, conferir `adb shell echo ok`. Em
builds em segundo plano, considerar o tempo: se o log não mudar por vários
minutos em `installDebug`, é o `adb`.

## Decisões do responsável (01/11/2026)

- Pontos 4 a 7 da leitura da spec aprovados e incorporados na spec v0.3
  (`src/config/`, voltar do Android no onboarding, `age_confirmed_at` nulo até a
  Fase 3, enums técnicos nunca em logs).
- **Sentry:** fica para antes da Fase 8. Não instalar agora.
- **Banco:** Drizzle ORM sobre `expo-sqlite`, com o teste de duas migrações no
  aparelho (V11).

## Decisões do responsável (02/11/2026)

- **Limite da moderação somado** (doc 01 v0.6, seção 6.5.4): um limite
  diário por compulsão, valendo para a soma do tempo em todos os apps
  escolhidos; estourado, a interrupção vale em qualquer um deles. Os apps de
  risco da pornografia seguem com 10 minutos **por app** (6.5.6). A
  interface de regras do passo 8 já atende (ver passo 8).
- **`expo-application`** para versão e build da tela "Sobre" (passo 9).
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
