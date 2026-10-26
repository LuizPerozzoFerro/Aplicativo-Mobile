# Roteiro — vídeo de demonstração do serviço em primeiro plano (`specialUse`)

> Rascunho de 25/10/2026. O Console pede um link de vídeo na declaração de cada
> tipo de serviço em primeiro plano (ver `play-console-justificativas.md`, seção 3).
> A página de ajuda do Play **não** traz exigência específica para `specialUse`; o
> princípio geral é mostrar **os passos do usuário dentro do app que disparam a
> função**. Este roteiro segue esse princípio. Como a VPN ficou fora da primeira
> versão (D6), **não há vídeo da VPN**.

## Duas fases

1. **Ensaio agora, no protótipo.** O laboratório (`com.norte.lab.dev`) tem o
   serviço, o alerta e a sobreposição. Serve para ensaiar o roteiro, medir o tempo
   e achar problemas de gravação. **Não enviar este vídeo ao Console**: o
   identificador é provisório e a tela é de laboratório.
2. **Gravação final, no build do app definitivo**, com o identificador e as telas
   reais, depois que o app existir na Fase 2. O roteiro é o mesmo; só mudam os
   nomes das telas.

## Preparação do aparelho (vale para as duas fases)

- Aparelho carregado, **modo Não Perturbe ligado** e notificações antigas
  limpas: a gaveta aparece no vídeo e mostra tudo o que estiver nela.
- Nenhum dado pessoal visível: sem contas logadas à mostra, sem fotos, sem
  mensagens. Escolher como app acompanhado um que não exponha nada seu (por
  exemplo, o navegador numa página em branco ou um app de teste).
- **Nunca** usar conteúdo adulto no vídeo. O app não precisa disso para mostrar
  a função (CLAUDE.md §9).
- Texto do alerta no padrão neutro ("Você atingiu o tempo que definiu para
  hoje.") ou outro neutro. O vídeo é público ou não listado; ninguém deve
  inferir o tema.
- Conceder as permissões **durante** o vídeo, não antes: o revisor precisa ver de
  onde elas vêm.
- Limite de **1 a 2 minutos** para o ensaio, para não esperar demais. No vídeo
  final, mostrar um relógio ou o contador na tela; se houver corte para pular a
  espera, deixar o corte visível (por exemplo, com um cartão "2 minutos depois"),
  nunca disfarçado.

## Como gravar

Três jeitos. O primeiro dá menos trabalho e funciona no S22.

1. **Gravador de tela da própria Samsung** (puxar a barra rápida → "Gravador de
   tela"). Salva em Galeria e dá para ativar o som do microfone se for narrar.
2. **`adb screenrecord`**, útil no ensaio porque salva no PC. O limite do comando
   é de 3 minutos por arquivo.

```bash
adb shell screenrecord --time-limit 170 /sdcard/ensaio.mp4
```

```bash
adb pull /sdcard/ensaio.mp4 .
```

3. Para narração, gravar o áudio depois e juntar; ou usar legendas curtas.

Vídeos de ensaio **não** vão para o git (arquivos grandes e podem mostrar dados
do aparelho). Guardar fora do repositório.

## Roteiro cena a cena

Duração alvo: **2 a 3 minutos**. Legenda sugerida entre aspas, em inglês, porque o
revisor lê inglês; a ação é a coluna do meio.

| # | Tempo | O que mostrar | Legenda |
|---|---|---|---|
| 1 | 0:00 | Tela inicial; tocar no ícone e abrir o app | "Opening the app" |
| 2 | 0:05 | Tela de boas-vindas e **divulgação destacada** do acesso ao uso, com o texto completo na tela por tempo de leitura | "In-app disclosure before asking for usage access" |
| 3 | 0:20 | Tocar em "Continuar"; abre a tela de Ajustes de *Acesso ao uso*; ligar o interruptor do app; voltar | "User grants Usage access in system Settings" |
| 4 | 0:35 | Escolher **um** aplicativo para acompanhar na lista | "User chooses which app to track" |
| 5 | 0:45 | Definir o limite diário (1 ou 2 min no ensaio) | "User sets a daily limit" |
| 6 | 0:55 | Disclosure e concessão de **Exibir sobre outros apps** (Ajustes), voltar | "User grants Display over other apps" |
| 7 | 1:10 | Tocar em **Iniciar acompanhamento** | "User starts tracking" |
| 8 | 1:15 | Puxar a gaveta: aparece a **notificação fixa** do serviço, texto neutro | "Persistent notification while the service runs" |
| 9 | 1:25 | Fechar o app: arrastá-lo para fora dos recentes | "App is closed; service keeps running" |
| 10 | 1:35 | Abrir o aplicativo escolhido e usá-lo até passar o limite (relógio visível) | "User uses the selected app until the limit" |
| 11 | 2:15 | Aparece o **aviso**; depois, a tela de pausa sobre o app, com "Continuar" e "Ir para a tela inicial" | "Reminder appears when the limit is reached" |
| 12 | 2:35 | Tocar em "Ir para a tela inicial" | "User can leave or continue at any time" |
| 13 | 2:45 | Abrir o app → **Parar acompanhamento**; a notificação fixa some | "User can stop tracking; notification disappears" |

Observações por cena:

- **Cenas 2 e 6** são as que mais pesam na revisão da política de Dados do
  Usuário. Não acelerar nem cortar o texto das divulgações.
- **Cena 8** prova a exigência de "perceptível ao usuário" dos critérios de
  serviço em primeiro plano. Deixar a notificação inteira na tela por 3 s.
- **Cena 9** responde à pergunta central do Console (por que precisa ser serviço
  e não tarefa agendada): o serviço continua depois de fechar o app, e o aviso
  chega na hora em que o limite estoura, não quando o sistema decidir.
- **Cena 13** mostra o controle do usuário sobre a duração do serviço, o que
  ajuda no critério de "rodar só o tempo necessário", o ponto mais frágil do
  A10. Dizer isso na descrição do vídeo.

## Descrição do vídeo (texto para a hospedagem)

```
Demonstration of the foreground service (specialUse) in [APP NAME]. The user
grants usage access and display-over-other-apps in system Settings after an
in-app disclosure, picks one app to track, sets a daily limit and starts
tracking. A persistent notification is shown while the service runs. With the
app closed, the user reaches the limit in the chosen app and a reminder
appears. The user can stop tracking at any time, which stops the service and
removes the notification. No usage data leaves the device.
```

## Hospedagem e link

O Console pede um **link**. O mais comum é um vídeo **não listado** (que só abre
quem tem o link) numa plataforma de vídeo, ou um arquivo com compartilhamento por
link. Subir o vídeo é publicar conteúdo fora do seu aparelho: a decisão é sua,
**e eu não faço isso por você**. Depois de enviado, confira numa janela anônima
que o link abre sem pedir login.

## Checklist antes de enviar o link

- [ ] Nenhum dado pessoal visível em nenhuma cena (revisar quadro a quadro).
- [ ] O tema do app não aparece em nenhum texto, nome de app ou notificação.
- [ ] As duas divulgações aparecem inteiras e antes dos pedidos de permissão.
- [ ] A notificação fixa aparece e some ao parar.
- [ ] Os cortes de tempo estão sinalizados.
- [ ] O link abre em janela anônima.
- [ ] O vídeo mostra o **build que será enviado**, com o identificador definitivo.
