# Spec 02 — Onboarding e Núcleo (Fase 3)

> **Status:** rascunho v0.2 · **Última atualização:** 02/11/2026
> **Documentos base:** `docs/01-visao-e-escopo-mvp.md` (v0.7) · `docs/02-plano-tecnico.md` (v0.6) · `docs/specs/spec-01-fundacao-do-app.md` (v0.3) · `NOTAS-APP.md` (pendências herdadas)
> **Tipo:** código definitivo, sobre a fundação da Fase 2.

---

## 1. Objetivo

Transformar o esqueleto da Fase 2 num app que o usuário **configura de verdade** e **usa no dia a dia sem o monitoramento nativo**:

- onboarding completo, com as respostas gravadas e o progresso salvo;
- streak das duas compulsões, check-in diário e registro de recaída;
- tela Início com um card por compulsão;
- Perfil para editar tudo o que foi respondido e apagar os dados.

Ao final, uma pessoa instala o app, responde o onboarding, faz o check-in do dia e acompanha a streak. O monitoramento continua sendo a implementação falsa da Fase 2; o módulo nativo entra na Fase 4.

---

## 2. Escopo

### 2.1 Dentro do escopo
- As 7 etapas do onboarding com conteúdo, validação e gravação no banco (doc 01, seção 4).
- Progresso do onboarding salvo e retomado.
- Migração 002 com as tabelas e colunas novas (seção 4.2).
- Regras de streak, marcos e check-in em `src/domain/`, puras e testadas.
- Tela Início com cards por compulsão, check-in do dia e "Registrar recaída".
- Perfil: compulsões, apps e limite, gatilhos, motivação, horário do check-in, apagar dados.
- As pendências herdadas da Fase 2 (seção 4.9).
- Fluxos Maestro atualizados.

### 2.2 Fora do escopo
- Módulo nativo, lista real de apps instalados, permissões reais de uso e sobreposição, alertas, tela de interrupção e botão de emergência (Fase 4). Nesta fase, a lista de apps e as permissões vêm do `FakeMonitoringModule`.
- Notificações (check-in por notificação, gatilhos, recomeço): Fase 4. Nesta fase o check-in é só pelo app.
- Conteúdo dos marcos (textos, referências e vídeos) e aba Progresso (Fase 5). A aba Estatísticas também fica para a Fase 5.
- Assinatura, teste de 7 dias e regras de plano (Fase 6). O resumo do onboarding não menciona teste nem preço.
- Identidade visual final.

---

## 3. Decisões aplicadas

Todas estão no doc 01 v0.7. Resumo para consulta rápida:

| Tema | Decisão |
|---|---|
| Idade | Confirmação na primeira etapa; menor de 18 anos vê tela de bloqueio educada e não segue |
| Apps pré-marcados | Vídeos curtos: Instagram, TikTok, YouTube, Kwai. Apps de risco: X, Reddit. Só se instalados; o usuário tira ou acrescenta |
| Limite de vídeos curtos | Um por compulsão, somado entre os apps. Padrão 60 min; opções 30, 45, 60, 90, 120 e valor livre |
| Check-in | Diário, horário escolhido (padrão 21h), "Sem recaída" ou "Tive uma recaída". Dia sem resposta não quebra a streak |
| Horários de risco | 12 faixas de 2 horas (00h–02h … 22h–24h), mais faixas personalizadas com início e fim livres, inclusive atravessando a meia-noite |
| Dias de risco | 7 dias da semana, com atalhos "dias úteis" e "fim de semana" |
| Emoções | Tédio, solidão, estresse, ansiedade, cansaço, tristeza |
| Progresso do onboarding | Salvo: etapa e respostas. Reabrir volta de onde parou |
| Voltar na primeira tela | Sem botão; o Voltar do Android pede confirmação |

---

## 4. Requisitos

### 4.1 Rótulos das compulsões na interface (discrição)
O app nunca mostra termo explícito (CLAUDE.md, seção 9; doc 01, P7). Na interface:

| Valor técnico | Rótulo na interface |
|---|---|
| `pornography` | **Conteúdo adulto** |
| `short_videos` | **Vídeos curtos e redes sociais** |

Os textos de apoio também evitam termos explícitos. O valor técnico segue só no banco e no código (spec 01, seção 4.6).

### 4.2 Banco: migração 002
Gerada pelo `drizzle-kit` a partir de mudanças em `src/data/schema/`. Colunas novas e tabelas:

| Tabela | Mudança | Campos |
|---|---|---|
| `settings` | colunas novas | `onboarding_step` (texto, uma das 7 etapas; nulo depois de concluído), `check_in_minutes` (minutos desde a meia-noite; padrão 1260 = 21h) |
| `check_ins` | nova | `id`, `compulsion_id` (cascata), `day_key` (AAAA-MM-DD, de `toDayKey`), `answer` (`no_relapse` \| `relapse`), `source` (`app` \| `notification`), `answered_at`. **Único** por (`compulsion_id`, `day_key`): responder de novo no mesmo dia substitui |
| `relapses` | nova | `id`, `compulsion_id` (cascata), `day_key`, `recorded_at`. Único por (`compulsion_id`, `day_key`) |
| `day_states` | nova (base para a Fase 4) | `compulsion_id` (cascata), `day_key`, `interruptions`, `continues`, `failed` (booleano), `failed_reason` (`ignored_limit` \| `third_continue`, nulo), chave única (`compulsion_id`, `day_key`) |

Formato do `triggers.value`, validado no domínio e por `CHECK` quando possível:

| `kind` | `value` | Exemplo |
|---|---|---|
| `time` | `HH:MM-HH:MM` (fim pode ser menor que o início: atravessa a meia-noite; início e fim nunca iguais) | `22:00-00:00`, `23:30-01:00` |
| `weekday` | `0` a `6` (domingo = 0) | `6` |
| `emotion` | `boredom` \| `loneliness` \| `stress` \| `anxiety` \| `tiredness` \| `sadness` | `stress` |

Requisitos:
- Teste no S22 sobre um banco **já existente** da Fase 2 (roteiro R10): a migração 002 aplica e os dados são preservados.
- `deleteAllData()` cobre as tabelas novas.
- Uma recaída registrada também grava o check-in do dia como `relapse` (e vice-versa), numa transação só.

### 4.3 Domínio
Em `src/domain/`, sem React nem banco, com testes que incluem virada de dia e horário de verão (como a borda do dia da Fase 2):

- **Base da streak:**
  - abstinência: o mais recente entre o início informado e o dia da última recaída;
  - moderação: o dia seguinte ao último dia reprovado (`day_states.failed`) ou o início, o que for mais recente. Se o dia atual estiver reprovado, a streak é 0.
- **Streak** = `calendarDaysBetween(base, hoje)`. No dia do início ou da recaída, a streak é 0 ("0 dias"; plural com `_zero`).
- **Dia de início:** para as duas compulsões, o início é o **dia em que o usuário toca em "Começar"** no fim do onboarding, não o dia em que respondeu a etapa. Uma compulsão adicionada depois pelo Perfil começa no dia em que é adicionada.
- **Início da abstinência no onboarding:** "Estou começando hoje" (base = dia do "Começar") ou "Estou sem recair há N dias" (base = dia do "Começar" − N dias de calendário, N inteiro de 1 a 3650).
- **Próximo marco:** da lista provisória **1, 3, 7, 14, 30, 60, 90, 180, 365** dias (doc 01, seção 6.3), o primeiro maior que a streak atual. Depois de 365, nenhum. A lista vive num único lugar e será substituída pelo conteúdo remoto na Fase 5.
- **Check-in do dia:** pendente, respondido "sem recaída" ou "recaída". Um dia sem resposta não muda a streak. Nesta fase o card oferece o check-in **o dia todo**; o horário escolhido só passa a valer na Fase 4, com a notificação. Se o usuário responder "Sem recaída" e recair depois no mesmo dia, "Registrar recaída" substitui a resposta.
- **Recaída:** pode ser registrada para **hoje ou ontem**. "Ontem" só é oferecido quando ontem já está dentro do período acompanhado (não antes do início). Registrar para ontem também zera a streak a partir de ontem.
- **Desfazer:** tudo o que foi **registrado hoje** pode ser desfeito até o fim do dia, inclusive uma recaída marcada para ontem por engano. O que foi registrado em dias anteriores não se desfaz pela interface.
- **Faixas de horário:** parse e validação de `HH:MM-HH:MM`, "está dentro da faixa agora?" (inclusive atravessando a meia-noite). No banco, cada faixa fica gravada como foi marcada. **No resumo, faixas vizinhas e sobrepostas viram um intervalo só** (ex.: 20h–22h, 22h–24h e 23:30–01:00 aparecem como "20h–01h"). Uma faixa personalizada igual a uma das 12 fixas não vira duplicata.
- **Horário do check-in:** minutos desde a meia-noite, de 0 a 1439.
- `isAppRoleAllowed` aplicado em toda gravação de app monitorado (pendência herdada).

### 4.4 Onboarding (doc 01, seção 4)

**Regras gerais**
- Cada etapa grava suas respostas **ao avançar** e atualiza `settings.onboarding_step`. Ao reabrir o app no meio do onboarding, ele abre na etapa gravada com as respostas preenchidas.
- Voltar para uma etapa anterior mostra as respostas já dadas e permite mudar. Mudar a escolha de compulsões apaga as respostas da compulsão retirada (com aviso).
- Primeira tela sem botão "Voltar"; o Voltar do Android pede confirmação (alerta já existente).
- Campos opcionais marcados como opcionais. O botão "Continuar" fica desabilitado enquanto a etapa estiver inválida, com o motivo visível.
- A `Screen` trata o teclado: o campo com foco nunca fica escondido (pendência herdada).

**Etapas**

| # | Etapa | Conteúdo | Validação |
|---|---|---|---|
| 1 | Boas-vindas | Apresentação curta e acolhedora; pergunta "Você tem 18 anos ou mais?" com "Sim" e "Não" | "Não" leva à tela de bloqueio (sem seguir, sem gravar nada), que tem um "Voltar" para as boas-vindas, para corrigir um toque errado. "Sim" grava `age_confirmed_at` |
| 2 | O que você quer mudar | Escolha de uma ou ambas as compulsões, com uma linha explicando cada uma | Pelo menos uma |
| 3 | Configuração | Uma seção por compulsão escolhida. **Vídeos curtos:** lista de apps (da `listTargets()`), com os sugeridos pré-marcados se presentes, e o limite (chips 30/45/60/90/120 + "outro", padrão 60). **Conteúdo adulto:** início da streak (hoje ou há N dias), apps de risco com os sugeridos pré-marcados e, para cada app marcado, "Você costuma consumir esse tipo de conteúdo neste app?" (Sim/Não), e o horário do check-in (padrão 21h) | Vídeos curtos: pelo menos um app; limite inteiro de 5 a 600 min. Conteúdo adulto: apps de risco opcionais, mas **cada app marcado precisa da resposta** sobre consumir o conteúdo nele (sem resposta pré-marcada); N válido |
| 4 | Gatilhos | Horários: 12 faixas de 2 horas em chips de seleção múltipla + "Adicionar faixa personalizada" (início e fim). Dias: 7 chips + atalhos "Dias úteis" e "Fim de semana". Emoções: 6 chips | Tudo opcional |
| 5 | Sua motivação | Campo "Por que eu quero mudar?" com exemplos neutros de inspiração | Obrigatório, 3 a 280 caracteres, contador visível |
| 6 | Permissões | Para cada permissão (acesso ao uso, sobreposição, notificações): o que é, para que o Quedo usa, o que **não** faz, e o botão para conceder, com "Agora não". Inclui o aviso da notificação permanente e da janela após reiniciar o aparelho (doc 01, seção 4.3). Nesta fase os pedidos vão ao `FakeMonitoringModule` | Nada obrigatório: negar mantém o modo reduzido |
| 7 | Seu plano | Resumo das escolhas: compulsões, apps e limite, check-in, gatilhos (faixas agrupadas), motivação. Botão "Começar" | Conclui: grava `onboarding_completed = true` e `onboarding_step = null` |

**Um app nas duas listas.** O mesmo app (ex.: X) pode estar em vídeos curtos e nos apps de risco. Em qual compulsão a interrupção conta fica para a spec de monitoramento (Fase 4).

**Apps sugeridos.** Identificadores em um único lugar (`src/domain/`), a confirmar no aparelho na Fase 4:

| App | Pacote |
|---|---|
| Instagram | `com.instagram.android` |
| TikTok | `com.zhiliaoapp.musically` (e `com.ss.android.ugc.trill`) |
| YouTube | `com.google.android.youtube` |
| Kwai | `com.kwai.video` |
| X | `com.twitter.android` |
| Reddit | `com.reddit.frontpage` |

A lista falsa do `FakeMonitoringModule` passa a incluir esses pacotes (nomes reais de apps populares, sem nada impróprio), para o fluxo de pré-marcação ser testável sem o módulo nativo.

**Textos.** Tom acolhedor, sem julgamento e sem promessas de saúde (doc 01, P1, P9 e 7.5). O Claude Code escreve uma primeira versão de todos os textos em `src/i18n/pt-BR/`; o responsável revisa no roteiro manual.

### 4.5 Tela Início (doc 01, seção 6.1)
Um card por compulsão ativa, na ordem em que foram escolhidas.

**Card de conteúdo adulto**
- Streak ("12 dias", com `_zero`) e próximo marco ("Próximo marco: 14 dias").
- Check-in do dia:
  - pendente: "Como foi hoje?" com "Sem recaída" e "Tive uma recaída";
  - respondido: a resposta, com "Desfazer" até o fim do dia.
- "Registrar recaída" (hoje ou ontem), com confirmação.
- Depois de uma recaída: mensagem acolhedora, sem culpa, lembrando que as conquistas ficam (P8).

**Card de vídeos curtos**
- Uso de hoje somado entre os apps escolhidos: "42 min de 60 hoje", lido de `getMonitoring().getUsageToday()`.
- Sem permissão ou sem suporte: "O acompanhamento do tempo ainda não está ativo", com atalho para o estado das permissões (por enquanto, a etapa de permissões reaproveitada).
- Streak e próximo marco.

**Sem nenhuma compulsão** (caso de quem concluiu o onboarding vazio da Fase 2, só no aparelho de desenvolvimento): estado vazio com atalho para "Adicionar compulsão" no Perfil.

Tocar no card não leva a outra tela nesta fase (a aba Progresso é da Fase 5). O botão de emergência fica para a Fase 4; o layout do Início deve deixar espaço previsto para ele.

### 4.6 Perfil (doc 01, seção 6.9)
- **Minhas escolhas:** compulsões (adicionar a que falta, que abre a configuração dela; remover, com confirmação explicando que o histórico daquela compulsão será apagado). Deve sobrar pelo menos uma.
- **Apps e limite** de vídeos curtos; **apps de risco** e as declarações; **horário do check-in**.
- **Gatilhos** e **motivação**, reaproveitando os componentes do onboarding.
- **Apagar meus dados:** confirmação em duas etapas; apaga tudo (`deleteAllData()`), **zera o `onboardingStatus`** e volta às boas-vindas (pendência herdada). Teste: banco vazio e tela de boas-vindas.
- Sobre o app e, em desenvolvimento, "Refazer onboarding" (já existentes).

### 4.7 Componentes novos do design system
Reaproveitáveis entre onboarding e Perfil, com acessibilidade (área de toque de 48 dp, estado lido pelo leitor de tela, contraste testado):
- `Chip` de seleção (simples e múltipla);
- `TextField` com rótulo, contador e mensagem de erro;
- `TimePicker` e seletor de faixa (início e fim). Se exigir biblioteca com código nativo, **explicar as opções e pedir confirmação** antes;
- as permissões do `FakeMonitoringModule` ficam só na memória nesta fase: depois de reabrir o app, voltam a "não concedidas". Isso é esperado até a Fase 4;
- `ConfirmDialog` (ou o padrão do sistema, com textos do i18n).

### 4.8 Privacidade
- Nada sai do aparelho. Respostas, check-ins, recaídas e motivação ficam só no banco local.
- Nenhum log com respostas, nomes de apps, motivação ou valores de enum.
- Textos sem termo explícito (4.1), inclusive nos dados de teste e nos fluxos do Maestro.

### 4.9 Pendências herdadas da Fase 2
Todas em `NOTAS-APP.md` e cobertas acima:

| Pendência | Onde |
|---|---|
| Salvar etapa e respostas do onboarding | 4.4 |
| Esconder "Voltar" na primeira tela | 4.4 |
| Teclado na `Screen` | 4.4 |
| "Apagar meus dados" zera o onboarding | 4.6 |
| `isAppRoleAllowed` ao gravar apps | 4.3 |

### 4.10 Testes
- **Domínio:** streak nas duas mecânicas (início hoje, há N dias, recaída hoje e ontem, desfazer, dias sem check-in, dia reprovado), próximo marco, faixas de horário (inclusive atravessando a meia-noite), validações. Com mutação de controle nos casos principais.
- **Repositórios e migração 002:** em Jest (sql.js) e no aparelho (R10).
- **Componentes e telas:** etapas do onboarding, cards e Perfil, com RNTL.
- **Maestro:** (a) onboarding completo com as duas compulsões até o Início; (b) sair no meio e retomar na mesma etapa; (c) check-in, desfazer e registrar recaída; (d) apagar dados e voltar às boas-vindas.
- `lint`, `typecheck` e `test` no CI.

---

## 5. Ordem de execução

1. **Domínio** (4.3), com testes.
2. **Banco:** migração 002, repositórios novos e transações (4.2); teste no S22 (R10).
3. **Componentes** novos (4.7).
4. **Onboarding:** progresso salvo e retomada, depois as etapas na ordem 1 a 7 (4.4), com os textos.
5. **Tela Início** (4.5).
6. **Perfil** (4.6), incluindo "Apagar meus dados".
7. **Maestro** e roteiro manual (seção 6).

---

## 6. Roteiro de verificação manual (no S22)

| # | Roteiro | Esperado |
|---|---|---|
| R1 | Primeira abertura → responder "Não" sobre a idade | Tela de bloqueio; nada gravado; reabrir o app volta às boas-vindas |
| R2 | Escolher as duas compulsões e preencher tudo | Validações claras; "Continuar" só habilita com a etapa válida |
| R3 | Na etapa 4, fechar o app pelo multitarefa e reabrir | Volta na etapa 4 com as respostas das etapas 1 a 3 |
| R4 | Voltar da etapa 4 à 2 e tirar uma compulsão | Aviso; a configuração dela some do resumo |
| R5 | Gatilhos: marcar faixas de 2 horas, criar uma faixa 23:30–01:00, marcar "Fim de semana" | Resumo mostra as faixas e os dias corretos |
| R6 | Concluir e ver o Início | Um card por compulsão, streak "0 dias" (ou N, se informado) e próximo marco |
| R7 | Check-in "Sem recaída", depois "Desfazer" | Card volta a "Como foi hoje?" |
| R8 | Registrar recaída para ontem | Streak recalculada a partir de ontem; mensagem acolhedora |
| R9 | Perfil: mudar limite, horário do check-in, motivação e um gatilho | Mudanças aparecem no Início e persistem ao reabrir |
| R10 | Instalar o build da Fase 3 sobre o app da Fase 2 com onboarding concluído | Migração 002 aplica; app abre nas abas, sem perder a flag |
| R11 | Perfil → Apagar meus dados | Duas confirmações; volta às boas-vindas; reabrir continua nas boas-vindas |
| R12 | Tema escuro e fonte no máximo em todas as etapas e no Início | Tudo legível, sem texto cortado; teclado não cobre o campo de motivação |
| R13 | Ler todos os textos novos | Português correto, tom acolhedor, nenhum termo explícito |

---

## 7. Critérios de aceite

- [ ] Onboarding completo com as 7 etapas, validações e textos revisados pelo responsável.
- [ ] Progresso do onboarding salvo e retomado (R3).
- [ ] Bloqueio de menores (R1).
- [ ] Migração 002 testada em Jest e no aparelho sobre banco existente (R10).
- [ ] Regras de streak, marcos, check-in, recaída e faixas em `src/domain/`, testadas.
- [ ] Tela Início com cards das duas compulsões, check-in, desfazer e registrar recaída.
- [ ] Perfil com edição de tudo e "Apagar meus dados" voltando às boas-vindas.
- [ ] Nenhum termo explícito na interface (4.1) e nenhum texto fixo (lint).
- [ ] Pendências herdadas resolvidas (4.9).
- [ ] Quatro fluxos Maestro passando no S22.
- [ ] Roteiro R1 a R13 executado com o responsável.
- [ ] `lint`, `typecheck` e `test` no CI; `NOTAS-APP.md` atualizado.

---

## 8. Instruções para o Claude Code

- Ler o `CLAUDE.md`, esta spec e as pendências da Fase 2 no `NOTAS-APP.md` antes de começar.
- Seguir a ordem da seção 5, com uma branch e um PR por passo (ex.: `fase3/dominio`, `fase3/banco`), como na Fase 2.
- Bibliotecas com código nativo (ex.: seletor de horário) exigem explicação das opções e confirmação.
- Escrever a primeira versão dos textos e **apresentá-los ao responsável** antes de fechar cada etapa do onboarding.
- Não alterar `docs/01`, `docs/02` nem as specs. Divergências vão para `NOTAS-APP.md` e para o chat de planejamento.
- Nunca afirmar que algo funciona sem evidência.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 02/11/2026 | Primeira versão |
| 0.2 | 02/11/2026 | Oito pontos esclarecidos com o Claude Code: início no dia do "Começar"; check-in o dia todo nesta fase; desfazer tudo o que foi registrado hoje; "ontem" só dentro do período; "Voltar" na tela de bloqueio de idade; faixas vizinhas unidas no resumo; resposta obrigatória por app de risco; app nas duas listas permitido e Início vazio sem compulsão |
