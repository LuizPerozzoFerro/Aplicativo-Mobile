# NOTAS — Diário técnico do protótipo

> Fase 1. Registro de decisões, problemas e comandos. Uma entrada por experimento,
> com resultado (✅ / ⚠️ / ❌) e evidência.

---

## Estado atual e próximo passo

> Seção de passagem entre sessões. **Ler primeiro.** Atualizada em 20/09/2026, 13:50.

**Branch:** `prototype/android-vpn`, criado a partir de `prototype/android-usage`
(que ficou com A1–A5 e A9) para o grupo da VPN: A6, A7 e A8. Tudo commitado.

**Placar do Android:**

| ID | Resultado |
|---|---|
| S1 · S4 · A1 · A2 · A5 | ✅ |
| A3 · A4 · A6 · A7 · A8 · A9 · A10 | ⚠️ com limitações documentadas |
| S2 · S3 · iOS | não iniciados — dependem da conta Apple Developer pessoal |
| C1 · C2 | C1 depende do iOS; C2 (textos neutros) já tem material no A3 |

**Feito na sessão de 18 e 19/09/2026** (pausa pedida pelo responsável na
madrugada de 19/09, retomada às 14:27):
- **A4, complemento:** instrumentação corrigida (retorno conferido depois do
  "Continuar", um `interruption_shown` por interrupção, voltar e início na tela
  própria registrados) e botão "Ir para a tela inicial" nas duas abordagens.
  Validado nas rodadas O1–O3 e T1–T5 (ver "Achado A4 → Instrumentação").
- Achado no caminho: a detecção do app em primeiro plano só olhava 5 minutos para
  trás. Corrigido para 24 h; afetaria a escalada do A4 e o retorno do alerta no A5.
- **A5 ✅**, pausa depois do "Continuar", na sobreposição (ver "Achado A5"). Regras
  decididas pelo responsável: só o "Continuar" pausa; a tela inicial e a emergência
  não; no fim da pausa vem a notificação e, se o uso continuar, a tela.
- **A6 ⚠️**, domínio da lista por VPN local de DNS (ver "Achado A6" e D5): alerta
  e bloqueio funcionam no Chrome, com as limitações do próprio DNS.
- **A7 ⚠️** (ver "Achado A7"): o acesso a instagram.com pelo Chrome é detectado
  e separado do app. O tempo no navegador, pela heurística escolhida pelo
  responsável, deu 204 s para 180,6 s reais (+13%) numa rodada de 5 min, mas o
  acerto depende de um corte numa faixa estreita e a resolução é de ~1 minuto.

- **A8 ⚠️** (ver "Achado A8"): rodadas A a E mais a janela de bateria, feitas com
  o responsável em 19/09. Um defeito do repasse foi medido e corrigido, o DNS
  privado estrito se mostrou incompatível com a VPN (os apps ficam sem DNS) e o
  custo de bateria da VPN ficou na mesma ordem do serviço sozinho.

- **A10 ⚠️** (ver "Achado A10"): pesquisa documental das políticas do Google
  Play, com a tabela de permissão, exigência e risco que a spec pede. Dois
  riscos altos: a política da VpnService pressupõe servidor remoto e criptografia
  até o túnel, que não existem num desenho local (I-19), e o critério de "rodar
  só o tempo necessário" bate de frente com um serviço que fica ligado o dia
  inteiro (I-2). Um achado técnico novo: qualquer app pode esconder a nossa
  sobreposição (I-25). O desenho que não manda nada para fora paga bem na
  declaração de segurança de dados, no spyware e na nova métrica de bateria.

- **A4, rodada do I-25** (ver "Achado A4 → Rodada do I-25"): função nova no
  módulo (`setHideOverlayWindows`), botões no laboratório e um app de teste de
  outro UID em `prototype/labtarget/`. Com o app de teste protegido na frente,
  a nossa sobreposição ficou **invisível** enquanto o log gravava
  `interruption_shown`; ao desligar a proteção, a mesma janela apareceu na hora.
  Dois impactos: I-25 (a sobreposição não é garantia) e I-28 (o nosso evento de
  interrupção não prova que o usuário viu). Com o laboratório protegendo a
  própria tela não dava para ver nada: entre janelas do mesmo UID o sistema
  ignorou a proteção.

- **I-28 corrigido no protótipo** (ver "Achado A4 → Correção do I-28"): a
  sobreposição confere quatro sondas meio segundo depois de aparecer e grava
  `interruption_shown` só se a janela estiver mesmo na tela; se não estiver,
  grava `interruption_suppressed`. Das quatro sondas, **só o foco de janela**
  denuncia a supressão. Na tela própria, o serviço passou a gravar
  `interruption_requested`, para um início barrado em silêncio aparecer como
  pedido sem tela. Validado nas duas rodadas de 22:36 e 22:43.

**Feito em 20/09/2026, pela manhã:**
- **Prazo de validade da janela suprimida (I-28).** Decisão do responsável: nada
  além da notificação já enviada, e 20 s de prazo para a janela aparecer. Os
  três caminhos medidos às 11:37–11:39: suprimida, descartada em 20 s, e
  aparecendo depois de 4,5 s quando a proteção sai dentro do prazo.
- **Varredura do I-25:** nenhum dos seis apps-alvo (Instagram, TikTok, X,
  Reddit, YouTube, Chrome, mais o Samsung Internet) protege a tela de abertura
  contra sobreposições. O risco segue real, mas hoje é teórico para esse
  conjunto. Bancos não foram medidos.
- **Notificação em tela cheia testada e descartada (I-26).** Com o aparelho em
  uso, o sistema não abre a tela — mostra um aviso flutuante, que é o que a
  notificação do A3 já faz. Com o aparelho bloqueado ela abre a activity, mas
  atrás do bloqueio. Somada à barreira de loja do A10, não há terceira via.

**Feito em 20/09/2026, à tarde:**
- **Recuo progressivo (I-28)**, decidido pelo responsável: 1, 2, 5 e 15 min
  depois de cada supressão, com volta à tentativa imediata quando a pessoa sai
  do app monitorado e entra de novo. Medido às 13:32–13:36.
- **A5 revalidado** no mesmo build (13:37–13:40): a pausa depois do "Continuar"
  seguiu a regra de 18/09, sem desvio. O experimento continua ✅ e **não precisa
  de mais nada**.
- **Notificação em tela cheia descartada** como caminho técnico, por decisão do
  responsável, e o código de teste removido do protótipo (fica no commit
  `6cd4c70`). A permissão `USE_FULL_SCREEN_INTENT` saiu do manifesto junto.
- **Tela própria segue como alternativa válida**: o atraso dela é de 31 ms entre
  o pedido do serviço e a tela, não algo que atrapalhe.
- Registrado para o relatório: **apps financeiros, inclusive casas de aposta,
  são os candidatos naturais a ligar a proteção do I-25** — o que atinge em
  cheio o escopo da Fase 2.

**Próximo passo: A6, em modo alerta.** O experimento já está ⚠️ concluído desde
18/09 (ver "Achado A6"), então o que falta é revalidar no build de hoje: ligar a
VPN em modo alerta e conferir a detecção de um domínio da lista pelo Chrome,
com a notificação. A VPN está desligada desde 19:30 de 19/09.

Depois disso, as opções continuam: fechar o C2, rodar os roteiros T1–T10
(inclusive o T6, que fecha a pendência de bateria do A8), começar o relatório de
viabilidade, ou o iOS, se a conta Apple Developer estiver pronta.

**VPN no aparelho:** consentimento concedido (`appops ... ACTIVATE_VPN: allow`),
VPN **desligada**, modo salvo **alerta**, listas example.com e example.org (A6) e
instagram.com e cdninstagram.com (A7). O Chrome está logado no Instagram (login
feito pelo responsável em 19/09).

**Para testar a interrupção de novo:** o limite no aparelho está em **600 min**
(ver o estado abaixo). Baixar para 2 min na seção A2 e tocar em "Iniciar limite":
o Instagram já passa de 20 min em 18/09, então o limite estoura no ciclo seguinte.
Desde o A5, **cada** abertura do Instagram acima do limite e fora da pausa
interrompe de novo. Ao terminar, subir o limite outra vez, para não atrapalhar o
uso normal do aparelho.

**Estado do aparelho em 20/09/2026, 13:50:** serviço do limite ativo (instância
recriada pela reinstalação das 13:29, que trouxe o recuo progressivo e tirou o
código da tela cheia), **limite de 600 min** no Instagram (acima do uso diário:
o serviço segue rodando sem interromper), modo **sobreposição**, pausa de 2 min.
VPN **desligada** desde 19:30:39 de 19/09. Todas as permissões concedidas
(acesso a dados de uso, notificação, sobreposição, VPN e HIDE_OVERLAY_WINDOWS).
Rotação automática ligada. **Modo economia de energia ligado**
(`settings get global low_power` = 1): estava ligado durante toda a janela de
bateria do A8, e o monitoramento funcionou assim mesmo. O DNS privado está em
`opportunistic` (o nome `dns.google` ficou guardado, sem uso) e o DNS seguro do
Chrome voltou ao padrão. O relógio do PC está ~2 s adiantado em relação ao do
aparelho.

**App de teste instalado:** `com.norte.labtarget` ("Alvo do laboratorio"), da
rodada do I-25. Fonte em `prototype/labtarget/`. Não roda nada em segundo plano;
some com `adb uninstall com.norte.labtarget`.

**Atenção ao abrir o laboratório:** o serviço mantém o processo vivo, e com ele o
JavaScript antigo na memória. Subir o Metro não basta (P6): com o laboratório na
frente, `adb shell input keyevent 46 46` recarrega.

**Recomendação de trabalho:** o responsável quer retomar **nesta mesma sessão**
do Claude Code (aberta em 18/09). Se ela não estiver disponível, uma sessão nova
parte daqui: este arquivo é a passagem.

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

### D5 — A6: VPN local só de DNS, repassando ao DNS da própria rede
Decidido com o responsável em 18/09/2026, antes da implementação.

- **Só DNS passa pela VPN.** A interface tem uma única rota, para um servidor de
  DNS falso; o resto do tráfego segue direto. Ler o tráfego inteiro exigiria uma
  pilha TCP/IP no app (custo, bateria, risco), e a spec pede exatamente "consultas
  DNS contra lista local".
- **Repasse ao DNS da própria rede**, e não a um DNS público fixo: nenhum terceiro
  novo passa a ver as consultas. O repasse acompanha a troca de rede (Wi-Fi e
  dados móveis), senão o servidor do roteador de casa deixaria de responder na rua.
- **Modo bloqueio também**, além do alerta pedido pelo A6: responde "domínio
  inexistente" aos itens da lista. Mostra no relatório que o Android consegue os
  dois.
- **Sem biblioteca** (§8.2): o mínimo de IPv4, UDP e DNS foi escrito à mão.
- **Domínios de teste:** example.com e example.org, reservados pela IANA.

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
    android/.../InterruptionBackoff.kt     # recuo progressivo depois de supressão (A4)
    android/.../InterruptionExits.kt       # saídas comuns (tela inicial, emergência, retorno) e pausa (A4, A5)
    android/.../LabVpnService.kt           # VPN local que só enxerga DNS (A6)
    android/.../DnsPacket.kt               # IPv4/UDP/DNS lidos e montados à mão (A6)
    android/.../DomainWatchConfig.kt       # listas de domínios (A6, A7) e modo, em disco
    android/.../BrowserSessionTracker.kt   # estimativa de tempo de rede social no navegador (A7)
    android/.../LabMonitoringModule.kt     # fachada Expo Modules
    ios/LabMonitoringModule.swift          # esqueleto: tudo 'unsupported'
  labtarget/                     # app de teste do I-25, fora do protótipo
    src/main/java/.../MainActivity.java    # só liga setHideOverlayWindows (A4)
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
| A4 | ⚠️ Funciona com limitações | As duas abordagens cumprem o critério: a tela aparece sobre o Instagram com o protótipo fechado, mostra a motivação, e "Continuar" registra `continue_tapped` e volta **ao mesmo post**. **Sobreposição:** o voltar é ignorado, ela continua por cima da tela inicial, não cobre as barras, e o sistema publica "Norte Lab exibido sobre outros apps". **Tela própria:** o voltar a fecha sem escolha. Ambas dependem de `SYSTEM_ALERT_WINDOW`. Em 18/09 à noite: instrumentação corrigida e botão "Ir para a tela inicial" nas duas, validados no aparelho. Em 19/09, rodada do I-25: um app de teste de outro UID, com `setHideOverlayWindows`, **apagou a nossa sobreposição** enquanto o log dizia que ela tinha aparecido (I-25). Corrigido: a sobreposição confere o foco da janela antes de gravar `interruption_shown`, grava `interruption_suppressed` quando some e descarta a janela depois de 20 s (I-28). Varredura de 20/09: nenhum dos seis apps-alvo protege a tela de abertura. Notificação em tela cheia testada e **descartada como caminho técnico**: com o aparelho em uso ela não abre a tela (I-26). Recuo progressivo de 1, 2, 5 e 15 min depois de cada supressão, com volta imediata quando a pessoa sai e volta ao app (I-28). Ver achado abaixo |
| A5 | ✅ Funciona | Pausa de 2 min depois do "Continuar", na sobreposição: nenhum alerta em 6 verificações, com a pessoa no Instagram e saindo e voltando. No fim, a notificação e, 20 s depois, a tela. O fim da pausa é notado com até 20 s de atraso (medido: 14 s). Tela inicial e emergência não pausam: reabrir o Instagram interrompe de novo em ~7 s. A pausa sobreviveu à recriação do serviço. Revalidado em 20/09 no build com o recuo progressivo: mesma regra, sem desvio. Ver achado abaixo |
| A6 | ⚠️ Funciona com limitações | VPN local só de DNS. No Chrome, abrir example.com gerou `adult_domain_detected` e a notificação 15 ms depois, e a página carregou: critério cumprido. Modo bloqueio também funciona (`DNS_PROBE_FINISHED_NXDOMAIN`). Zero consultas sem resposta; ida e volta de 26 ms ao DNS da rede. Limitações: o pré-carregamento dispara o alerta sem visita, página guardada no navegador aparece mesmo bloqueada, só uma VPN por vez, e o sistema diz ao usuário que a VPN "permite monitorar o tráfego da rede". Ver achado abaixo |
| A7 | ⚠️ Funciona com limitações | Critério da spec cumprido: instagram.com no Chrome gerou `social_domain_detected` "via: navegador", e o app do Instagram saiu separado ("via: outro app"). A consulta de DNS não diz qual app perguntou; a separação vem do app em primeiro plano. Tempo no navegador, por heurística: 204 s estimados para 180,6 s reais (+13%) numa rodada de 5 min, mas com corte fora da faixa de 85–96 s o erro vai de −99% a +67%, e a resolução é de ~1 min. Ver achado abaixo |
| A8 | ⚠️ | Navegação geral ok depois de corrigir o repasse (mediana de 2,6 s → 49 ms); apps de banco ok; outra VPN derruba a nossa, que não volta sozinha; **DNS privado estrito + nossa VPN deixa os apps sem DNS**; DNS seguro do Chrome ainda deixa ver o endereço principal; a VPN sobrevive à queda do Wi-Fi, ao Doze profundo e ao modo economia; bateria: 0,366% de CPU e ~1 mAh a cada 2 h com o aparelho parado. Ver achado abaixo |
| A9 | ⚠️ Funciona com limitações | Sobreviveu a 2 h 05 min desconectado (~114 min em Doze profundo) e continuou detectando com 3 s de latência. Volta sozinho após reinício via `BOOT_COMPLETED`, mas só **~2,5 min depois do boot e só depois do usuário desbloquear a tela** — há uma janela cega. Custo: **0,138%** de CPU, 0,476 de 73,2 mAh, e esse número inclui ruído do dev client. Faltam "Apps em suspensão" da Samsung (precisa de dias) e o roteiro T6 |
| A10 | ⚠️ Tabela pronta, com riscos abertos | Pesquisa documental das políticas do Play em 19/09/2026. Tabela de permissão, exigência e risco no achado abaixo. `PACKAGE_USAGE_STATS` e a lista de apps são dado sensível: exigem divulgação destacada no app e política de privacidade. `specialUse` exige `<property>`, declaração no Play Console com vídeo e os cinco critérios de serviço em primeiro plano — o de "rodar só o tempo necessário" é o risco. `systemExempted` da VPN é isento desses critérios, mas só vale enquanto somos a VPN ativa. A política da `VpnService` pressupõe servidor remoto e criptografia até o túnel, que não existem no nosso desenho local. Achado novo, confirmado no aparelho na mesma noite: `setHideOverlayWindows` esconde a nossa sobreposição, com uma permissão de nível normal, e o nosso log não percebe (I-25, I-28). Ver achado abaixo |

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

#### Rodada do I-25: um app comum apaga a nossa interrupção (19/09/2026, 21:20–22:10)

O A10 achou `Window.setHideOverlayWindows(true)`, que promete impedir
sobreposições de terceiros sobre a janela de quem chama, com uma permissão de
nível **normal** — qualquer app pode declará-la, e ela sai concedida na
instalação. Evidência completa em
`docs/relatorios/evidencias/a4-protecao-contra-sobreposicao.txt`.

**Primeira rodada, com o laboratório protegendo a própria tela: nada aconteceu.**
A flag chegou ao sistema (`pfl=10088840` protegida contra `pfl=10008840`
desprotegida, diferença de `0x00080000`) e mesmo assim a sobreposição apareceu,
às 21:26:41 e de novo às 21:29:08. Entre janelas do mesmo UID o sistema agiu
como se a proteção não existisse.

**Segunda rodada, com um app de teste de outro UID: apagou.** O app está em
`prototype/labtarget/`, tem uma activity e uma linha de código. Com ele na
frente e protegido:

| Momento | O que o sistema diz |
|---|---|
| 22:06:27 | O laboratório grava `interruption_shown` — do nosso lado, a interrupção "aconteceu" |
| 22:07, protegido | A janela da sobreposição: `mForceHideNonSystemOverlayWindow=true`, `mPolicyVisibility=false`, `Surface: shown=false`, `isVisible=false`. A tela do app de teste, na captura, está limpa |
| 22:07, toque em "Alternar protecao" | **Na hora**, sem o serviço fazer nada: `Surface: shown=true`, `isVisible=true`. A mesma janela, que nunca foi recriada, aparece |

Duas conclusões, e a segunda é pior que a primeira:

1. **A sobreposição não é garantia.** Um app comum a apaga com uma linha e uma
   permissão que ninguém precisa aprovar (I-25). A tela própria não é afetada
   por essa proteção, mas o voltar a dispensa (I-13).
2. **A nossa instrumentação mente.** `interruption_shown` é gravado quando
   chamamos `addView`, não quando a janela chega à tela. Nas duas rodadas o
   evento está lá com a tela do usuário limpa. Qualquer contagem de
   interrupções construída sobre esse evento estaria errada, e o app não teria
   como perceber a falha (I-28).

#### Correção do I-28: o log passou a conferir se a janela chegou à tela (22:36–22:43)

A sobreposição agora só grava `interruption_shown` **meio segundo depois de ser
adicionada**, e só se quatro sondas da própria view disserem que ela está na
tela. Quando não está, grava `interruption_suppressed` com as mesmas sondas no
detalhe. As duas rodadas, com o mesmo app de teste da rodada anterior:

| Rodada | Evento gravado | foco | janela visível | isShown | desenhou |
|---|---|---|---|---|---|
| 22:36:50, app **desprotegido** | `interruption_shown` | sim | sim | sim | sim |
| 22:37:50, app **protegido** | `interruption_suppressed` | **não** | sim | sim | sim |

**Só o foco de janela denuncia a supressão.** `windowVisibility`, `isShown` e o
desenho da view continuam positivos com a janela escondida — é exatamente por
isso que o app não tinha como perceber. Como a nossa sobreposição é focável (ela
precisa receber o voltar e os toques), a ausência de foco meio segundo depois de
aparecer é sinal confiável. Não é infalível: uma sobreposição não focável, ou um
teclado do sistema por cima, dariam falso negativo.

Também ficou visível um efeito que ninguém tinha notado: **a janela suprimida
não é descartada**. Ela fica adicionada e invisível, e no instante em que o app
protegido sai da frente ela aparece — às 22:39 a interrupção surgiu sobre o
laboratório, fora de contexto, minutos depois do que a motivou. No app
definitivo isso precisa de prazo de validade.

Na tela própria (abordagem b) o problema é outro: um início de activity barrado
pelo sistema não gera exceção. Agora o serviço grava `interruption_requested`
quando pede a tela, e a activity grava o `interruption_shown` no `onCreate`; o
par mostra se a tela chegou a existir. Medido às 22:43:10: pedido e tela com
31 ms de diferença.

#### Prazo de validade da janela suprimida (decisão do responsável, 20/09/2026)

Duas decisões fecharam o assunto do I-28. **Quando a interrupção é suprimida, o
app não faz nada além da notificação de nível 1 que já saiu** — ela é a rede de
segurança, e o app monitorado não consegue suprimi-la. E **a janela suprimida
vale 20 segundos**: se não aparecer nesse prazo, é descartada, em vez de surgir
fora de contexto quando o app protegido sair da frente.

Implementado e medido na mesma manhã, com o app de teste protegido na frente:

| Momento | Evento |
|---|---|
| 11:37:58 | `interruption_suppressed` — foco: não |
| 11:38:18 | `interruption_discarded` — "suprimida por 20 s" |
| 11:38:38 | o ciclo seguinte tenta de novo e é suprimido de novo |
| 11:39:18 → 11:39:22 | com a proteção desligada dentro do prazo: `interruption_shown` — "apareceu depois de 4,514 s" |

Os três caminhos funcionam. Fica registrado um efeito que o produto vai ter de
resolver: enquanto a pessoa continua no app protegido e acima do limite, o
serviço tenta a cada ciclo, e o log enche de pares suprimida/descartada a cada
40 s. O app definitivo precisa de recuo progressivo depois da primeira falha.

#### Recuo progressivo depois da supressão (decisão do responsável, 20/09/2026)

O protótipo insistia a cada ciclo e falhava a cada 40 s enquanto a pessoa
continuasse no app protegido. A regra decidida: **1 min, depois 2, depois 5, com
teto de 15**, e volta à tentativa imediata se a pessoa sair do app monitorado e
entrar de novo acima do limite. Implementado em `InterruptionBackoff.kt`.

| Momento | O que aconteceu |
|---|---|
| 13:32:43 | `interruption_backoff` — "supressao 1 · proxima tentativa em 1 min" |
| 13:34:03 | nova tentativa, suprimida de novo |
| 13:34:23 | `interruption_backoff` — "supressao 2 · proxima tentativa em 2 min" |
| 13:35:03 | `interruption_backoff_reset` — "saiu do app monitorado · supressoes anteriores: 2" |
| 13:35:23 | de volta ao app, a tentativa foi **imediata**, sem esperar os 2 min |

O intervalo entre tentativas saiu de 40 s para 100 s e depois 140 s. Os degraus
de 5 e 15 min não foram exercitados no aparelho — são o mesmo caminho de código,
escolhido por índice.

#### A5 revalidado no build de hoje (13:37–13:40)

As mudanças do I-25 e do I-28 mexeram no caminho que mostra a sobreposição, que
é por onde a pausa do A5 começa. Rodada de regressão com o app de teste
**desprotegido**: `continue_tapped` às 13:37:37, `pause_started` "2 min, ate
13:39:37", nenhum alerta em 6 verificações, `pause_ended` com 6 s de atraso,
notificação de fim de pausa e a tela de volta no ciclo seguinte, às 13:40:04.

É a regra decidida em 18/09, sem desvio. **O A5 continua ✅ e não precisa de
mais nada.**

#### Varredura: nenhum dos apps-alvo protege a tela de abertura (20/09/2026)

Com o I-25 confirmado, a pergunta que sobrava era se o risco é cotidiano. Cada
app foi aberto e a janela dele lida no `dumpsys`:

| App | Tela medida | Protege? |
|---|---|---|
| Instagram | `MainTabActivity` | não |
| TikTok | tela de login | não |
| X | `MainActivity` | não |
| Reddit | `AuthActivity` | não |
| YouTube | `HomeActivity` | não |
| Chrome | `Main` | não |
| Samsung Internet | `HelpIntroActivity` | não |
| Alvo do laboratório (controle) | `MainActivity` | **sim** |

**Hoje o risco é teórico para esse conjunto.** Três ressalvas: só a tela de
abertura foi medida e a flag é por janela; é um retrato das versões de hoje; e
apps de banco, os suspeitos naturais, não foram medidos.

**Para o relatório final, e já de olho na Fase 2:** os apps mais propensos a
ligar essa proteção são os **financeiros** — bancos, carteiras e, o que
interessa diretamente à Fase 2, **casas de aposta**. São eles que têm motivo
para se proteger de sobreposições, porque sobreposição é a técnica clássica de
fraude em tela de pagamento. Se o app definitivo for monitorar apostas, a
sobreposição é a abordagem com maior chance de ser apagada justamente no alvo
que mais importa, e a tela própria passa a ser a aposta principal. Vale medir
uma amostra de apps de aposta antes de fechar o desenho.

#### Notificação em tela cheia: testada e descartada como alternativa

A pergunta era se a notificação em tela cheia (`setFullScreenIntent`) abriria a
tela própria sem depender da sobreposição. Evidência em
`docs/relatorios/evidencias/a4-notificacao-tela-cheia.txt`.

A documentação oficial já responde, e o aparelho confirmou:

| Situação | O que aconteceu |
|---|---|
| Aparelho em uso (11:48) | A notificação foi postada com `fullscreenIntent` e importância alta, e **a activity não abriu**: o laboratório continuou na frente. Repetido duas vezes |
| Aparelho bloqueado (11:51) | A activity **abriu** 615 ms depois e o aparelho acordou — mas atrás do bloqueio (`mKeyguardOccluded=false`). O usuário via a tela de bloqueio |

Desde o Android 13, com a pessoa usando o aparelho, o sistema mostra um aviso
flutuante em vez de abrir a intent. Ou seja, no momento que nos interessa a
tela cheia entrega o mesmo que o alerta de nível 1 do A3 já entrega. Junte-se a
isso a barreira de loja do A10 — a permissão é reservada a apps de chamada e
despertador, e o Play revoga a de quem não se encaixa — e a conclusão é que
**não há terceira via**: restam a sobreposição e a tela própria (I-26).

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
- **Apps de banco com a proteção do I-25.** A varredura cobriu os seis
  apps-alvo; bancos ficaram de fora porque o laboratório não opera apps
  bancários do responsável.

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

### Achado A6 — detectar domínio por VPN local de DNS: funciona, mas o DNS é só um indício de acesso

**Resultado: ⚠️ funciona com limitações.** O critério da spec foi cumprido em
18/09/2026 às 23:35: no Chrome, abrir https://example.com gerou
`adult_domain_detected` e a notificação 15 ms depois, e a página carregou
normalmente. As limitações vêm do próprio DNS, que avisa que um nome foi
consultado, não que uma página foi vista. Desenho na decisão D5; evidência em
`docs/relatorios/evidencias/a6-vpn-dns.txt`.

#### O que foi medido

| Medida | Valor |
|---|---|
| Da consulta ao alerta | 15 ms (log: `adult_domain_detected` → `notification_sent`) |
| Consultas repassadas sem resposta | 0 de 95 repassadas, em duas sessões |
| Ida e volta ao DNS da rede (roteador) | 26,5 ms em média, pela VPN |
| Latência de DNS vista pelo sistema, na VPN | mediana 26 ms, p90 55 ms, máxima 164 ms (49 consultas) |
| Rede VPN segundo o sistema | `VALIDATED`, `NOT_METERED`, rede de baixo = Wi-Fi |
| Modo bloqueio | example.org no Chrome: `DNS_PROBE_FINISHED_NXDOMAIN`; sites fora da lista abrem |
| Subdomínio | www.example.org detectado como example.org |
| Alertas repetidos | um por item da lista por minuto; 21 de 25 detecções foram agrupadas assim |

Os números de latência não têm linha de base sem VPN: medida no A8 (mediana de
49 ms com VPN contra 15 a 38 ms sem, na mesma navegação).

#### O que o Android cobra de uma VPN (guia oficial, consultado em 18/09/2026)

- **Consentimento numa caixa do sistema**, com um texto que o app não controla:
  *"O Norte Lab quer configurar uma conexão VPN que permite monitorar o tráfego da
  rede. Aceite somente se confiar na origem."* É o que o usuário do app definitivo
  vai ler no onboarding.
- **Chave de VPN na barra de status** enquanto ela existir, e o nome do app nas
  telas de VPN do sistema.
- **Uma só VPN por usuário.** Ligar a do app desliga qualquer outra (corporativa,
  de privacidade, a "Wi-Fi seguro" da Samsung). A testar no A8.
- **Notificação permanente** e, no Android 14+, o tipo de serviço
  `systemExempted`, permitido a apps de VPN configurados nos Ajustes.
- **Dois comportamentos padrão que quebrariam o aparelho**, tratados no código: sem
  `allowFamily(AF_INET6)`, uma VPN que só declara IPv4 bloqueia todo o IPv6; sem
  `setMetered(false)`, o Wi-Fi passaria a parecer rede tarifada para todos os apps.

#### O que o DNS não conta

- **Pré-carregamento dispara o alerta sem visita.** O Samsung Internet consultou
  www.example.org antes de mostrar a página, parado na tela de primeiro uso. Links
  pré-carregados, sugestões de busca e pré-visualizações podem gerar alerta sem o
  usuário ver o site.
- **Página guardada no navegador aparece mesmo com bloqueio.** example.com,
  aberto 2 minutos antes, voltou a aparecer no modo bloqueio: a cópia do cache HTTP
  do Chrome dispensou a rede. A consulta daquela vez foi especulativa; nada garante
  que ela aconteça numa revisita.
- **O cache de DNS do sistema** faz o alerta sair no primeiro acesso depois que a
  resposta anterior expira, não a cada acesso.
- **DNS cifrado esconde o nome.** O "DNS privado" do aparelho está no automático: o
  sistema tentou DNS sobre TLS contra o servidor falso da VPN, falhou e seguiu em
  texto claro (visível). No modo estrito, ou com o DNS seguro do navegador ligado
  com um provedor próprio, as consultas iriam cifradas direto ao provedor. Não
  testado; é do A8.
- **Só nomes, nunca URLs nem conteúdo.** É o que a privacidade exige (§9), e é
  também um limite: um domínio que mistura conteúdo comum e adulto não se separa
  por DNS.

#### Observação: consultas barradas pelo sistema

O registro de DNS do sistema (`NetdEventListenerService`) mostrou 105 consultas
com `isBlocked=true`, de Instagram, Chrome e Samsung Internet, todos em segundo
plano. Elas começaram na rede Wi-Fi **antes** de a VPN existir, e nenhuma chegou
à VPN (zero "sem resposta"). O padrão é de restrição de rede a apps em segundo
plano, do próprio Android, e não de falha do repasse. A causa exata não foi
investigada; vale olhar de novo no A8.

#### Ainda não testado

- Samsung Internet até o fim: a tela de primeiro uso pede concordância com os
  Termos e Condições do navegador, que não foi aceita em nome do responsável.
- Troca de rede com a VPN ligada: a queda e a volta do Wi-Fi foram exercitadas
  no A8 (rodada E); Wi-Fi para dados móveis, não (o S22 está sem serviço).
- DNS privado no modo estrito, DNS seguro do Chrome, outras VPNs e bateria:
  todos feitos no A8, ver "Achado A8".
- VPN sempre ativa e religamento após reinício (A9).

### Achado A7 — instagram.com pelo navegador: o acesso sim; o tempo, só por aproximação

**Resultado: ⚠️ funciona com limitações.** O critério da spec foi cumprido em
19/09/2026: o acesso a instagram.com pelo Chrome é registrado, e separado do uso
pelo app. O tempo de uso no navegador só se estima, com resolução de cerca de um
minuto e um acerto que depende de ajuste fino. Evidência em
`docs/relatorios/evidencias/a7-instagram-navegador.txt`.

#### O acesso é detectado, mas o DNS não diz qual app perguntou

Com a mesma VPN do A6 e uma segunda lista (instagram.com, cdninstagram.com), abrir
instagram.com no Chrome gerou `social_domain_detected` às 00:04:18, "via:
navegador". O problema de fundo é que **a consulta de DNS não carrega o app de
origem**, e o próprio app do Instagram consulta os mesmos domínios que o site. A
separação vem do app em primeiro plano no instante da consulta (leitura do A1):
com o app do Instagram na frente, a consulta dele (test-gateway.instagram.com) saiu
como "via: outro app". Navegador, aqui, é qualquer app que abre links https.

Limite dessa separação: uma consulta feita em segundo plano por outro app, com o
navegador na frente, seria atribuída ao navegador.

#### O tempo de uso no navegador: opções e a escolha

O DNS marca o momento do acesso, não a duração. As opções levadas ao responsável
em 19/09/2026:

| Opção | Situação |
|---|---|
| Tempo por site que o Chrome informa ao Bem-estar digital | Fora: não está na API pública do `UsageStatsManager` (referência consultada em 19/09/2026) |
| Serviço de acessibilidade lendo a barra de endereço | Descartada: lê conteúdo da tela (§9) e o Google Play restringe esse uso |
| VPN que lê o tráfego inteiro | Descartada por ora: pilha de rede nativa, bateria, risco de derrubar a internet; contraria a D5 |
| **Heurística: navegador na frente + consultas do Instagram chegando** | **Escolhida pelo responsável** |

O rastreador (`BrowserSessionTracker`) abre uma sessão na primeira consulta de rede
social com um navegador na frente, e a fecha quando o navegador sai da tela
(conferido a cada 5 s) ou quando as consultas param por 90 s, caso em que o fim é
a última consulta. O instante de cada consulta vai no `social_session_ended`,
para recalcular com outros intervalos sem repetir o teste.

#### A rodada de 5 minutos (19/09/2026, 14:30)

Com o Chrome logado no Instagram pelo responsável, ele rolou o feed por 3 minutos
e leu a Wikipédia por 2, no mesmo Chrome. O `adb` só cuidou do tempo e das trocas,
registrando a hora do aparelho em cada uma.

| | Valor |
|---|---|
| Verdade: Instagram aberto até a Wikipédia abrir | 180,6 s |
| Estimativa ao vivo (corte de 90 s) | **204 s: +23 s, +13%** |
| Instantes das consultas de rede social (s) | 0, 0, 0, 1, 1, 66, 66, 147 (×5), 204 |
| Maior intervalo entre consultas com o feed rolando | 81 s |

**O que os instantes mostram:**

- **O DNS pulsa por volta de uma vez por minuto**, mesmo com o feed rolando sem
  parar: o sistema e o Chrome guardam as respostas por cerca de um minuto, e as
  conexões são reaproveitadas. Essa é a resolução da heurística.
- **A aba em segundo plano continua consultando.** A última consulta (204 s) veio
  23 s depois da troca para a Wikipédia. Foi ela que levou a estimativa acima da
  verdade.
- **O acerto depende de um corte numa faixa estreita.** Recalculando com os mesmos
  instantes: com corte até 60 s, o intervalo natural de 66–81 s quebra a sessão
  (−99% a −68%); com 70–80 s, −32%; com 85–96 s, +13%; com 120 s ou mais, a sessão
  só fecha quando o navegador sai da tela e conta a Wikipédia (+67%).

Na prévia da madrugada, com o Chrome ainda sem login, a página de login parada
fez todas as 5 consultas no carregamento e nenhuma nos 35 s seguintes: página
parada não gera consultas, e a heurística não a distingue do fim do uso.

**Para o relatório (Q4):** detectar o uso de rede social pelo navegador, sim;
medir o tempo, só de forma grosseira. É uma rodada só, num site e num aparelho:
indício, não medida robusta. Se o produto precisar contar o navegador no limite,
a alternativa mais simples é tratar o acesso pelo navegador como gatilho de
alerta depois que o limite do app estourar, o que só exige a detecção, que
funciona.

### Achado A8 ⚠️ — impacto da VPN: um defeito corrigido, um conflito grave e custo baixo

**Feito em 19/09/2026, das 14:41 às 19:31**, com o responsável operando o
aparelho. Evidência em `docs/relatorios/evidencias/a8-impacto-vpn.txt`.

| Rodada | Resultado |
|---|---|
| A — navegação geral, com e sem VPN | ✅ depois de uma correção. Os 8 sites carregaram nas quatro janelas. Antes da correção, o Chrome esperou 2,4 a 3,2 s por consultas que levariam 20 ms; depois, mediana de 49 ms (15 a 38 ms sem VPN) |
| B — apps de banco | ✅ Dois apps de banco abriram normalmente, pediram a digital e chegaram ao login; todo o DNS deles passou pela VPN, sem aviso de VPN |
| C — outra VPN ("Wi-Fi seguro" da Samsung) | ⚠️ Ligar a outra derrubou a nossa na hora (`onRevoke`), sem travar nada; a nossa não voltou quando a outra foi desligada |
| D1 — DNS privado estrito | ❌ **Com a nossa VPN ligada, os apps ficaram sem DNS**, e o sistema avisou "Não é possível acessar o servidor DNS privado" |
| D2 — DNS seguro do Chrome | ⚠️ O endereço principal de cada navegação continuou passando pela VPN (2 de 2 domínios da lista detectados); os domínios secundários da página, não |
| E — queda e volta do Wi-Fi | ✅ A VPN ficou conectada, percebeu a queda (`upstream_lost`) e pegou a rede nova sozinha 27 s depois |
| Bateria — 2h 10 fora do cabo | ✅ 0,366% de CPU e 2,79 mAh de 97,0 do aparelho (1,47 é a tela, cobrada porque o laboratório ficou 1 min na frente). Nenhum wakelock parcial. A VPN atravessou o Doze profundo (91% da janela) e o modo economia de energia (100% da janela) |

#### O defeito do repasse (rodada A)

O DNS do roteador perde consultas nas rajadas de páginas pesadas: 7 falhas de 5 a
6 s **sem VPN**. A VPN repassava com 4 threads fixas e esperava 4 s por resposta,
então cada consulta perdida segurava as outras na fila. Corrigido no commit
`33bfb2a`: uma thread por consulta em andamento, espera de 1,5 s e uma segunda
tentativa. Na sessão seguinte, 2 consultas só responderam na segunda tentativa,
e as que continuaram sem resposta (~3%) são as que o roteador perde de qualquer
jeito.

#### O conflito grave: DNS privado estrito (rodada D1)

Com o DNS privado apontando para `dns.google`, o sistema validou o provedor pela
rede Wi-Fi, mas **não conseguiu pela rede da VPN**: a sondagem falhou a cada
tentativa ("Unable to resolve host", ~4,2 s), o sistema marcou
`PRIVATE_DNS_BROKEN`, tirou o `VALIDATED` da rede da VPN e notificou "A rede não
tem acesso à Internet". No modo estrito o sistema não volta ao DNS comum, e as
consultas do Chrome voltaram vazias depois de 4,2 a 8,4 s. A VPN, por sua vez,
não recebeu nenhuma. A causa provável é a rota única da VPN, só para o servidor
falso. Voltar ao "Automático" resolveu em menos de um minuto. Para o produto:
detectar o modo estrito antes de ligar a VPN, e depois dela ligada, é
obrigatório (I-22).

#### A bateria: barata, mas medida com o aparelho parado

Das 17:15:44 às 19:25:31, fora do cabo, com a VPN em modo alerta e o serviço do
limite ligados. O `batterystats` se zera sozinho quando o cabo sai, então as
estatísticas "since last charge" cobrem exatamente a janela.

A janela **não foi de uso leve, foi de aparelho parado**: 6m 58s de tela ligada
em 2h 09m, 91,4% em Doze profundo e modo economia de energia ligado o tempo
todo. Mede bem o custo de uma VPN que fica ligada 24 h por dia; não mede o custo
durante navegação pesada.

| métrica | A9 (só o serviço, 17/09) | A8 (serviço + VPN) |
|---|---|---|
| ciclo de CPU | 0,138% | 0,366% |
| mAh no estado "serviço" | 0,282 | 1,00 |
| mAh do UID, fora a tela | 0,476 | 1,32 |
| projeção por dia | ~5,5 mAh | ~11 a 15 mAh (0,3% a 0,4% de 3590 mAh) |

Nenhum wakelock parcial: a VPN não acorda o aparelho, só trabalha quando a CPU
já está acordada por outro motivo. O serviço em primeiro plano rodou 2h 08m 45s
sem parar, com detecções espalhadas pela janela inteira.

**Duas ressalvas honestas sobre esse número:**

1. A diferença para o A9 não é toda da VPN. O laboratório foi aberto 3 vezes
   (1 min em primeiro plano) e, com o cabo fora, o `adb reverse` morre: o dev
   client passa a tentar reconectar ao Metro a cada 2 s, resolvendo "localhost"
   a cada tentativa (178 consultas do nosso UID em 58 min, de 0 a 1 ms, que
   pararam no segundo em que o `adb reverse` voltou). É custo do build de
   desenvolvimento, não do produto. Se o mesmo valia no A9, não dá para saber
   depois do fato. O número medido é, portanto, um **teto**.
2. O volume de DNS foi o de um aparelho parado: nos 58 min que o logcat ainda
   guardava, 199 consultas de 18 apps em segundo plano pela rede da VPN, 91
   delas respondidas pelo cache do sistema. As 108 consultas de verdade tiveram
   mediana de 20 ms e p90 de 74 ms **com a VPN no caminho** — a única acima de
   1 s foi barrada pelo próprio sistema, não pela VPN.

#### Tráfego de fundo dispara detecção sem ninguém usando o app

Na janela parada, 11 detecções de instagram.com e, em 10 delas, o app do
Instagram **não estava na tela** (8 com a tela apagada, 2 com o laboratório na
frente). É o app consultando sozinho em segundo plano. Um detector que olhasse
só o domínio contaria 11 acessos onde houve 1; o cruzamento com o app em
primeiro plano, que o protótipo já faz, é o que separa os dois casos (I-20).

#### O que ficou de fora

- Troca de Wi-Fi para **dados móveis**: o S22 está sem serviço de celular.
- VPN ligada primeiro e **outra VPN depois**, testado; a ordem inversa, não (pela
  documentação, ligar a nossa desligaria a outra).
- Outros navegadores com DNS seguro próprio (Firefox), não instalados.
- A causa das consultas barradas de apps em segundo plano (`isBlocked=true`),
  que aparecem com e sem VPN.
- **Bateria com uso de verdade**: fica para o roteiro T6 (um dia inteiro de uso
  normal com o monitoramento ligado).

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

### Achado A10 ⚠️ — o que o Google Play exige de cada permissão que usamos

**Pesquisa documental em 19/09/2026**, nas páginas oficiais de política do Play
e de referência do Android. Evidência, com todos os links e as datas de
vigência, em `docs/relatorios/evidencias/a10-politicas-google-play.txt`.

A tabela pedida pela spec (seção 6.2, A10):

| Permissão / API | O que o Play exige | Risco para o nosso app |
|---|---|---|
| `PACKAGE_USAGE_STATS` (acesso ao uso) | É permissão restrita (nível `signature\|privileged\|appop`), então tudo que vem dela é dado pessoal e sensível: divulgação destacada **dentro** do app antes de pedir, uso só para funcionalidade central promovida na ficha, política de privacidade. Sem formulário próprio | Baixo, se o onboarding fizer a divulgação antes de mandar o usuário aos Ajustes |
| `<queries>` MAIN/LAUNCHER (lista de apps) | `QUERY_ALL_PACKAGES` é proibida quando uma consulta direcionada resolve — e a política diz que métodos alternativos que *aproximem* a visibilidade ampla também ficam restritos à funcionalidade central | Baixo/médio: a nossa consulta lista todos os apps com ícone. A justificativa ("o usuário escolhe o que monitorar") precisa estar escrita na ficha e no app |
| `FOREGROUND_SERVICE_SPECIAL_USE` + tipo `specialUse` | `<property>` no manifesto com texto livre lido por revisor humano, **mais** declaração no Play Console (descrição, impacto se a tarefa for adiada ou interrompida, vídeo) e os cinco critérios da política de serviços em primeiro plano | **O maior risco de loja.** O quinto critério é "rodar só o tempo necessário", e o nosso monitoramento roda o dia inteiro. Os outros quatro dão defesa |
| `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` + tipo `systemExempted` (VPN) | O Android só libera esse tipo para casos listados, entre eles apps de VPN; fora deles, `ForegroundServiceTypeNotAllowedException`. Em troca, a política **isenta** esse tipo dos cinco critérios | Médio: a isenção só vale enquanto somos a VPN ativa. Se outra VPN revogar a nossa (A8, rodada C), subir o serviço de novo pode estourar exceção |
| `SYSTEM_ALERT_WINDOW` (sobreposição) | Permissão especial: mandar o usuário aos Ajustes sem manipulação, só para funcionalidade central promovida na ficha. A política de comportamento enganoso proíbe imitar avisos do sistema. A própria referência do Android diz que pouquíssimos apps deveriam usá-la | **Alto**, e agora por dois motivos: a justificativa de loja (I-7) e o achado novo abaixo — qualquer app pode esconder a nossa sobreposição |
| `VpnService` | Funcionalidade central de VPN **ou** uma das exceções, que incluem "acompanhamento de uso de apps"; documentar na ficha; **criptografar os dados até o ponto final do túnel**; formulário no Play Console com dois vídeos de até 90 s (a VPN em uso e a divulgação destacada) | **Alto.** Duas exigências não encaixam num desenho local (ver abaixo), e a aprovação é humana |
| `POST_NOTIFICATIONS` | Permissão de runtime comum; degradar com elegância se negada | Baixo, já tratado (I-6) |
| `RECEIVE_BOOT_COMPLETED` | Nível normal, sem declaração | Nenhum |

#### As duas exigências da VPN que não encaixam no nosso desenho

A seção "VPN Service" entrou na política de permissões sensíveis e está em
vigor **desde 01/01/2026**. Ela pressupõe uma VPN que leva o tráfego a um
servidor: fala de apps que *precisam* de servidor remoto e manda criptografar
os dados "até o ponto final do túnel". A nossa VPN (D5) é local: não existe
servidor nem ponto final, e o tráfego nem sai do aparelho.

A leitura favorável existe: o formulário do Play traz "App usage tracking" como
opção de funcionalidade permitida, e é exatamente o nosso caso, com privacidade
maior do que a política pressupõe. Mas é leitura, e a decisão é de um revisor
humano. Não há como ter certeza antes de submeter.

Some-se que ler domínios visitados é, na taxonomia do Play, histórico de
navegação — o que exige a divulgação destacada específica da VPN, mesmo sem
nada sair do aparelho (I-19).
#### O achado novo: uma linha esconde a nossa sobreposição

`Window.setHideOverlayWindows(true)` existe desde a API 31 e impede que
sobreposições de terceiros apareçam sobre aquela janela. A permissão que ela
exige (`HIDE_OVERLAY_WINDOWS`) é de nível **normal**: qualquer app pode
declará-la, e ela sai concedida na instalação, sem consentimento.

Testado na mesma noite (ver "Achado A4 → Rodada do I-25"). Com um app de teste
de outro UID na frente e protegido, a nossa sobreposição ficou invisível
(`mForceHideNonSystemOverlayWindow=true`, `isVisible=false`) enquanto o
laboratório gravava `interruption_shown`; ao desligar a proteção, a mesma
janela apareceu na hora. O risco do I-25 está confirmado, e trouxe junto o
I-28: o nosso evento de interrupção não prova que o usuário viu nada.

#### O desenho local paga bem em três frentes

- **Segurança de dados:** a política define "coletar" como transmitir dado para
  fora do aparelho, e diz que dado processado **apenas** no aparelho não precisa
  ser declarado como coletado. A nossa seção de segurança de dados pode ser
  declarada sem coleta.
- **Spyware:** os exemplos de violação giram em torno de transmitir dados. Nada
  sai daqui.
- **Bateria:** desde 01/03/2026 o Play trata wake lock parcial como métrica de
  qualidade, com aviso na ficha e saída das recomendações para quem segura um
  wake lock não isento por mais de 2 h em média com a tela apagada em mais de 5%
  das sessões. O A8 mediu **zero** wake lock parcial nosso.

Nada disso dispensa a política de privacidade (exigida mesmo sem coleta), a
divulgação destacada no app, nem a exclusão de conta dentro do app e na web, que
o app definitivo vai precisar por ser assinatura.

#### Rotas que a pesquisa fechou

- **Notificação em tela cheia** como alternativa à tela de interrupção: desde
  22/01/2025, só apps de chamada ou despertador recebem `USE_FULL_SCREEN_INTENT`
  por padrão. Não é caminho confiável.
- **AccessibilityService** para detectar uso: a política manda usar APIs mais
  estreitas quando existirem, e existe (`UsageStatsManager`). Além disso exige
  declaração própria e proíbe a flag de ferramenta de acessibilidade para quem
  não é uma.
- **Isenção de otimização de bateria** (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`):
  só é aceitável quando o Doze quebra a função central, e tentar contornar a
  gestão de energia sem ser elegível é violação. No nosso caso o Doze só ocorre
  com o aparelho parado, quando não há uso para detectar. Não pedir.
- **`isMonitoringTool`**: é para apps que monitoram **outra pessoa** (pai/filho,
  empresa/empregado), e quem declara aparece num aviso do Play Protect. O nosso
  app monitora o próprio dono do aparelho: **não** declarar.

#### O que não foi pesquisado

- Regras da ficha da loja para o tema (política de conteúdo sexual,
  classificação indicativa, o que pode aparecer em texto e imagens). É a lacuna
  mais importante que sobra.
- Obrigatoriedade do Google Play Billing para a assinatura.
- Políticas equivalentes da App Store, que ficam com o grupo do iOS.

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
| 1 | Conectar o S22 e confirmar | `adb devices` deve listar `RQCT305RZ3Y device`, e `adb shell echo ok` responder; se travar, P7 |
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
| I-2 | O serviço é do tipo `specialUse`, aprovado por **revisão humana** do Google Play a partir de uma justificativa em texto livre. O A10 mediu o tamanho da exigência: `<property>` no manifesto, declaração no Play Console com descrição, impacto se a tarefa for adiada ou interrompida e vídeo, **mais** os cinco critérios da política de serviços em primeiro plano — e o quinto deles é "rodar só o tempo necessário para concluir a tarefa" | Doc 02 riscos, fase 9 | O texto da justificativa passa a ser parte do produto; risco de rejeição. Montar a defesa dos outros quatro critérios (o usuário liga, a notificação é perceptível, ele desliga quando quiser, e adiar significa não avisar na hora do risco) |
| I-3 | No One UI o botão de ação da notificação **só aparece expandindo-a** — dois toques até a emergência | Doc 01 P3 ("no máximo um toque"), §6.7 | A emergência pela notificação não cumpre P3 no Samsung; depende da tela de interrupção |
| I-4 | "Hoje" do sistema não coincide com a meia-noite: o método agregado atribui uso de ontem ao dia seguinte (confirmado duas vezes) | Doc 01 §6.2 e §6.8 | Streak de moderação e estatísticas diárias precisam calcular a borda do dia explicitamente |
| I-5 | Após reiniciar o aparelho, o monitoramento só volta **~2,5 min depois do boot e só após o primeiro desbloqueio** | Doc 01 §6.5 (P2 proativo) | Declarar a janela cega ou aceitá-la |
| I-6 | Sem a permissão de notificação o serviço roda, mas nenhum alerta chega — e nada avisa o usuário | Doc 01 §6.9, onboarding | O app precisa detectar e explicar o modo degradado |
| I-7 | A tela de interrupção depende de `SYSTEM_ALERT_WINDOW`, e a documentação do Android enquadra "atividade sobre o app em uso" como **sequestro de interface**; a própria referência da permissão diz que pouquíssimos apps deveriam usá-la. A política de comportamento enganoso ainda proíbe imitar avisos do sistema (A10) | Doc 02 riscos; Doc 01 §6.5 | Risco de loja para a tela de interrupção; justificar no pedido e desenhar a tela para se identificar como nossa, sem parecer aviso do Android |
| I-8 | A tela inicial do sistema aparece na lista de uso como se fosse um app | Doc 01 §6.8 | Filtrar lançadores das estatísticas |
| I-9 | Custo medido do monitoramento: 0,138% de CPU e 0,65% do consumo do aparelho, incluindo ruído do ambiente de desenvolvimento | Doc 02 riscos (bateria) | O risco de bateria parece baixo; confirmar no roteiro T6 |
| I-10 | Com a sobreposição, o app monitorado continua em primeiro plano por baixo: o tempo diante da tela de interrupção conta como uso dele | Doc 01 §6.2 e §6.8 | Descontar esse tempo das estatísticas e da streak de moderação |
| I-11 | Enquanto a sobreposição está na tela, o Android publica "<nome do app> exibido sobre outros apps", com um toque para desativar a permissão. O app não pode suprimir | Doc 01 P7 (discrição), §6.5 | O nome do app aparece na gaveta durante a interrupção, e desligar a proteção fica a um toque no momento de vulnerabilidade |
| I-12 | A sobreposição pede uma escolha antes de qualquer outro uso do aparelho: o voltar é ignorado, e ela continua por cima da tela inicial e de qualquer app | Doc 01 §6.5 | Não fere o princípio P4 ("Continuar" está sempre a um toque; leitura confirmada pelo responsável em 18/09/2026). Falta testar uma chamada recebida com a sobreposição na tela |
| I-13 | Na tela própria, o voltar fecha a interrupção sem escolha, e com o app fechado devolve o usuário direto ao app monitorado. (Desde 18/09 o protótipo ao menos registra a saída, como `interruption_dismissed`) | Doc 01 §6.5 | Se a tela própria for usada, interceptar o voltar ou tratá-lo como "continuar" e registrá-lo |
| I-14 | Todo o comportamento de voltar medido depende de uma desativação que o Android 16 chama de temporária (`enableOnBackInvokedCallback="false"`) | Doc 02 riscos | Tratar o voltar de forma explícita no app definitivo e testar com o voltar preditivo ligado |
| I-15 | Sugestão do responsável: um terceiro botão na tela de interrupção, "Ir para a tela inicial", como saída que respeita o limite sem passar pela emergência | Doc 01 §6.5, que prevê só "Emergência" e "Continuar mesmo assim" | Incluir a opção no documento 01; definir se ela conta como vitória nas estatísticas (§6.8). No protótipo (decisão de 18/09) ela não pausa: reabrir o app monitorado interrompe de novo |
| I-16 | Só o "Continuar" pausa (A5). Acima do limite e fora da pausa, **cada reabertura** do app monitorado gera uma nova interrupção, em até 20 s | Doc 01 §6.5, que não fala de pausa nem de reinterrupção; risco R7 (excesso de alertas) | Definir no documento 01 a duração da pausa, quais saídas pausam, o que volta no fim dela (no protótipo: notificação e, se o uso continuar, a tela) e se há teto diário de interrupções |
| I-17 | A VPN do A6 exige consentimento numa caixa do sistema cujo texto diz que ela "permite monitorar o tráfego da rede", e mostra a chave de VPN na barra de status enquanto estiver ligada | Doc 01 P7 (discrição), §4 (onboarding) | Preparar o usuário para essa caixa no onboarding; aceitar a chave visível o tempo todo |
| I-18 | Só uma VPN funciona por vez: ligar outra desliga a do app na hora, e ela **não volta sozinha** quando a outra é desligada (A8, com a "Wi-Fi seguro" da Samsung) | Doc 01 §6.5, doc 02 riscos | Decidir o que fazer com quem já usa VPN; o app precisa perceber a queda (`onRevoke`) e avisar o usuário |
| I-19 | Google Play: toda VPN exige declaração no Play Console, em categoria permitida (a lista inclui "acompanhamento de uso de apps"), com **dois vídeos de até 90 s** (a VPN em uso e a divulgação destacada); ler domínios visitados conta como histórico de navegação e exige divulgação destacada com consentimento dentro do app. O A10 achou o conflito de fundo: a política, em vigor desde 01/01/2026, pressupõe VPN com **servidor remoto** e manda **criptografar os dados até o ponto final do túnel** — e a nossa é local, sem servidor nem túnel | Doc 02 riscos, fase 9 | Escolher a categoria e desenhar a divulgação destacada antes da publicação. Decidir se vale submeter uma VPN local a essa política ou se a detecção por domínio sai do MVP; a resposta depende de revisão humana e não dá para prever |
| I-20 | A detecção por DNS é um indício, não prova de acesso: pré-carregamento dispara alerta sem visita, e página guardada no navegador aparece sem nova consulta. DNS seguro do Chrome 153 (A8): o endereço principal de cada navegação ainda passou pela VPN, só os domínios secundários sumiram; comportamento interno, que pode mudar. E o próprio app da rede social consulta sozinho em segundo plano: em 2h 10 de aparelho parado, 10 das 11 detecções de instagram.com aconteceram sem ninguém no app (A8) | Doc 01 §6.5 ("onde tecnicamente possível"), §6.8 (estatísticas, recaídas) | Não tratar detecção como recaída automática; tratar o alerta de conteúdo como lembrete; cruzar sempre com o app em primeiro plano antes de contar um acesso |
| I-21 | Redes sociais pelo navegador: o acesso é detectável (DNS + app em primeiro plano), mas o tempo de uso só se estima por heurística: +13% numa rodada de 5 min, resolução de ~1 min, e erro de −99% a +67% fora de uma faixa estreita de ajuste. A API do Chrome para o Bem-estar digital não é pública | Doc 01 §6.2 (limite de vídeos curtos), §6.8 (tempo de uso), risco R5 | Decidir se o limite conta o navegador (e com que precisão), ou se o navegador vira só gatilho de alerta depois que o limite do app estoura |
| I-22 | **Com "DNS privado" no modo estrito (provedor com nome, comum para bloquear anúncios), ligar a VPN do app deixa os apps sem DNS**: o sistema não alcança o provedor pela rede da VPN, marca a rede como sem internet e avisa "Não é possível acessar o servidor DNS privado". A VPN também não vê nada nesse modo | Doc 01 §6.5, onboarding (§4); doc 02 riscos | O app precisa detectar o modo estrito antes de ligar a VPN (e depois, se mudar) e orientar o usuário, ou não ligar a VPN; nunca deixar o aparelho sem internet |
| I-23 | O DNS do roteador doméstico perde consultas em rajadas de páginas pesadas, com ou sem VPN; um repasse ingênuo transforma essas perdas em atraso de 2 a 3 s para todas as consultas (medido e corrigido no A8) | Doc 02 riscos (qualidade da conexão com a VPN) | O repasse do app definitivo precisa de concorrência sem fila e nova tentativa curta, e de monitoramento de falhas |
| I-24 | Custo da VPN somada ao serviço, com o aparelho parado (A8): 0,366% de CPU e ~1 mAh a cada 2 h, contra 0,138% e ~0,5 mAh do serviço sozinho (A9). Sem wakelock; atravessa Doze profundo e modo economia de energia. Projeção de 0,3% a 0,4% de bateria por dia, e o número é um teto (inclui ruído do ambiente de desenvolvimento) | Doc 02 riscos (bateria), roteiro T6 | O risco de bateria segue baixo, mas o número vale para aparelho parado: confirmar com um dia de uso real no T6 |
| I-25 | **Um app comum apaga a nossa tela de interrupção.** `Window.setHideOverlayWindows(true)` existe desde a API 31 e a permissão que ela exige é de nível normal, concedida na instalação sem consentimento. Medido em 19/09 no S22 com um app de teste de outro UID (A4): com ele na frente e protegido, a nossa sobreposição ficou `isVisible=false`; ao desligar a proteção, a mesma janela apareceu na hora. Varredura de 20/09: **nenhum dos seis apps-alvo** protege a tela de abertura, então hoje o risco é teórico para esse conjunto. **Mas os candidatos naturais a usar a proteção são os apps financeiros — bancos, carteiras e casas de aposta —, porque sobreposição é a técnica clássica de fraude em tela de pagamento. Isso atinge em cheio a Fase 2, que prevê apostas** | Doc 01 §6.5 (tela de interrupção), doc 02 riscos; escopo da Fase 2 | A sobreposição não é garantia. Manter a tela própria como reserva (I-13) — e, se o alvo for aposta, tratá-la como abordagem principal. Conferir a visibilidade (I-28), aceitar a notificação como rede de segurança, e medir uma amostra de apps de aposta e de banco antes de fechar o desenho |
| I-26 | **A rota de notificação em tela cheia está fechada, por dois motivos.** Política: desde 22/01/2025, em apps que miram Android 14+, só apps de chamada ou despertador recebem `USE_FULL_SCREEN_INTENT` por padrão, e o Play revoga a de quem não se encaixa (A10). Comportamento, medido em 20/09 (A4): mesmo com a permissão concedida num build instalado pelo cabo, **com o aparelho em uso o sistema não abre a tela** — mostra um aviso flutuante, que é o que a notificação do A3 já faz. Com o aparelho bloqueado ela abre a activity, mas atrás do bloqueio | Doc 01 §6.5, doc 02 (alternativas de alerta de nível 2) | **Descartada como caminho técnico pelo responsável em 20/09**, e o código de teste removido do protótipo (fica no commit `6cd4c70`). Restam a sobreposição e a tela própria — esta sem atraso relevante, 31 ms entre o pedido e a tela —, com o alerta de nível 1 como rede de segurança das duas |
| I-27 | Como **nada sai do aparelho**, a seção de segurança de dados do Play pode ser declarada **sem coleta** (a política define coletar como transmitir para fora do aparelho). Isso não dispensa política de privacidade, divulgação destacada no app, nem exclusão de conta dentro do app e na web — esta última passa a valer porque o app é por assinatura (A10) | Doc 01 §4 (onboarding) e §9 (privacidade), doc 02 fase 9 | Tratar "nenhum dado coletado" como diferencial de produto, e já prever política de privacidade, divulgação destacada e exclusão de conta no escopo do MVP |
| I-28 | **O evento que diz "interrompi" não provava que o usuário viu.** `interruption_shown` era gravado no `addView`, não quando a janela chegava à tela. **Corrigido no protótipo em 19 e 20/09:** a sobreposição confere quatro sondas (só o **foco de janela** denuncia a supressão) e grava `interruption_shown`, `interruption_suppressed` ou, passados **20 s** sem aparecer, `interruption_discarded`. Decisão do responsável: a janela suprimida é descartada em vez de surgir fora de contexto, e nenhuma outra ação é tomada — a notificação de nível 1 já enviada é a rede de segurança. Na tela própria, o serviço grava `interruption_requested` ao pedir a tela (A4) | Doc 01 §6.5 e §6.8 (estatísticas), doc 02 (telemetria local) | Levar as três regras para o app definitivo: confirmar a visibilidade, descartar depois do prazo e contar com a notificação. **Resolvido em 20/09:** recuo progressivo de 1, 2, 5 e 15 min depois de cada supressão, com volta à tentativa imediata quando a pessoa sai do app monitorado e entra de novo (medido: intervalo entre tentativas foi de 40 s para 100 s e 140 s) |

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
| Consumo por app | `adb shell dumpsys batterystats` (zerar antes com `--reset`; tirar o cabo também zera sozinho) |
| Consultas de DNS do sistema | `adb logcat -d -s NetdEventListenerService` (só contagens e tempos; o buffer guarda cerca de 1 h) |
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
| Consentimento de VPN (A6) | `adb shell appops get com.norte.lab.dev ACTIVATE_VPN` |
| VPN no ar? | `adb shell dumpsys connectivity \| grep "VPN CONNECTED"` |
| Consultas de DNS vistas pelo sistema | `adb logcat -d \| grep "DNS Requested"` — mostra rede, app e resultado; tem nomes de todos os apps, então só versionar contagens |
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

### P7 — Servidor do adb travado: o aparelho aparece, mas nada responde
**Sintoma:** `adb devices` lista o aparelho como `device`, mas `adb shell`
qualquer coisa fica parado até estourar o tempo. Nem `adb kill-server` responde.
Aconteceu duas vezes em 18/09/2026: às 22:45 e às 23:50. Na segunda, o
`installDebug` do Gradle ficou 11 min parado e falhou com "Could not create ADB
Bridge", e até `adb devices` travou.

**Causa:** não identificada. As duas vezes foram depois de longos períodos com um
gravador que chamava `adb shell dumpsys window` a cada segundo; na segunda, o
próprio gravador estava preso numa dessas chamadas. Os três processos `adb.exe`
eram do mesmo SDK (servidor, o gravador preso e um `start-server` do Gradle), o
que descarta duas versões disputando a porta.

**Solução:** encerrar os gravadores e todos os `adb.exe` (`taskkill //F //IM
adb.exe`), depois `adb start-server`, e refazer o `adb reverse tcp:8081 tcp:8081`
(P3). Nos scripts, envolver os comandos do adb em `timeout`, e evitar gravadores
por segundo em sessões longas: preferir leituras pontuais.

### P8 — Com o cabo fora, o dev client fica tentando o Metro a cada 2 s
**Sintoma:** em medições de bateria com o aparelho desconectado, o UID do
protótipo aparece resolvendo nomes a cada 2 s, em rajadas de ~30 por minuto
(178 consultas em 58 min na janela do A8), todas de 0 a 1 ms.

**Causa:** o `adb reverse` morre junto com o cabo (P3), o dev client perde o
Metro e entra em laço de reconexão, resolvendo `localhost` a cada tentativa. As
consultas pararam no segundo em que o `adb reverse` voltou, o que confirma a
origem.

**Solução:** para medir bateria com honestidade, encerrar o Metro antes de tirar
o cabo, ou tratar o número medido como teto e dizer isso no registro (foi o caso
do A8). Vale para o roteiro T6.

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
