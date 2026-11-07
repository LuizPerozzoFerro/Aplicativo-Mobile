# 01 — Visão do Produto e Escopo do MVP

> **Status:** revisado v0.8 · **Última atualização:** 07/11/2026
> **Nome do app:** **Quedo** (decidido em 01/11/2026, ver seção 7.4 e o documento de decisão do nome no Project)
> **Documentos relacionados:** `02-plano-tecnico.md` (v0.7) · `relatorios/01-viabilidade-monitoramento.md` (v0.4, resultado da Fase 1 no Android)
> Este documento descreve **o que** o app faz e **por quê**. Decisões de arquitetura, stack e padrões de código ficam em documentos técnicos próprios e no `CLAUDE.md`.

---

## 1. Visão

### 1.1 Problema
Compulsões digitais, especialmente pornografia e consumo excessivo de vídeos curtos e redes sociais, consomem tempo, atenção e bem-estar. Os apps existentes para esse problema são, em geral, **passivos**: dependem de o usuário lembrar de abri-los e registrar tudo manualmente. Quando o usuário não abre o app, esquece que ele existe.

### 1.2 Proposta de valor
Um app que **vai até o usuário no momento de risco**. Ele monitora o uso do aparelho, conhece os gatilhos declarados pelo usuário e intervém com alertas que lembram o objetivo pessoal, deixando a decisão com a pessoa. Ao longo da jornada, mostra os benefícios conquistados com base em evidências científicas.

### 1.3 Público-alvo do MVP
Pessoas no Brasil que querem reduzir ou eliminar:
- **Pornografia** (objetivo típico: abstinência);
- **Vídeos curtos e redes sociais** (objetivo típico: moderação).

**Plataforma de lançamento:** o MVP é lançado **primeiro no Android** (cerca de 75% dos aparelhos no Brasil). O iOS vem depois de publicada a primeira versão Android (decisão de 24/09/2026).

### 1.4 Referência de mercado
Inspirado no app Seed. Deficiências identificadas no Seed que este produto deve superar:
1. Questionário inicial genérico, usado apenas para gerar um relatório de tempo perdido;
2. Tradução incompleta (trechos em inglês);
3. Experiência passiva: sem notificações relevantes e com tudo dependendo de input manual.

---

## 2. Princípios de produto

Todo requisito e decisão de design deve respeitar estes princípios:

| # | Princípio | Implicação prática |
|---|---|---|
| P1 | **Onboarding gera um plano, não culpa** | O questionário configura monitoramento, gatilhos, limites e motivação pessoal. |
| P2 | **Proativo em vez de passivo** | O app age no momento de risco, sem depender de o usuário abri-lo. |
| P3 | **Mínimo input manual** | Registrar algo deve custar no máximo um toque, preferencialmente direto na notificação. |
| P4 | **Alertar, não bloquear** | O usuário sempre pode seguir em frente; o app cria uma pausa consciente. |
| P5 | **Português impecável** | 100% do app em português natural no lançamento; nenhum texto em outro idioma. |
| P6 | **Privacidade por padrão** | Coletar o mínimo; manter dados no aparelho sempre que possível. |
| P7 | **Discrição** | Nada no app, nas notificações ou na cobrança deve expor o tema a terceiros. |
| P8 | **Recaída não é punição** | Recaídas zeram a streak, mas nunca apagam conquistas. |
| P9 | **Afirmações com base científica** | Nenhum benefício é apresentado sem fonte; o app não promete cura nem resultados médicos. |

> **Limites conhecidos dos princípios no Android (Fase 1):**
> - **P3:** no One UI (Samsung), o botão de ação da notificação só aparece com a notificação expandida (dois toques). A emergência a **um toque** só é garantida pela tela de interrupção.
> - **P7:** o monitoramento exige uma **notificação permanente** o dia inteiro, e a VPN (quando existir) mostra uma **chave na barra de status**. Ambos são neutros (nome "Quedo", sem referência ao tema), mas visíveis. Decisão: manter assim por enquanto; reavaliar no beta um canal de notificação de importância mínima.

---

## 3. Conceito central: Compulsão

O sistema deve modelar **Compulsão** como uma entidade genérica desde o início, para permitir adicionar novas compulsões no futuro sem reescrever o app.

Cada compulsão possui:
- **Tipo de mecânica:** `abstinencia` ou `moderacao`;
- **Calendário de benefícios** próprio;
- **Marcos e vídeos** próprios;
- **Fonte de detecção:** o que é monitorado (apps, domínios, nenhum);
- **Regra de streak** própria;
- **Textos** de alertas, notificações e check-in.

### 3.1 Compulsões do MVP

| Compulsão | Mecânica | O que é monitorado (Android) | Regra de streak |
|---|---|---|---|
| Pornografia | Abstinência | Tempo de uso em redes sociais de risco (ex.: X, Reddit), ver 6.5.6. Acesso a **domínios adultos** por VPN local *(versão posterior, D6)* | Dias sem recaída |
| Vídeos curtos / redes sociais | Moderação | Tempo de uso nos apps escolhidos (ex.: Instagram, TikTok, YouTube, Kwai), **somado num limite diário único** (ver 6.5.4). O acesso às versões web pelo navegador **não conta no limite** e só é detectado com a VPN *(versão posterior, D6)* | Dia é reprovado apenas pelas ações da seção 6.5.4 |

### 3.2 Primeira versão sem VPN (decisão D6, 25/10/2026)
A **primeira versão publicada não inclui a VPN local**. A política do Google Play para `VpnService` pressupõe servidor remoto, e o desenho local do Quedo não é o caso descrito; incluir a VPN arriscaria a aprovação do resto do app, que não depende dela.

| Fica na primeira versão | Fica para uma versão posterior |
|---|---|
| Tempo de uso por app, limite, notificação, tela de interrupção e pausa | Detecção de **domínios adultos** pela VPN local |
| Apps de risco da pornografia (por tempo de uso no app) | Alerta de acesso a redes sociais **pelo navegador** |

Consequência para o produto: na primeira versão, a pornografia no Android é acompanhada por **apps de risco, check-in, gatilhos e emergência**, sem detectar acesso a sites. Ficha da loja, onboarding e tela de assinatura não podem prometer detecção de sites. Todas as regras marcadas com *(versão posterior, D6)* neste documento ficam valendo para quando a VPN voltar.

### 3.3 Regras gerais
- O usuário pode ter **uma ou mais** compulsões ativas simultaneamente (sujeito ao plano, ver seção 8).
- Cada compulsão tem **streak, calendário e marcos independentes**. Recair em uma não afeta a outra.
- O usuário só vê calendário, marcos e vídeos das compulsões que escolheu.
- Compulsões podem ser adicionadas ou removidas depois do onboarding, pelo Perfil.
- Monitoramento é feito **no nível do app**: não é necessário distinguir Reels, Stories ou Feed.
- *(versão posterior, D6)* **Detecção de domínio é indício, não prova.** O DNS gera falsos positivos (pré-carregamento de páginas, consultas em segundo plano do próprio app) e falsos negativos (página em cache). Por isso, **nenhuma detecção vira recaída automática**: o alerta é um lembrete, e a recaída só é registrada pelo usuário (check-in).
- **Apps de risco da pornografia** (ex.: X, Reddit): como o app não sabe o que está sendo consumido, tempo de uso nesses apps gera **alerta preventivo** depois de **10 minutos**, nunca recaída automática. A tela de interrupção só é usada nos apps em que o usuário declarou, no onboarding, que consome esse conteúdo; nos demais, apenas notificação (regras em 6.5.6). O alerta é mais enfático dentro de janelas de gatilho declaradas. A lista de apps de risco é editável pelo usuário.
- **Navegador** *(versão posterior, D6)*: o tempo de uso de redes sociais pelo navegador **não conta no limite** diário, porque só pode ser estimado com erro alto. O acesso pelo navegador a domínios de rede social da lista gera **apenas notificação**, e **só depois que o limite do app correspondente estourou** no dia. As estatísticas não exibem minutos de navegador.
- Um mesmo app pode estar monitorado por mais de uma compulsão (ex.: X em pornografia e em vídeos curtos). Nesse caso, os alertas devem ser unificados, sem duplicidade.

---

## 4. Onboarding

### 4.1 Objetivos
Configurar o plano personalizado do usuário e obter as permissões necessárias, explicando claramente o que é monitorado e por quê.

### 4.2 Etapas (ordem sugerida, a validar no design)
1. **Boas-vindas** e proposta do app, com linguagem acolhedora e sem julgamento, e **confirmação de idade (18 anos ou mais)**, ver 7.6. Quem responder que tem menos de 18 anos vê uma tela educada explicando que o Quedo é só para adultos, sem poder seguir.
2. **Escolha das compulsões:** pornografia, vídeos curtos/redes sociais ou ambas.
3. **Configuração por compulsão:**
   - Vídeos curtos: quais apps monitorar e **um** limite diário aceitável, que vale para a soma de todos eles. **Pré-marcados, se instalados:** Instagram, TikTok, YouTube e Kwai; o usuário pode tirar ou acrescentar outros. **Limite padrão: 60 minutos**, com as opções 30, 45, 60, 90 e 120 e um valor livre;
   - Pornografia: há quanto tempo está sem recair (opcional, para iniciar a streak), quais redes sociais de risco monitorar e, **para cada uma, se o usuário costuma consumir esse tipo de conteúdo nela** (define se haverá tela de interrupção, ver 6.5.6). **Pré-marcados, se instalados:** X e Reddit; o usuário pode tirar ou acrescentar outros. Também o **horário do check-in diário** (padrão 21h, ver 6.2).
4. **Gatilhos:**
   - **Horários de vulnerabilidade**, com boa granularidade (decisão de 02/11/2026): o usuário marca quantas quiser entre **12 faixas de 2 horas** que cobrem o dia todo (00h–02h, 02h–04h … 22h–24h) e pode criar **faixas personalizadas** com início e fim livres, inclusive atravessando a meia-noite (ex.: 23h30–01h00). Não usar só turnos (manhã, tarde, noite);
   - **Dias de maior risco:** os 7 dias da semana, com atalhos "dias úteis" e "fim de semana";
   - **Estados emocionais** associados, de uma lista (tédio, solidão, estresse, ansiedade, cansaço, tristeza), usados para personalizar os textos dos alertas.
   - **Não** usar gatilhos de localização.
5. **Motivação pessoal:** texto curto escrito pelo usuário ("Por que eu quero mudar?"), exibido em alertas e no botão de emergência.
6. **Permissões** (ver 4.3): explicação transparente seguida dos pedidos. O app deve funcionar (em modo reduzido) se o usuário negar.
7. **Resumo do plano:** o que o app vai fazer por ele, e início do teste premium (ver seção 8.3).

### 4.3 Permissões no Android
O app não controla as caixas do sistema; o onboarding precisa preparar o usuário para cada uma, nesta ordem lógica:

| Permissão | Para quê | Cuidado obrigatório |
|---|---|---|
| Notificações | Alertas e lembretes | Pedido comum de runtime |
| Acesso a dados de uso | Tempo por app e limite | **Divulgação destacada** dentro do app antes de levar o usuário aos Ajustes (exigência do Google Play) |
| Sobreposição a outros apps | Tela de interrupção | Explicar sem manipulação; a tela precisa se identificar como do Quedo |
| VPN local *(versão posterior, D6)* | Detecção de domínios adultos | Avisar antes que o texto do sistema diz que a VPN "permite monitorar o tráfego da rede", e explicar que nada sai do aparelho |

Também no onboarding:
- Explicar a **notificação permanente** na barra de status (custo de discrição, ver P7).
- *(versão posterior, D6)* Explicar a chave de VPN na barra de status.
- *(versão posterior, D6)* **Detectar DNS privado em modo estrito** antes de ligar a VPN. Nesse modo, a VPN deixa o aparelho sem internet: o app deve orientar o usuário em vez de ligar.
- **Avisar que, após reiniciar o aparelho**, o monitoramento leva alguns minutos para voltar e só volta depois do primeiro desbloqueio.
- *(versão posterior, D6)* Informar que **outra VPN ativa** (ex.: Wi-Fi seguro da Samsung) desliga a do Quedo.

### 4.4 Regras
- Todas as respostas podem ser editadas depois pelo Perfil.
- O onboarding deve ser rápido; perguntas opcionais devem ser claramente marcadas.
- **Progresso salvo (decisão de 02/11/2026):** a etapa atual e as respostas já dadas ficam gravadas. Quem sai no meio volta exatamente de onde parou.
- Na primeira tela não há botão "Voltar"; o Voltar do Android pede confirmação antes de fechar o app.

---

## 5. Navegação

Barra inferior com 4 itens, nesta ordem:

| # | Aba | Papel | Pergunta que responde |
|---|---|---|---|
| 1 | **Início** | O agora | "Como estou hoje?" |
| 2 | **Estatísticas** | O passado, em números | "Como tenho me saído?" |
| 3 | **Progresso** | A jornada, olhando adiante | "O que já conquistei e o que vem?" |
| 4 | **Perfil** | Configurações | "Como o app funciona para mim?" |

A barra inferior é **igual para todos os usuários**, independentemente de quantas compulsões estão ativas.

---

## 6. Funcionalidades do MVP

### 6.1 Início
- **Um card por compulsão ativa**, contendo:
  - Streak atual;
  - Status do dia (ex.: "42 min de 60 hoje" para moderação, somando todos os apps; "Dia 12" para abstinência);
  - Próximo marco do calendário.
- Tocar no card abre a aba **Progresso filtrada naquela compulsão** (evitar tela duplicada).
- **Botão de emergência** sempre visível.
- **Aviso de proteção inativa:** se alguma permissão ou o serviço de monitoramento (e a VPN, quando existir) estiver desligado, a tela Início mostra um aviso que leva à tela de estado do monitoramento (6.9).

### 6.2 Streak e check-in
- **Moderação (vídeos curtos):** streak calculada automaticamente a partir do monitoramento e das respostas na tela de interrupção. O dia só é **reprovado** por "Ignorar o limite por hoje" ou pelo terceiro "Continuar mesmo assim" do dia (regras completas em 6.5.4).
- **Abstinência (pornografia):** a streak é o número de **dias de calendário desde a última recaída** (ou desde o início informado no onboarding). O monitoramento não detecta tudo, então a recaída é sempre informada pelo usuário. Detecção nunca é recaída automática (3.3).
- **Check-in da pornografia (decisão de 02/11/2026):**
  - **um por dia**, no horário escolhido pelo usuário (padrão **21h**), editável no Perfil;
  - duas respostas de um toque: **"Sem recaída"** e **"Tive uma recaída"**;
  - **um dia sem resposta não quebra a streak**: o check-in serve para registrar recaídas, e a streak só zera quando o usuário informa uma;
  - o card da tela Início oferece o check-in do dia e, a qualquer momento, "Registrar recaída" (hoje ou ontem);
  - a partir da Fase 4 do plano técnico, o check-in também chega por notificação, com as duas respostas como ações (decisão de 07/11/2026):
    - **uma notificação por dia**, no horário escolhido, só se o check-in do dia ainda não foi respondido;
    - ela fica na barra até ser respondida ou até a meia-noite, **sem lembrete repetido**;
    - conta dentro do limite de notificações proativas (6.6).
- Sem permissão de monitoramento, a streak depende apenas do check-in.
- Em pornografia, tocar em "continuar mesmo assim" num alerta **não é recaída automática**: é registrado como sinal, e o app faz um check-in gentil posteriormente para o usuário confirmar.
- Recaída zera a streak atual, mas mantém histórico, marcos e vídeos já desbloqueados.
- **Notificação de recomeço:** no dia seguinte a uma quebra de streak, o app envia uma notificação especial de motivação, com texto neutro, apenas quando havia streak a perder (streak de 1 dia ou mais antes da quebra). **Horário (decisão de 07/11/2026): às 9h, ou no primeiro desbloqueio depois das 9h**, uma vez só. O agendamento precisa sobreviver ao reinício do aparelho.
- O tempo diante da tela de interrupção **não conta** como uso do app monitorado, e o dia tem borda explícita (meia-noite no fuso do aparelho).

### 6.3 Calendário de benefícios (aba Progresso)
- Linha do tempo de marcos por compulsão, mostrando marcos alcançados e próximos.
- Cada marco possui: dia, título, descrição do benefício e **referência científica**.
- Marcos iniciais próximos para reter o usuário na primeira semana. Proposta: **1, 3, 7, 14, 30, 60, 90** dias em diante (a validar com as fontes).
- Conteúdo com aviso de que não substitui acompanhamento profissional.
- **Conteúdo fora do código:** marcos, textos e referências vêm de uma fonte de conteúdo remota ou arquivo estruturado, editável sem publicar nova versão nas lojas e preparado para tradução.
- O conteúdo científico será pesquisado e fornecido pelo responsável do produto.

### 6.4 Vídeos por marco (aba Progresso)
- Ao atingir um marco, o usuário desbloqueia um vídeo motivacional específico daquele marco.
- Vídeos desbloqueados **permanecem disponíveis** mesmo após recaída.
- Vídeos hospedados externamente e carregados sob demanda.
- Produção com IA, observando:
  - Ferramenta com licença de uso comercial;
  - Nenhum rosto ou voz de pessoa real sem autorização escrita;
  - Nenhuma música protegida;
  - Nenhuma alegação de cura ou resultado médico;
  - Nenhuma imagem com conotação sexual;
  - Indicação discreta de "conteúdo gerado com IA";
  - Registro de cada vídeo: ferramenta, data e roteiro utilizado.

### 6.5 Monitoramento e alertas

#### 6.5.1 Dois níveis de intervenção
1. **Notificação:** quando o uso atinge o limite (moderação), quando há 10 minutos de uso em app de risco (pornografia) ou, *(versão posterior, D6)*, quando há acesso a domínio adulto, o app envia uma notificação neutra lembrando o objetivo.
2. **Tela de interrupção:** se o uso continuar, uma tela sobre o app monitorado exibe a motivação pessoal e as opções da seção 6.5.2. Em pornografia, só nos casos da seção 6.5.6.

#### 6.5.2 Tela de interrupção
Opções:

| Botão | Efeito |
|---|---|
| **Emergência** | Abre o botão de emergência (6.7). Não pausa os alertas e não conta como interrupção respondida |
| **Ir para a tela inicial** | Leva o usuário à tela inicial do aparelho. Conta como **vitória** nas estatísticas. Não pausa os alertas |
| **Continuar mesmo assim** | Volta ao app monitorado e inicia uma **pausa de 5 minutos** sem alertas |
| **Ignorar o limite por hoje** | Aparece **a partir da terceira tela de interrupção** do dia (inclusive), na mesma compulsão. Reprova o dia e encerra os alertas até a meia-noite. Só em moderação |

Requisitos da tela:
- Precisa **se identificar como do Quedo**, sem imitar avisos do sistema (exigência da política do Google Play).
- Fundo opaco; o gesto de voltar é tratado explicitamente e não fecha a tela sem uma escolha.
- **Antes do terceiro "Continuar mesmo assim"**, a tela avisa que ele encerra a meta do dia.

#### 6.5.3 Pausa e reinterrupção
- Só "Continuar mesmo assim" pausa. A pausa dura **5 minutos**; ao fim, se o usuário ainda estiver no app monitorado, a interrupção volta.
- Acima do limite e fora da pausa, **cada reabertura** do app monitorado gera nova interrupção.
- **Toda tela de interrupção exibida conta** para o total do dia. Abrir a Emergência não conta.
- **Contagens por compulsão:** interrupções e "Continuar mesmo assim" são contados separadamente para cada compulsão, somando todos os apps dela (ex.: Instagram e TikTok juntos em vídeos curtos).
- **App nas duas listas (decisão de 07/11/2026):** um app monitorado por duas compulsões (ex.: X em vídeos curtos e nos apps de risco) gera **uma única tela de interrupção**, contada na compulsão que disparou primeiro, com os botões e as regras dela. A outra compulsão não gera tela própria enquanto aquela estiver ativa no mesmo app.

#### 6.5.4 Reprovação do dia (moderação)
- Só reprovam o dia, zerando a streak:
  1. "Ignorar o limite por hoje";
  2. O **terceiro** "Continuar mesmo assim" do dia na compulsão.
- Depois de qualquer um dos dois, **nenhum alerta adicional** daquela compulsão no resto do dia (até a meia-noite).
- Ultrapassar o limite, por si só, não reprova o dia: dispara as interrupções.
- **Limite somado (decisão de 02/11/2026):** a moderação tem **um único limite diário por compulsão**, que vale para a **soma** do tempo em todos os apps escolhidos. Estourado o limite, a interrupção vale em qualquer um desses apps. Motivo: com limite por app, o usuário trocaria de um app para outro sem nunca ser interrompido. O detalhamento por app aparece nas Estatísticas.
- Os apps de risco da pornografia seguem com **10 minutos por app** (6.5.6).

#### 6.5.5 Regras gerais
- Uso dentro de uma **janela de gatilho declarada** justifica um alerta mais enfático.
- O app nunca bloqueia definitivamente o acesso (P4).
- Textos de notificação devem ser **discretos** (P7): nada que exponha o tema na tela bloqueada.
- A tela de interrupção **pode não aparecer**: qualquer app consegue esconder sobreposições (hoje nenhum dos apps-alvo do MVP faz isso). A notificação é a rede de segurança.

#### 6.5.6 Pornografia (abstinência)

| Situação | Alerta |
|---|---|
| **App de risco** em que o usuário declarou consumir esse conteúdo | Depois de **10 minutos** de uso no dia naquele app: notificação e, se o uso continuar, tela de interrupção |
| **App de risco** sem essa declaração | Depois de **10 minutos** de uso no dia naquele app: **apenas notificação** |
| **Domínio adulto** detectado (navegador ou app) *(versão posterior, D6)* | **Apenas notificação**, com ação para a Emergência |

Regras:
- Nada disso é recaída automática (3.3). "Continuar mesmo assim" e as detecções são registrados como sinal, e o check-in seguinte pergunta ao usuário se houve recaída.
- Na tela de interrupção da pornografia não existe "Ignorar o limite por hoje" (não há limite a ignorar). "Continuar mesmo assim" pausa 5 minutos; depois do terceiro "Continuar" do dia na compulsão, o app para de mostrar a tela até a meia-noite e mantém só as notificações.
- *(versão posterior, D6)* Notificações de domínio adulto não se repetem em menos de 5 minutos, para não inundar o usuário numa mesma navegação.

> ⚠️ **Plataformas:** as regras acima foram validadas no Android (Fase 1). No iOS, a viabilidade de cada uma ainda não foi testada (riscos R1, R2 e R4). Ver seção 10.

### 6.6 Notificações por gatilho
- Com base nos horários e dias declarados, o app envia notificações preventivas. **Regra (decisão de 07/11/2026):** uma notificação **no início de cada faixa de horário marcada**, com as faixas vizinhas e sobrepostas unidas (20h–22h e 22h–24h geram uma só, às 20h), **só nos dias marcados** ou em todos os dias, se nenhum dia foi marcado.
- Estados emocionais declarados e a motivação personalizam o texto, sempre neutro na tela de bloqueio.
- Notificações agendadas funcionam mesmo sem permissão de monitoramento.
- **Coordenação de notificações:** usuários com mais de uma compulsão não devem receber o dobro de alertas. **Limite diário global: 6 notificações proativas** (gatilho, check-in, recomeço e lembrete), somadas todas as compulsões, com agrupamento de mensagens. O check-in e o recomeço sempre têm vaga: as preventivas por gatilho ficam com no máximo 4 por dia. Ficam fora desse limite a notificação permanente do monitoramento e os alertas de monitoramento (limite, app de risco, domínio), que respondem ao uso real e têm controle próprio de frequência (pausa e encerramento do dia).
- Notificações devem incluir ação rápida para o botão de emergência e, quando aplicável, para o check-in. No One UI essa ação exige expandir a notificação (ver limites de P3).

### 6.7 Botão de emergência
Disponível na tela Início, na tela de interrupção e nas notificações de gatilho. **Sempre gratuito.** Não usa IA e não armazena conteúdo sensível.

Fluxo:
1. Exibe imediatamente a motivação pessoal do usuário;
2. Exercício de respiração guiado de **1 minuto**;
3. Cronômetro de espera de **5 minutos** com sugestões rápidas (sair do ambiente, beber água, falar com alguém);
4. Pergunta final: "A vontade passou?" → resposta positiva é registrada como vitória nas estatísticas.

O usuário pode pular a respiração ou o cronômetro a qualquer momento e ir direto à pergunta final (decisão de 07/11/2026).

### 6.8 Estatísticas
- Tempo de uso por dia e semana (vídeos curtos), no total e detalhado por app, **somente dos apps**: minutos no navegador não são exibidos;
- Horários de maior uso;
- Alertas respeitados vs. ignorados ("Ir para a tela inicial" é respeitado; "Continuar mesmo assim" e "Ignorar o limite por hoje" são ignorados);
- Uso do botão de emergência e vitórias;
- Histórico de streaks e recaídas;
- Tempo recuperado em relação ao ponto de partida;
- Comparação entre gatilhos declarados e padrões observados.

Regras de cálculo: descontar o tempo diante da tela de interrupção, filtrar lançadores (tela inicial do aparelho) da lista de apps e usar borda de dia explícita.

### 6.9 Perfil
- Compulsões ativas (adicionar/remover);
- Gatilhos e motivação pessoal;
- Limites e apps monitorados;
- **Estado do monitoramento:** tela que mostra se cada parte está de fato ativa (permissões, serviço de monitoramento e, quando existir, VPN) e como corrigir o que estiver desligado;
- Permissões de monitoramento e notificações;
- Assinatura e plano;
- Idioma (preparado para o futuro; apenas português no MVP);
- Privacidade: explicação do que é coletado, exclusão de dados e conta.

### 6.10 Modo degradado e vigilância de permissões
- O app **confere periodicamente** as permissões e o serviço (e a VPN, quando existir), e **avisa o usuário** quando algo para de funcionar, explicando o que deixou de ser monitorado.
- Casos que precisam de aviso: permissão revogada; serviço parado. *(versão posterior, D6)* VPN derrubada por outra VPN; VPN não religada após reinício; DNS privado estrito ativado depois do onboarding.
- Sem monitoramento, o app segue com streak por check-in, notificações por gatilho, emergência e progresso.

---

## 7. Requisitos não funcionais

### 7.1 Plataformas
- **Android primeiro** (lançamento e validação); **iOS depois** da primeira versão Android publicada.
- Base de código compartilhada sempre que possível, já preparada para o iOS.
- Monitoramento exige **código nativo** em cada plataforma.

### 7.2 Internacionalização
- Nenhum texto fixo no código: todos os textos em arquivos de tradução.
- Datas, números e moedas formatados conforme o idioma.
- Conteúdo remoto (calendário, vídeos) com suporte a múltiplos idiomas.

### 7.3 Privacidade e LGPD
- Dados sobre hábitos e compulsões são tratados como **sensíveis**.
- Minimização: coletar apenas o necessário para as funcionalidades.
- Processamento e armazenamento **local** no aparelho. No MVP, **nenhum dado sobre hábitos e compulsões sai do aparelho** (uso de apps, lista de apps, limites, gatilhos, motivação, check-ins).
- A seção de segurança de dados do Google Play **não será "sem coleta"**: assinatura (RevenueCat) e relatórios de erro (Sentry) transmitem dados técnicos e de compra, que precisam ser declarados. O que nunca sai do aparelho continua fora da declaração enquanto nenhuma ferramenta externa o receber. Rascunho em `docs/rascunhos/privacidade-e-seguranca-de-dados.md`.
- Política de privacidade clara, consentimento explícito e opção de exclusão de dados.

### 7.4 Discrição e nome
- **Nome do app: Quedo** ("quieto, calmo" em português e espanhol). Curto, neutro, sem referência ao tema. Título nas lojas: "Quedo"; na App Store, subtítulo descritivo sem termos explícitos.
- **Nome do desenvolvedor:** na fase de validação a conta é de **pessoa física**, e o nome legal do responsável aparece na loja. Aceito enquanto não houver divulgação; o nome neutro de desenvolvedor vem com o CNPJ (seção 12).
- Ícone neutro.
- Notificações discretas na tela bloqueada.
- Descrição da cobrança nas lojas sem referência ao tema.
- Ficha da loja, telas e vídeos de declaração **sem termos explícitos** (pornografia, masturbação etc.) **nem nomes de sites**, especialmente no nome, no subtítulo e nas primeiras linhas da descrição.

### 7.5 Saúde e conteúdo
- Nenhuma promessa de cura ou alegação médica sem fonte. Evitar "cura" e "tratamento".
- Aviso de que o app não substitui acompanhamento profissional nem é dispositivo médico.

### 7.6 Classificação etária
- O app é **18+** (decisão de 01/11/2026): classificação adulta nas lojas, público-alvo adulto declarado no Play Console e confirmação de idade no onboarding.
- Pendente: confirmar se o Digital ECA exige, além disso, consultar o sinal de faixa etária fornecido pela loja, e checagem jurídica.

---

## 8. Monetização

### 8.1 Modelo
Freemium com assinatura via App Store e Google Play. No Google Play, a assinatura usa obrigatoriamente o **Google Play Billing** (comissão de 15% sobre assinaturas no Brasil).

> **Fase de validação:** enquanto o app estiver na conta de pessoa física e sem divulgação, **qualquer assinatura é apenas de teste**. Não há cobrança real.

### 8.2 Gratuito vs. Premium

| Recurso | Gratuito | Premium |
|---|---|---|
| Streak e check-in | ✅ (pornografia) | ✅ |
| Botão de emergência | ✅ completo | ✅ |
| Compulsões ativas | 1, **somente pornografia** | Todas |
| Calendário de benefícios | Marcos até 7 dias | Completo |
| Vídeos por marco | Marcos até 7 dias | Todos |
| Monitoramento de apps e alertas | ❌ | ✅ |
| Tela de interrupção | ❌ | ✅ |
| Notificações por gatilho | 1 lembrete diário simples | Personalizadas por gatilho |
| Estatísticas | Resumo semanal | Histórico completo e padrões |

### 8.3 Período de teste
- **Teste invertido:** ao concluir o onboarding, o usuário recebe **7 dias de Premium** sem cadastrar cartão.
- Ao fim do teste, sem assinatura, a conta passa ao plano Gratuito.
- **Vídeos curtos não existem no plano gratuito**, porque dependem do monitoramento. Ao fim do teste, essa compulsão fica **pausada**: streak, histórico, marcos e vídeos são preservados e voltam ao assinar. Quem escolheu só vídeos curtos é convidado a assinar ou a ativar pornografia.
- A transição deve ser **clara e explicada**: o usuário precisa entender o que mudou, sem sentir que o app quebrou.
- **No Android, a transição desliga o serviço de monitoramento** (e a VPN, quando existir). O usuário verá a notificação permanente sumir, o que deve ser explicado na tela de transição. A permissão de sobreposição continua concedida, e o app precisa deixar de usá-la por conta própria.
- Esse desligamento também reforça, na revisão da loja, que o serviço só roda enquanto o usuário quer.
- Teste com cartão via lojas poderá ser experimentado após o lançamento.

### 8.4 Preços (referência)

| Plano | Preço de referência | Exibição |
|---|---|---|
| Mensal | ~R$ 24,90/mês | Âncora de comparação |
| Anual | ~R$ 167,90/ano (~R$ 13,99/mês) | Pré-selecionado e destacado, com cobrança total visível |

- Valores finais dependem das faixas de preço disponíveis nas lojas.
- A tela de assinatura deve mostrar claramente valor cobrado, periodicidade e renovação automática.
- Gestão de assinaturas, teste e permissões premium: **RevenueCat** (proposta).
- Preços e ofertas devem ser testáveis após o lançamento.

---

## 9. Fora do escopo do MVP

| Item | Situação |
|---|---|
| Chat de IA | Descartado no MVP (sensibilidade dos dados e risco em momentos de crise) |
| Apostas | Segunda etapa do produto. Antes de desenhar a tela de interrupção para apostas, medir quais apps de aposta e de banco escondem sobreposições |
| Compulsões não digitais (cigarro, maconha e outras) | Etapa futura, com mecânica baseada em check-in e gatilhos |
| Outros idiomas | Etapa futura (arquitetura já preparada) |
| Bloqueio definitivo de apps e sites | Fora do conceito do produto (o modo bloqueio da VPN existe tecnicamente, mas não será usado) |
| Gatilhos por localização | Fora do escopo |
| Detecção de domínios e de redes sociais no navegador (VPN local) | **Versão posterior à primeira publicada** (D6, 25/10/2026). Voltar exige nova leitura da política de `VpnService` e, possivelmente, uma função de servidor real |
| Servidor próprio / funções remotas (ex.: parceiro de responsabilidade, sincronização entre aparelhos) | Fora do MVP. Avaliado em 26/10/2026; só faz sentido se houver função real para o usuário |
| Comunidade / recursos sociais | Não discutido |
| Backup e troca de aparelho | Fase futura (no MVP, trocar de aparelho perde o histórico) |

---

## 10. Riscos e premissas a validar

Situação atualizada com o relatório de viabilidade (Fase 1, Android).

| # | Risco / premissa | Impacto | Situação em 01/11/2026 |
|---|---|---|---|
| R1 | **Monitoramento de tempo por app no iOS** depende da Screen Time API (Family Controls / Device Activity), que exige autorização especial da Apple para produção | Alto | **Aberto.** Não testado (conta Apple não destravou). Passa para a fase iOS |
| R2 | **Alertas de conteúdo adulto no iOS:** o filtro nativo bloqueia, mas pode não permitir alertar sem bloquear | Alto | **Aberto.** Passa para a fase iOS |
| R3 | **VPN local no Android** exige declaração e revisão humana no Google Play | Alto | **Confirmado e agravado.** A política pressupõe servidor remoto e criptografia até o túnel, que não existem no desenho local. **Mitigado pela D6:** a VPN fica fora da primeira versão |
| R4 | **Tela de interrupção** sobre outros apps | Médio | **Android: validado com ressalva grave.** Funciona, mas qualquer app pode escondê-la, e **o Nubank já esconde** (medido em 25/10/2026). Nos apps-alvo do MVP (Instagram, TikTok, X, Reddit, YouTube) não acontece hoje. iOS: aberto |
| R5 | Uso de redes sociais pelo **navegador** | Médio | **Confirmado.** Detecta o acesso, não mede o tempo com precisão. Decisão: navegador só gera alerta |
| R6 | Rejeição nas lojas por **tema sensível** ou alegações de saúde | Médio | **Google Play pesquisado:** controlável pela redação da ficha, telas e vídeos. Possível enquadramento na política de apps de saúde (a confirmar). App Store não pesquisada |
| R7 | **Excesso de notificações** leva o usuário a silenciar o app | Médio | Ganhou caso concreto (cada reabertura acima do limite interrompe), mitigado pela pausa de 5 min e pelo encerramento após a reprovação do dia |
| R8 | **Baixa conversão** do gratuito para o premium | Médio | Sem mudança; medir após lançamento |
| R9 | **Evidências científicas** sobre abstinência de pornografia são menos sólidas que de outras compulsões | Médio | Sem mudança; curadoria das fontes pelo responsável |
| R10 | **Classificação etária e Digital ECA:** o Google Play bloqueia ou filtra apps 18+ para menores no Brasil, e o desenvolvedor decide como a lei se aplica ao app | Médio | **App definido como 18+** (7.6). Falta responder o questionário IARC no Play Console e a checagem jurídica |
| R11 | **Proteção contra sobreposição** em apps financeiros e de apostas | Médio | **Confirmado em app real:** primeira rodada (7 apps, 25/10/2026), o Nubank esconde a sobreposição; a Bet365 não. Para a etapa de apostas, a tela própria passa a ser a principal nesses apps. Falta ampliar a amostra (bancos tradicionais e ao menos 3 casas de aposta) |
| R12 | **Teste fechado obrigatório** (conta pessoal): 12 testadores ativos por 14 dias seguidos antes da produção | Médio | **Novo.** Recrutar com folga (14 ou 15) e garantir uso real |

> **Premissa crítica:** R1, R2 e R4 no iOS devem ser validados em protótipo antes de portar o app para o iOS.

---

## 11. Questões em aberto

**Resolvidas**
- [x] Nome do app: **Quedo** (01/11/2026)
- [x] Plataforma de lançamento: Android primeiro (24/09/2026)
- [x] Pausa, reinterrupção, teto e reprovação do dia (24/09/2026, seção 6.5)
- [x] "Ir para a tela inicial" conta como vitória (24/09/2026)
- [x] Necessidade de conta/login: **sem login no MVP** (doc 02, seção 3.2)
- [x] Framework, backend e hospedagem de conteúdo: definidos no doc 02 (exceto streaming de vídeo)
- [x] Comportamento sem permissão de monitoramento: seção 6.10
- [x] "Ignorar o limite por hoje": a partir da **terceira** tela de interrupção (01/11/2026)
- [x] Contagens de interrupção e "Continuar": **por compulsão** (01/11/2026)
- [x] Apps de risco da pornografia: alerta após **10 minutos**; tela de interrupção só onde o usuário declarou consumir o conteúdo (01/11/2026)
- [x] Domínio adulto detectado: **só notificação** (01/11/2026)
- [x] Navegador: notificação **só depois de estourar o limite do app** (01/11/2026)
- [x] Plano gratuito: **sem vídeos curtos**, só pornografia (01/11/2026)
- [x] Limite diário global: **6 notificações proativas** (01/11/2026)
- [x] Janela cega após reinício: **avisar no onboarding** (01/11/2026)
- [x] Idade mínima: **18+** (01/11/2026)
- [x] Limite da moderação: **somado entre os apps**, um por compulsão (02/11/2026)
- [x] Apps pré-marcados: Instagram, TikTok, YouTube e Kwai (vídeos curtos); X e Reddit (apps de risco) (02/11/2026)
- [x] Limite padrão de vídeos curtos: **60 minutos** (02/11/2026)
- [x] Check-in da pornografia: **diário**, horário escolhido (padrão 21h), dia sem resposta não quebra a streak (02/11/2026)
- [x] Onboarding: **progresso salvo**; menor de 18 anos bloqueado; faixas de horário de 2 horas e personalizadas (02/11/2026)
- [x] App nas duas listas: uma tela só, contada na compulsão que disparou primeiro (07/11/2026)
- [x] Notificações: check-in diário sem repetição; preventivas no início de cada faixa (no máximo 4 por dia); recomeço às 9h ou no primeiro desbloqueio depois (07/11/2026)
- [x] Emergência: 1 min de respiração e 5 min de cronômetro, podendo pular (07/11/2026)
- [x] VPN na primeira versão: **não** (D6, 25/10/2026, seção 3.2)

**Ainda em aberto**
- [ ] Quando e como a detecção de domínios volta (nova leitura da política de `VpnService`; avaliar se existe função de servidor real)
- [ ] Ícone e identidade visual
- [ ] Marcos exatos e conteúdo de cada calendário (depende das fontes científicas)
- [ ] Ferramenta de IA para produção dos vídeos

---

## 12. Contexto de negócio (referência, não é requisito técnico)

**Fase de validação (decisão de 24/09/2026)**
- Contas de desenvolvedor como **pessoa física** nas duas lojas.
- Sem divulgação do app nessa fase; assinaturas apenas de teste.
- Objetivo: testar a aprovação nas lojas e o produto com testadores antes de assumir os custos de uma empresa.

**Ao iniciar a divulgação**
- Abrir CNPJ. **MEI não é permitido** para desenvolvimento/licenciamento de software; caminho previsto: **Microempresa (ex.: SLU) no Simples Nacional**, a confirmar com contador (CNAE, tributação de receita das lojas, Fator R).
- Obter o número D-U-N-S (exigido pelas duas lojas para contas de organização).
- **Apple:** converter a mesma conta de individual para organização (pedido ao suporte, com o D-U-N-S).
- **Google Play:** conta pessoal que monetiza não converte. Criar conta de organização e transferir o app: as assinaturas vão junto, os grupos de teste fechado não.
- Aderir aos programas de comissão reduzida das lojas, conferindo condições vigentes.

**Marca (responsável: Luiz Felipe)**
- Registrar o domínio quedo.com.br (e conferir quedo.app), depositar a marca no INPI (classes 9 e 42, avaliar 41 e 44), reservar o nome no App Store Connect quando a conta Apple estiver ativa. Detalhes e riscos no documento de decisão do nome.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 15/09/2026 | Primeira versão consolidando o brainstorm inicial |
| 0.2 | 15/09/2026 | Redes sociais de risco (X, Reddit) monitoradas para pornografia; plano gratuito com marcos e vídeos até 7 dias |
| 0.3 | 01/11/2026 | Resultados da Fase 1 (Android) e decisões de 24/09/2026: Android primeiro; navegador só alerta; detecção de domínio como indício; tela de interrupção com quatro botões, pausa de 5 min e regras de reprovação do dia; notificação de recomeço; permissões no onboarding; estado do monitoramento e modo degradado; desligamento do monitoramento no fim do teste; contas como pessoa física na validação; nome Quedo; riscos atualizados (R10 a R12); questões em aberto revisadas. "Fase 2" do produto passa a se chamar "segunda etapa" para não confundir com as fases do plano técnico |
| 0.4 | 01/11/2026 | Decisões de 01/11/2026: "Ignorar o limite por hoje" a partir da terceira tela; contagens por compulsão; regras da pornografia (apps de risco após 10 min, interrupção só com declaração no onboarding, domínio adulto só notificação); navegador só notifica depois do limite do app; plano gratuito só com pornografia e pausa de vídeos curtos no fim do teste; limite de 6 notificações proativas; aviso da janela cega no onboarding; app 18+ (seção 7.6) |
| 0.5 | 01/11/2026 | Decisão D6 (25/10/2026): primeira versão publicada sem VPN (nova seção 3.2; itens dependentes da VPN marcados como versão posterior); I-25 medido no Nubank (R4 e R11); segurança de dados deixa de ser "sem coleta" por causa de RevenueCat e Sentry; referência ao relatório v0.4 |
| 0.6 | 02/11/2026 | Limite da moderação somado entre os apps escolhidos, um por compulsão (6.5.4); card do Início e Estatísticas ajustados |
| 0.7 | 02/11/2026 | Decisões para a Fase 3: check-in diário da pornografia (padrão 21h, dia sem resposta não quebra a streak); apps pré-marcados e limite padrão de 60 min; faixas de horário de 2 horas e personalizadas; lista de emoções; progresso do onboarding salvo; bloqueio de menores de 18 |
| 0.8 | 07/11/2026 | Decisões para a Fase 4: app nas duas listas com uma tela só; notificação diária de check-in sem repetição; preventivas no início de cada faixa, só nos dias marcados, no máximo 4 por dia; recomeço às 9h ou no primeiro desbloqueio; emergência com 1 min de respiração e 5 min de cronômetro |
