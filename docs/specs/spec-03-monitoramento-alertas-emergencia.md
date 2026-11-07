# Spec 03 — Monitoramento, Alertas e Emergência (Fase 4)

> **Status:** rascunho v0.1 · **Última atualização:** 07/11/2026
> **Documentos base:** `docs/01-visao-e-escopo-mvp.md` (v0.8, seções 3, 6.2, 6.5 a 6.7 e 6.10) · `docs/02-plano-tecnico.md` (v0.7, seções 3.4, 4 e 4.1) · `docs/relatorios/01-viabilidade-monitoramento.md` (v0.4, seções 6.2, 7 e 9.6) · `NOTAS-APP.md` (pendências herdadas)
> **Tipo:** código definitivo. **Só Android.** Sem VPN (D6).

---

## 1. Objetivo

Tornar o Quedo **proativo**: monitorar de verdade o uso dos apps escolhidos e agir no momento de risco, mesmo com o app fechado.

Ao final, no S22:
- o limite somado dos vídeos curtos e os 10 minutos por app de risco disparam notificação e tela de interrupção, com as regras de pausa, contagem e reprovação do dia do doc 01;
- o check-in, as preventivas por gatilho e o recomeço chegam por notificação, dentro do limite diário;
- o botão de emergência funciona do Início, da tela de interrupção e das notificações;
- o app percebe quando perde uma permissão e avisa;
- tudo sobrevive a fechar o app, à morte do processo e ao reinício do aparelho.

---

## 2. Escopo

### 2.1 Dentro do escopo
- Módulo nativo Android definitivo em `modules/monitoring-android/`, a partir do `lab-monitoring` do protótipo, **sem a VPN**, com as correções obrigatórias do doc 02 (seção 4.1) e do relatório (seção 7.2).
- Regras de limite, interrupção, pausa, contagem e reprovação (doc 01, 6.5), executadas no nativo.
- Tela de interrupção (sobreposição como principal, tela própria como reserva).
- Notificações: alertas de limite e de app de risco, check-in com ações, preventivas por gatilho, recomeço, aviso de proteção pausada.
- Botão de emergência completo.
- Sincronização dos eventos nativos com o banco do app.
- Permissões reais no onboarding, no Perfil e na tela de permissões.
- Vigilância de permissões, estado do monitoramento e modo degradado (doc 01, 6.10).
- Pendências herdadas da Fase 3 (seção 5.12).

### 2.2 Fora do escopo
- VPN, detecção de domínios e alertas de navegador (D6). A flag `domainMonitoring` continua desligada.
- iOS (Fase 10).
- Estatísticas, aba Progresso e conteúdo dos marcos (Fase 5).
- Planos gratuito e premium: nesta fase **tudo fica ligado** para todos. O desligamento ao fim do teste é da Fase 6.
- Sentry (Fase 8).
- Medição oficial de bateria em build de loja (Fase 8). Aqui só uma conferência de sanidade (seção 5.13).

---

## 3. Decisões aplicadas

Todas no doc 01 v0.8. Resumo:

| Tema | Decisão |
|---|---|
| Limite de vídeos curtos | Um por compulsão, somado entre os apps escolhidos |
| Apps de risco | 10 minutos de uso no dia **por app**. Tela de interrupção só onde o usuário declarou consumir o conteúdo; nos outros, só notificação |
| Botões da tela (moderação) | Emergência · Ir para a tela inicial · Continuar mesmo assim · Ignorar o limite por hoje (a partir da 3ª tela do dia, inclusive) |
| Botões da tela (conteúdo adulto) | Emergência · Ir para a tela inicial · Continuar mesmo assim. Sem "Ignorar" |
| Pausa | 5 minutos, só depois de "Continuar mesmo assim" |
| Contagem | Por compulsão, somando os apps dela. Toda tela exibida conta; a Emergência não |
| Reprovação do dia (moderação) | "Ignorar o limite por hoje" ou o 3º "Continuar". Depois, nenhum alerta daquela compulsão até a meia-noite |
| Conteúdo adulto, 3º "Continuar" | Sem reprovação e sem recaída. A tela para de aparecer até a meia-noite |
| App nas duas listas | Uma tela só, contada na compulsão que disparou primeiro, com os botões e as regras dela |
| Check-in | Uma notificação por dia no horário escolhido, só se ainda não respondido; fica até ser respondida ou até a meia-noite; sem repetição |
| Preventivas | No início de cada faixa marcada (faixas vizinhas unidas), só nos dias marcados (ou todos, se nenhum dia foi marcado) |
| Limite diário | 6 proativas por dia; check-in e recomeço sempre têm vaga, então as preventivas ficam com no máximo 4 |
| Recomeço | No dia seguinte a uma quebra, às 9h ou no primeiro desbloqueio depois das 9h; só se a streak era de 1 dia ou mais |
| Emergência | Motivação, 1 min de respiração, 5 min de cronômetro com sugestões, "A vontade passou?". Pode pular etapas |

---

## 4. Arquitetura

### 4.1 Quem decide o quê
A tela de interrupção e as notificações precisam funcionar **com o app fechado**, quando o JavaScript não está rodando. Por isso:

| Camada | Responsabilidade |
|---|---|
| **Nativo (Kotlin)** | Executa as regras que acontecem no momento: medir o uso, decidir alerta e tela, aplicar pausa, contar interrupções e "Continuar", reprovar o dia, agendar e enviar notificações, receber as ações das notificações. **Guarda o próprio estado em disco** e grava eventos |
| **JavaScript** | Fonte da configuração e do histórico: monta a configuração a partir do banco e a envia ao nativo; importa os eventos do nativo para o banco; calcula streak e telas; abre a emergência |

**Exceção registrada ao CLAUDE.md (seção 8.3, "regras em `src/domain/`"):** as regras do momento vivem no Kotlin, porque precisam rodar sem o JavaScript. Para não existirem duas versões divergentes:
- as regras ficam descritas **numa tabela única** (seção 5.2);
- os casos de teste ficam num **arquivo de vetores compartilhado** (`src/domain/vectors/*.json`), lido pelos testes em Jest **e** pelos testes JUnit do Kotlin;
- a borda do dia segue a mesma regra nos dois lados, com vetores que incluem horário de verão (pendência herdada).

### 4.2 Configuração enviada ao nativo
O JS chama uma função de configuração (ex.: `configure(config)`) sempre que algo muda (onboarding concluído, Perfil, check-in, recaída) e ao abrir o app. O nativo **persiste a última configuração em disco** e a usa depois do reinício, sem precisar do JS.

A configuração contém, no mínimo:
- as regras de uso (moderação somada; uma por app de risco, com o flag de interrupção);
- por compulsão: tipo, dia-base da streak (para saber se havia streak a perder) e se o check-in de hoje já foi respondido;
- horário do check-in, faixas e dias de gatilho, emoções;
- a motivação e **todos os textos** que o nativo exibe (notificações, tela de interrupção), já traduzidos pelo i18n do JS. O nativo não tem textos próprios além de um mínimo neutro para o caso de ainda não haver configuração.

### 4.3 Eventos e sincronização
O nativo grava eventos num armazenamento próprio, cada um com **identificador único**. O JS, ao abrir o app e ao voltar do segundo plano, lê os eventos, grava no banco de forma **idempotente** (importar duas vezes não duplica) e só então pede ao nativo para apagá-los.

Eventos mínimos: limite atingido, notificação enviada (com o tipo), tela de interrupção exibida (só quando a tela **de fato** apareceu, I-28), resposta da tela (`emergency`, `home`, `continue`, `ignore_today`), dia reprovado (com o motivo), check-in respondido pela notificação, emergência pedida, permissão perdida, serviço iniciado ou recriado.

Ao importar:
- resposta "Tive uma recaída" pela notificação → recaída e check-in de hoje, como pelo app (transação da Fase 3);
- dia reprovado → `day_states.failed` com o motivo;
- telas e respostas → tabela nova de interrupções (seção 5.6), base das estatísticas da Fase 5.

### 4.4 Estado em disco
Todo estado do nativo que importa (configuração, contagens do dia, pausa, alertas já enviados no dia, agendamentos, eventos ainda não importados) fica **em disco**. O processo pode morrer a qualquer momento (I-31) e a recriação é caminho normal, não exceção.

---

## 5. Requisitos

### 5.1 Módulo nativo
- Novo módulo `modules/monitoring-android/` (Expo Modules, Kotlin), implementando a interface de `src/monitoring/` (que pode evoluir nesta fase, com a implementação falsa acompanhando).
- Base: o `lab-monitoring` do protótipo, **sem** VPN, `BrowserSessionTracker`, `HIDE_OVERLAY_WINDOWS` nem o log de laboratório.
- Serviço em primeiro plano `specialUse`, com a justificativa **em inglês** no manifesto (rascunho em `docs/rascunhos/play-console-justificativas.md`).
- Correções obrigatórias (doc 02, 4.1): acumular o uso incrementalmente, borda do dia explícita, filtrar lançadores, descontar o tempo diante da tela de interrupção, contador de verificações no serviço.
- Receptor de boot (e de atualização do app) que religa o serviço quando o monitoramento estava ativo. A janela cega depois do reinício (~2,5 min, só depois do primeiro desbloqueio) é aceita e já é avisada no onboarding.
- Listagem de apps por `queries` MAIN/LAUNCHER, **nunca** `QUERY_ALL_PACKAGES`.
- Confirmar no S22 os pacotes sugeridos da Fase 3 (Instagram, TikTok, YouTube, Kwai, X, Reddit) com os apps reais instalados.

### 5.2 Regras do momento (tabela única)

**Moderação (vídeos curtos), por dia:**

| Situação | Ação |
|---|---|
| Soma de uso atinge o limite | Notificação de limite (uma vez no dia). Se o app continuar em primeiro plano na verificação seguinte, tela de interrupção |
| Acima do limite, fora da pausa, app monitorado aberto ou reaberto | Nova tela de interrupção |
| Tela exibida | `interruptions += 1` |
| "Ir para a tela inicial" | Leva à tela inicial do aparelho. Vitória. Sem pausa |
| "Emergência" | Abre a emergência no app. Não conta como resposta. Sem pausa |
| "Continuar mesmo assim" | `continues += 1`; pausa de 5 min. Se `continues` chegar a 3: dia reprovado (`third_continue`) e alertas encerrados até a meia-noite |
| "Ignorar o limite por hoje" (visível quando `interruptions >= 3`) | Dia reprovado (`ignored_limit`) e alertas encerrados até a meia-noite |
| Fim da pausa com o app ainda aberto | Nova tela |
| Antes do 3º "Continuar" | A tela avisa que ele encerra a meta do dia |

**Conteúdo adulto (apps de risco), por app e por dia:**

| Situação | Ação |
|---|---|
| 10 min de uso no dia naquele app | Notificação (uma vez por app no dia) |
| App **declarado**: continua em primeiro plano, ou reaberto fora da pausa | Tela de interrupção (Emergência · Ir para a tela inicial · Continuar) |
| App **não declarado** | Nunca tela |
| "Continuar mesmo assim" | `continues += 1` na compulsão; pausa de 5 min; sinal registrado (sem recaída). No 3º, a tela para de aparecer até a meia-noite |

**Regras comuns:**
- Contagens por **compulsão**, somando os apps dela; zeram na borda do dia.
- App nas duas listas: uma tela só, da compulsão que disparou primeiro no dia; a outra não gera tela naquele app enquanto a primeira estiver ativa.
- Carência curta depois de qualquer saída da tela, para não reabrir sobre a tela inicial (o `EXIT_GRACE_MS` do protótipo).
- Todas as regras com vetores de teste compartilhados (4.1).

### 5.3 Tela de interrupção
- **Sobreposição como principal; tela própria (Activity) como reserva** quando a sobreposição não puder aparecer (relatório, 7.2).
- Conteúdo: identidade "Quedo" (sem imitar avisos do sistema), a motivação do usuário, uma frase de apoio e os botões da seção 5.2. **Nenhum termo explícito**, nem o nome da compulsão como "Conteúdo adulto": a tela aparece por cima de outro app e pode ser vista por terceiros.
- Fundo opaco; textos do i18n (via configuração); tema claro e escuro; fonte do sistema até o máximo; leitor de tela com foco inicial no título.
- **Voltar do Android** tratado explicitamente: não fecha a tela sem escolha. Testado **com o voltar preditivo ligado** (pendência herdada).
- Tela própria: fora dos recentes, sem histórico, `taskAffinity` vazio e retrato fixo (relatório, 7.2).
- **Conferir que a tela de fato apareceu** antes de gravar o evento; descartar em 20 s se não ficou visível; recuo progressivo de 1, 2, 5 e 15 min quando escondida, voltando a tentar ao sair e reentrar no app (I-28, I-25).
- O tempo diante da tela não conta como uso do app monitorado.

### 5.4 Notificações
**Canais** (nomes neutros, sem tema):

| Canal | Uso | Importância |
|---|---|---|
| Acompanhamento | Notificação permanente do serviço | Baixa |
| Avisos | Limite, app de risco, proteção pausada | Alta |
| Lembretes | Check-in, preventivas, recomeço | Padrão |

**Regras gerais:**
- Toda notificação com **versão pública neutra** na tela bloqueada (só "Quedo" e um texto genérico); o texto completo só desbloqueado.
- Ação "Emergência" nas notificações de aviso e nas preventivas; abre o app direto na emergência.
- **Sem alarme exato:** não usar `SCHEDULE_EXACT_ALARM` nem `USE_EXACT_ALARM` (política do Google Play). Agendamento inexato, com tolerância de até 15 minutos, aceita.
- Agendamentos sobrevivem ao reinício e à morte do processo.
- Funcionam **mesmo sem a permissão de uso**: check-in, preventivas e recomeço não dependem do serviço de monitoramento.
- **Limite de 6 proativas por dia** controlado no nativo: check-in e recomeço sempre têm vaga; preventivas no máximo 4. Avisos de monitoramento ficam fora do limite.

**Check-in:**
- No horário escolhido, se o check-in de hoje não foi respondido (o JS informa pela configuração).
- Ações "Sem recaída" e "Tive uma recaída", respondidas **sem abrir o app** e gravadas como evento.
- Removida à meia-noite se não respondida. Sem repetição.
- Responder no app antes do horário cancela a notificação do dia.

**Preventivas por gatilho:**
- No início de cada faixa (faixas vizinhas e sobrepostas unidas, regra do resumo da Fase 3), só nos dias marcados ou em todos, se nenhum foi marcado.
- Texto escolhido entre variações que usam a emoção declarada e, quando couber, a motivação.

**Recomeço:**
- Depois de uma quebra (recaída registrada ou dia reprovado) quando a streak era de 1 dia ou mais.
- No dia seguinte, às 9h ou no primeiro desbloqueio depois das 9h. Uma só.

**Proteção pausada:**
- Quando a vigilância (5.7) percebe uma permissão perdida ou o serviço parado sem querer, uma notificação neutra leva à tela de permissões. No máximo uma por dia por motivo.

### 5.5 Botão de emergência
- Rota própria no app (ex.: `/emergency`), aberta pelo Início (botão no espaço já reservado), pela tela de interrupção e pelas notificações.
- Fluxo do doc 01, 6.7:
  1. motivação;
  2. respiração guiada de 1 minuto (animação simples, respeitando "remover animações" do sistema);
  3. cronômetro de 5 minutos com sugestões;
  4. "A vontade passou?" (Sim / Ainda não).
- "Pular" visível em todas as etapas. Sair no meio registra a sessão como abandonada.
- **Sempre gratuito.** Não usa IA e não guarda texto digitado.
- Sessões gravadas no banco (5.6), com origem e resultado. "Sim" conta como vitória.

### 5.6 Banco: migração 005
Só `CREATE TABLE` e `ALTER TABLE ... ADD`, sem recriar tabela-pai, e passando no teste das tabelas filhas.

| Tabela | Campos |
|---|---|
| `interruption_events` (nova) | `id` (o identificador do evento nativo, único), `compulsion_id` (cascata), `day_key`, `shown_at`, `response` (`emergency` \| `home` \| `continue` \| `ignore_today`, nulo se a tela foi fechada de outro jeito), `responded_at`, `app_package` (fica só no aparelho) |
| `emergency_sessions` (nova) | `id`, `started_at`, `ended_at`, `source` (`home` \| `interruption` \| `notification`), `outcome` (`passed` \| `not_passed` \| `abandoned`) |
| `imported_events` (nova) | `event_id` (único), `imported_at`. Garante a importação idempotente |

`day_states` (Fase 3) passa a ser preenchida a partir dos eventos. `check_ins.source = 'notification'` passa a ser usado.

### 5.7 Permissões, estado do monitoramento e modo degradado
- As três permissões (notificações, acesso ao uso, sobreposição) passam a ser **reais** na etapa 6 do onboarding, no item "Permissões" do Perfil e em `/permission-status`, com os mesmos textos de divulgação destacada aprovados na Fase 3.
- Acesso ao uso e sobreposição abrem a tela certa dos Ajustes; ao voltar, o app consulta de novo.
- O monitoramento **liga** ao concluir o onboarding (ou ao conceder a permissão depois) e **desliga** quando nenhuma regra precisa dele.
- **Vigilância (I-30):** o serviço confere as permissões periodicamente; o app confere ao abrir e ao voltar do segundo plano. Permissão perdida → evento, notificação de proteção pausada (5.4) e aviso no Início.
- **Tela de estado do monitoramento** (doc 01, 6.9): `/permission-status` passa a mostrar também se o serviço está ativo e a última verificação, com o que fazer em cada caso.
- Sem permissão de uso: os cards seguem como na Fase 3 (sem minutos), e check-in, preventivas, recomeço e emergência continuam funcionando.

### 5.8 Manifesto
- A verificação do manifesto passa a usar uma **lista de permissões permitidas** (além da de proibidas). Qualquer permissão nova fora da lista quebra a verificação.
- Permitidas nesta fase (a conferir na documentação atual): `INTERNET`, `VIBRATE`, `SYSTEM_ALERT_WINDOW`, `PACKAGE_USAGE_STATS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`.
- Proibidas, somando às atuais: `QUERY_ALL_PACKAGES`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- Qualquer permissão a mais exige explicação e confirmação do responsável.

### 5.9 Textos
- Todos do i18n, enviados ao nativo pela configuração (4.2). Neutros, sem termo explícito, inclusive na tela de interrupção.
- Variações para as preventivas por emoção e para a tela de interrupção, para não repetir sempre a mesma frase.
- Listados no PR, por tela e por notificação, para revisão do responsável, como na Fase 3.

### 5.10 Ferramentas de teste (só em desenvolvimento)
Uma tela no Perfil, só no ambiente de desenvolvimento, para:
- usar limite de 1 minuto e app de risco com 1 minuto;
- disparar agora o check-in, uma preventiva e o recomeço;
- mostrar a tela de interrupção sem esperar o limite;
- ver o estado do dia no nativo e os eventos ainda não importados;
- zerar o estado de hoje.

Nada disso aparece em prévia ou produção, e a verificação de manifesto e os testes garantem isso.

### 5.11 Privacidade
- Nada sai do aparelho. Eventos, pacotes dos apps e respostas ficam no armazenamento do nativo e no banco local.
- Logs do sistema (`logcat`) sem motivação, nomes de app, respostas ou valores de compulsão, inclusive nas mensagens de erro do Kotlin.

### 5.12 Pendências herdadas da Fase 3

| Pendência | Onde |
|---|---|
| Voltar preditivo ligado na tela de interrupção | 5.3 |
| Borda do dia igual no Kotlin e no Hermes | 4.1 (vetores) |
| Regras de limite (somado; uma por app de risco) | 5.2 |
| App nas duas listas | 5.2 |
| `fontScale` e `density` no `configChanges` da Activity principal (config plugin), testado mudando a fonte com o app aberto | Passo 1 |
| AP4: instalações pelo `adb` recusadas pela verificação de desenvolvedor | Investigar se dá para registrar os pacotes `.dev` e `.preview` no Play Console; registrar o resultado no `NOTAS-APP.md` |

### 5.13 Testes
- **Kotlin:** testes JUnit das regras (5.2), da borda do dia e do agendamento, com os **vetores compartilhados**. Rodar localmente; no CI, se for viável sem build nativo completo (registrar a decisão).
- **Jest:** importação idempotente de eventos, montagem da configuração, emergência, telas novas; os mesmos vetores.
- **Mutação de controle** nos casos principais, como nas fases anteriores.
- **Maestro:** o que der para automatizar dentro do app (emergência pelo Início, tela de permissões, ferramentas de teste). A tela de interrupção sobre outros apps e as notificações ficam no roteiro manual.
- **Bateria (sanidade):** algumas horas de uso normal com o serviço ligado, medindo com `dumpsys batterystats`, para conferir que não piorou em relação ao protótipo. A medição oficial é da Fase 8.

---

## 6. Ordem de execução

1. **Base nativa:** criar `modules/monitoring-android/` a partir do protótipo (sem VPN), serviço, receptor de boot, `fontScale` no `configChanges`, manifesto com a lista de permitidas. Investigar o AP4.
2. **Configuração e eventos:** `configure`, persistência em disco, eventos com identificador, importação idempotente no JS, migração 005.
3. **Regras do momento:** máquina de estados da seção 5.2 no Kotlin, com vetores compartilhados e JUnit; borda do dia.
4. **Tela de interrupção:** sobreposição e reserva, visibilidade, recuo, voltar preditivo.
5. **Notificações:** canais, check-in com ações, preventivas, recomeço, limite de 6, proteção pausada.
6. **Emergência:** rota, fluxo e sessões.
7. **Permissões reais, vigilância e estado do monitoramento**, mais o Início com os minutos reais.
8. **Ferramentas de teste**, Maestro e roteiro manual (seção 7).

Uma branch e um PR por passo, como nas fases anteriores. Se um passo ficar grande, dividir em partes, como no passo 4 da Fase 3.

---

## 7. Roteiro de verificação manual (no S22)

Com as ferramentas de teste (5.10) para encurtar os tempos.

| # | Roteiro | Esperado |
|---|---|---|
| M1 | Conceder as três permissões pelo onboarding | Cada uma abre a tela certa; ao voltar, aparece como permitida; a notificação permanente surge |
| M2 | Limite de 1 min somado entre Instagram e YouTube; usar 30 s em cada | Notificação de limite e, continuando, tela de interrupção sobre o app |
| M3 | "Ir para a tela inicial" | Volta à tela inicial; reabrir o app gera nova tela |
| M4 | "Continuar" três vezes | Pausa de 5 min a cada vez; aviso antes do 3º; depois do 3º, nenhum alerta; Início mostra o dia reprovado (streak 0) |
| M5 | Outro dia (ou estado zerado): três telas e "Ignorar o limite por hoje" | Botão só a partir da 3ª tela; dia reprovado; nenhum alerta depois |
| M6 | App de risco declarado (Reddit) com 1 min | Notificação e tela sem "Ignorar"; o 3º "Continuar" encerra as telas sem recaída |
| M7 | App de risco não declarado (X) com 1 min | Só notificação |
| M8 | X nas duas listas | Uma tela só, da compulsão que disparou primeiro |
| M9 | "Emergência" na tela de interrupção | Abre o app na emergência; respiração, cronômetro, "pular" e "A vontade passou?" |
| M10 | Notificação de check-in com o app fechado → "Tive uma recaída" | Sem abrir o app; ao abrir, recaída de hoje registrada e streak 0 |
| M11 | Check-in respondido no app antes do horário | Nenhuma notificação de check-in no dia |
| M12 | Preventiva disparada pela ferramenta | Texto com a emoção; tela bloqueada mostra só a versão neutra |
| M13 | Recomeço disparado pela ferramenta depois de uma quebra | Uma notificação; nenhuma se a streak era 0 |
| M14 | Reiniciar o S22 | Depois do desbloqueio e de alguns minutos, o monitoramento volta sozinho e os agendamentos continuam |
| M15 | Revogar o acesso ao uso nos Ajustes | Notificação de proteção pausada e aviso no Início; a tela de estado mostra o que fazer |
| M16 | Mudar o tamanho da fonte com o app aberto | O app não recria a tela nem mostra erro |
| M17 | Voltar preditivo ligado, gesto de voltar na tela de interrupção | A tela não fecha sem uma escolha |
| M18 | Tema escuro e fonte no máximo na tela de interrupção e na emergência | Tudo legível, sem corte |
| M19 | Ler todos os textos novos | Português correto, tom acolhedor, nenhum termo explícito, inclusive na tela de interrupção |

---

## 8. Critérios de aceite

- [ ] Módulo `monitoring-android` sem VPN, com as correções do doc 02 (4.1), substituindo o falso no Android.
- [ ] Regras da seção 5.2 no Kotlin, com vetores compartilhados passando em JUnit e Jest, e mutação de controle.
- [ ] Tela de interrupção com visibilidade conferida, recuo, reserva e voltar preditivo.
- [ ] Notificações de check-in (com ações), preventivas, recomeço e proteção pausada, dentro do limite de 6, sem alarme exato.
- [ ] Emergência completa, com sessões no banco.
- [ ] Eventos importados de forma idempotente; migração 005 testada em Jest e no aparelho sobre banco existente.
- [ ] Permissões reais, vigilância, tela de estado e modo degradado.
- [ ] Sobrevive a fechar o app, à morte do processo e ao reinício (M14).
- [ ] Manifesto só com as permissões da lista permitida.
- [ ] Ferramentas de teste ausentes em prévia e produção.
- [ ] Pendências herdadas resolvidas (5.12), com o resultado do AP4 registrado.
- [ ] Roteiro M1 a M19 executado com o responsável.
- [ ] `lint`, `typecheck` e `test` no CI; `NOTAS-APP.md` atualizado.

---

## 9. Instruções para o Claude Code

- Ler o `CLAUDE.md`, esta spec, o relatório de viabilidade (seções 6.2, 7 e 9.6) e o `prototype/NOTAS.md` antes do passo 1.
- **Consultar a documentação oficial atual** do Android (serviço em primeiro plano, `UsageStatsManager`, sobreposição, notificações, agendamento, boot) e as políticas do Google Play antes de cada passo nativo.
- Bibliotecas com código nativo e qualquer permissão nova exigem explicação e confirmação.
- Textos listados no PR para revisão do responsável.
- Não alterar `docs/01`, `docs/02` nem as specs. Divergências vão para o `NOTAS-APP.md` e para o chat de planejamento.
- Responder **sempre em português** (CLAUDE.md, seção 4).
- Nunca afirmar que algo funciona sem evidência.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 07/11/2026 | Primeira versão |
