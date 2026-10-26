# Rascunho — justificativas de permissão para o Google Play

> Rascunho de trabalho, **não** altera os documentos 01 e 02. Escrito em 25/10/2026
> a partir do achado A10 (`prototype/NOTAS.md`) e da revalidação das políticas
> feita hoje. Os blocos em inglês são para colar no Console ou no app; o resto é
> explicação para o responsável.

---

## 1. Revalidação das políticas (25/10/2026)

Páginas oficiais relidas hoje. O que mudou em relação ao A10 de 19/09:

| Tema | Resultado |
|---|---|
| Serviço em primeiro plano (`specialUse`) | Sem mudança. A declaração por tipo continua na página *App content*, com **descrição da funcionalidade, impacto se a tarefa for adiada ou interrompida, link de vídeo e caso de uso**. A página não traz exigência de vídeo específica para `specialUse`: o vídeo deve mostrar o passo do usuário que dispara a função. Os cinco critérios continuam na política de abuso de dispositivo e rede |
| `USE_FULL_SCREEN_INTENT` | Confirmado: desde 22/01/2025 só apps de chamada ou despertador a recebem por padrão. Caminho continua descartado (I-26) |
| `SYSTEM_ALERT_WINDOW` | A política de dados sensíveis só diz "direcionar o usuário à tela de Ajustes" para permissões especiais. **Não há formulário nem regra própria de sobreposição.** O risco é de revisão humana e de comportamento enganoso, não de declaração |
| `PACKAGE_USAGE_STATS` | Não é citada na política de dados sensíveis. A exigência vem da política de Dados do Usuário: divulgação destacada no app e política de privacidade. **Sem formulário** |
| `QUERY_ALL_PACKAGES` | Sem mudança: proibida quando uma consulta direcionada resolve. Seguimos com `<queries>` MAIN/LAUNCHER |
| **`VpnService`** | **Leitura mais dura do que a do A10.** Ver abaixo |

### O que a leitura de hoje muda na VPN

O A10 registrou uma "leitura favorável": o formulário tem a opção *App usage
tracking*. Relendo o texto, a lista de exceções é introduzida por **"apps que
exigem um servidor remoto para a funcionalidade central"**. Ou seja, *App usage
tracking* está na lista como caso de **VPN com servidor remoto**, não como
permissão geral para VPN. A nossa VPN é local (D5), sem servidor e sem ponto final
do túnel; a exigência de "criptografar os dados do aparelho até o ponto final do
túnel" também não tem a que se aplicar.

Consequências práticas:

- A resposta à pergunta 1 do formulário ("a VPN é a funcionalidade central?")
  é **Não**: o produto é um app de apoio, não uma VPN.
- A pergunta 2 (categoria) deixa duas saídas: *App usage tracking* (defensável
  pelo texto, mas apoiada numa leitura) ou *None of the above*, que **rejeita o
  app salvo explicação detalhada**.
- A página **não menciona VPN local nem processamento no aparelho**. Não há
  precedente escrito para o nosso caso: a decisão é de um revisor humano.
- Mudar o uso da API depois obriga a reenviar o formulário, e uso não declarado
  pode levar a suspensão.

**Recomendação:** tratar a VPN como o componente mais frágil para a loja. O
caminho de monitoramento por uso de apps (A1/A2) não depende dela; a VPN só
entrega a parte de domínios (A6/A7). Vale decidir, no produto, se a VPN entra na
primeira versão publicada ou numa versão posterior, para não pôr em risco a
aprovação do resto. Essa decisão é sua e fica fora do Claude Code.

---

## 2. Texto para o manifesto: a `<property>` do `specialUse`

O valor atual está **em português** em
`prototype/modules/lab-monitoring/android/src/main/AndroidManifest.xml:122`. Quem
lê é um revisor do Google. Para o app publicado, trocar por:

```
Monitors, on the device only, how long the user has used apps that the user
personally chose, and shows a reminder when the daily limit the user set is
reached. Runs continuously because usage can start at any time. No usage data
leaves the device.
```

Observação: o tempo de uso só é útil se o serviço estiver vivo no momento em que o
limite estoura (medido: 3 s de latência no A2). Esse é o argumento para o quinto
critério ("rodar só o tempo necessário"), que é o maior risco de loja.

---

## 3. Declaração de serviço em primeiro plano — `specialUse`

Campos pedidos pelo Console, um por tipo de serviço:

**Description of the functionality**

```
The app helps users limit time spent in specific apps that they select
themselves. A foreground service checks the on-device usage statistics at short
intervals and, when the daily limit that the user configured is reached,
shows a notification and an optional interruption screen. The service shows a
persistent notification while it runs. No usage data is transmitted off the
device.
```

**Impact if the task is deferred or interrupted by the system**

```
The reminder is only useful at the moment the limit is crossed. If the system
deferred or stopped the service, the user would receive the reminder late or not
at all, and the feature the user turned on would silently stop working. A
scheduled job cannot meet this, because the check must happen while the user is
actively using the selected app, not at a system-chosen time.
```

**Use case:** *Other* — "Self-chosen app time limit reminder".

**Video (steps to show):** abrir o app; escolher um app a acompanhar; definir
o limite; iniciar o acompanhamento (mostrando a notificação persistente);
fechar o app; usar o app escolhido até o limite; mostrar o aviso. Gravação a
cargo do responsável, no aparelho.

**Defesa contra os cinco critérios** (para a resposta, se pedirem):
perceptível ao usuário (notificação permanente, texto neutro); iniciado pelo
usuário; sem alternativa de API que permita checar o limite com o app fechado;
zero wake lock parcial (A8); custo medido de 0,16% do consumo em 22 h (T6). O
ponto fraco continua sendo o de funcionar o dia todo.

---

## 4. Justificativas por permissão

Para as permissões sem formulário, o texto abaixo serve de base para a ficha
da loja, para a divulgação destacada no app e para eventuais respostas a
revisores.

### `PACKAGE_USAGE_STATS`

- **Destino:** divulgação destacada dentro do app, antes de mandar o usuário aos
  Ajustes; política de privacidade; ficha da loja.
- **Sem formulário** no Console.

```
To count how long you use the apps you choose, this app needs "Usage access".
The app reads only the time each selected app is in the foreground, and only on
this device. It does not read what you do inside any app, and nothing is
uploaded. You can revoke this access at any time in system Settings.
```

### `SYSTEM_ALERT_WINDOW` (sobreposição)

- **Destino:** divulgação no app antes de abrir a tela de Ajustes; ficha da loja.
- A permissão é da funcionalidade central (interromper no momento de risco) e
  precisa constar na ficha. Não imitar avisos do sistema.

```
To show a pause screen on top of an app you chose when you reach your daily
limit, this app needs permission to "Display over other apps". The pause screen
is shown only when your limit is reached, only over the apps you selected, and
you can always continue or go to the home screen. You can turn this off in
Settings at any time.
```

### `BIND_VPN_SERVICE` / `VpnService`

Ver a decisão de produto na seção 1. Se a VPN entrar, o formulário pede:

| Pergunta | Resposta proposta |
|---|---|
| Q1 — VPN é a funcionalidade central? | **No** |
| Q2 — Categoria | *App usage tracking* (com a ressalva da seção 1) |
| Q3 — Vídeo de até 90 s com a VPN em uso | App aberto, VPN ligada, chave de VPN visível |
| Q4 — Coleta ou compartilha dados? | **No** (processado só no aparelho) |
| Q5 — Vídeo da divulgação destacada | Caminho até a tela de divulgação, rolagem lenta, fluxo de aceite **e de recusa**, e como reabrir a divulgação |
| Q5(a) — Manipula tráfego para monetização? | **No** |

Divulgação destacada específica (separada das demais, dentro do app, com ação
afirmativa; **não** basta a política de privacidade):

```
This app can create a local VPN connection on your phone. It is used only to
notice when you look up certain website names that you or the app have chosen,
so that it can remind you. The connection does not send your traffic to any
server: the lookups stay on your phone and are passed on to your normal
network. The app does not store full addresses or page content. Your phone will
show a key icon and a system message about the VPN while it is on. Do you agree
to turn it on?
```

Aviso: ler domínios visitados é "histórico de navegação" na taxonomia do Play
(I-19); por isso a divulgação precisa existir mesmo sem coleta.

### `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE`

Permissões de nível normal ou de runtime comum. Sem declaração. Degradar com
elegância se a notificação for negada (I-6).

### `HIDE_OVERLAY_WINDOWS`

Só existe para o experimento do I-25. **Remover do build publicado**; não há
justificativa de produto para mantê-la.

### `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` (VPN)

Vale enquanto somos a VPN ativa; a isenção dos cinco critérios acompanha isso.
Se outra VPN nos derrubar, subir o serviço de novo pode lançar exceção (A8,
rodada C). Tratar no código antes de publicar.

---

## 5. Pendências que este rascunho não fecha

- Regras da ficha da loja para o tema (conteúdo sexual, classificação indicativa,
  o que pode aparecer em texto e imagem). **É a lacuna mais importante** e não
  foi pesquisada no A10 nem hoje.
- Obrigatoriedade do Google Play Billing para a assinatura.
- Resposta final das perguntas do formulário da VPN: não consegui ver o formulário
  vivo, só a página de ajuda. Conferir os campos no Console antes de submeter.
- Política de privacidade e Segurança de Dados (ponto 3 da lista combinada).
- O `INTERNET` que consta hoje no manifesto vem do template do Expo. No app
  definitivo haverá rede para a assinatura; a declaração de Segurança de Dados
  precisa refletir isso.

## Fontes consultadas em 25/10/2026

- [Foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821)
- [Understanding Google Play's VpnService policy](https://support.google.com/googleplay/android-developer/answer/12564964)
- [Permissions and APIs that Access Sensitive Information](https://support.google.com/googleplay/android-developer/answer/16558241)
