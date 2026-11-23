# NOTAS-APP — diário técnico do app definitivo

Decisões, problemas, tentativas e comandos do app da Fase 2 em diante. O diário
do protótipo continua em `prototype/NOTAS.md`.

---

## Onde paramos (22/11/2026)

- **Fase 4 concluída e revisada** (PRs #21 a #33); documentos fechados no planejamento
  (PR #34: doc 01 v0.11, doc 02 v0.9, spec 03 v0.3, relatório 01 v0.5).
- **Fase 5 (spec 04 v0.2):** leitura e decisões integradas (PR #35). Seção "Fase 5 ·
  Leitura da spec 04".
- **Passo 1 (catálogo)** integrado (PR #36). Seção
  "Fase 5 · Passo 1 · Catálogo" (migração: uma por passo, decidido em 22/11). Passo 2
  (hospedagem no Cloudflare R2) pronto na branch `fase5/hospedagem`, para revisão: catálogo e
  vídeos de teste publicados no R2, desenvolvimento e prévia no `r2.dev`, produção impedida de
  usar o `r2.dev`. Próximo: passo 3.
- **Pendências para a Fase 8 (teste fechado):** chamada pela internet (Teams) com a tela de
  interrupção aberta e a medição oficial de bateria num build de loja.

### Histórico até 09/11/2026

- **Fase 3 encerrada:** passos 1 a 7 integrados na `main` (PRs #12 a #20).
- **Fase 4 (spec 03 v0.2):** documentos e decisões da leitura da spec
  integrados (PR #21). Seção "Fase 4 · Leitura da spec 03".
- **Passo 1 (base nativa)** integrado (PR #22). Seção "Fase 4 · Passo 1".
- **Passo 2 (configuração e eventos)** integrado (PR #23). Seção "Fase 4 · Passo 2".
- **Passo 3 (regras do momento)** integrado (PR #24). Seção "Fase 4 · Passo 3".
- **Passo 4 (tela de interrupção)** integrado (PR #25). M20 (chamada) pendente para o
  roteiro.
- **Passo 5 (notificações)** integrado (PR #26). Seção "Fase 4 · Passo 5".
- **Passo 6 (emergência)** integrado (PR #27). Seção "Fase 4 · Passo 6".
- **Passo 7 (permissões reais, vigilância e estado)** integrado (PR #28). Seção "Fase 4 ·
  Passo 7". O ajuste do aviso do Início foi em PR próprio, porque o #28 já estava
  integrado (PR #29).
- **Passo 8 (ferramentas, Maestro e roteiro):** **Bloco 0 concluído**, no PR #30 (branch
  `fase4/roteiro`), com CI verde, **aguardando o merge do responsável**. Seção "Fase 4 ·
  Passo 8", com as decisões e o resultado.

### Retomada (atualizada em 22/11/2026): fase pronta para revisão

**Bateria lida em 22/11 às 17:44: ok** (resultado em "Bateria (Bloco 7, último item)",
abaixo). As duas ressalvas foram decididas pelo responsável em 22/11 (tabela de critérios,
abaixo). Próximo passo: revisão da Fase 4 no chat de planejamento (CLAUDE.md, seção 11).

### Retomada anterior (21/11/2026, 18:50): faltava só ler a bateria

**Roteiro concluído, menos a leitura da bateria e a chamada pelo Teams.** PR da parte 2 aberto.

### Sessão de 21/11/2026 (parte 2 do roteiro, branch `fase4/roteiro-parte2`)

**Fila do nativo lida às 14:06, antes de abrir o app:**

- Check-in de 20/11 às 21:59:17, removido à meia-noite; preventiva de 21/11 às 05:15:40.
- A preventiva saiu com o aparelho bloqueado e, às 14:06, estava na barra **completa**, com
  "Emergência" e o horário original (05:15): a troca no desbloqueio funcionou. A aparência
  dela bloqueada só foi vista no teste do M12, abaixo.
- **Recomeço natural (dia de vídeos reprovado em 20/11): saiu às 14:02:52, no segundo
  desbloqueio, não no primeiro.** O `batterystats` mostra o Quedo marcado como inativo
  (`pkginactive`) às 09:38 e o aparelho em economia profunda; o alarme das 9h ficou adiado.
  No primeiro desbloqueio (14:01:34), `restartWaiting` ainda era falso, porque o alarme não
  tinha rodado, e a tela apagou 9 s depois. No segundo (14:02:45), o recomeço saiu em 7 s.
- **Correção:** no desbloqueio (`ACTION_USER_PRESENT`), o serviço agora roda
  `NotificationCenter.onUnlock`, que confere na hora tudo o que já venceu (o mesmo `run`
  do alarme) e troca as neutras. Sem regra nova: o `run` já é testado em JUnit. Repetir o
  cenário no aparelho exige uma quebra com streak, um dia, economia profunda e o desbloqueio
  depois das 9h; fica para observar no uso.

**Lacuna achada no M12 e corrigida:** um aviso que chega com o celular em uso (o de limite)
saía completo e continuava completo depois de bloquear. Agora, quando a tela apaga
(`ACTION_SCREEN_OFF`), o serviço troca pela neutra, em silêncio, as completas que estão na
barra (`Notifier.hideVisible`). O guardado em disco passou a registrar toda notificação
publicada e se está neutra (`PostedNotifications`). JUnit 78; 9 mutações derrubam testes.

**M12 no S22 (21/11): ok.**

- Aviso de limite publicado com o celular em uso; ao apagar a tela, virou "Quedo / Você tem um
  lembrete.", sem botões (lido no S22: `held=true`).
- Check-in (14:40:53) e preventiva da faixa das 15:10 (15:15:39, com a motivação) chegaram
  com o S22 bloqueado e apareceram neutros, sem botões.
- No desbloqueio, os três viraram os completos, com os botões e o horário original, sem tocar
  de novo (confirmado pelo responsável).
- Na primeira tentativa a faixa das 14:40 não foi gravada (faltou "Salvar" nos Gatilhos);
  repetido com a das 15:10.

**Bloco 5 (21/11):**

- **M15: ok.** Acesso ao uso desligado nos Ajustes: notificação "Proteção pausada", aviso
  "Proteção pausada" no Início e "Parado: falta permitir o acesso a dados de uso" na tela de
  permissões; serviço parado.
- **Notificação que chega bloqueada, sem o serviço: comportamento aceito, como o responsável
  esperava.** Preventiva das 15:45 com o S22 bloqueado e sem o acesso ao uso: neutra na tela
  bloqueada, **continuou neutra depois do desbloqueio** (nada percebe o desbloqueio sem o
  serviço; lido no S22: `held=true`) e virou a completa ao abrir o app.
- **Diferença encontrada:** sem o serviço, as notificações que chegam com o celular em uso
  (a "Proteção pausada", o aviso de limite, o check-in respondido depois) ficam completas e
  aparecem completas na tela bloqueada, porque nada as troca quando a tela apaga. Opções
  levadas ao responsável.
- **Serviço parado com o app fechado: ok.** "Parar só o serviço" com a faixa das 17:10 já
  salva e o app fechado na hora (antes, o próprio app religava o serviço ao ficar na tela, e
  a primeira tentativa não parou). No alarme, às 17:15:40, a vigilância mandou "Proteção
  pausada" com o motivo `service_stopped`, junto com a preventiva.
- **Decisão do responsável (21/11, opção 1 de 3): a versão completa de toda notificação do
  Quedo é secreta (`VISIBILITY_SECRET`); na tela bloqueada só aparece a neutra
  (`VISIBILITY_PUBLIC`).** Com o serviço, a completa vira neutra ao apagar a tela; sem ele, a
  completa só some da tela bloqueada e continua na barra depois do desbloqueio. A regra está
  em `NotificationHold.lockScreen`, com JUnit (80 testes) e mutação. **O planejamento
  atualiza a spec 03 (5.4, "versão pública neutra") no fechamento da fase.** As opções
  recusadas: neutra sempre sem o serviço (perde texto e botões até abrir o app) e aceitar.
- **Marcação secreta no S22 (21/11): ok.** Aviso de limite, check-in e preventiva disparados
  pela ferramenta com o celular em uso, depois o S22 bloqueado:
  - **com o serviço:** na tela bloqueada só as neutras; no desbloqueio, as completas, com os
    botões, sem tocar de novo; lido no S22: as completas com `vis=SECRET`;
  - **sem o serviço** (acesso ao uso desligado): na tela bloqueada as três não apareceram; no
    desbloqueio estavam na barra, completas e com os botões (`vis=SECRET`).
  Nenhuma versão completa apareceu na tela bloqueada nos dois casos (responsável).

**Bloco 6 (21/11): M20 no emulador `lab_android16` (API 36, x86_64): ok.**

- O mesmo APK de desenvolvimento (tem as bibliotecas x86_64) instalado no emulador; onboarding
  pelo Maestro (só vídeos curtos, com o YouTube) e a sobreposição concedida pelo responsável.
- Tela de interrupção aberta por "Mostrar a tela de interrupção"; `adb emu gsm call 5551234`
  às 17:42:29. Em 5 s, com o áudio em `MODE_RINGTONE`, a janela da tela de pausa sumiu (4
  janelas do Quedo fora da atividade antes, 0 depois) e o aviso de chamada ficou por cima,
  sem nada cobrindo.
- **Chamada pela internet (Teams no S22): não testada**, por falta de uma segunda pessoa
  para ligar. O código usa o mesmo sinal (`MODE_IN_COMMUNICATION` no modo de áudio).
- Cuidados para o emulador: o Maestro precisou de uma segunda tentativa (erro de
  comunicação), e o menu do dev client fica aberto por cima do app na primeira abertura
  (fechar com "Close").

**Bloco 8 (21/11): prévia ok; produção em andamento.**

- **Build de prévia** (`APP_ENV=preview`, `prebuild --clean` e `assembleRelease`, 13 min):
  pacote `br.com.quedo.app.preview`, não depurável. **`check:manifest` (lista de proibidas e
  de permitidas) passou nos três manifestos mesclados do release.**
- **Ferramentas ausentes:** o Perfil da prévia não tem "Monitoramento (base)" nem
  "Componentes" (responsável). As funções `debug*` do nativo também não fazem nada, porque o
  build não é depurável (`FLAG_DEBUGGABLE`).
- **Tela acesa:** com o tempo de tela do S22 em 30 s, a tela não apagou no minuto da
  respiração nem em mais 1 minuto do cronômetro (responsável).
- **Abertura a frio:** com o processo encerrado, `quedo-preview:///emergency?source=notification`
  abriu direto na emergência (`LaunchState: COLD`, 171 ms).
- O app de prévia foi desinstalado depois do teste, com aviso ao responsável, para não
  pesar na medição de bateria.
- O `adb` travou de novo na instalação do APK da prévia (AP3); reiniciado.

**Bloco 8 (21/11): produção ok.** `APP_ENV=production`, `assembleRelease` (14 min), pacote
`br.com.quedo.app`; `check:manifest` passou nos três manifestos mesclados do release. Não
instalado. Depois, `prebuild --clean` de desenvolvimento: a pasta `android/` voltou a
`br.com.quedo.app.dev`. As ferramentas de teste ausentes foram vistas só na prévia; a
produção usa o mesmo caminho (não depurável e `variant.environment` diferente de
`development`).

**Bateria (Bloco 7, último item): medição começada.** Em 21/11 às 18:43, com o S22 no
cabo, em 81% e o serviço ligado: `dumpsys batterystats --reset`. Antes, com o responsável:
limite de teste desligado, limite de vídeos em 60 a partir de 22/11 (30 em 21/11), só a faixa
das 05:00, check-in às 21:00 e o app de prévia desinstalado. O responsável usa o S22
normalmente no fim de semana, sem abrir o Quedo Dev.

**Para ler a bateria na retomada:** S22 no cabo; `adb shell dumpsys batterystats
br.com.quedo.app.dev` (consumo estimado do app, alarmes, wakelocks e tempo do serviço) e o
resumo geral de `dumpsys batterystats` desde 18:43 de 21/11. Comparar com o protótipo
(0,16% do consumo num dia de uso leve, T6). A medição oficial é da Fase 8.

**Bateria: resultado (lido em 22/11 às 17:44, com o S22 de volta ao cabo).**

- **Janela:** 22h53 fora do cabo (de 21/11, ~18:50, a 22/11, 17:44), economia de energia
  ligada o tempo todo, 35 min de tela (13 vezes), 96,9% em Doze profundo. O aparelho gastou
  673 mAh (81% para 61%). Dia leve, como o T6 do protótipo (29 min de tela).
- **Quedo Dev (UID 10516): 1,73 mAh, 0,26% do consumo do aparelho.** Por dia, ~1,8 mAh, ou
  0,05% da bateria de 3700 mAh. Fora a tela (0,07 mAh, de 1,5 s com o app à frente), 1,66 mAh.
  - Com a tela acesa: 1,09 mAh (a hora em que a verificação importa); com ela apagada:
    0,52 mAh em 22h18.
  - CPU: 47 s na janela (31 s de usuário e 16 s de sistema), ciclo de trabalho de ~0,06%.
  - Wakelocks próprios: só o do alarme (16 ms, duas vezes). Os 667 ms de
    `NotificationManagerService:post` são do sistema publicando as notificações (7 vezes),
    cobrados do app. Sensor: 0,8 s (só com o app aberto); nada do acelerômetro do A9.
- **Comparação com o protótipo (relatório 01, seção 6.1, T6):** 1,09 mAh fora a tela em
  21h59 (0,15% do consumo, 1,2 mAh por dia), com o serviço e a VPN. Agora, sem a VPN e com
  as notificações, os alarmes e as regras do momento, 1,66 mAh fora a tela em 22h53: **cerca
  de 0,5 mAh por dia a mais**, ainda desprezível. **Não piorou de forma relevante.**
- **De onde vem a maior parte, provavelmente:** o build de desenvolvimento, sem o Metro, fica
  tentando reconectar (P8 do protótipo). Contadores por thread do processo (vivo desde 21/11
  às 17:31, então incluem 1h12 antes da medição, com o app em uso): a thread da verificação
  (`quedo-monitoring`) gastou 8,5 s de CPU no total; as duas do `OkHttp Dispatcher`, usadas
  na conexão com o Metro, 39,7 s. A conta só dá teto, porque não separa o antes e o depois
  do reset, mas indica que a verificação em si é a parte menor. Um número limpo exige o build
  de loja (Fase 8).
- **Nenhuma falha:** o serviço em primeiro plano rodou a janela inteira sem recomeçar (uma
  entrada, ainda `running`; `serviceStartedAt` em 21/11 às 17:32); o processo não morreu
  (24h13 de vida). Os dois alarmes rodaram (21h e 5h); a preventiva da faixa das 05:00 saiu
  às 05:15:40, dentro da janela inexata. O check-in de 21/11 já tinha saído às 14:40 (teste
  do M12), por isso o alarme das 21h não mandou outro.
- **Conclusão: aceitável para a sanidade da spec (5.13).**

**Jest no fechamento (22/11):** a primeira execução, logo depois de atualizar a `main` e com o
cache frio, terminou em 64 s com 5 suítes falhando; as duas seguintes, sem mudar nada,
passaram inteiras (784 testes, 17 s). Esta branch só muda documentação. As falhas não foram
capturadas; se voltarem, rodar `npm test -- --runInBand` e registrar quais suítes caem.

## Fechamento da Fase 4: critérios de aceite e roteiro (21 e 22/11/2026)

O pedido citou a "seção 7"; na spec 03, a seção 7 é o roteiro M1 a M20 e a seção 8 são os
critérios de aceite. Seguem os dois.

### Critérios de aceite (spec 03, seção 8)

| Critério | Situação | Evidência |
|---|---|---|
| Módulo `monitoring-android` sem VPN, com as correções do doc 02 (4.1), substituindo o falso | ok | Passos 1 e 7 (PRs #22 e #28); `check:manifest` sem as permissões da VPN; `getMonitoring()` nativo no Android |
| Regras 5.2 no Kotlin, vetores em JUnit e Jest, mutação | ok | Passo 3 (PR #24); `moment-rules.json` nos dois lados; mutações registradas no passo 3 |
| Tela de interrupção: visibilidade, recuo, reserva, voltar preditivo | ok | Passo 4 (PR #25): reserva I-25 com o `labtarget`; M17 em 08/11; M2, M3 e M20 no roteiro |
| Notificações: check-in com ações, preventivas, recomeço, proteção pausada, limite de 6, sem alarme exato | ok | Passo 5 (PR #26); roteiro M10 a M13 e Bloco 7; `check:manifest` sem `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`; tela bloqueada corrigida (M12, secreta) |
| Emergência completa, com sessões no banco | ok | Passo 6 (PR #27); M9 em 20/11 com as sessões no banco |
| Eventos idempotentes; migração 005 em Jest e no aparelho | ok | Passo 2 (PR #23): Jest e, no S22, as 5 migrações sobre o banco com dados |
| Permissões reais, vigilância, tela de estado, modo degradado | ok | Passo 7 (PR #28); M1 (11/11), M15 (08/11 e 21/11), serviço parado com o app fechado (21/11) |
| Sobrevive a fechar o app, à morte do processo e ao reinício (M14) | ok | `kill -9` no passo 2; serviço recriado pelo Android em 14/11; M14 em 15 e 16/11 |
| Manifesto só com as permissões da lista | ok | `check:manifest` em desenvolvimento, prévia e produção (21/11) |
| Ferramentas de teste ausentes em prévia e produção | ok (decisão do responsável, 22/11) | Prévia instalada e vista no S22 (21/11): sem as ferramentas no Perfil e `debug*` inertes (não depurável); produção: build de release com `check:manifest` ok (21/11), mesmo caminho de código da prévia, sem instalar. O responsável aceitou essa evidência como suficiente |
| Pendências herdadas (5.12) e AP4 registrado | ok | Voltar preditivo (M17), borda do dia (vetores), limites e app nas duas listas (passo 3 e M8), `fontScale` (M16), AP4 (seção "AP4: resultado da investigação") |
| Roteiro M1 a M20 com o responsável | ok, com uma pendência para a Fase 8 | Tabela abaixo; chamada pela internet (Teams) fica para o teste fechado (decisão do responsável, 22/11) |
| `lint`, `typecheck` e `test` no CI; `NOTAS-APP.md` atualizado | ok | CI verde nos PRs #22 a #32; este registro |
| Bateria, sanidade (5.13) | ok | 22h53 fora do cabo (21 e 22/11): 1,73 mAh, 0,26% do consumo do aparelho, ~1,8 mAh por dia, sem falhas; ~0,5 mAh por dia a mais que o T6 do protótipo, ainda desprezível. Detalhes em "Bateria: resultado", acima. A medição oficial é da Fase 8 |

**Pendências para a Fase 8 (teste fechado), decididas pelo responsável em 22/11:**

- **Chamada pela internet (Teams)** com a tela de interrupção aberta: a tela deve sumir e
  deixar a chamada por cima, como no M20 do emulador. O código usa o mesmo sinal
  (`MODE_IN_COMMUNICATION`), mas isso não foi visto no aparelho.
- **Medição oficial de bateria** num build de loja, sem o cliente de desenvolvimento, e num
  dia de uso pesado (relatório 01, seção 6.1).

### Roteiro M1 a M20 (spec 03, seção 7)

| Item | Resultado | Quando |
|---|---|---|
| M1 permissões pelo onboarding | ok | 11/11 |
| M2 limite somado | ok | 20/11 |
| M3 "Ir para a tela inicial" | ok | 20/11 |
| M4 "Continuar" três vezes | ok | 20/11 |
| M5 "Ignorar o limite por hoje" | ok | 20/11 |
| M6 app de risco declarado | ok | 20/11 |
| M7 app de risco não declarado | ok | 20/11 |
| M8 app nas duas listas (e completo, depois do M4) | ok | 20/11 |
| M9 emergência pela tela | ok | 20/11 (e passo 6) |
| M10 "Tive uma recaída" pela notificação | ok depois da correção do Início | 12/11 (falhou na tela), 15/11 (ok) |
| M11 check-in respondido antes | ok | 15/11 |
| M12 tela bloqueada | ok depois de duas correções | 20/11 (falhou), 21/11 (ok, com e sem o serviço) |
| M13 recomeço | ok pela ferramenta; a regra de streak 0 só em Jest | 20/11 |
| M14 reinício | ok | 15 e 16/11 |
| M15 acesso ao uso revogado | ok | 08/11 e 21/11 |
| M16 fonte com o app aberto | ok | 07/11 |
| M17 voltar preditivo | ok | 08/11 (build temporário) |
| M18 tema escuro e fonte máxima | ok | 08/11 (tela de pausa) e 20/11 (emergência) |
| M19 textos | ok | Aprovados nos PRs; tela de pausa em 20/11 |
| M20 chamada | ok no emulador; Teams fica para a Fase 8 | 21/11 |

### Para o planejamento atualizar na spec 03

- **5.4, versão pública:** a completa é secreta (nunca aparece na tela bloqueada) e a neutra
  aparece no lugar, também quando a tela apaga com o serviço ligado (decisões de 20 e 21/11).
- **5.4, recomeço:** se o celular não for desbloqueado no dia seguinte inteiro, o recomeço
  expira à meia-noite (decisão de 14/11).
- **5.4, recomeço no desbloqueio:** o desbloqueio confere na hora o que venceu, porque em
  economia profunda o alarme das 9h pode estar adiado (21/11).

### Retomada (atualizada em 20/11/2026, 20:30): próximo passo, em 21/11

**Feito em 20/11 (detalhes em "Sessão de 20/11/2026", abaixo):** Blocos 2 e 3 completos;
Bloco 4 com M13 e o "ontem sem recomeço" ok e o M12 corrigido no código, ainda sem teste no
aparelho; teste da decisão de 14/11 no JUnit. PR aberto com o que já estava pronto.

**Em 21/11, nesta ordem:**

1. **Antes de abrir o app:** ler a fila do nativo. O dia de vídeos reprovado em 20/11 (streak
   de vários dias) deve ter gerado um recomeço no primeiro desbloqueio depois das 9h.
2. **M12 com a correção:** check-in 10 minutos à frente, S22 bloqueado; a notificação deve
   aparecer só como "Quedo / Você tem um lembrete.", sem botões; no desbloqueio, vira
   "Como foi hoje?" com os botões, sem tocar de novo.
3. **Bloco 5:** M15 de novo e serviço parado com o app fechado ("Parar só o serviço" e
   esperar um alarme).
4. **Bloco 6:** M20 no emulador `lab_android16` (`adb emu gsm call`) e, se houver uma segunda
   pessoa, pelo Teams. **Antes do Bloco 8**, porque precisa do build de desenvolvimento.
5. **Bloco 8:** builds de prévia e de produção (o `prebuild --clean` refaz a pasta
   `android/`); ferramentas ausentes, tela acesa, abertura a frio e `check:manifest` nos dois.
   No fim, **desinstalar o app de prévia** (avisar: apaga os dados dele) e refazer o
   `prebuild` de desenvolvimento.
6. **Bateria por último:** limite de teste desligado (já está), limite de vídeos de volta a 60
   (hoje está em 30 a partir de 21/11), `batterystats --reset` no cabo e uso normal fora dele.

**Estado do S22 ao encerrar 20/11:** build com a correção do M12 instalado; limite de teste
desligado; check-in às 21:45; limite de vídeos de 5 min só em 20/11 e 30 min daí em diante;
o X está nas duas listas e declarado.

### Retomada anterior (16/11/2026, 23:46)

**Bloco 7 concluído, menos a bateria.** Lido em 16/11 às 23:45, antes de abrir o app:

- **M14: ok.** A preventiva das 5h, agendada antes do reinício de 15/11, saiu às 05:12:02.
- **Recomeço esperando o desbloqueio: ok.** O S22 ficou com a tela apagada o dia todo. O
  primeiro desbloqueio foi às 23:44:19 (`usagestats`), e o recomeço saiu às 23:44:20.
- O check-in das 21:45 saiu às 21:54:35, sem resposta, e é removido à meia-noite.

**Próximo passo, em outro dia por decisão do responsável:** bateria (zerar o
`batterystats` no cabo e algumas horas de uso fora dele, sem abrir o Quedo) e os Blocos 2 a
6 e 8. Detalhes na seção "Retomada em 11/11/2026" e seguintes, logo abaixo.

**Sessão de 20/11/2026: Bloco 2 no S22 (tudo ok, com evidência no nativo e no banco):**

- **Teste da decisão de 14/11:** `restartWaitingAllDayExpiresAtMidnight` (JUnit). O
  recomeço que esperou o dia todo expira à meia-noite e não é reenviado, nem com a
  configuração antiga do JS. Três mutações derrubam o teste.
- **M2:** limite somado entre Instagram e YouTube; aviso e tela sobre o YouTube.
- **M3:** "Ir para a tela inicial" e nova tela ao reabrir.
- **M9:** emergência pela tela de pausa (respiração inteira, cronômetro, "Pular", "Ainda
  não") e pelo Início ("Pular" na motivação leva à pergunta, "Sim"). Duas sessões no banco.
- **M7:** X não declarado, só o aviso de app de risco.
- **M8:** X nas duas listas; uma tela só, a dos vídeos, que estourou primeiro.
- **M4:** três "Continuar", aviso de última vez, dia de vídeos reprovado (`third_continue`).
- **M8 completo:** com os vídeos encerrados, o X, já declarado, mostrou a tela do conteúdo
  adulto.
- **M6:** Reddit declarado, tela sem "Ignorar"; o 3º "Continuar" encerrou as telas sem
  recaída e sem dia reprovado.
- **M5:** depois de "Zerar o estado de hoje", "Ignorar" só na 3ª tela; dia reprovado.
- **Limite maior depois de estourar:** limite real em 5 min, tela; aumento para 30 com a
  mensagem de amanhã; a tela continuou com o limite de hoje (`limitToday` 5).
- **M19:** textos da tela de pausa aprovados pelo responsável.
- **Atenção para a bateria:** o limite de vídeos ficou em 30 min a partir de 21/11.

**Bloco 3 (20/11):** M18 na emergência com fonte no máximo (`font_scale` 2.0) e "Remover
animações" (escalas em 0): tudo legível, confirmado pelo responsável. Os ajustes voltaram
(animações em 1; fonte em 1.3, escolha do responsável).

**Bloco 4 (20/11):**

- **M12 falhou: o texto completo aparece na tela bloqueada.** O S22 está em "mostrar
  conteúdo" (`lock_screen_allow_private_notifications=1`), e com isso o Android ignora o
  `setPublicVersion` do `VISIBILITY_PRIVATE`. O responsável viu, bloqueado, "Você chegou ao
  tempo que definiu para hoje." em vez de "Quedo / Você tem um lembrete.". A preventiva
  (sentimento e motivação) e o check-in ("Tive uma recaída") também ficariam expostos.
- **Decisão do responsável (opção 1 de 3):** com o aparelho bloqueado, o app publica a versão
  neutra como conteúdo principal, sem ações, e troca pela completa depois do desbloqueio
  (verificação do serviço ou abertura do app). As outras opções eram esconder as notificações
  da tela bloqueada (foge da spec) ou manter e registrar.
- **M13: ok** pela ferramenta: uma notificação "Um novo dia", texto conferido. A regra
  "nenhuma se a streak era 0" só tem teste automatizado; a ferramenta dispara sempre. A
  preventiva da ferramenta também chegou (na etapa do M12 ela não tinha sido publicada).
- Recaída registrada hoje para ontem sem recomeço: já feito em 11/11.
- O dia de vídeos reprovado em 20/11, com streak, deve gerar um recomeço natural em 21/11.

**Correção do M12 (20/11, ainda sem teste no aparelho):**

- `NotificationHold.kt`: com o aparelho bloqueado (`isKeyguardLocked`), toda notificação
  (menos a permanente) sai com o título e o texto da versão pública e sem ações, e guarda
  em disco como refazer a completa (`quedo-monitoring-held`).
- A troca pela completa acontece no desbloqueio (`ACTION_USER_PRESENT`, registrado pelo
  serviço), a cada verificação do serviço e quando o app manda configuração. Usa o mesmo
  id, o horário original e `setOnlyAlertOnce`, para não tocar de novo. A que saiu da barra
  é esquecida e não volta.
- Sem o serviço (sem o acesso ao uso), a neutra só vira completa quando o app é aberto.
- JUnit: 76 (7 novos); 6 mutações derrubam testes; manifesto sem permissão nova.
- **Para testar:** bloquear, disparar pela ferramenta (com atraso) ou esperar um aviso real;
  conferir a neutra na tela bloqueada; desbloquear e conferir a completa, com as ações.

**Ao retomar:** subir o Metro com o vigia (ele caiu com o fim da sessão de sábado) e fazer o
`adb reverse tcp:8081 tcp:8081`.

### Retomada anterior: o próximo passo era o Bloco 1

Sessão encerrada em 09/11/2026, sem nenhuma tarefa rodando no computador.

**Estado do S22:** build de desenvolvimento com o código do PR #30. Dados apagados, app nas
boas-vindas. Acesso ao uso e sobreposição continuam concedidos; notificações, não. Nada foi
desinstalado.

**Para retomar:** conectar o S22, `adb devices`, voltar à `main` com `git pull` se o PR #30
já estiver integrado, subir o Metro (`npx expo start --dev-client --port 8081`) e fazer o
`adb reverse tcp:8081 tcp:8081`.

**O que falta em cada bloco:**

| Bloco | O que falta | O que exige do responsável |
|---|---|---|
| 1 · App zerado | **Começa desinstalando e reinstalando o app de desenvolvimento**, para ficar sem permissões. Depois: "Ative o acompanhamento" e "Agora não"; conferir a lista recolhida, a busca e a ordem; M1 e a janela do sistema das notificações | Onboarding duas vezes. Na segunda, Instagram e YouTube na moderação, Reddit e X como risco, pelo menos 1 dia sem recair |
| 2 · Limite de 1 minuto | M2, M3, M9 ("Pular", "Ainda não", "Pular" na motivação), M4, M8 completo depois do M4, M5, M6, M7, M8, limite maior salvo depois de estourar, M19 | Usar os apps. M4 e M6 levam pelo menos 15 min cada |
| 3 · Aparência | M18 na emergência, animações removidas | Fonte no máximo e remover animações nos Ajustes; desfazer depois |
| 4 · Tela bloqueada | M12, M13, recaída registrada hoje para ontem sem recomeço | PIN ou senha no S22 |
| 5 · Permissão e serviço | M15 de novo, serviço parado com o app fechado | Desligar e religar o acesso ao uso |
| 6 · Chamada | M20 no emulador `lab_android16` e pelo Teams | Segunda conta no Teams para ligar |
| 7 · Dois dias | Dia 1: M11, remoção à meia-noite (check-in às 23h30, sem responder), economia profunda (faixa perto das 5h, S22 parado e fora da tomada). Dia 2: bateria, M10, M14 com agendamentos. Manhã do Dia 3: recomeço esperando o desbloqueio depois das 9h | Mudar horários no Perfil; S22 fora da tomada à noite |
| 8 · Prévia e produção | Ferramentas ausentes, tela acesa, abertura a frio, `check:manifest` pela lista estrita nos builds de prévia e de produção | Onboarding e permissões no app de prévia |

M16, M17 e AP4 já feitos. Bloco 7 pode correr em paralelo aos outros. Ao final: critérios de
aceite da spec 03, seção 8, e aviso de fase pronta (CLAUDE.md, seção 11).

### Retomada em 11/11/2026: Bloco 1 e calendário do Bloco 7

PR #30 integrado. Branch `fase4/roteiro-final`, criada da `main`. Às 22:52 o app de
desenvolvimento foi desinstalado (autorizado pelo responsável) e reinstalado, sem
permissões.

**Bloco 1 em duas passadas, sem reinstalar de novo:** na primeira, "Agora não" nas três
permissões, dentro do app, o que não aciona a janela do sistema. Depois, "Apagar meus dados"
no Perfil volta ao onboarding com as permissões ainda nunca concedidas, e a segunda passada
é o M1.

**Calendário do Bloco 7.** Cada item depende do check-in de um dia diferente:

| Dia | O que entra |
|---|---|
| 11/11 (noite) | Recaída registrada hoje para ontem (item do Bloco 4); check-in às 23h45, sem responder; faixa 05h–06h para a preventiva; S22 fora da tomada e parado até de manhã |
| 12/11 (manhã) | Conferir: check-in removido à meia-noite, preventiva das 5h com o horário real de saída e **nenhum** recomeço |
| 12/11 | Bateria (zerar `batterystats` no cabo e algumas horas de uso fora dele); M10 com o check-in perto da hora e o app fechado; M14 reiniciando depois do M10 |
| 13/11 (manhã) | Recomeço esperando o desbloqueio: tela bloqueada até depois das 9h |
| 13/11 | M11 (check-in respondido no app antes da hora) |

**Bloco 1 concluído (11/11, confirmado pelo responsável):** passada 1 ("Agora não" nas três
permissões, "Ative o acompanhamento", "Agora não" escondendo o aviso e continuando
escondido ao reabrir, e a lista de apps nova: sugeridos no topo, "Ver outros apps", busca e
ordem) e passada 2 (M1: cada permissão abriu a tela certa, voltou como permitida, a janela
do sistema das notificações apareceu e a notificação permanente surgiu), tudo como descrito.

**Preparo da noite de 11/11, lido no S22 às 23:08:** as três permissões concedidas; serviço
ligado e notificação "Acompanhamento" na barra; recaída registrada para 10/11, com a base
da streak em 10/11 e nenhum recomeço agendado (`nativeRestartDays` vazio); check-in de 11/11
sem resposta e sem envio, com alarme às 23:45 (janela de 10 min); preventiva às 05:00, com o
sentimento "Tédio". Ao dormir, o responsável tira o cabo e deixa o S22 parado.

**Para conferir em 12/11, com o cabo:** se o check-in saiu e foi removido à meia-noite, a hora
real da preventiva (o alarme de economia profunda pode atrasar) e que não houve recomeço.
Sugestão: `adb shell dumpsys notification --noredact` e os eventos `notification_sent` da
fila do nativo, antes de abrir o app.

**Bloco 7, Dia 1: resultado (lido em 12/11, 22:43, antes de abrir o app):**

- **Check-in:** enviado às 23:54:21 de 11/11, dentro da janela de 10 minutos do alarme das
  23:45. Na manhã de 12/11 não estava mais na barra (id 1011 ausente; o responsável viu só a
  preventiva). **Remoção à meia-noite: ok.**
- **Preventiva da faixa das 05h:** enviada às 05:20:30, com o S22 fora da tomada e parado.
  **O atraso de 20 minutos em economia profunda está dentro do aceito pela spec (5.4).**
- **Recaída registrada hoje para ontem:** `restartSent` falso e `nativeRestartDays` vazio,
  sem notificação de recomeço. **Item do Bloco 4: ok.**
- Serviço ligado a noite toda (132 verificações), sem novo boot.

**Dia 2 replanejado:** o responsável conectou às 22:43 de 12/11, sem tempo para a bateria.
Por decisão dele, só o M10 fica para o check-in das 23:45 de 12/11. Novo calendário:

| Dia | O que entra |
|---|---|
| 12/11, quinta (noite) | M10 com o app fechado |
| 13/11, sexta | Sem computador; S22 em modo avião. **Às 9h, o S22 bloqueado**; o recomeço (agendado pela recaída do M10) deve sair no primeiro desbloqueio depois das 9h. O horário fica no evento `notification_sent` da fila do nativo, para ler no sábado sem abrir o app |
| 14/11, sábado | Ler os eventos de sexta antes de abrir o app; bateria; M11; Blocos 2 a 6 e 8; à noite, M14 reiniciando o S22 |
| 15/11, domingo (manhã) | Fim do M14: a preventiva das 5h, agendada antes do reinício, precisa sair |

**M10 (12/11, 23:55): passou no nativo e no banco, falhou na tela.**

- "Tive uma recaída" na notificação, com o app fechado: a notificação saiu da barra, o
  nativo marcou o check-in respondido e agendou o recomeço para 13/11.
- Ao abrir, o evento foi importado: o banco tem a recaída de 12/11 e o check-in de 12/11 com
  `source = notification`, às 23:55:42.
- **Defeito:** o Início continuou com "2 dias" e "Como foi hoje?", sem a recaída. O
  `HomeScreen` recarrega ao ganhar o foco e quando o app volta à frente, no mesmo instante em
  que a sincronização começa a importar. A leitura vence a importação, e o Início não escuta
  `dataChanges` para recarregar depois. Também afeta o usuário real: quem responde pela
  notificação e abre o app vê a contagem antiga até trocar de aba.
- **Para sábado:** o Início passar a recarregar depois de cada gravação (`dataChanges`), com
  teste que importa um evento depois do primeiro desenho da tela; repetir o M10 no aparelho.

**Sexta, 13/11, lida no sábado às 15:43 (antes de abrir o app):**

- Check-in enviado às 23:50:30 e removido à meia-noite; preventivas às 05:20:31 em 13/11 e
  em 14/11. Remoção e economia profunda repetiram o resultado da primeira noite.
- **O recomeço de 13/11 não saiu, e não é defeito:** o histórico de tela do `batterystats`
  mostra a tela desligada das 00:03 de 13/11 até a tarde de 14/11. Sem desbloqueio, o
  recomeço esperou e expirou à meia-noite (`nativeRestartDays` limpa os dias passados). O
  caminho "sai no primeiro desbloqueio depois das 9h" continua sem teste no aparelho.
- O `usagestats` só guardava os desbloqueios do dia; o histórico de tela do
  `dumpsys batterystats --history` (`+screen`/`-screen`) cobre os dias desde a última carga
  completa.
- **Ponto para o responsável:** a spec não diz o que fazer se o celular não for desbloqueado
  no dia seguinte inteiro. Hoje o recomeço se perde.

**Correção do M10 (14/11):** o `HomeScreen` agora também recarrega a cada gravação
(`dataChanges`). O teste novo importa um "Tive uma recaída" depois do primeiro desenho da
tela e falha sem a correção.

**Calendário a partir de 14/11:**

| Dia | O que entra |
|---|---|
| 14/11, sábado | M11; M10 de novo (check-in disparado pela ferramenta, respondido na notificação), que agenda o recomeço de domingo; Blocos 2 a 6 e 8; à noite, M14 reiniciando o S22 |
| 15/11, domingo (manhã) | Preventiva das 5h, agendada antes do reinício (fim do M14); **S22 bloqueado às 9h** e recomeço no primeiro desbloqueio depois disso; depois, bateria |

**Domingo, 15/11.** O Metro caiu com o fim da sessão de sábado e o teste não aconteceu; agora
ele sobe com um vigia que avisa se parar. A fila mostrou o check-in de sábado às 23:51, a
preventiva de domingo às 05:08 e o serviço religado sozinho pelo Android às 18:34 de sábado
(`origin=restart`).

- **M11: ok.** Check-in às 21:45, "Sem recaída" no app antes; até 21:55 nada chegou. O nativo
  tinha o dia respondido, sem envio, e o próximo alarme só à meia-noite.
- **M10 repetido: ok.** Check-in disparado pela ferramenta, app fechado, "Tive uma recaída"
  na notificação: a notificação saiu, o nativo agendou o recomeço para 16/11, e na abertura o
  Início já mostrou "0 dias", a mensagem de apoio e "Hoje: recaída registrada.", sem trocar
  de aba.
- **M14, primeira parte: ok.** Reinício às 22:03; em 3 minutos, `lastBootResult = started`, o
  serviço em primeiro plano com a notificação "Proteção ativa.", o evento
  `service_started origin=boot`, o recomeço de 16/11 preservado e o alarme da meia-noite
  agendado de novo.
- **Próximo:** fechar o M14 com o que foi agendado antes do reinício. Em 16/11, a preventiva das 5h e o recomeço
  no primeiro desbloqueio depois das 9h fecham o M14 e o recomeço esperando o desbloqueio.

O modo avião não afeta o roteiro: alarmes e notificações são locais. Na sexta, o check-in das
23:45 sai e fica sem resposta, o que só repete o teste da remoção à meia-noite.

O M11 saiu da noite de 11/11 porque, às 22:50, não havia tempo para ele e para a remoção à
meia-noite, que precisam de check-ins diferentes. Uma quebra da moderação no dia 11 não gera
recomeço, porque a streak começa em 0. No dia 12, uma quebra na moderação se junta à do M10
numa notificação só.

**Cuidados:**

- **M12 pode expor texto na tela bloqueada.** O S22 está com "mostrar conteúdo"
  (`lock_screen_allow_private_notifications=1`), e o `Notifier.kt` usa `VISIBILITY_PRIVATE`.
  Pelo comportamento documentado do Android, a versão neutra só vale com "ocultar conteúdo".
  Ainda não visto no aparelho. **Decisão do responsável: testar primeiro como está e, se
  vazar, trazer as opções antes de fechar a fase.**
- **Limite de teste ligado iguala todos os limites a 1 minuto.** O item "limite maior depois
  de estourar" precisa dos limites reais, com "Voltar aos limites reais".
- **M7 antes do M8:** o X precisa estar só na lista de risco no M7 e nas duas no M8.
- **"Zerar o estado de hoje" não mexe em notificações nem em check-ins**, e um recomeço já
  agendado pela reprovação continua agendado.
- **Instalar sempre com `npm run android:install`**, que tem limite de tempo. O `adb` travou
  duas vezes em 08/11 (AP3).
- **Subir o Metro depois do build** (AP5) e refazer o `adb reverse` depois de reinstalar.
- **Tarefas longas com vigia:** acusar saída parada e avisar o responsável.
- **Não gravar no banco do aparelho pelo `adb` sem avisar.** Desinstalar o app de
  desenvolvimento no Bloco 1 está previsto no roteiro, mas o responsável pediu para não
  fazer antes da retomada.
- O emulador `lab_android16` ainda não foi usado neste passo: conferir se o build roda nele.
- A DV2 continua aberta: levar a nota da recusa por tempo esgotado ao chat de planejamento.

---

## Regras do responsável para os testes no aparelho

- **Não gravar arquivos no banco do aparelho pelo `adb` sem avisar antes (08/11/2026).**
  Para preparar e limpar testes, preferir as ferramentas de teste do app (spec 03,
  seção 5.10), que podem ser adiantadas se for preciso. Ler o banco pelo `adb`
  continua permitido. Origem: "Cuidado: copiar o banco para o aparelho", no passo 4.

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

### DV2 · Relatório 9.5 diz que a instalação por `adb` não é afetada (07/11/2026)

- O relatório v0.4 (seção 9.5), sobre a verificação de desenvolvedor do
  Android: "Instalação por adb não é afetada".
- No S22, em 07/11/2026, três instalações seguidas pelo `adb` foram recusadas
  pela verificação (`INSTALL_FAILED_VERIFICATION_FAILURE`, `[ADV]` no
  `logcat`): ver AP4.
- **Status:** aberta. A spec 03 (5.12) pede investigar o AP4 nesta fase; o
  resultado vai ao chat de planejamento para corrigir o relatório.

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
| `streak.ts` | `MILESTONE_DAYS` (lista provisória, único lugar), `getStreakBase` e `getStreakDays` (mesma regra nas duas mecânicas), `getNextMilestone`, `getAbstinenceStart` (do dia do "Começar" menos N) e `isValidDaysAlreadyWithoutRelapse` (1 a 3650) |
| `checkIn.ts` | Enums `CHECK_IN_ANSWERS` e `CHECK_IN_SOURCES`, `DEFAULT_CHECK_IN_MINUTES` (1260), `isValidCheckInMinutes`, `getTodayCheckInStatus`, `getRelapseDayOptions` ("ontem" só com início antes de hoje), `getRelapseDayKey` e `canUndo` (pelo dia do registro, não pelo dia a que se refere) |
| `timeRange.ts` | `TimeRange` em minutos, `parseTimeRange`/`formatTimeRange` (`HH:MM-HH:MM`), `PRESET_TIME_RANGES` (as 12 de 2 horas), `isWithinTimeRange` (início incluso, fim excluso, atravessando a meia-noite), `addTimeRange` (sem duplicata) e `mergeTimeRanges` para o resumo (vizinhas e sobrepostas unidas, inclusive através da meia-noite; `ALL_DAY` quando cobrem as 24 horas) |
| `triggers.ts` | `EMOTIONS`, `WEEKDAYS` (domingo = 0, como `Date.getDay()`), atalhos "Dias úteis"/"Fim de semana" com `toggleWeekdayShortcut` e `isValidTriggerValue` por `kind` |
| `onboarding.ts` | `ONBOARDING_STEPS` (os nomes das rotas, futuro `settings.onboarding_step`), etapa seguinte e anterior, limite diário (opções, padrão 60, 5 a 600) e motivação (3 a 280 caracteres sem os espaços das pontas; emoji conta 1) |
| `suggestedApps.ts` | Pacotes pré-marcados por papel (TikTok com os dois pacotes) e `getPreselectedPackages` |

Regras escolhidas na implementação, dentro da spec:
- **Base da streak igual nas duas mecânicas (correção do responsável na
  revisão do PR #12, 02/11/2026):** o mais recente entre o início e o
  **próprio dia do último evento** (recaída na abstinência, dia reprovado na
  moderação). No dia da quebra a streak é 0 e no dia seguinte é 1, nas duas
  compulsões. A primeira versão do PR usava o dia seguinte ao reprovado na
  moderação, como a spec 02 v0.2 (4.3) descreve; a regra nova vem na spec
  02 v0.3, do chat de planejamento.
- A streak nunca é negativa: início no futuro dá 0.
- Eventos com chave inválida ou em dia futuro são ignorados no cálculo.
- Toque num atalho de dias: com todos os dias dele marcados, desmarca esses
  dias; senão, marca os que faltam. Os outros dias não mudam.
- O `isAppRoleAllowed` ao gravar apps fica para o passo 2 (repositórios).
- A lista do `FakeMonitoringModule` com os pacotes sugeridos fica para o
  onboarding (passo 4), onde a pré-marcação é usada.

### Testes

123 testes no domínio (273 no total), com virada de dia, mês e ano e o horário
de verão de São Paulo (dia de 23 horas sem meia-noite, dia de 25 horas).

Mutação de controle, cada uma derrubando ao menos um teste (refeita depois da correção da base):

| # | Mutação | Falhas |
|---|---|---|
| M1 | Base no dia seguinte ao evento (regra antiga da moderação) | 10 |
| M1b | Evento ignorado (base sempre no início) | 11 |
| M1c | Evento antes do início conta | 2 |
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

## Fase 3 · Passo 2 · Banco (02/11/2026)

Nenhuma biblioteca nova. A spec 02 v0.3 (base da streak igual nas duas
mecânicas) entrou no primeiro commit da branch `fase3/banco`.

### Migração 002

A "migração 002" da spec é o arquivo `drizzle/0001_fase3_core.sql` (o
drizzle-kit numera a partir de 0000).

| Tabela | Mudança |
|---|---|
| `settings` | `onboarding_step` (nula ou uma das 7 etapas) e `check_in_minutes` (padrão 1260, de 0 a 1439), com CHECK |
| `triggers` | CHECK do `value` conforme o `kind` (faixa `HH:MM-HH:MM` com horas até 23 e início diferente do fim; dia `0` a `6`; emoção da lista) |
| `check_ins` | nova; única por (`compulsion_id`, `day_key`); CHECK de `answer`, `source` e formato do dia |
| `relapses` | nova; única por (`compulsion_id`, `day_key`) |
| `day_states` | nova; chave primária (`compulsion_id`, `day_key`); contagens não negativas; `failed_reason` preenchido só em dia reprovado |

As três tabelas novas apagam em cascata com a compulsão.

### Cuidados com o drizzle-kit (importante para as próximas migrações)

1. **Ao recriar uma tabela, o `INSERT ... SELECT` gerado copiava as colunas
   novas da tabela antiga, onde elas ainda não existem.** Para adicionar um
   CHECK, o SQLite exige recriar a tabela (`__new_settings`, cópia, `DROP`,
   `RENAME`). No SQLite, um nome entre aspas duplas que não existe vira texto
   literal: a cópia gravaria o texto `'onboarding_step'` e o CHECK recusaria.
   - Corrigido à mão no SQL (só as 5 colunas antigas).
   - Coberto pelo teste R10 em Jest: falha com o SQL original (mutação D1).
   - **Sempre ler o SQL gerado** quando ele tiver `__new_`.
2. **CHECK com o nome da tabela quebra a recriação.** O Drizzle escreve
   `"settings"."id"`, que não existe dentro de `__new_settings`. Os CHECKs
   novos, e os de `settings` e `triggers` (recriadas), citam só a coluna
   (helper `column()` no esquema). Os CHECKs da 001 nas tabelas que não mudam
   ficaram como estavam: mudar o texto deles faria o drizzle-kit recriar a
   tabela, e recriar `user_compulsions` apagaria em cascata os filhos (o
   `PRAGMA foreign_keys=OFF` não vale dentro da transação da migração). Ver
   a regra de tabela-pai no passo 3.
3. **`NULL in (...)` dá NULL, e o SQLite aceita CHECK com resultado NULL.**
   O CHECK de `failed_reason` precisou de `is not null` explícito; o teste de
   restrições pegou o erro.
4. A migração roda numa transação: se falhar, nada fica pela metade (teste
   com um gatilho que a 002 passa a recusar). Na Fase 2 nenhuma tela gravava
   gatilhos, então esse caso não existe fora de testes.

### Repositórios (`src/data/repositories.ts`)

- `settings`: `setOnboardingStep` e `setCheckInMinutes` (valida 0 a 1439).
- `compulsions`:
  - `setStartedAt`, para o dia do "Começar";
  - `setDailyLimit`, só na moderação e de 5 a 600; `add` também recusa limite
    na abstinência.
- `monitoredApps`: confere o papel com `isAppRoleAllowed` em toda gravação
  (pendência herdada) e `replaceForCompulsion` troca a lista numa transação.
- `triggers`: valida o `value` pelo domínio antes do banco; `replaceAll` numa
  transação.
- `checkIns.answer`:
  - substitui a resposta do dia;
  - "recaída" grava também a recaída do dia, e "sem recaída" apaga a recaída
    do dia;
  - tudo numa transação.
- `relapses.record` grava a recaída e o check-in do dia como "recaída", numa
  transação.
- `checkIns.undo` e `relapses.undo` apagam os dois registros do dia. Quem
  decide se ainda pode desfazer é a interface, com `canUndo`.
- Check-in e recaída só na abstinência; estado do dia só na moderação
  (`dayStates.markFailed` e `listFailedDayKeys`, para a Fase 4 e a streak).
- `deleteAllData` cobre as três tabelas novas e zera as colunas novas de
  `settings`.

### Testes

318 no total (69 em `src/data/`):
- R10 em Jest: um banco só com a 001 e dados como a Fase 2 gravaria; a 002
  aplica e preserva tudo, e a cascata continua valendo depois de recriar
  `triggers`;
- rollback da migração;
- restrições novas, nos dois sentidos (recusa e aceita);
- transação da recaída e do check-in (com um gatilho SQL que faz a recaída
  falhar).

Mutação de controle:

| # | Mutação | Falhas |
|---|---|---|
| D1 | SQL da 002 como o drizzle-kit gerou | 1 (R10) |
| D2 | Sem `isAppRoleAllowed` | 2 |
| D3 | Recaída sem transação | 1 |
| D4 | "Sem recaída" não apaga a recaída do dia | 1 |
| D5 | Check-in "recaída" não grava a recaída | 3 |
| D6 | Desfazer deixa a recaída | 1 |

### No aparelho (S22): R10

1. Código da `main` (esquema da Fase 2) no Metro. Um fluxo Maestro
   temporário (fora do repositório) apagou os dados e concluiu o onboarding
   vazio. No banco: 1 migração aplicada e `settings` = `[1, 1, 6]`.
2. Metro com a `fase3/banco`, app fechado (`am force-stop`) e reaberto pelo
   link do dev client.
3. **O app abriu no Início, sem tela de erro e sem erro de JavaScript no
   `logcat`.** No banco:
   - **2 migrações aplicadas** e as tabelas `check_ins`, `day_states` e
     `relapses`;
   - em `settings`, as colunas novas e `onboarding_completed = 1` preservado:
     `[1, 1, null, 1260, 6]` (id, concluído, etapa, check-in, limite de
     notificações).
4. A 002 é a migração real, não de teste: o banco do aparelho continua válido
   e não precisou de `pm clear`.

Cuidados descobertos:
- Com o cache do Metro limpo (`--clear`), o menu do dev client aparece depois
  das batidas opcionais do fluxo Maestro ("Continue"/"Close") e cobre o app.
  No fluxo temporário, o Voltar do Android fechou o menu. Rever no passo 7.
- **`Start-Process adb start-server -Wait` trava**: o `-Wait` espera também o
  daemon do adb, que fica rodando. Matar o `adb.exe` e chamar
  `adb devices` direto (sobe o daemon sozinho).
- No Git Bash, caminhos do aparelho como `/sdcard/...` precisam de
  `MSYS_NO_PATHCONV=1`; senão viram `C:/Program Files/Git/sdcard/...`.

## Fase 3 · Passo 3 · Componentes (02/11/2026)

### Regra: migração que recria tabela-pai (pedido do responsável na revisão do PR #13)

**Toda migração que recriar uma tabela com filhos (hoje `user_compulsions`)
precisa ser revisada à mão e passar no teste de preservação das tabelas
filhas.**

Por quê:
- As migrações rodam numa transação, onde o `PRAGMA foreign_keys=OFF` que o
  drizzle-kit escreve não tem efeito.
- O `DROP TABLE` da tabela-pai faz um `DELETE` implícito, e a cascata apaga
  apps, gatilhos, check-ins, recaídas e estados do dia.
- Não dá erro: os dados somem em silêncio.

O teste (`src/data/migrations.test.ts`, "migrações não apagam linhas de
tabelas filhas"):
- **Cada migração depois da primeira** é aplicada sobre um banco com todas as
  tabelas filhas e os pais delas populados (`FIXTURE_ROWS`). Depois da
  migração, a contagem de linhas de cada uma tem de ser igual à de antes.
- **As tabelas vêm do próprio banco**, pelas chaves estrangeiras
  (`PRAGMA foreign_key_list`). Se uma migração criar uma tabela filha nova sem
  linhas em `FIXTURE_ROWS`, o teste falha com "Tabela sem linhas de teste".
  Conferido tirando as linhas de `relapses`.
- **Controle:** uma migração de teste recria `user_compulsions` com
  `PRAGMA foreign_keys=OFF`, como o drizzle-kit faria. Os filhos (apps,
  check-ins) chegam a 0. Isso confirma o risco no próprio migrador.

Se um dia for preciso recriar uma tabela-pai, o caminho é escrever a
migração à mão, sem `DROP TABLE` da tabela-pai. Exemplos: só `ALTER TABLE ...
ADD COLUMN`, ou copiar e recriar também os filhos na mesma migração. Discutir
antes com o responsável.

### Componentes (`src/ui/`)

Nenhuma biblioteca nova. Todos recebem os textos já traduzidos, como os da
Fase 2.

| Componente | O que faz |
|---|---|
| `Chip` | Seleção com área de toque de 48 dp. Papel `checkbox` (múltipla) ou `radio` (simples), com `checked` anunciado. Marcado e desmarcado diferem no fundo e no peso da fonte, não só na cor |
| `ChipGroup` | Chips em linhas que quebram. Múltipla: cada toque alterna e a seleção sai na ordem das opções. Simples: tocar marca só um, e tocar de novo não desmarca |
| `TextField` | Rótulo (nome acessível), apoio, contador e erro. O erro substitui o apoio e põe o contorno na cor de erro; com foco, o contorno fica na cor de ação e mais grosso. O leitor de tela ouve o erro ou o apoio e o contador. A contagem e a validação ficam com quem usa (ex.: `getMotivationLength`) |
| `confirmDialog` | Diálogo de confirmação do sistema (`Alert`), como permite a spec 4.7. Resolve `true` só ao confirmar; cancelar ou tocar fora dá `false`. Para duas etapas ("Apagar meus dados"), chamar duas vezes |

Notas:
- **Contraste:** os componentes novos só usam pares de cores que o teste de
  contraste já cobre (texto e contorno sobre `surface`, `onPrimary` sobre
  `primary`, `danger` sobre `surface`).
- **Grupo de rádio:** o `ChipGroup` simples leva `accessibilityRole="radiogroup"`
  mas não é um elemento acessível próprio. Se fosse, o TalkBack o leria como
  um bloco só e não chegaria aos chips. Por isso o teste confere o papel pelas
  propriedades, não por `getByRole`.
- **RNTL 14:** `fireEvent` é assíncrono e precisa de `await`; sem ele, o
  estado (ex.: foco) não é aplicado antes da conferência.
- **Teclado na `Screen`:** fica para o passo 4, com o campo de motivação no
  aparelho (R12). O Android 16 força edge-to-edge, e o comportamento do
  teclado precisa ser medido no S22.
- **Etapas do onboarding em dois lugares:** `src/features/onboarding/steps.ts`
  (Fase 2) e `ONBOARDING_STEPS` no domínio (passo 1). Unificar no passo 4.

### Seletor de horário: opções levantadas (02/11/2026)

Documentação consultada: página do `@react-native-community/datetimepicker`
no Expo (versão recomendada 9.2.1), o README da biblioteca e as páginas do
`@expo/ui` (versão recomendada ~58.0.26, `DateTimePicker`/`TimePickerDialog`
em Jetpack Compose). A página do Expo recomenda o `@expo/ui` como substituto
do `datetimepicker`.

| Opção | Código nativo | Prós | Contras |
|---|---|---|---|
| A. Componente próprio em JS (hora e minuto com − e +, minuto de 5 em 5) | Não | Sem recompilar; tema claro/escuro, fonte grande e TalkBack sob nosso controle; testável no Jest; igual no iOS depois | Não é o relógio do sistema; mais código nosso |
| B. `@react-native-community/datetimepicker` 9.2.1 | Sim | Relógio nativo do Android, familiar; 24 h | Recompilar e confirmar; no Android, o tema escuro depende do tema do app; `minuteInterval` sem suporte documentado no Android; manutenção incerta (procura mantenedores, mudança de nome prevista) |
| C. `@expo/ui` ~58.0.26 (Compose, Material 3) | Sim | Mantido pelo Expo, acompanha o SDK; Material 3; iOS em SwiftUI depois | Recompilar e confirmar; exige o `Host` em volta; pacote novo (pronto para produção desde o SDK 56) e APIs ainda mudando; sem orientação de acessibilidade na documentação |

**Decisão do responsável (02/11/2026): opção A**, com três requisitos:
1. no TalkBack, hora e minuto são controles ajustáveis (deslizar para cima e
   para baixo muda o valor) e o leitor anuncia o horário completo, por
   exemplo "21 horas e 30 minutos";
2. os valores dão a volta (23 → 00, 55 → 00), e segurar o botão repete o
   ajuste;
3. cada botão tem 48 dp de área de toque, testado com a fonte no máximo.

### `TimePicker` e `TimeRangePicker`

- **Valor:** minutos desde a meia-noite (0 a 1439), como `check_in_minutes`.
  Minuto de 5 em 5 por padrão (`minuteStep`).
- **Ajuste (funções puras, testadas):**
  - `stepHours` dá a volta no dia;
  - `stepMinutes` dá a volta na hora sem mudar a hora;
  - um minuto fora do passo (ex.: 07) vai ao múltiplo seguinte ou anterior.
- **TalkBack:**
  - cada unidade (hora, minuto) é uma `View` acessível com papel
    `adjustable`, ações `increment`/`decrement` e `accessibilityValue` com o
    horário completo falado;
  - o rótulo é "Nome do campo, Hora" ou "Nome do campo, Minutos";
  - os botões + e − ficam dentro da unidade e não recebem foco separado; o
    ":" fica escondido do leitor;
  - o horário falado vem do i18n (`common:timePicker`): "zero hora",
    "1 hora e 5 minutos", "21 horas" (sem "e zero minuto").
- **Segurar:**
  - um toque ajusta uma vez (`onPress`);
  - segurar por 400 ms ajusta e repete a cada 120 ms (`onLongPress` e
    `setInterval`), até soltar (`onPressOut`) ou a tela sair;
  - depois de um toque longo, o Pressable não chama `onPress`, então não há
    ajuste extra ao soltar;
  - a repetição parte sempre do valor mais recente (ref atualizada num
    efeito; o React Compiler não aceita atualizar ref durante a
    renderização).
  - O ajuste começa no `onPress`, e não no `onPressIn`, para que encostar
    no botão ao rolar a tela não mude o valor.
- **`TimeRangePicker`:** início e fim. Avisa "Termina no dia seguinte" quando o
  fim é menor que o início e mostra erro quando os dois são iguais.

Testes (22) e mutação de controle, com as 8 mutações derrubando testes:

| # | Mutação | Falhas |
|---|---|---|
| T1 | Hora sem volta | 3 |
| T2 | Minuto sem volta | 4 |
| T3 | Soltar não para a repetição | 2 |
| T4 | Segurar não repete | 2 |
| T5 | Sem papel `adjustable` | 9 |
| T6 | Deslizar para cima não aumenta | 1 |
| T7 | Sem o horário falado | 8 |
| T8 | Botão com altura fixa de 40 | 2 |

### Tela "Componentes" (só em development)

`app/dev-components.tsx`, no Perfil, ao lado de "Refazer onboarding":
- é a vitrine dos componentes do passo 3, para conferir tema, fonte e
  TalkBack no aparelho antes de eles entrarem nas telas;
- em preview e produção, redireciona para o início (testado);
- os textos ficam no namespace `dev` do i18n.

### No aparelho (S22, fonte no máximo)

- `font_scale` = 2.0 (máximo, como deixado pelo responsável na Fase 2) e
  densidade 480 (3 px por dp). Medido pelo `uiautomator`.
- **Os quatro botões + e −: 48,0 × 48,0 dp**, com o símbolo inteiro. Os
  números (21 : 00) aparecem ampliados e sem corte.
- **Chips:** 53 dp de altura; o de texto longo quebra em duas linhas e
  cresce para 89 dp.
- A captura de tela usada na conferência foi apagada (mostrava a barra de
  status).
- **TalkBack conferido pelo responsável no S22** (02/11/2026, depois do PR
  #14): hora e minuto respondem a deslizar para cima e para baixo e anunciam
  o horário. Observação dele: leva um tempo para entender como o controle
  ajustável funciona. Considerar uma dica curta (`accessibilityHint`) quando
  o seletor entrar nas telas.

## Fase 3 · Passo 4 · Onboarding (02/11/2026)

### Parte 1: progresso salvo, retomada e Voltar

- **Etapas num lugar só:** `src/features/onboarding/steps.ts` agora
  reexporta as do domínio (`ONBOARDING_STEPS`, seguinte e anterior), que
  também alimentam o CHECK de `settings.onboarding_step`.
- **`onboardingProgress`** (mesmo padrão do `onboardingStatus`):
  - começa em memória e o `initializeDatabase` o liga a
    `settings.onboarding_step`;
  - `setStep` grava antes de mudar; se o banco falhar, quem chamou não navega.
- **Ao avançar:** cada "Continuar" grava a etapa seguinte. A última limpa a
  etapa (null) antes de marcar o onboarding como concluído.
- **Retomada (R3):**
  - as boas-vindas, onde o app abre, redirecionam (`<Redirect>`) para a
    etapa gravada;
  - a retomada vale uma vez por abertura do app: qualquer etapa que aparece
    marca a retomada como feita, e voltar às boas-vindas depois não pula de
    novo;
  - o `connect` (na abertura) a reativa.
- **Voltar:**
  - o botão do app e o do Android vão sempre à etapa anterior;
  - se ela está logo abaixo na pilha, `router.back()`; senão (depois de uma
    retomada a pilha não tem as anteriores), `router.replace` para ela;
  - **a primeira tela não tem botão Voltar**, e o Voltar do Android nela pede
    confirmação (pendência herdada).
- **Tentativas que não funcionaram:**
  - **`navigation.reset`** com a pilha das etapas: foi chamado com o estado
    certo, mas a pilha do onboarding (dentro do `Stack.Protected`) continuou
    só com as boas-vindas, mesmo com atraso;
  - **`router.push` em sequência num efeito:** empilhava, mas falha com "the
    imperative router is unavailable before the first render has finished"
    quando a tela monta antes do roteador, e deixava as boas-vindas em
    branco ao voltar;
  - a solução declarativa (redirecionar e Voltar explícito) não depende do
    momento do roteador.
- **Lista do `FakeMonitoringModule`:** ganhou os seis sugeridos com nomes
  reais (Instagram, TikTok, YouTube, Kwai, X, Reddit), além dos de exemplo.
- **Testes:**
  - navegação: grava ao avançar, limpa ao concluir, retoma na etapa, Voltar
    do app e do Android depois de retomar, primeira tela sem Voltar;
  - unitários do `onboardingProgress`;
  - o Voltar do Android é simulado capturando os listeners do
    `BackHandler`, porque o mock do React Native 0.88 não tem
    `mockPressBack`.
  - **372 testes no total.**
- **No S22 (R3):**
  1. "Refazer onboarding" e três "Continuar" levaram a "Gatilhos"; no banco,
     `settings` = `[1, 0, "triggers", 1260, 6]`.
  2. `am force-stop` e reabertura levaram **direto a "Gatilhos"**.
  3. O Voltar do app levou a "Configuração", e o do Android a "O que você
     quer mudar".
  4. As boas-vindas já não têm botão Voltar.

**Decisão do responsável (02/11/2026):** o passo 4 vai em três PRs: (1)
progresso e Voltar; (2) etapas 1 a 3; (3) etapas 4 a 7. Nos PRs das etapas,
os textos novos ficam listados no próprio PR, agrupados por tela, para
revisão. O seletor de horário ganha a dica do leitor de tela "Deslize para
cima ou para baixo para mudar".

### Parte 2: etapas 1 a 3

- **Etapa 1, boas-vindas:**
  - apresentação, a frase de privacidade e a pergunta "Você tem 18 anos ou
    mais?";
  - "Sim" grava `age_confirmed_at` e avança;
  - "Não" abre `app/(onboarding)/underage.tsx` sem gravar nada (nem etapa),
    com "Voltar e corrigir a resposta". Reabrir o app volta às boas-vindas
    (R1).
- **Etapa 2, compulsões:**
  - dois `OptionCard` (componente novo: caixa de seleção com título e uma
    linha de explicação);
  - a ordem de escolha vira a ordem de inserção no banco (e dos cards no
    Início);
  - tirar uma compulsão já gravada pede confirmação, e ao avançar ela é
    apagada com as respostas (cascata);
  - o gravado é lido na hora de usar, porque a tela continua montada quando
    se volta a ela.
- **Etapa 3, configuração:** uma seção por compulsão, na ordem da escolha.
  - **Vídeos curtos:**
    - apps (chips) e limite (30/45/60/90/120 ou "Outro", com campo
      numérico);
    - na primeira vez, os sugeridos instalados vêm pré-marcados;
    - ao voltar, aparece o gravado (critério: `daily_limit_minutes` não
      nulo).
  - **Conteúdo adulto:**
    - "Estou começando hoje" ou "há N dias", com campo numérico;
    - apps de risco opcionais, com os sugeridos pré-marcados;
    - para cada app marcado, "Você costuma ver esse tipo de conteúdo no
      {app}?" com Sim/Não, obrigatório e sem resposta pré-marcada;
    - horário do check-in (`TimePicker`, padrão 21h).
  - Enquanto a lista de apps carrega, o "Continuar" fica desabilitado
    ("Carregando os apps do aparelho…"); sem isso, gravaria uma lista vazia.
- **`OnboardingStepScreen`:**
  - recebe conteúdo, `blockedReason` (desabilita o "Continuar" e mostra o
    motivo, com `accessibilityLiveRegion`) e `onContinue` (grava antes de
    avançar);
  - `renderActions` troca o "Continuar" (Sim/Não da idade).
- **Validação no domínio:** `getCompulsionChoiceProblem`,
  `getShortVideoSetupProblem`, `getAbstinenceSetupProblem` e
  `parseWholeNumber`.
- **Textos revisados pelo responsável no PR #16 (03/11/2026):** código e
  migração 003 aprovados. Ajustes aplicados:
  - "Responda à pergunta…" (com crase);
  - "…esse tipo de conteúdo em {app}?" (em vez de "no");
  - botão "Não, tenho menos de 18";
  - apps de risco: "O Quedo avisa depois de 10 minutos de uso em cada um."

### Migração 003: `user_compulsions.initial_streak_days`

- **Por quê:** a spec v0.2 manda contar o início a partir do dia do
  "Começar". O "há N dias" é respondido na etapa 3, então o N precisa ficar
  guardado até a etapa 7, e nenhuma coluna existente servia.
- **Como:** coluna nova, nula, só com `ALTER TABLE ... ADD`, sem CHECK. Um
  CHECK obrigaria a recriar `user_compulsions`, a tabela-pai da regra acima.
  A validação (0 ou de 1 a 3650, só na abstinência) fica no repositório
  (`setInitialStreakDays`).
- **Testes:** o teste das tabelas filhas passou a cobrir a 003 sozinho, e os
  testes de migração não contam mais um número fixo de migrações.

### Testes e aparelho

- **394 testes no total:**
  - `__tests__/onboardingSteps.test.tsx` (11): idade, bloqueio, ordem da
    escolha, confirmação ao tirar, pré-marcação, declaração obrigatória,
    validação do limite e dos dias, gravação e volta mostrando o gravado;
  - navegação atualizada: o teste usa um banco sql.js por teste, por um
    `getRepositories` simulado.
- **No S22**, com `pm clear` do app de desenvolvimento, tema escuro e fonte
  no máximo:
  - "Não" mostrou o bloqueio, e "Voltar e corrigir a resposta" voltou;
  - "Sim" levou às compulsões; escolher as duas e "Continuar" levou à
    configuração, com as seções na ordem da escolha, os seis sugeridos na
    lista, 60 min marcado e X e Reddit pré-marcados como risco;
  - nada cortado;
  - no banco: 3 migrações aplicadas, 2 compulsões e etapa `setup`.

### Parte 3: etapas 4 a 7 e teclado

- **Etapa 4, gatilhos:**
  - as 12 faixas de 2 horas em chips ("00h–02h" … "22h–24h");
  - "Adicionar faixa personalizada" abre o `TimeRangePicker` (padrão
    23h–01h) com "Adicionar faixa". Início igual ao fim fica bloqueado com o
    motivo, e uma faixa igual a uma das fixas marca a fixa, sem duplicar;
  - as faixas personalizadas aparecem marcadas, e tocar numa tira;
  - dias com os atalhos "Dias úteis" e "Fim de semana" (`toggleWeekdayShortcut`)
    e os 6 sentimentos;
  - tudo opcional. Os gatilhos são gerais (`compulsion_id` nulo), gravados com
    `triggers.replaceAll`.
- **Etapa 5, motivação:**
  - campo de várias linhas com exemplos neutros e contador "N/280" (contagem
    do domínio, emoji conta 1);
  - o mínimo de 3 aparece como motivo do botão; acima de 280, erro no campo;
  - grava sem os espaços das pontas.
- **Etapa 6, permissões** (ordem do doc 01, seção 4.3: notificações, acesso
  a dados de uso, sobreposição):
  - cada cartão explica "Para que serve" e "O que o Quedo não faz" antes do
    "Permitir" (divulgação destacada); "Agora não" ou pedido negado mostram
    que dá para permitir depois, no Perfil;
  - "Bom saber": a notificação permanente e a demora depois de reiniciar o
    celular;
  - nada obrigatório. Os pedidos vão ao `FakeMonitoringModule`. A spec 4.4
    lista "acesso ao uso, sobreposição, notificações", sem dizer que é a
    ordem; segui a ordem lógica do doc 01.
- **Etapa 7, seu plano:**
  - resumo por compulsão (apps, limite, início, apps de risco, horário do
    check-in), gatilhos com as faixas unidas (`mergeTimeRanges`: 20h–22h,
    22h–24h e 23h30–01h viram "20h–01h", R5), dias, sentimentos e a
    motivação;
  - "Começar" grava o início: na abstinência, o dia do "Começar" menos os
    dias informados (`getAbstinenceStart`); na moderação, o próprio
    instante. Depois limpa a etapa e conclui o onboarding;
  - sem teste nem preço (Fase 6).
- **Rótulos:** `useTriggerLabels` monta horários ("22h", "23h30", meia-noite
  no fim como "24h"), dias e emoções a partir do i18n (`common:time`,
  `weekdays`, `emotions`), com chaves literais e `satisfies`.

### Teclado na `Screen` (pendência herdada)

- **Primeira tentativa:** `KeyboardAvoidingView` com `padding` só no iOS e
  nada no Android, como o guia de teclado do Expo sugere. **Não funcionou no
  S22:** o app tem `adjustResize`, mas com edge-to-edge
  (`edgeToEdgeEnabled=true`, obrigatório no Android 15+) a janela não
  encolhe. O conteúdo ficou parado e o contador da motivação ficou meio
  coberto pelo teclado, que começa em y = 1314 px.
- **Solução:** `behavior="padding"` também no Android, e
  `keyboardShouldPersistTaps="handled"` no `ScrollView`.
  - Na motivação, a área de rolagem passou a terminar exatamente no topo do
    teclado (1314 px), e o resto fica alcançável rolando.
  - Na configuração, o campo "Há quantos dias?" estava em 2148 px. Ao tocar
    nele, foi levado a 1170 px e terminou em 1314 px, logo acima do teclado.
- **Sem teste automático:** o RNTL 14 não tem mais as consultas `UNSAFE_*`, e
  a prop `behavior` não chega aos elementos nativos. A evidência é a medição
  acima.
- **Sem biblioteca nativa:** a `react-native-keyboard-controller` não foi
  necessária.

### Testes e aparelho

- **407 testes no total.** `__tests__/onboardingSteps.test.tsx` cobre as 7
  etapas (24 testes), com um banco sql.js e um `FakeMonitoringModule` novos a
  cada teste (`getMonitoring` simulado).
- **No S22** (tema escuro e fonte no máximo), um fluxo Maestro temporário
  (fora do repositório) foi da configuração até a motivação:
  - respondeu Sim para X e Reddit;
  - marcou 20h–22h, 22h–24h e "Fim de semana";
  - digitou a motivação, com o teclado medido como acima.
- **O fluxo Maestro do repositório (`.maestro/onboarding-e-abas.yaml`) está
  desatualizado:** ele toca "Continuar" nas boas-vindas. É reescrito no passo
  7, com os quatro fluxos da spec.

### Revisão do responsável no PR #17 (04/11/2026)

- **Acesso a dados de uso:** o "Para que serve" ganhou "Também vê a lista de
  apps instalados, só para você escolher quais acompanhar." O relatório da
  Fase 1 exige essa justificativa para a lista de apps. O teste da etapa 6
  confere a frase no cartão.
- **Plural no resumo:** "Sem recair há {{days}} dias" não tinha plural, e com
  N = 1 saía "há 1 dias". Passou a `startDaysAgo_one`/`_other` com `count`.
  - Sem `_zero`: o texto só aparece com 1 a 3650 dias (com zero, o resumo
    mostra "Começando hoje"). É a primeira entrada de `PLURALS_WITHOUT_ZERO`
    no `keys.test.ts`.
  - Teste novo: "Sem recair há 1 dia". Antes da correção, ele falhou.
- **408 testes no total.**

### Para o passo 6 (Perfil)

- **Item "Permissões" no Perfil**, reaproveitando a etapa 6 do onboarding
  (`PermissionsStep`). O texto "Dá para permitir depois, no Perfil", mostrado
  ao recusar, promete isso (doc 01, seção 6.9). Pedido do responsável na
  revisão do PR #17.

## Fase 3 · Passo 5 · Tela Início (04/11/2026)

Nenhuma biblioteca nova. Branch `fase3/inicio`.

### Domínio (`src/domain/overview.ts`)

- `getAbstinenceOverview` junta streak, próximo marco e check-in num resumo do
  dia, para a interface só desenhar:
  - check-in de hoje (pendente ou respondido, com `canUndo`);
  - `yesterdayRelapseUndoable`: recaída de ontem registrada hoje;
  - `relapseDays`: os dias que "Registrar recaída" oferece, **sem os que já
    têm recaída**. Com recaída hoje e ontem, o botão some;
  - `relapseRecordedToday`: mostra a mensagem de apoio (P8) no dia em que a
    recaída foi registrada, para hoje ou para ontem.
- `getModerationOverview`: streak e próximo marco a partir dos dias
  reprovados.
- `sumUsageMinutes`: uso de hoje somado só entre os apps escolhidos,
  arredondado para baixo.

### Tela (`src/features/home/`, `app/(tabs)/index.tsx`)

- Um card por compulsão **ativa** (pausada não aparece), na ordem da escolha.
- **Recarrega** ao ganhar o foco (volta das permissões e, no passo 6, do
  Perfil), ao voltar do segundo plano (`AppState`) e à meia-noite (um
  `setTimeout` até `startOfNextDay`).
- As gravações usam o dia do momento do toque, não o do último carregamento.
- **Card de conteúdo adulto:** streak ("0 dias", com `_zero`), "sem recair",
  próximo marco, "Como foi hoje?" com "Sem recaída" e "Tive uma recaída",
  resposta com "Desfazer" e "Registrar recaída".
- **Registrar recaída:** diálogo do sistema em que confirmar já é escolher o
  dia. Com os dois dias: "Cancelar", "Ontem" e "Hoje". Com um só: "Cancelar"
  e "Registrar", com a mensagem do dia. `choiceDialog` novo em `src/ui/`, ao
  lado do `confirmDialog` (o Android mostra no máximo três botões, então são
  até duas escolhas).
- **Card de vídeos curtos:** "42 min de 60 hoje", lido de `getUsageToday()`.
  Sem permissão ou sem suporte: "O acompanhamento do tempo ainda não está
  ativo." com "Ver permissões". Outro erro do monitoramento não é escondido.
- **Sem compulsão:** estado vazio com "Escolher no Perfil", que abre a aba
  Perfil. O "Adicionar compulsão" entra no passo 6.
- **Botão de emergência (Fase 4):** o espaço previsto é acima dos cards,
  marcado no código.
- Tocar no card não faz nada nesta fase.
- Os rótulos das compulsões ganharam `common:compulsions` (spec 4.1), para o
  Início e o Perfil. O onboarding segue com as suas chaves.
- O doc 01 (6.1) cita "Dia 12" para a abstinência; segui a spec 4.5 ("12
  dias").

### Permissões fora do onboarding (`app/permission-status.tsx`)

- Os cartões da etapa 6 viraram `src/features/permissions/PermissionCards.tsx`,
  usados pela etapa e pela tela nova.
- A rota não pode se chamar `/permissions`: a etapa do onboarding já ocupa
  esse caminho (grupos não entram no caminho).
- Na tela nova, recusar mostra "Dá para permitir quando quiser, nesta tela."
  em vez de "…depois, no Perfil".
- O item "Permissões" do Perfil (passo 6) abre esta mesma tela.

### Recaída sobre um check-in: restaurar ao desfazer (decisão do responsável, 04/11/2026)

- **O problema:** com "Sem recaída" ontem e recaída registrada hoje para
  ontem, o check-in de ontem virava "recaída", e o "Desfazer" apagava os dois.
  O "Sem recaída" original sumia do histórico.
- **Decisão (revisão do PR #18):** ao registrar recaída para um dia que já
  tinha check-in, guardar a resposta anterior e restaurá-la no "Desfazer".
- **Migração 004** (`drizzle/0003_check_in_previous_answer.sql`): três
  colunas nulas em `check_ins`, `previous_answer`, `previous_source` e
  `previous_answered_at`, só com `ALTER TABLE ... ADD`. Sem CHECK, para não
  recriar tabela. Passa no teste das tabelas filhas.
- **Repositório:**
  - recaída (pelo check-in ou por "Registrar recaída") sobre outra resposta
    guarda resposta, origem e horário; sobre outra recaída, mantém o que já
    estava guardado;
  - "Sem recaída" por cima de uma recaída não guarda nada;
  - desfazer (pelos dois caminhos) apaga a recaída e restaura a resposta
    guardada, ou apaga o check-in se não havia nenhuma. Desfazer de novo apaga
    a resposta restaurada;
  - as três colunas andam juntas: guardada pela metade, o desfazer recusa e a
    transação volta.
- Na tela, o mesmo vale para hoje: "Sem recaída", "Registrar recaída" e
  "Desfazer" voltam a "Hoje: sem recaída.".
- Textos do PR #18 aprovados pelo responsável.

### Testes e aparelho

- **438 testes no total:**
  - `src/domain/overview.test.ts` (13);
  - `__tests__/home.test.tsx` (14): estado vazio, ordem dos cards, pausada,
    check-in e desfazer (R7), "Tive uma recaída", recaída para ontem e
    desfazer (R8), dia do início só com "hoje", substituir "Sem recaída",
    uso somado, dia reprovado, permissões e volta com o uso, texto da recusa
    fora do onboarding;
  - `choiceDialog` (3).
- Mutação de controle, cada uma derrubando ao menos um teste:

| # | Mutação | Falhas |
|---|---|---|
| H1 | Desfazer a recaída de ontem desfaz a de hoje | 1 |
| H2 | "Registrar recaída" oferece dias que já têm recaída | 4 |
| H3 | Sem recarregar ao ganhar o foco | 1 |
| H4 | Uso soma apps fora da lista | 2 |
| H5 | Sem mensagem de apoio | 4 |
| H6 | Mostra compulsão pausada | 1 |
| R1 | Desfazer sempre apaga o check-in (comportamento antigo) | 5 |
| R2 | Segunda recaída perde a resposta guardada | 1 |
| R3 | Restaura sem limpar a resposta guardada | 3 |

- **Depois da revisão: 445 testes** (5 novos no repositório, 1 de tela para
  "ontem Sem recaída → recaída para ontem → Desfazer → volta Sem recaída" e a
  volta de "Hoje: sem recaída." no teste de hoje).
- **No S22, migração 004 sobre o banco existente:** com o app aberto pelo
  Metro, o banco passou a 4 migrações, com onboarding concluído, 2
  compulsões e a recaída de hoje preservados. No fluxo temporário, "Sem
  recaída" → "Registrar recaída" → "Desfazer" voltou a "Hoje: sem recaída.";
  no banco, o check-in ficou `no_relapse` com as três colunas nulas. Sem erro
  de JavaScript no `logcat`.

- **No S22** (tema escuro, fonte no máximo), com um fluxo Maestro temporário
  (fora do repositório), a partir da etapa de motivação:
  1. "Começar" levou ao Início: vídeos curtos e depois conteúdo adulto, os
     dois com "0 dias" e "Próximo marco: 1 dia"; vídeos curtos com "O
     acompanhamento do tempo ainda não está ativo.";
  2. "Sem recaída" mostrou "Hoje: sem recaída.", e "Desfazer" voltou a "Como
     foi hoje?" (R7);
  3. "Registrar recaída" no dia do início abriu o diálogo só com "Cancelar" e
     "Registrar"; "Registrar" mostrou a mensagem de apoio e "Hoje: recaída
     registrada.";
  4. "Ver permissões" → "Permitir" no acesso a dados de uso → "Voltar": o
     card passou a "0 min de 60 hoje";
  5. no banco: check-in e recaída de hoje gravados, sem erro de JavaScript no
     `logcat`.
- **Não conferido no aparelho:** a recaída para ontem (R8), porque o início
  foi hoje e "ontem" ainda não é oferecido. Coberta em Jest; fica para o
  roteiro manual.
- O fluxo Maestro do repositório continua desatualizado (passo 7). Ele também
  procura o texto antigo do Início ("Seu dia aparece aqui"), que saiu.
- **Maestro:** `takeScreenshot` não aceita caminho fora da pasta de saída
  dele. Para guardar capturas, usar `adb exec-out screencap -p > arquivo.png`
  entre fluxos curtos.

## Fase 3 · Passo 6 · Perfil (05/11/2026)

Nenhuma biblioteca nova. Branch `fase3/perfil`.

### Campos do onboarding reaproveitados (`src/features/setup/`)

- As etapas 3, 4 e 5 viraram componentes controlados (`value` e
  `onChange`), usados pelo onboarding e pelo Perfil:
  - `ShortVideoFields`: apps e limite;
  - `AbstinenceFields`: início da streak (opcional, `showStart`) e apps de
    risco com as declarações;
  - `CheckInTimeField`: horário do check-in com a explicação;
  - `TriggerFields`: horários, dias e sentimentos;
  - `MotivationField`: campo, exemplos e contador.
- Cada um vem com as funções de carregar, validar e gravar
  (`loadShortVideoSetup`, `getShortVideoProblem`, `saveRiskApps`,
  `loadTriggers`, `saveTriggers`…) e o texto de cada problema.
- `useAppTargets`: a lista de apps instalados, num lugar só.
- **Pré-marcação dos sugeridos:** passou de um efeito com `setState` para um
  valor calculado no render (`preselectShortVideoApps`, `preselectRiskApps`).
  A regra `react-hooks/set-state-in-effect` do lint recusa o efeito, e o valor
  calculado faz o mesmo: enquanto a lista não foi escolhida (`null`), mostra
  os sugeridos instalados.
- Os textos continuam no namespace `onboarding`. Os 25 testes das etapas
  passaram sem mudança depois da extração.

### Telas (`app/edit/`, `src/features/profile/`)

- **Perfil** (`app/(tabs)/profile.tsx`), em duas seções:
  - **Minhas escolhas:** "O que você quer mudar" (com as escolhas atuais),
    "Apps e limite" (com o limite), "Apps de risco", "Horário do check-in"
    (com o horário), "Gatilhos" e "Minha motivação". Os itens de cada
    compulsão só aparecem se ela está ativa;
  - **O app:** "Permissões" (abre `/permission-status`, pedido da revisão do
    PR #17), "Sobre o app", os dois itens de desenvolvimento e "Apagar meus
    dados".
  - Recarrega ao ganhar o foco, depois de cada edição.
- **Edição** (`EditScreen`): título, campos, "Salvar" (desabilitado com o
  motivo à vista) e "Cancelar". Só grava ao salvar; "Cancelar" e o Voltar do
  Android descartam.
- **Rotas** em `app/edit/` (`/edit/compulsions`, `/edit/add-compulsion`,
  `/edit/short-videos`, `/edit/risk-apps`, `/edit/check-in`,
  `/edit/triggers`, `/edit/motivation`), com um `_layout` próprio e um só
  `Stack.Screen name="edit"` nas rotas protegidas. Uma pasta `app/profile/`
  teria o mesmo caminho da aba (`/profile`).
- **O que você quer mudar:**
  - um cartão por compulsão, com "Acompanhando" e "Remover", ou "Não
    acompanhado" e "Adicionar";
  - remover pede confirmação, porque apaga o histórico (cascata);
  - com uma só, "Remover" fica desabilitado, com o motivo (o mesmo
    `getCompulsionChoiceProblem` do onboarding);
  - "Adicionar" abre `/edit/add-compulsion?type=…` com a configuração do
    onboarding. **Nada é gravado antes do "Salvar"**, então cancelar não deixa
    compulsão pela metade. O tipo da rota é validado por `isCompulsionType`
    (novo, no domínio).
- **Apps de risco:** sem a pergunta do início da streak (a spec não lista o
  início entre o que se edita no Perfil).
- **Apagar meus dados:** duas confirmações do sistema ("Continuar", depois
  "Apagar tudo", destrutivo); `deleteAllData()`, depois
  `onboardingProgress.setStep(null)` e `onboardingStatus.setCompleted(false)`.
  As rotas protegidas levam às boas-vindas (pendência herdada da Fase 2).

### "Há N dias" ao adicionar pelo Perfil (decidido na revisão do PR #19)

- A spec 02 (4.3) diz que uma compulsão adicionada pelo Perfil "começa no dia
  em que é adicionada". Ao adicionar conteúdo adulto, a pergunta "Desde quando
  você está sem recair?" continua, e "há N dias" conta a partir do dia em que
  ela é adicionada, como o "Começar" do onboarding. **O responsável decidiu
  manter a pergunta.**
- Para combinar com isso, o texto da tela de adicionar ficou diferente por
  opção (`profile:add.body.*`):
  - vídeos curtos: "Ajuste do seu jeito. A contagem começa a partir de hoje.";
  - conteúdo adulto: "Ajuste do seu jeito. A contagem começa hoje, a não ser
    que você informe que já está sem recair há alguns dias."
- Os dois testes de adicionar conferem o texto de cada opção (mutação P7:
  mostrar sempre o texto de vídeos curtos derruba 1 teste). Os demais textos
  do PR #19 foram aprovados.

### Testes e aparelho

- **463 testes no total:** `__tests__/profile.test.tsx` (17) e
  `isCompulsionType` no domínio.
- Mutação de controle, cada uma derrubando ao menos um teste:

| # | Mutação | Falhas |
|---|---|---|
| P1 | "Apagar meus dados" não zera o onboarding | 1 |
| P2 | Segunda confirmação ignorada | 1 |
| P3 | Deixa remover a última compulsão | 1 |
| P4 | Ignora o "há N dias" ao adicionar | 1 |
| P5 | "Salvar" não grava | 7 |
| P6 | Remove sem confirmar | 1 |
| P7 | Texto de vídeos curtos também ao adicionar conteúdo adulto | 1 |

- **No S22** (tema escuro, fonte no máximo), com fluxos Maestro temporários:
  1. **R8 no aparelho, com o início em 04/11 e hoje 05/11:** "Registrar
     recaída" mostrou "Ontem" e "Hoje"; "Ontem" deu a mensagem de apoio e,
     no banco, o check-in de 04/11 virou `relapse` com `previous_answer =
     no_relapse`. "Desfazer" voltou o check-in a `no_relapse`, sem recaída
     (restauração do PR #18);
  2. Perfil: "Apps e limite" → 90 min → "Salvar" mostrou "Limite de 90 min
     por dia" no item;
  3. "Remover" vídeos curtos, depois "Adicionar": os quatro sugeridos vieram
     pré-marcados e foi gravado com início hoje;
  4. "Remover" conteúdo adulto (os check-ins dele sumiram) e "Adicionar" com
     "há 5 dias" e "Não" para X e Reddit: início em 31/10, `initial_streak_days
     = 5`, declarações gravadas, e o Início mostrou "5 dias";
  5. "Permissões" abriu a tela de permissões;
  6. **R11:** "Apagar meus dados" → "Continuar" → "Apagar tudo" levou às
     boas-vindas, com todas as tabelas vazias e `settings` no padrão;
     `am force-stop` e reabrir: continuou nas boas-vindas;
  7. sem erro de JavaScript no `logcat`.
- Cuidado com fluxos Maestro em telas de cartões iguais: `text: Remover,
  index: 1` tocou no segundo cartão (vídeos curtos), porque a ordem nessa tela
  é a de `COMPULSION_TYPES` (conteúdo adulto primeiro).

## Fase 3 · Passo 7 · Maestro e roteiro manual (07/11/2026)

### Os quatro fluxos (spec 02, seção 4.10)

O `onboarding-e-abas.yaml` da Fase 2 (onboarding vazio) saiu: o que ele
conferia (as quatro abas, reabrir no Início, o "Sobre") foi para o fluxo (a).
Todos apagam os dados do app de desenvolvimento (`clearState`).

| Arquivo | O que faz | Roteiro |
|---|---|---|
| `a-onboarding-completo.yaml` | As 7 etapas com as duas opções: "Continuar" desabilitado com o motivo na etapa 2 e sem as declarações dos apps de risco na etapa 3; sugeridos pré-marcados; 45 min; "há 3 dias"; X "Não" e Reddit "Sim"; 20h–22h, 22h–24h e a faixa 23:30–01:00 (seis toques de 5 min no início da faixa nova, que começa em 23h–01h); fim de semana; "Agora não" nas três permissões. Resumo com "Horários: 20h–01h". Início com os dois cards ("3 dias", "Próximo marco: 7 dias"; "0 dias", "Próximo marco: 1 dia"; uso inativo). As quatro abas, reabrir no Início e o "Sobre" | R2, R5, R6 |
| `b-retomar-onboarding.yaml` | Fecha o app na etapa 4 e reabre: volta na etapa 4, com 90 min e os apps da etapa 3. Volta à etapa 2, tenta tirar vídeos curtos ("Manter" desiste), tira de vez ("Tirar"), e a configuração dela some | R3, R4 |
| `c-check-in-e-recaida.yaml` | "Sem recaída" e "Desfazer"; recaída para ontem (1 dia, "Próximo marco: 3 dias", mensagem de apoio) e "Desfazer"; "Sem recaída", recaída para hoje (0 dias) e "Desfazer" devolve o "Sem recaída"; reabrir mantém a resposta | R7, R8 |
| `d-apagar-dados.yaml` | Desiste na primeira e na segunda confirmação (nada apagado); depois apaga: boas-vindas, sem "Voltar"; reabrir continua nas boas-vindas | R11 |

Subfluxos em `.maestro/subflows/` (o `maestro test .maestro` não entra em
subpastas, conferido: só os quatro rodaram):
- `abrir-app.yaml`: o link do dev client e o menu dele;
- `onboarding-curto.yaml`: só conteúdo adulto, "há 3 dias" (para "ontem" já
  estar no período), sem apps de risco; usado por (c) e (d).

Seletores descobertos (`maestro hierarchy --compact` mostra o que o Maestro
vê):
- Na etapa 3, **conteúdo adulto vem antes de vídeos curtos**, e as duas listas
  têm os mesmos apps. O estado ajuda a separar: o Instagram marcado só existe
  em vídeos curtos, e o X marcado só nos apps de risco.
- O cartão de opção da etapa 2 é lido como título e descrição juntos: para o
  estado, `text: "Vídeos curtos e redes sociais,.*"` com `checked`.
- Declarações: `text: Não` com `below:` na pergunta do app.
- O "Voltar" do onboarding fica no fim da rolagem: `scrollUntilVisible` antes.
- Os botões dos diálogos podem vir em maiúsculas: `ONTEM|Ontem`.
- Depois de voltar do "Sobre", o Perfil continua rolado até embaixo.

**Execução no S22 (`npm run e2e`): 4/4 aprovados em 11m28s** ((a) 4m03s,
(b) 2m10s, (c) 2m33s, (d) 2m41s). Antes, cada fluxo sozinho, também
aprovado. As falhas durante a escrita (o Instagram desmarcado da lista de
risco, o "Voltar" fora da tela, o cartão com a descrição) mostraram que os
fluxos acusam quando a tela não bate. Três tentativas caíram no AP4 (abaixo).

### Roteiro R1 a R13 (spec 02, seção 6)

O responsável executou no S22, com as instruções passo a passo, R1, R2, R9,
R12 e R13, e confirmou em 07/11/2026: "Executei, tudo ok". O resto foi
coberto pelos fluxos Maestro, que rodam no mesmo aparelho.

| # | Como foi verificado | Resultado |
|---|---|---|
| R1 | Responsável: "Não" → tela de bloqueio; fechar pelo multitarefa e reabrir → boas-vindas | ✅ |
| R2 | Responsável (motivos com "Continuar" desabilitado) e fluxo (a) | ✅ |
| R3 | Fluxo (b): fechado na etapa 4, reabre na etapa 4 com as respostas das etapas 1 a 3 | ✅ |
| R4 | Fluxo (b): aviso ao tirar vídeos curtos; a configuração dela some | ✅ |
| R5 | Fluxo (a): 20h–22h, 22h–24h, 23:30–01:00 e fim de semana; resumo "Horários: 20h–01h" | ✅ |
| R6 | Fluxo (a): um card por opção, "3 dias" e "0 dias", com o próximo marco | ✅ |
| R7 | Fluxo (c): "Sem recaída" → "Desfazer" → "Como foi hoje?" | ✅ |
| R8 | Fluxo (c): recaída para ontem → 1 dia e mensagem de apoio (também no passo 6) | ✅ |
| R9 | Responsável no Perfil: limite, check-in, motivação e gatilho; reabrir mantém. No banco: limite 45, check-in 1290 (21h30, o padrão é 1260), motivação gravada às 11:25 | ✅ |
| R10 | Passo 2 (02/11): migração 002 sobre o banco da Fase 2 no S22. As 003 e 004 também foram aplicadas sobre banco existente no aparelho (passos 4 e 5); hoje, 4 migrações | ✅ |
| R11 | Fluxo (d) e passo 6 | ✅ |
| R12 | Responsável: tema escuro e fonte no máximo nas etapas e no Início; o teclado não cobre a motivação | ✅ |
| R13 | Responsável leu os textos (já aprovados nos PRs de cada passo) | ✅ |

### Ponto para a Fase 4: a Activity é recriada quando a fonte muda

- No `logcat`, durante o R12, o mesmo processo rodou o `"main"` três vezes
  (rootTag 1, 11 e 21, às 11:23, 11:24 e 11:25). Nas duas últimas, o React
  Navigation avisou com `console.error`: "configured linking in multiple
  places" e "multiple navigation containers consuming the shared imperative
  routing queue".
- **Causa provável:** o `configChanges` da `MainActivity` (gerado pelo Expo)
  não inclui `fontScale`, então o Android recria a Activity quando o tamanho
  da fonte muda. O JavaScript continua o mesmo e monta a raiz de novo antes de
  a antiga sair. Coincide com o R12 (o responsável estava nas Configurações e
  a fonte voltou a 1.15), mas não reproduzi: mudar a fonte é configuração do
  aparelho.
- Não travou nem apareceu nada na tela ("tudo ok"). São avisos do modo de
  desenvolvimento.
- **A ver na Fase 4** (quando o `android/` ganha o módulo nativo): incluir
  `fontScale` (e `density`) no `configChanges` por um config plugin, ou
  confirmar que a recriação não quebra a navegação. Testar mudando a fonte
  com o app aberto.

### Critérios de aceite da Fase 3 (spec 02, seção 7)

| Critério | Evidência | |
|---|---|---|
| Onboarding com as 7 etapas, validações e textos revisados | Passo 4 (PRs #15 a #17, textos aprovados); fluxo (a); R2 e R13 | ✅ |
| Progresso salvo e retomado (R3) | Fluxo (b); testes do passo 4 | ✅ |
| Bloqueio de menores (R1) | Responsável no S22; testes do passo 4 | ✅ |
| Migração 002 em Jest e no aparelho (R10) | `migrations.test.ts` (com a mutação D1); S22 no passo 2 | ✅ |
| Streak, marcos, check-in, recaída e faixas em `src/domain/`, testados | Passo 1 e `overview.ts` (passo 5), com mutação de controle | ✅ |
| Início com os dois cards, check-in, desfazer e recaída | Passo 5 (PR #18); fluxos (a) e (c) | ✅ |
| Perfil com edição de tudo e "Apagar meus dados" | Passo 6 (PR #19); R9; fluxo (d) | ✅ |
| Nenhum termo explícito e nenhum texto fixo | `npm run lint` (regra de texto bruto); R13 | ✅ |
| Pendências herdadas (4.9) | Etapa e respostas salvas: fluxo (b). Sem "Voltar" na primeira tela: fluxos (a) e (d). Teclado na `Screen`: passo 4 e R12. "Apagar" zera o onboarding: fluxo (d). `isAppRoleAllowed`: passo 2 (mutação D2) | ✅ |
| Quatro fluxos Maestro no S22 | `npm run e2e`: 4/4 | ✅ |
| Roteiro R1 a R13 com o responsável | Tabela acima | ✅ |
| `lint`, `typecheck` e `test` no CI; `NOTAS-APP.md` | 32 suítes, 463 testes; CI do PR do passo 7; este arquivo | ✅ |

**Fase 3 pronta para revisão no chat de planejamento.** Pontos para as
próximas fases, além dos já registrados na Fase 2: o AP4 (verificação de
desenvolvedor nas instalações pelo `adb`) e a recriação da Activity quando a
fonte muda (acima).

## Fase 4 · Leitura da spec 03 (07/11/2026)

Spec: `docs/specs/spec-03-monitoramento-alertas-emergencia.md`. Documentos de
partida (PR #21): spec 03 v0.1, doc 01 v0.8 e doc 02 v0.7. Lidos também o
relatório de viabilidade (seções 6.2, 7 e 9.6) e o `prototype/NOTAS.md` (sem
os achados da VPN, A6 a A8, fora do escopo pela D6).

Doze pontos levantados na leitura da v0.1. O responsável aceitou as propostas,
com dois ajustes, e as incorporou na **spec 03 v0.2** (no mesmo PR #21):

| # | Ponto | Decisão | Onde na spec |
|---|---|---|---|
| 1 | Notificação de recomeço | Dia seguinte à quebra: às 9h se o celular estiver em uso; bloqueado, no primeiro desbloqueio depois das 9h. Sem a permissão de uso (nenhum serviço rodando para perceber o desbloqueio), sai às 9h. **Ajuste do responsável:** recaída registrada hoje para ontem **não gera** recomeço (o usuário acabou de ver a mensagem de apoio). Quebra nas duas compulsões no mesmo dia: uma só. "Desfazer" a quebra cancela o recomeço agendado | 5.4, Recomeço |
| 2 | Pausa de 5 min do "Continuar" | Vale para a **compulsão inteira**, em todos os apps de risco dela, como as contagens | 5.2 |
| 3 | App nas duas listas | A tela é da compulsão que **atingiu primeiro o seu limite naquele dia**. Quando ela para de interromper (dia reprovado, alertas ou telas encerrados), a outra passa a valer naquele app, se as regras dela pedirem tela | 5.2 |
| 4 | Tela própria (Activity) como reserva | A sobreposição e a Activity dependem da mesma permissão; sem ela, só a notificação. Com a sobreposição escondida por outro app (I-25), tentar a Activity **uma vez** antes do recuo progressivo | 5.3 |
| 5 | Preventivas: casos-limite | Mais de 4 faixas no dia: as 4 primeiras em ordem de horário. Faixas cobrindo o dia todo: nenhuma preventiva | 5.4 |
| 6 | M16, mudar a fonte com o app aberto | Além de não recriar a tela, o texto precisa acompanhar o novo tamanho. A medir no passo 1; se o React Native não aplicar na hora, voltar com as opções | 7, M16 |
| 7 | Lista de permissões permitidas | Entra a permissão própria do app `<pacote>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (vem do AndroidX). As três do dev client (`ACCESS_NETWORK_STATE`, `ACCESS_LOCAL_NETWORK`, `CHANGE_WIFI_MULTICAST_STATE`) só na variante de desenvolvimento; prévia e produção pela lista estrita | 5.8 |
| 8 | Agendamento sem alarme exato | **Ajuste do responsável:** `AlarmManager` em modo inexato que dispara também em economia profunda (`setAndAllowWhileIdle`), **sem WorkManager**. Tolerância de 15 min; em economia profunda o atraso pode ser maior, e isso é aceito | 5.4 |
| 9 | AP4 e o relatório 9.5 | O relatório diz que a instalação por `adb` não é afetada, mas o S22 recusou instalações em 07/11 (AP4). Investigar pela documentação oficial e trazer os passos; registrar pacotes no Play Console é ação do responsável. Divergência em DV2 | 5.12 |
| 10 | Chamada recebida com a tela de interrupção aberta | A tela nunca cobre uma chamada: sai e volta depois, se ainda fizer sentido. Sem permissão nova (o estado da chamada vem do `AudioManager`). Novo item **M20** no roteiro | 5.3; 7, M20 |
| 11 | Kwai | Confirmar no S22 os pacotes dos apps instalados; se algum não estiver (ex.: Kwai), registrar quais foram confirmados | 5.1 |
| 12 | Doc 01 v0.8 citava o doc 02 como v0.6 | Corrigido pelo responsável no próprio doc 01 v0.8 (agora cita a v0.7) | — |

**Próximo:** passo 1 (base nativa) na branch `fase4/base-nativa`, depois do
merge do PR #21.

## Fase 4 · Passo 1 · Base nativa (07/11/2026)

Branch `fase4/base-nativa`. Escopo da spec 03 (seção 6, passo 1): módulo
`modules/monitoring-android/` a partir do protótipo (sem VPN), serviço, receptor
de boot, `fontScale` no `configChanges`, manifesto com a lista de permitidas e a
investigação do AP4.

### Documentação oficial conferida (07/11/2026)

- **Tipos de serviço em primeiro plano** (developer.android.com, "Foreground
  service types"): `specialUse` exige `FOREGROUND_SERVICE_SPECIAL_USE`, não tem
  pré-requisito em tempo de execução nem limite de tempo, e pede a `<property>`
  `PROPERTY_SPECIAL_USE_FGS_SUBTYPE`, lida na revisão do Play Console. Os tipos
  proibidos de iniciar pelo `BOOT_COMPLETED` (apps para Android 15+) são
  `dataSync`, `mediaPlayback`, `mediaProjection`, `phoneCall`, `camera` e
  `microphone`: o `specialUse` não está na lista.
- **Início em segundo plano** ("Restrictions on starting a foreground service
  from the background"): `ACTION_BOOT_COMPLETED`, `ACTION_LOCKED_BOOT_COMPLETED`
  e `ACTION_MY_PACKAGE_REPLACED` estão entre as exceções. Ter
  `SYSTEM_ALERT_WINDOW` só vale como exceção no Android 15+ com uma sobreposição
  visível naquele momento.
- **Módulos locais do Expo** (docs.expo.dev, "Get started"): ficam em
  `modules/` e o autolinking os encontra sozinho. Conferido com
  `npx expo-modules-autolinking resolve --platform android`: aparece
  `monitoring-android`, classe `br.com.quedo.monitoring.MonitoringModule`.
- **`AppOpsManager`**: `unsafeCheckOpNoThrow` ficou obsoleto na API 36, que
  voltou a recomendar `checkOpNoThrow`. O código escolhe por versão.

### O que veio do protótipo e o que mudou

| Protótipo (`lab-monitoring`) | App (`monitoring-android`) |
|---|---|
| `UsageReader.getUsageTodayFromEvents` e `currentForegroundPackage` | `UsageTimeline` (Kotlin puro, testado em JUnit) + `UsageReader` (só a conversa com o Android). Uma passada só devolve o total do dia e o app na tela |
| Lia os eventos a partir da meia-noite | **Borda do dia explícita:** lê 24 h antes da meia-noite e corta cada intervalo em `[início do dia, agora]`. Um app aberto antes da meia-noite conta só a parte de hoje (o protótipo perdia esse uso) |
| Tela inicial contada como app (I-8) | **Lançadores fora:** pacotes que respondem a `MAIN`/`HOME` com prioridade >= 0 (o `FallbackHome` das Configurações fica de fora; ver "No aparelho"), com o `<queries>` correspondente |
| `startOfToday` com `Calendar` | `DayBoundary` com `java.time` (`atStartOfDay`), igual a `src/domain/day.ts`: dia de 23 e 25 horas e meia-noite inexistente (04/11/2018) testados em JUnit. Os vetores compartilhados com o Jest entram no passo 3 |
| `UsageLimitService` com as regras do A2 a A5 | `MonitoringService` só com o laço de verificação (20 s, como no protótipo) e o **contador de verificações**. As regras entram no passo 3; o acúmulo incremental e o desconto do tempo diante da tela, nos passos 3 e 4 |
| `LimitConfig` | `MonitoringState`: ligado ou não, criações do serviço, verificações, último boot e o resultado. Nada que identifique app ou compulsão |
| `BootReceiver` com `EventLog` | Mesmo gatilho (`BOOT_COMPLETED` e `MY_PACKAGE_REPLACED`); só religa com o monitoramento ligado **e** o acesso ao uso concedido; grava o resultado no estado (os eventos com identificador vêm no passo 2) |
| VPN, `BrowserSessionTracker`, `HIDE_OVERLAY_WINDOWS`, log de laboratório, iOS | Fora (D6 e spec 03, seção 5.1). O módulo declara só `android` no `expo-module.config.json` |
| Textos fixos no Kotlin | Mínimo neutro em `res/values/strings.xml` (canal "Proteção", "Quedo", "Proteção ativa."). Os definitivos chegam pelo `configure` no passo 2 |

O `getMonitoring()` **continua devolvendo o falso** neste passo: a troca pelo
nativo muda o onboarding e o Início (permissões reais), que é o passo 7. Para
conferir a base no aparelho, há uma tela só de desenvolvimento
(`app/dev-monitoring.tsx`, Perfil → "Monitoramento (base)"), que vira parte das
ferramentas de teste do passo 8.

### Permissões declaradas pelo módulo

`PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS` e
`RECEIVE_BOOT_COMPLETED`, todas da lista da spec 03 (5.8). Nenhuma fora dela.

### Lista de permitidas (`scripts/check-manifest.js`)

- Permitidas: as oito da spec 03 (5.8) e a `<pacote>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
  do próprio pacote do manifesto.
- Só no pacote `.dev`: `ACCESS_NETWORK_STATE`, `ACCESS_LOCAL_NETWORK` e
  `CHANGE_WIFI_MULTICAST_STATE`.
- Proibidas, somadas às anteriores: `QUERY_ALL_PACKAGES`, `SCHEDULE_EXACT_ALARM`,
  `USE_EXACT_ALARM` e `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- A variante sai do atributo `package` do manifesto mesclado. Sem ele, vale a
  lista estrita.
- Mutação de controle: com a checagem da lista desligada, 5 dos 13 testes
  falham.

### `fontScale` e `density` no `configChanges`

Config plugin `plugins/with-font-scale-config-changes.js` (testado em Jest).
Depois do prebuild, o `AndroidManifest.xml` gerado traz
`...|assetsPaths|fontScale|density`.

### Testes JUnit

- 15 testes JUnit (borda do dia, reconstrução do uso e lançadores).
- `junit:junit:4.13.2` só como `testImplementation` do módulo: não vai para o
  APK. É a biblioteca de testes padrão do Android.
- Comando (depois do prebuild): `cd android && gradlew.bat :monitoring-android:testDebugUnitTest`.
  Resultado em `modules/monitoring-android/android/build/test-results/`.
- **Só localmente, por enquanto.** No CI, o módulo precisaria do projeto
  `android/` gerado e do Gradle do Expo (prebuild + download do Android SDK).
  A decisão sobre o CI fica para o passo 3, quando os vetores compartilhados
  entram e o JUnit passa a ter mais peso (spec 03, seção 5.13).

### Para o passo 4: justificativa do `specialUse` (pedido do responsável, 07/11/2026)

Quando a tela de interrupção entrar (passo 4), atualizar a justificativa do
`specialUse` em dois lugares:
- a `<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE">`
  do `modules/monitoring-android/android/src/main/AndroidManifest.xml`;
- `docs/rascunhos/play-console-justificativas.md` (seções 2 e 3).

O texto atual fala só do limite diário e do lembrete. Precisa mencionar
também **a tela de pausa** (a interrupção sobre o app) e **os apps que o
usuário escolheu como de risco** (o limite de 10 minutos por app), porque o
revisor do Google compara o que está declarado com o comportamento do app.

### AP4: resultado da investigação (spec 03, seção 5.12)

- **Documentação oficial** (FAQ da verificação de desenvolvedor,
  developer.android.com/developer-verification/guides/faq, lido em 07/11/2026):
  "As a developer, you are free to install apps without verification with
  ADB", e o período de espera do fluxo avançado "does not apply to ADB
  installs". Ou seja, o desenho oficial é que a instalação pelo `adb` não
  precise de registro, como diz o relatório (seção 9.5).
- **Registrar `.dev` e `.preview` no Play Console não resolve nem é
  necessário:** o registro serve à distribuição (lojas e instalação direta) e
  exige provar a posse da chave de assinatura do pacote. Os builds de
  desenvolvimento são assinados com a chave de depuração da máquina, e o
  `.preview` nunca vai à loja. A FAQ não menciona nenhum registro para builds
  de desenvolvimento.
- **O que vimos em 07/11 é outra coisa:** a recusa veio do Play Protect
  (`Finsky`, `VerifyApps`), que não recebeu a resposta do serviço de
  verificação em 5 s e recusou por padrão (`Verification task timed out`). A
  regra oficial não muda isso; é uma falha de tempo da consulta, intermitente.
- **Conclusão:** não há ação no Play Console. Seguimos tentando de novo quando
  acontecer (AP4). Desligar "Verificar apps via USB" nas opções do
  desenvolvedor provavelmente evitaria a consulta, mas é configuração de
  segurança do aparelho e decisão do responsável; não recomendo sem
  necessidade, porque a falha é rara.
- A DV2 continua aberta só como registro: o relatório está certo quanto à
  regra; vale acrescentar a ele a nota da recusa por tempo esgotado.
- No build de hoje (13:52), a instalação pelo `adb` passou na primeira.

### No aparelho (S22)

- `installDebug` instalou às 13:52 (`dumpsys package`: as cinco permissões
  novas declaradas; `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` e
  `RECEIVE_BOOT_COMPLETED` concedidas na instalação, como é normal para
  permissões comuns).
- `npm run check:manifest`: os três manifestos mesclados do build de
  desenvolvimento passam (pacote `br.com.quedo.app.dev`).
- Tela "Monitoramento (base)": o módulo nativo responde; permissões lidas do
  sistema (as três negadas neste momento); `MY_PACKAGE_REPLACED` recebido às
  13:52:46, com o monitoramento desligado ("estava desligado").
- **Pacotes da Fase 3 confirmados no S22** (spec 03, 5.1): Instagram
  (`com.instagram.android`), TikTok (`com.zhiliaoapp.musically`), YouTube,
  Kwai (`com.kwai.video`), X e Reddit, todos instalados e achados pela
  consulta MAIN/LAUNCHER. O segundo pacote do TikTok
  (`com.ss.android.ugc.trill`, outra região da loja) não está instalado, como
  esperado.
- **Permissões e serviço (responsável, 14:11):** acesso ao uso e notificações
  concedidos pela tela; "Ligar o serviço" às 14:11:48. O `logcat` registrou
  `Background started FGS: Allowed ... uidState: TOP` (iniciado com o app na
  tela). `dumpsys activity services`: `isForeground=true`,
  `types=0x40000000` (`specialUse`), notificação no canal `monitoring`. 6
  verificações até 14:13:28, no ritmo de 20 s.
- **Lançadores (achado novo):** no S22, a intenção HOME devolve o One UI Home
  (prioridade 0) **e** `com.android.settings/.FallbackHome` (prioridade
  -1000), a tela de reserva do boot. A primeira versão descontava as duas, e
  o app de Configurações sumia do uso. Corrigido com `Launchers.select`
  (só prioridade >= 0), com teste JUnit. Depois da correção: "Config.: 2 min"
  na lista, One UI Home fora.
- **Morte do processo (I-31):** `run-as br.com.quedo.app.dev kill -9` às
  14:15:06 com o serviço ligado. O sistema recriou o processo e o serviço em
  ~6 s (pid novo, `restartCount=1`, de novo em primeiro plano). O estado em
  disco continuou: `serviceStarts` 1 → 2, verificações seguindo de 11 para 15
  em ~80 s.
- **Atualização do app com o monitoramento ligado:** a reinstalação das
  14:18:24 disparou o `MY_PACKAGE_REPLACED`, e o receptor religou o serviço
  sozinho (`lastBootResult = started`, `serviceStarts` 3, em primeiro plano).
- **M16, mudança de fonte com o app aberto:** a fonte foi de 1.15 para 2.0 às
  14:12:31 e voltou às 14:12:46. A janela da `MainActivity` é a mesma antes e
  depois (`Window{91d9c9f ...}` às 14:11:19, 14:12:35 e 14:12:44), no mesmo
  processo, e o Metro não registrou nenhum aviso do React Navigation: a
  Activity **não foi recriada**.
- **M16, confirmação do responsável:** o texto do app acompanhou o novo
  tamanho na hora. Com a Activity mantida (acima), o M16 está atendido.
- **M14, reinício do S22 (responsável, 07/11):** com o serviço ligado.
  `/proc/uptime` dá o boot por volta de 14:26:25; `boot_progress_enable_screen`
  às 14:27:29. O receptor recebeu o `BOOT_COMPLETED` e religou o serviço às
  14:28:59 (`Background started FGS: Allowed ... uidState: RCVR`), ~2,5 min
  depois de ligar, a mesma janela cega do A9. Estado em disco preservado
  (`active`, `serviceStarts` 4, verificações seguindo de 45),
  `lastBootResult = started`, serviço em primeiro plano. Os agendamentos do
  M14 entram no passo 5.

- **JUnit:** 15 testes (3 da borda do dia, 10 da reconstrução do uso, 2 dos
  lançadores), todos passando. Mutação de controle: sem o corte da
  meia-noite, 2 falham.

## Fase 4 · Passo 2 · Configuração e eventos (07/11/2026)

Branch `fase4/config-eventos`. Escopo da spec 03 (seção 6, passo 2):
`configure`, persistência em disco, eventos com identificador, importação
idempotente no JS e migração 005.

### Como ficou

```
banco (JS) ──buildMonitoringConfig──> configure(JSON) ──> ConfigStore (nativo, em disco)
nativo ──EventStore (arquivo, 1 JSON por linha, id único)──> getPendingEvents
JS: parseNativeEvents → importEvents (transação por evento) → acknowledgeEvents
```

- **Configuração** (`MonitoringConfig` em `src/monitoring/types.ts`, montada em
  `src/features/monitoring/config.ts`): versão; por compulsão, o tipo, o
  dia-base da streak e o último dia com check-in respondido; um limite somado
  por compulsão de vídeos; um limite de 10 min por app de risco, com a tela só
  onde o usuário declarou consumir; horário do check-in (só com abstinência
  ativa); preventivas (dias, até 4 horários já unidos, emoções); motivação; e
  os textos do nativo, do i18n (`src/i18n/pt-BR/monitoring.json`). Compulsão
  pausada fica de fora. Cresce a cada passo, com a versão.
- **Nativo:** `ConfigStore` guarda a última configuração válida
  (`ConfigValidation` confere versão, listas e textos; uma inválida é recusada
  com `ERR_INVALID_CONFIG` e a anterior fica). A notificação permanente e o
  nome do canal já usam os textos dela, com o `strings.xml` como reserva.
- **Eventos:** `EventLog` (Kotlin puro) grava um JSON por linha com `id`
  (UUID), `at`, `dayKey` (borda do dia do nativo) e `type`. Escrita por arquivo
  temporário e troca, para uma morte no meio não deixar o arquivo pela metade.
  Teto de 2000 eventos (os mais antigos saem). Neste passo o nativo só grava
  `service_started`, com a origem `app`, `boot`, `update` ou `restart` (sem
  intent: o sistema recriou o serviço). Os outros tipos entram nos passos 3 a
  7, e o JS já sabe importar todos.
- **Importação** (`repositories.monitoringEvents.importEvents`), um evento por
  transação, pulando os que já estão em `imported_events`:
  - `check_in_answered` → check-in com `source = 'notification'` e, na
    recaída, a recaída do dia, como pelo app (com o instante do evento);
  - `day_failed` → `day_states.failed` com o motivo;
  - `interruption_shown` → linha em `interruption_events` e
    `day_states.interruptions + 1` (nas duas mecânicas: contagem por
    compulsão, spec 03, 5.2);
  - `interruption_response` → completa a mesma linha (só a primeira resposta
    vale) e, no "Continuar", `continues + 1`;
  - os outros (`service_started`, `limit_reached`, `notification_sent`,
    `emergency_requested`, `permission_lost`) ficam só como importados;
  - evento de compulsão apagada: confirmado sem efeito. Evento que falha (ex.:
    reprovação na abstinência): confirmado sem efeito e contado, para não
    travar a fila. O JS registra só as contagens, sem dados.
- **Eventos malformados** (`parseNativeEvents`, campo a campo): não entram no
  banco, mas são apagados do nativo também.
- **Quando sincroniza** (`useMonitoringSync`, no layout raiz): ao abrir o app,
  ao voltar do segundo plano e 300 ms depois de qualquer gravação no banco.
  Uma rodada por vez. As gravações são percebidas por `observeRepositories`
  (`src/data/changes.ts`): toda função de repositório que não começa com
  `list`/`get` avisa depois de gravar. Um teste confere a lista de funções que
  gravam, para uma nova não passar despercebida.
- **"Apagar meus dados"** chama antes o `reset()` do nativo: para o serviço e
  apaga configuração, estado e eventos pendentes (spec 03, 4.4).

### Decisão: configuração e eventos já reais, permissões ainda falsas

`getMonitoring()` continua devolvendo o falso (as permissões reais mudam o
onboarding e o Início e são o passo 7). A sincronização usa
`getMonitoringSync()`, que no Android já é o nativo (`AndroidMonitoringSync`) e
nos testes e no iOS é o falso. Configuração e eventos não mudam nada que o
usuário veja, então dá para conferi-los no aparelho desde já. No passo 7 os
dois pontos viram um só.

### Migração 005 (`drizzle/0004_fase4_monitoring.sql`)

- Só `CREATE TABLE` (`interruption_events`, `emergency_sessions`,
  `imported_events`), sem `__new_`. Renomeada como as anteriores.
- CHECKs novos: resposta e origem e resultado dentro das listas, e resposta e
  horário (`responded_at`, `ended_at`) sempre juntos.
- `interruption_events` é filha de `user_compulsions`: entrou em
  `FIXTURE_ROWS`. O teste das tabelas filhas acusou a falta antes disso, como
  deve.
- `emergency_sessions` só ganha repositório no passo 6.

### Bibliotecas

- `org.json:json:20240303` só como `testImplementation` do módulo: o
  android.jar dos testes locais tem só esboços do `org.json`, que falham ao
  ser chamados. Não vai para o APK.

### Testes

- Jest (550 no total, 41 suítes): domínio das preventivas; leitura dos eventos; falso;
  adaptador nativo; montagem da configuração; sincronização (ordem,
  confirmação só depois de gravar, rodada única); aviso de gravações;
  importação; migração 005 (tabelas, restrições, cascata).
- JUnit (26): `EventLog` (id único, confirmação, persistência, teto, linhas
  ilegíveis) e `ConfigValidation`.
- Mutações de controle: sem a checagem de "já importado", 2 testes da
  importação falham; com o `acknowledge` sem apagar, 1 teste JUnit falha.

### No aparelho (S22)

- O Metro parado antes do build e subido depois (AP5): sem travar desta vez.
- `installDebug` às 15:05. Com o monitoramento ligado, a atualização gravou
  `service_started` com `origin: "update"` no arquivo de eventos.
- Ao abrir o app: a fila esvaziou, o evento apareceu em `imported_events` e a
  configuração chegou ao nativo (`quedo-monitoring-config.xml`) com os dados
  do responsável (duas compulsões, um limite de vídeos de 45 min com 4 apps, X
  e Reddit como risco com tela, check-in 21:30, preventivas e textos).
- Banco: as 5 migrações aplicadas sobre o banco com dados; compulsões, apps,
  gatilhos e motivação preservados.
- Canal da notificação permanente renomeado para "Acompanhamento", vindo da
  configuração.
- Morte do processo (`kill -9`): serviço recriado em ~3 s, evento com
  `origin: "restart"` pendente com o app fechado e importado ao abrir.
- Gravação no banco reenvia a configuração: "Sem recaída" no Início levou o
  `checkInAnsweredDayKey` a 2026-11-07; "Desfazer" o devolveu a nulo (estado
  do responsável restaurado).
- **Não testado no aparelho:** "Apagar meus dados" com o `reset()` do nativo
  (apagaria os dados de teste do responsável). Fica para o roteiro, junto com
  o fluxo (d) do Maestro.

### Comandos úteis

- Fila de eventos do nativo:
  `adb shell run-as br.com.quedo.app.dev cat files/quedo-monitoring-events.jsonl`
- Configuração guardada:
  `adb shell run-as br.com.quedo.app.dev cat shared_prefs/quedo-monitoring-config.xml`

## Fase 4 · Passo 3 · Regras do momento (08/11/2026)

Branch `fase4/regras`. Escopo da spec 03 (seção 6, passo 3): máquina de estados
da seção 5.2 no Kotlin, com vetores compartilhados e JUnit, e a borda do dia.
Mais o ajuste pedido pelo responsável no `EventLog`.

### Ajuste no `EventLog` (pedido do responsável, 08/11/2026)

Os eventos que mudam a streak (`day_failed` e `check_in_answered`) nunca saem
pelo teto de 2000. Acima do teto, saem os mais antigos dos demais. Só esses dois
tipos podem fazer o arquivo passar do teto, e são no máximo alguns por dia.

### Como ficou

```
verificação (20 s) → UsageAccumulator (só os eventos novos) → MomentRules.tick → ações
tela apareceu → MomentRules.shown · resposta → MomentRules.respond (passo 4)
```

- **`MomentRules.kt`:** a tabela da 5.2, com o estado num JSON. As ações são
  `limit_reached`, `show_interruption` (com `canIgnore` e `warnsEndOfDay`) e
  `day_failed`.
- **`UsageAccumulator.kt`:** o acúmulo incremental (correção do doc 02, 4.1).
  Lê só os eventos novos, repetindo os últimos 10 s, com impressões digitais
  para não contar duas vezes (sem isso, um PAUSED atrasado se perderia e o app
  contaria como aberto até a tela apagar). Já desconta o tempo diante da tela de
  interrupção (`suspend`/`resume`), que o passo 4 vai chamar. O `UsageTimeline`
  passou a usar a mesma conta, para não haver duas versões da regra do STOPPED.
- **`MomentRunner.kt`:** liga tudo ao serviço, com o estado em disco. Por
  enquanto, `limit_reached` vira só evento (a notificação é do passo 5) e
  `show_interruption` só fica registrado para a tela de desenvolvimento (a tela
  é do passo 4).
- **Vetores** em `src/domain/vectors/`: `moment-rules.json` (26 cenários) e
  `day-boundary.json` (8 casos, com horário de verão). O JUnit os recebe pelo
  `systemProperty` `quedo.vectors` do `build.gradle` e passa o estado por JSON a
  cada passo, para provar que sobrevive à morte do processo.

### Decisão: as regras também existem em TypeScript

A spec pede vetores "passando em JUnit e Jest" (seção 8). Para o Jest ter o que
rodar, `src/domain/momentRules.ts` repete as regras. **Não entra no bundle:
nenhum código do app importa esse arquivo.** Os vetores são o que impede as duas
versões de divergirem.

### Interpretações da spec

Casos 1, 2, 3, 5 e 6 aprovados pelo responsável na revisão do PR #24 (08/11/2026); o 4 mudou.

| Caso | O que ficou | Por quê |
|---|---|---|
| App nas duas listas, a primeira compulsão em pausa | A outra não entra no lugar | A spec só libera a outra quando a primeira "para de interromper" (dia reprovado, alertas ou telas encerradas); pausa não é isso |
| App nas duas listas, app de risco **não declarado** atingiu primeiro | A tela é da moderação | Quem nunca gera tela não "interrompe": senão, ninguém interromperia |
| As duas atingem o limite na mesma verificação | Vale o menor id de compulsão | A spec não define; precisava ser determinístico nos dois lados |
| Limite aumentado no meio do dia | **Mudou na revisão do PR #24:** ver "Aumento do limite só vale no dia seguinte", no passo 4 | |
| Abstinência, 3º "Continuar" | Encerra as telas, mas os avisos de 10 min de outros apps de risco seguem | A spec encerra só "a tela" |
| Aviso de que o 3º "Continuar" encerra a meta | Só na moderação | Está só na tabela da moderação |

### CI do JUnit (decisão pendente desde o passo 1)

Novo workflow `android-unit.yml`: gera o `android/` e roda só
`:monitoring-android:testDebugUnitTest`, sem compilar o C++ nem o APK. Só dispara
quando mudam `modules/**` ou `src/domain/vectors/**`, porque leva bem mais que o
CI principal.

### Testes

- Jest: 587 no total (37 novos: 26 cenários e 8 casos da borda do dia, nos vetores, mais a tela de desenvolvimento).
- JUnit (42): vetores, `UsageAccumulator` (11), `EventLog` (8, com os 2 do teto).
- **Mutações de controle**, cada uma derruba testes:
  - Kotlin: tela de quem atingiu por último; sem pausa; tela na mesma verificação
    do aviso; sem zerar no dia novo; acumulador sem crédito;
  - `EventLog` sem a proteção da streak (2 falham);
  - TypeScript: tela de quem atingiu por último (5 falham); sem pausa (4 falham);
  - acumulador sem deduplicar: **a primeira versão do teste não pegava**, porque
    repetia só o PAUSED. Reforçado para repetir o RESUMED também, dentro da
    janela de 10 s.

### No aparelho (S22, 08/11)

- Com o limite de teste de 1 minuto, YouTube aberto às 12:25:12: `limit_reached`
  às 12:26:28, e o pedido de tela às 12:26:48, na verificação seguinte (20 s).
- `kill -9` com o limite já atingido: serviço de volta em ~4 s, estado lido do
  disco (mesmo `reachedAt`), sem repetir o `limit_reached`, e o evento `restart`
  gravado.
- Atualização do app com o monitoramento ligado: `origin: "update"`.
- Ao abrir o app: fila de eventos zerada. Limite de teste desligado no fim.
- **Não dá para testar no aparelho ainda:** respostas da tela, pausa, reprovação
  e app nas duas listas (precisam da tela do passo 4). Estão cobertos pelos
  vetores nas duas linguagens.

### Ferramenta de teste

"Usar limite de 1 minuto" na tela de desenvolvimento (`setTestLimit`). O nativo
ignora em build não depurável (`FLAG_DEBUGGABLE`). Adiantado do passo 8 porque,
sem ele, conferir a regra exigiria 45 minutos de uso real.

### Problemas

- **AP3 de novo:** `installDebug` parado por mais de 10 min com o `adb` travado.
  Resolvido pelo procedimento registrado (matar o `adb.exe`, `adb start-server`,
  `adb install -r`).
- O AP5 não voltou com o Metro parado antes do build.

## Fase 4 · Passo 4 · Tela de interrupção (08/11/2026)

Branch `fase4/tela-interrupcao`.

### Aumento do limite só vale no dia seguinte (decisão do responsável, 08/11/2026)

Revisão do PR #24: aumentar o limite de vídeos curtos só vale a partir do dia
seguinte; diminuir vale na hora. Na tela de edição, um aumento mostra "O novo
limite começa a valer amanhã.".

- **Por quê:** sem isso, aumentar o limite seria um jeito de escapar do alerta do
  dia.
- **Regra** (`src/domain/dailyLimit.ts`, testada): um valor maior que o limite
  **em vigor hoje** é aumento. Aumentar duas vezes no dia mantém o limite da
  manhã. Reduzir abaixo do de hoje vale na hora e apaga o aumento pendente.
  Reduzir e voltar a aumentar no mesmo dia não recupera o limite antigo.
- **Migração 006** (`drizzle/0005_daily_limit_raise.sql`): só `ALTER TABLE ADD` em
  `user_compulsions` (`previous_daily_limit_minutes` e `daily_limit_raised_on`).
- **Só no Perfil:** `changeDailyLimit`. O onboarding e "Adicionar compulsão" usam
  `setDailyLimit`, que vale na hora, porque ali não há limite anterior a proteger.
- **Por que no banco, e não só no estado do nativo:** o Início precisa mostrar o
  limite em vigor (no dia do aumento, ainda o antigo), e o nativo precisa virar
  para o novo à meia-noite com o app fechado. A configuração leva os dois:
  `dailyLimitMinutes` (o novo) e `limitToday` (dia e minutos, só no dia do
  aumento). As regras escolhem pelo dia, sem estado a mais.
- **Vetores:** três cenários novos (aumento depois de atingir, aumento antes de
  atingir, redução), nas duas versões das regras.
- **Mutação de controle:** ignorar o `limitToday` derruba testes no Jest e no
  JUnit.

### Tela de interrupção

Documentação oficial conferida em 08/11/2026 (voltar preditivo, início de
Activity em segundo plano, `AudioManager`).

- **`InterruptionScreen`:** a tela, em código, usada pelas duas formas. Fundo
  opaco, identidade "Quedo", frase de apoio (varia a cada tela do dia),
  motivação, botões da spec 5.2, texto em sp, rolagem para a fonte no máximo e
  leitor de tela começando no título. Cores em `res/values` e `values-night`,
  iguais aos tokens (um teste Jest confere).
- **`InterruptionPresenter`:** mostra, confere e tira.
  - **Só conta se apareceu (I-28):** o `interruption_shown` sai depois de conferir
    foco da janela e visibilidade, ou seja, não no pedido.
  - **20 s sem aparecer:** descarta.
  - **`InterruptionAttempts`** (Kotlin puro, JUnit): sobreposição escondida →
    tela própria uma vez → recuo de 1, 2, 5 e 15 min. Zera quando aparece ou
    quando o usuário sai dos apps monitorados.
- **Chamada:** com a sobreposição aberta, o modo do `AudioManager` é conferido a
  cada segundo (sem permissão). Em chamada, a tela sai sem resposta e nenhuma nova
  é pedida. Volta na verificação seguinte depois da chamada, se ainda fizer sentido.
- **Usuário saiu do app com a tela aberta** (gesto de início): sai sem resposta.
  **Com a tela do aparelho apagada, ela fica**, para não contar outra tela ao
  desbloquear.
- **Voltar:** a raiz da sobreposição consome a tecla e registra um
  `OnBackInvokedCallback`; a tela própria liga `enableOnBackInvokedCallback` só
  para si (o app segue com o voltar preditivo desligado, decisão de 02/11).
- **Uso:** o tempo com a tela na frente não conta (`suspend`/`resume`). Se o
  processo morrer com a tela aberta, o serviço volta a contar ao nascer.
- **Sem `FLAG_KEEP_SCREEN_ON`** (o protótipo tinha): a tela não deve impedir o
  aparelho de apagar.
- **Emergência:** por enquanto só abre o app e grava `emergency_requested`; a rota
  é do passo 6.
- **Sem a permissão de sobreposição:** não há tela (a notificação é do passo 5).
- **Regras:** nova função `exited` (tela saiu sem resposta: só a carência), com
  vetor nas duas versões.
- **Versão da configuração:** continua 1. Só precisa mudar depois da primeira
  publicação, porque antes não há aparelho com configuração antiga. (Correção do
  que está no passo 2.)

### Justificativa do `specialUse` (pedido do responsável)

Atualizada no manifesto e em `docs/rascunhos/play-console-justificativas.md`
(seções 2 e 3): menciona a tela de pausa e os apps marcados como de risco.

### Textos novos (`src/i18n/pt-BR/monitoring.json`)

Listados no PR para revisão.

### Testes

- Jest: 608. JUnit: 46 (`InterruptionAttempts`, novos vetores).
- Mutação de controle: sem a tentativa da tela própria, 3 testes JUnit falham.

### No aparelho (S22, 08/11, com o limite de teste de 1 minuto)

- Sobreposição sobre o YouTube, com `interruption_shown` só depois de conferida.
- Voltar (`KEYCODE_BACK`) não fecha, na sobreposição e na tela própria.
- "Ir para a tela inicial" leva ao lançador; reabrir o app gera nova tela, com
  outra frase.
- "Emergência" abre o app e não pausa.
- Com a tela aberta, o uso quase não anda: 0,6 s em 25 s.
- Importação: as telas e as respostas chegam a `interruption_events`.
- **Reserva (I-25), com o `labtarget` do protótipo** (`setHideOverlayWindows`),
  incluído só para o teste no banco de desenvolvimento e removido depois:
  sobreposição escondida às 14:12, descartada em 20 s **sem contar**; na
  verificação seguinte, tela própria, que contou, mostrou "Ignorar" (3ª tela) e,
  com "Continuar", devolveu ao app e iniciou a pausa, sem nova tela em 38 s.
- **AP3 de novo** no `adb`, com o `assembleDebug` seguido de `adb install -r`:
  mesmo procedimento.

### Testes do responsável no S22 (08/11)

- Aprovados: aparência e textos da tela, gesto de voltar na sobreposição, tema
  escuro e fonte no máximo (M18) e a mensagem "O novo limite começa a valer
  amanhã.".
- **M20 (chamada) não testado:** o S22 está sem chip. O código confere o modo do
  `AudioManager`, mas isso **não foi visto funcionando**. Pendente para o roteiro
  final (passo 8): uma ligação simulada no emulador (`adb emu gsm call`) cobre a
  chamada telefônica; WhatsApp ou Teams, instalados no S22, cobrem a chamada
  pela internet, cujo modo de áudio ao tocar ainda é uma incógnita.
- **M17 (voltar preditivo) conferido num build temporário** (08/11): só o
  `android:enableOnBackInvokedCallback` do `android/` gerado virou `true`, sem
  mudar o `app.config.ts`, e voltou a `false` depois. Gesto real de borda
  (`adb shell input swipe` a partir da borda, que o sistema trata como voltar):

  | Tela | Voltar preditivo | Caminho no `logcat` | Resultado |
  |---|---|---|---|
  | Sobreposição | Ligado | `onBackInvoked, callback=InterruptionRootView` | Não fecha, nas duas bordas |
  | Tela própria | Ligado | `onBackInvoked, callback=InterruptionRootView` | Não fecha, nas duas bordas |
  | Sobreposição | Desligado (como o app sai) | `OnBackInvokedCallback is not enabled` e o callback de compatibilidade do `ViewRootImpl` | Não fecha |

  O aviso da última linha confirma que a sobreposição, por não ser Activity, segue
  o valor do app. O app continua com o voltar preditivo desligado (decisão de
  02/11): ligar de vez é outra decisão, porque muda o voltar de todas as telas.

### Cuidado: copiar o banco para o aparelho

Com o `adb` travado (AP3), `adb exec-out ... cat app.db > app.db` grava um arquivo
de **0 byte** sem dar erro. Em 08/11 um script meu seguiu adiante e mandou copiar
esse arquivo de volta. O banco só escapou porque o `adb` também travou na cópia.
Antes de escrever no aparelho: conferir o tamanho do arquivo lido, abrir o banco e
guardar uma cópia.

## Fase 4 · Passo 5 · Notificações (08/11/2026)

Branch `fase4/notificacoes`.

### Como ficou

- **`NotificationPlan`** (Kotlin puro, JUnit): o que sai agora e quando acordar,
  com o estado em JSON. Um alarme só por vez, o do próximo lembrete ou, no máximo,
  o da meia-noite.
- **`NotificationCenter`:** envia, grava `notification_sent`, agenda. Roda no alarme,
  ao receber configuração, no boot, ao atualizar o app e quando o relógio ou o fuso
  mudam. Check-in, preventivas e recomeço **não dependem do serviço**.
- **`Notifier`:** três canais (Acompanhamento, baixa; Avisos, alta; Lembretes,
  padrão) e **versão pública neutra** em todas as notificações.
- **Check-in:** "Sem recaída" e "Tive uma recaída" gravam `check_in_answered` sem
  abrir o app. Removida à meia-noite se não respondida; sem repetição.
- **Preventivas:** a frase alterna entre uma genérica, uma por emoção declarada e
  uma com a motivação (o nativo troca o marcador `{motivation}`). Limite de 4, e 6
  no total, com vaga garantida para check-in e recomeço.
- **Recomeço:** `src/domain/restart.ts` calcula os dias pendentes a partir do banco,
  então desfazer a quebra cancela. Quebras vistas pelo nativo antes da importação
  (resposta na notificação, dia reprovado) ficam em `nativeRestartDays`, e o
  dia-base da streak da configuração diz se havia streak a perder. Com o aparelho
  bloqueado, espera o desbloqueio; a verificação do serviço (a cada 20 s) percebe.
  Sem serviço, sai às 9h.
- **Proteção pausada:** pronta, no máximo uma por dia por motivo, abrindo
  `/permission-status`. Quem chama é a vigilância, no passo 7.
- **"Emergência"** abre o app por `PendingIntent` direto (uma ação de notificação não
  pode abrir tela a partir de um receptor, Android 12). A rota própria é do passo 6.

### Alarmes: dois para o mesmo instante

A decisão era `setAndAllowWhileIdle`. No S22, `dumpsys alarm` mostrou que ele recebe
uma **janela proporcional à distância**: 1m52s para um horário a 3 min, e **1 hora**
para um horário a 6 horas, acima da tolerância de 15 min da spec. Fora o
`setAndAllowWhileIdle`, agendo também um `setWindow` de 10 min para o mesmo
instante: o primeiro que disparar faz o trabalho e reagenda os dois. O `setWindow`
cobre o uso normal e o `setAndAllowWhileIdle`, a economia profunda. Nenhum dos dois
pede permissão e nenhum é alarme exato.

### Vetores

`src/domain/vectors/notification-schedule.json` (16 cenários) roda só no JUnit: o
agendamento só existe no nativo, e não fiz uma versão em TypeScript. O cálculo que é
do JS (faixas e dias de recomeço) tem testes próprios no Jest.

### Testes

- Jest: 620. JUnit: 50.
- Mutações de controle, cada uma derruba testes: sem o máximo de preventivas; sem
  descartar a preventiva atrasada; check-in ignorando a resposta no app; ignorando
  os dias marcados; recomeço sem a regra de "registrada hoje para ontem".

### No aparelho (S22, 08/11)

- Pelas ferramentas de teste (`debugFireNotification`, adiantada do passo 8): limite,
  check-in, preventiva, recomeço e proteção pausada, com título, texto, botões e
  versão pública conferidos em `dumpsys notification`.
- **Entrega real:** check-in marcado para 15:35 pelo Perfil, app em segundo plano:
  saiu às 15:35:10.
- **Resposta na notificação:** "Sem recaída" na bandeja gravou o evento sem abrir o
  app e tirou a notificação. Ao abrir, entrou no banco com `source = notification`.
  Desfeito e horário devolvido a 21:30 pelo próprio app.
- Dois alarmes confirmados em `dumpsys alarm` (janelas de 1 h e de 10 min).

### Ainda sem teste no aparelho

M14 (agendamentos depois de reiniciar), M10 ("Tive uma recaída" pela notificação),
M12 (tela bloqueada vista a olho), remoção à meia-noite, recomeço esperando o
desbloqueio e o atraso real em economia profunda. Ficam para o roteiro do passo 8.
Para o M20, o WhatsApp aparece desconectado no S22: sobram o Teams e o emulador.

### Revisão do responsável no PR #26 (08/11/2026)

Aprovados: os dois alarmes (`setAndAllowWhileIdle` e `setWindow` de 10 min, só o
primeiro a disparar envia), os vetores do agendamento só no JUnit e todos os textos
listados no PR.

---

## Fase 4 · Passo 6 · Emergência (08/11/2026)

Branch `fase4/emergencia`. Spec 03, seção 5.5; doc 01, seção 6.7.

### Como ficou

- **Rota `/emergency`** (`app/emergency.tsx`, `src/features/emergency/`), aberta pelo
  botão no Início, pela tela de interrupção e pela ação "Emergência" das notificações.
  A origem vem no endereço (`?source=`) e só valores conhecidos passam
  (`parseEmergencySource`); o resto conta como Início.
- **Etapas:** motivação, 1 min de respiração, 5 min de cronômetro com as três sugestões
  do doc 01 e "A vontade passou?". Sem biblioteca nova: a animação usa o `Animated` do
  React Native, e com "remover animações" o círculo fica parado e só o texto muda.
- **Tempo pelo relógio** (`src/domain/emergency.ts`), não por contagem de tiques: com o
  app em segundo plano ou a tela apagada o JS para, e o tempo continua certo na volta.
- **Links na configuração:** `emergencyFromNotification` e `emergencyFromInterruption`,
  montados pelo JS; o nativo só os abre. A validação em Kotlin exige os dois.
- **Tela única** (`dangerouslySingular`): pedir a emergência com ela já aberta volta ao
  fluxo em curso, sem abrir outra sessão.

### Sessões (`emergency_sessions`)

- Abre ao entrar na tela. "Sim" grava `passed`; "Ainda não", `not_passed`.
- "Sair" e o Voltar do Android gravam `abandoned`.
- **Ir para outro app não abandona:** uma das sugestões é falar com alguém.
- Processo morto no meio: a sessão fica aberta e vira `abandoned` na próxima abertura do
  app (`abandonOpen`, em `initializeDatabase`), quando nenhuma tela tem sessão em curso.
- O evento nativo `emergency_requested` só existe a partir da tela de interrupção. Pela
  notificação, o `PendingIntent` abre o app direto (Android 12), sem passar por código
  nosso; a origem fica na sessão, então nada se perde.

### Interpretações da spec (a confirmar na revisão)

- **"Pular" em todas as etapas:** o doc 01 diz que pular leva direto à pergunta final,
  então vale também na motivação. A própria pergunta é o destino e não tem "Pular"; lá
  só há "Sair", que registra abandono.
- **Fechamento depois da resposta:** a spec para na pergunta. Acrescentei uma frase curta
  e "Voltar ao início", para a resposta não terminar em uma tela sem saída.
- **Aberta a frio:** sem tela atrás, "Sair" e o Voltar levam ao Início, em vez de fechar
  o app.

### Revisão do responsável no PR #27 (08/11/2026)

Aprovados: "Pular" na motivação leva à pergunta final; o fechamento com "Voltar ao
início" fica. Dois ajustes, feitos no começo do passo 7:

- **`expo-keep-awake` (aprovado, 58.0.3):** a respiração e o cronômetro duram 6 minutos,
  e o desligamento automático da tela poderia apagá-la no meio. Biblioteca oficial do
  Expo, que já vinha como dependência do `expo`; agora declarada no `package.json`.
  Ativo só nessas duas etapas.
- **Texto depois de "Ainda não":** acrescentada a frase sobre conversar com alguém de
  confiança ou com um profissional.

### Testes

- Jest: 669. JUnit: 50. `check:manifest` sem alteração.
- Mutações de controle, cada uma derruba testes: `finish` sobrescrevendo sessão
  encerrada; `start` sem encerrar a aberta; abertura sem abandonar órfãs; sair sem
  registrar abandono; resposta sem gravar; "Pular" para a etapa errada; ignorar "remover
  animações"; sem tela única; origem sem validação; "Sair" e Voltar a frio sem ir ao
  Início; durações erradas; Início sem o botão.

### No aparelho (S22, 08/11)

- Pelo Início: motivação, respiração alternando "Inspire" e "Solte o ar" com o círculo
  animado (capturas), passagem automática ao cronômetro depois de 1 min, "Pular",
  "Sim", fechamento e volta ao Início. Sessão `home` / `passed` no banco.
- **Notificação real:** preventiva disparada pela ferramenta, ação "Emergência"
  expandida na bandeja: abriu a rota, com sessão `notification`.
- **Interrupção real:** limite de teste de 1 minuto, tela sobre o YouTube, "Emergência":
  abriu a rota, com sessão `interruption`. Limites reais devolvidos pela ferramenta.
- Link com o fluxo já aberto: continuou no fluxo, sem segunda sessão.
- Voltar do Android e "Sair": `abandoned`.
- Processo encerrado com a sessão aberta: `abandoned` na abertura seguinte.
- **A frio pelo link:** o dev client mostra o próprio launcher e, ao escolher o servidor,
  entrega o link pendente; a rota abriu, e o Voltar levou ao Início.
- Ficaram 6 sessões de teste no banco do S22, gravadas pelo próprio app.

### Ainda sem teste no aparelho (roteiro do passo 8)

- **Remover animações** (M9): coberto no Jest; no aparelho depende de mudar um ajuste do
  sistema.
- **Fonte no máximo** (M18) na emergência. O tema escuro foi visto nas capturas.
- **A frio em prévia ou produção:** no development build o launcher fica no meio.
- "Ainda não" e "Pular" na motivação só foram exercitados no Jest.

### Cuidado para o Maestro (passo 8)

Durante a respiração o `uiautomator dump` falha com "could not get idle state", porque
a tela nunca fica parada. No fluxo Maestro, usar "Pular" logo no início da etapa ou
conferir se ele sofre do mesmo problema.

---

## Fase 4 · Passo 7 · Permissões reais, vigilância e estado (08/11/2026)

Branch `fase4/permissoes`. Spec 03, seção 5.7; doc 01, seções 6.9 e 6.10. O começo da
branch traz os dois ajustes da revisão do PR #27.

### Como ficou

- **Um ponto só:** `getMonitoring()` agora é o nativo no Android
  (`AndroidMonitoringModule`) e o falso no Jest e no iOS. Saiu o `getMonitoringSync`.
- **Interface:** saíram `startUsageLimit`, `stopUsageLimit` e `getUsageLimitStatus`, sem
  uso desde que as regras vão pela configuração. Entraram `startMonitoring`,
  `stopMonitoring`, `getServiceStatus` e `checkProtection`.
- **Notificações:** janela do sistema pelo `PermissionsAndroid` do React Native, sem
  biblioteca nova. Se o usuário recusou de vez, ou desligou nos Ajustes, abre os Ajustes.
- **Liga e desliga:** a cada rodada da sincronização. Liga com onboarding concluído,
  regra de uso e acesso ao uso, e só com o app na tela (exigência do Android para serviço
  em primeiro plano). Desliga quando nenhuma regra precisa dele.
- **Regras puras:** `src/domain/protection.ts` (o que faz falta e a situação do serviço)
  e `ProtectionRules` em Kotlin (o que a vigilância faz), com JUnit.
- **Início:** minutos reais, e aviso "Proteção pausada" dizendo o que parou.
- **`/permission-status`:** serviço ativo, última verificação e o que fazer em cada caso,
  com "Religar o acompanhamento".

### Vigilância (`ProtectionWatch`)

Roda a cada verificação do serviço (20 s), a cada sincronização do app, no boot e nos
alarmes. Os alarmes são o que percebe o serviço parado quando o app está fechado.

- **Perda** é passar de concedida a negada. A primeira conferência só aprende o estado.
- Cada perda grava `permission_lost`.
- **"Proteção pausada":** acesso ao uso perdido, sobreposição perdida (se alguma regra usa
  a tela) e serviço parado. Notificações perdidas não têm como avisar por notificação:
  ficam o evento e o aviso no Início.
- **Serviço parado:** sem rodar, com o acesso ao uso dado, e 5 min sem verificação nem
  pedido para ligar. O limite de uma por dia por motivo já estava em `NotificationCenter`.
- **Sem o acesso ao uso, o serviço se encerra:** não há o que medir, e a notificação
  "Proteção ativa" estaria errada. Continua marcado como ligado, e o app religa ao ganhar
  a permissão.

### Interpretação da spec (a confirmar na revisão)

O aviso do Início aparece também para permissão que nunca foi concedida, não só para a
perdida: o doc 01 (6.1) fala em "alguma permissão desligada". Quem disse "Agora não" no
onboarding vê o aviso enquanto a permissão fizer falta. O que não faz falta não entra: sem
regra de uso, o acesso ao uso não é cobrado; sem tela prevista, a sobreposição também não.

### Testes

- Jest: 722. JUnit: 63. `lint`, `typecheck`, `format:check` e `check:manifest` passando.
- Mutações de controle: 19 no JS e 6 no Kotlin, todas derrubam testes.

### No aparelho (S22, 08/11)

- Depois de encerrar o app à força, ao abrir, a sincronização religou o serviço
  (`dumpsys activity services`).
- Início com os minutos reais ("12 min de 45 hoje") e sem o aviso, com tudo permitido.
- `/permission-status`: "Ativo." e a última verificação.
- A vigilância gravou o estado inicial, sem nenhum `permission_lost`.

### Ainda sem teste no aparelho

Dependem de mudar permissões nos Ajustes, que é ação do responsável: M15 (revogar o
acesso ao uso), M1 (conceder pelo onboarding real) e a janela do sistema das
notificações. Ficam para os testes do responsável ou para o roteiro do passo 8. O serviço
parado com o app fechado e a tela acesa em prévia ou produção também ficam para o roteiro.

### Para o passo 8

Os fluxos Maestro agora rodam contra a lista real de apps do aparelho, e não foram
executados neste passo porque apagam os dados do app de desenvolvimento.

### Revisão do PR #28: dois avisos no Início (decisão do responsável)

M15 confirmado pelo responsável no S22. Decidido sobre o aviso do Início:

- Permissão perdida ou serviço parado: "Proteção pausada", sem como adiar.
- Permissão nunca concedida: "Ative o acompanhamento", mesmo texto, "Ver o que fazer" e
  "Agora não", que esconde o aviso por 7 dias (7 × 24 h, contadas do toque).

Como separei os casos, e por quê:

- `settings` ganhou três colunas `*_granted_once` e `protection_notice_dismissed_at`
  (migração 0006). `useProtection` registra o que está concedido a cada leitura, só quando
  há novidade, porque toda gravação dispara uma sincronização.
- Não usei os eventos `permission_lost`: o evento gerado no fim de uma rodada só seria
  importado na seguinte, e adiantar a vigilância na rodada acusaria serviço parado antes
  de ele religar. Também não mexi no nativo, então não precisa de build novo.
- Limite conhecido: quem concede e revoga antes de qualquer leitura de `useProtection`
  (ainda no onboarding) cai em "Ative o acompanhamento". O texto continua correto.
- Uma perdida junto de uma nunca concedida: "Proteção pausada", com as duas linhas.
- Durante o adiamento, a tela de estado continua mostrando tudo o que falta.
- Relógio voltado para antes do adiamento: o aviso aparece.

Verificado: Jest 747, 21 mutações derrubam testes (2 sobreviveram na primeira rodada e
viraram teste). No S22, a migração rodou sobre os dados reais, as três permissões ficaram
registradas e o Início abriu sem aviso. O aviso novo e o "Agora não" só foram vistos em
teste automatizado: o S22 está com tudo permitido e já registrado.

## Fase 4 · Passo 8 · Ferramentas, Maestro e roteiro (08/11/2026)

### Roteiro final aprovado pelo responsável

Blocos agrupados pela preparação. Tela bloqueada: testar primeiro como está e, se o texto
vazar, trazer as opções. O responsável autorizou apagar os dados do app de desenvolvimento.

- **Bloco 0 (cabo):** ferramentas da 5.10, Maestro, "Apagar meus dados" com o nativo.
- **Bloco 1 (app zerado):** "Ative o acompanhamento" e "Agora não"; M1 e a janela do
  sistema das notificações.
- **Bloco 2 (limite de 1 minuto):** M2, M3, M9 ("Pular", "Ainda não", "Pular" na
  motivação), M4, **M8 completo depois do M4** (com o dia de vídeos curtos reprovado, o X
  passa a seguir as regras do conteúdo adulto, se declarado), M5, M6, M7, M8, **limite
  maior salvo depois de estourar** (a tela continua hoje com o limite antigo) e M19.
- **Bloco 3 (ajustes de aparência):** M18 na emergência e animações removidas.
- **Bloco 4 (tela bloqueada):** M12, M13 e **recaída registrada hoje para ontem sem
  notificação de recomeço**.
- **Bloco 5 (permissão e serviço):** M15 de novo e serviço parado com o app fechado.
- **Bloco 6 (chamada):** M20 no emulador e pelo Teams.
- **Bloco 7 (dois dias):** M11, remoção à meia-noite, atraso em economia profunda,
  bateria, M10, M14 com agendamentos, recomeço esperando o desbloqueio.
- **Bloco 8 (prévia e produção):** ferramentas ausentes, tela acesa, abertura a frio e
  **`check:manifest` pela lista estrita nos builds de prévia e de produção**.
- **Já feitos, sem repetir:** M16 (07/11), M17 (08/11), AP4 (07/11).

### Ferramentas de teste (spec 03, 5.10)

A tela continua em Perfil → "Monitoramento (base)". O limite de 1 minuto já valia para os
apps de risco. Entraram:

- **"Zerar o estado de hoje":** importa a fila, esquece telas, pausas e reprovações no
  nativo, apaga `day_states` e `interruption_events` do dia e reenvia a configuração.
  Não mexe em notificações nem em check-ins. Decidi zerar também o uso visto pelas regras,
  com um desconto (`UsageBaseline`): o uso vem do histórico do sistema e não dá para
  apagar, e sem isso o M2 e o M5 não medem nada num dia em que os apps já foram usados.
- **"Mostrar a tela de interrupção":** tem como alvo o próprio app, porque a tela fecha
  sozinha quando o app da frente não é o alvo. Conta como tela de verdade.
- **"Parar só o serviço (sem desligar)":** para o "serviço parado com o app fechado".
- A fila de eventos aparece contada por tipo.

### Decisão do responsável: lista de apps recolhida (08/11/2026)

Os fluxos Maestro revelaram que, com a lista real, a etapa de configuração mostrava 207
etiquetas: os apps já marcados e as perguntas ficavam escondidos, e a ordem errava nos
acentos. Vale para o onboarding e para o Perfil:

- Sugeridos instalados no topo, já marcados. Os demais ficam atrás de "Ver outros apps".
- App não sugerido e marcado continua à vista com a lista recolhida.
- Na lista expandida: campo "Buscar app" (ignora acentos e maiúsculas) e ordem alfabética
  do pt-BR (`Intl.Collator`, em `createTextComparer`).
- Sem nenhum sugerido instalado: uma frase curta e o botão, nunca uma área vazia.

Decidi por conta própria, para o responsável revisar no PR: botão "Recolher a lista" e
frase "Nenhum app encontrado." quando a busca não acha nada.

**Armadilha:** o `ChipGroup` devolve só o que está nas opções recebidas. Com a busca, as
opções são parciais e o resto da seleção se perderia; `mergeAppSelection` junta as duas.

Testes em `__tests__/appChooser.test.tsx`, com 202 apps falsos e nomes acentuados. Um app
marcado na lista expandida não muda de lugar; só sobe ao recolher.

### Decisão do responsável: limite de tempo e vigilância (08/11/2026)

Em 08/11 o `adb` travou (AP3) e o build ficou parado cerca de 20 minutos sem erro.

- `npm run android:install` agora é `scripts/android-install.js`: compila com
  `assembleDebug`, confere o `adb` (15 s), instala (3 min) e, se falhar ou estourar o tempo,
  reinicia o `adb` e tenta mais uma vez. Na segunda falha, termina com erro.
- Toda tarefa longa em segundo plano é lançada com um vigia que acusa saída parada, e o
  responsável é avisado sem precisar perguntar.

### Bloco 0: resultado no S22 (08 e 09/11/2026)

- **Fluxos Maestro:** (b) a (f) passaram na rodada completa; (a) e (d) passaram na repetição,
  depois de ajustar só o texto esperado de (a) à ordem alfabética.
- **"Apagar meus dados" com o nativo (fluxo d):** regras do dia vazias, fila de eventos
  inexistente, serviço parado, nenhuma notificação do app e, ao reabrir, configuração sem
  compulsões, regras nem motivação.
- **Reinício do `adb` em uso real:** em 08/11, às 23:24, o `adb` estava travado, a primeira
  tentativa falhou e o script reiniciou e instalou na segunda.
- **`clearState` do Maestro só tira a permissão de notificações.** Acesso ao uso e
  sobreposição continuam concedidos. Para ter o app sem permissões (Bloco 1), é preciso
  desinstalar e instalar de novo.
- Neste ambiente o Windows não procura executáveis na pasta atual: o script chama o
  `gradlew.bat` pelo caminho completo.

### Cuidado para testes com `fireEvent`

`fireEvent.press` fora de `act` no fim de um teste fez todos os testes seguintes do mesmo
arquivo não encontrarem a tela. O teste de notificações passava porque era o último.

## Fase 5 · Leitura da spec 04 (22/11/2026)

Spec: `docs/specs/spec-04-progresso-estatisticas-conteudo.md`. Documentos de partida (PR
#34): spec 04 v0.1, doc 01 v0.11 e doc 02 v0.9. A spec foi conferida contra o código da
`main` depois do PR #34 (banco, domínio, configuração do nativo, `NotificationPlan`,
importação de eventos, rotas e Início).

Dez pontos levantados na leitura da v0.1. O responsável aceitou as dez propostas e as
incorporou na **spec 04 v0.2** (neste PR):

| # | Ponto | Decisão | Onde na spec |
|---|---|---|---|
| 1 | Quebras vistas pelo nativo | O nativo só conhece a base da streak pelo `streakBaseDayKey` da configuração; o dia reprovado na tela de interrupção e "Tive uma recaída" na notificação só agendam o recomeço (`nativeRestartDays`). Com a base antiga, a notificação de marco sairia errada. **A base é a mais recente entre a do JS e a última quebra que o nativo viu**, nos vetores compartilhados | 4.3; P7b |
| 2 | Avisos dos apps de risco | Só as telas de interrupção ficam no banco (`interruption_events`); os avisos por notificação (`limit_reached`) eram descartados na importação. **Nova tabela `monitoring_alerts`**; "respeitado ou ignorado" só para as telas. O histórico dos avisos começa na Fase 5 | 5.8; 5.9 |
| 3 | Ponto de partida de quem já usa o app | Os 7 dias antes do início já saíram do que o Android guarda, e o histórico próprio só começa agora. **Quem começou antes da Fase 5: média dos 7 primeiros dias completos depois de instalar a Fase 5** (`first_week`). O tempo recuperado soma só os dias com histórico | 5.7 |
| 4 | Tela de interrupção nos dias anteriores | Com a sobreposição aberta, o Android continua contando o app de baixo. **Descontar pelos `shown_at` e `responded_at` de `interruption_events`.** O P10 compara com o "Tempo de uso" do Android num dia sem telas | 4.4; P10 |
| 5 | Marco de 1 dia | O dia da quebra é 0 e o seguinte é 1 (`getStreakBase`), então todo recomeço alcança o 1 dia. **Celebração "de novo" só a partir do marco de 3 dias**; o de 1 dia só na primeira vez. **Recaída registrada hoje para ontem conta como dia de recomeço:** sem notificação de marco e sem celebração do 1 dia | 5.3; 5.5; P9 |
| 6 | Marco no dia da quebra | O alcance fica gravado e o marco desbloqueado; se ainda não foi celebrado, **é marcado como celebrado sem mostrar a tela** | 5.3 |
| 7 | Recomeço e marco no mesmo dia | **A regra vale para o aparelho inteiro:** no dia de recomeço, nenhuma notificação de marco de nenhuma compulsão. Fecha com o limite de 6 (check-in, recomeço e 4 preventivas) | 5.5 |
| 8 | "Dias dentro do limite" | O banco só guarda os dias reprovados, e um dia pode passar do limite sem ser reprovado. **Dias aprovados (já terminados e não reprovados) e dias reprovados, desde o início** | 5.8 |
| 9 | Toque no card do Início | Os cards têm botões próprios (check-in, recaída, permissões). **Só a área da streak e do próximo marco abre o Progresso**, com rótulo para o leitor de tela | 5.4 |
| 10 | Vídeos de teste e ferramenta de streak | **`ffmpeg` autorizado no computador** (fora do app e do repositório). **"Simular uma streak"** guarda os valores originais e tem "Desfazer a simulação", que apaga também os alcances criados nela | 5.1; 5.12 |

**Também na v0.2, sem dúvida na leitura:** migração `0007` (já existem as `0000` a `0006`);
`expo-video` sem reprodução em segundo plano nem imagem sobre imagem (5.6); "Apagar meus
dados" com as tabelas novas, menos o catálogo, e com o histórico do nativo e a última quebra
vista (5.13). Hoje `deleteAllData` (`src/data/repositories.ts`) e o `reset` do nativo
(`MonitoringModule.kt`) listam o que apagam um a um, então as duas listas precisam crescer.

**Interpretação a confirmar na revisão:** em `monitoring_alerts`, `app_package` fica **nulo**
no aviso de limite da moderação, porque o limite é somado entre os apps
(`MomentRules.Action.LimitReached` com `target` nulo). No aviso de app de risco ele vem
preenchido.

**Conferido e já de acordo com a spec:** tipos de compulsão usados como chave do catálogo
(`pornography` e `short_videos`, `src/domain/compulsion.ts`); "dia seguinte à quebra = dia
1"; vagas do limite de 6 (`NotificationPlan`: check-in e recomeço antes, preventivas até 4);
canal "Lembretes" (`reminders`); origem e resultado da emergência (`emergency_sessions`);
lista fixa de marcos só em `src/domain/streak.ts` (`MILESTONE_DAYS`, usada por
`getNextMilestone`).

**Próximo:** passo 1 (catálogo) na branch `fase5/catalogo`, depois do merge deste PR.

## Fase 5 · Passo 1 · Catálogo (22/11/2026)

Spec 04 v0.2, seções 4.1, 4.2, 5.1 e 6 (passo 1). Branch `fase5/catalogo`. Sem biblioteca
nova: o download usa o `fetch` do React Native com `AbortController`, e a cópia embutida é
um `import` de JSON que o Metro já empacota (`resolveJsonModule` vem do
`expo/tsconfig.base`). Nenhuma API do sistema nova, por isso não houve documentação oficial
a consultar neste passo; o R2 e o `expo-video` ficam para os passos 2 e 4.

### Como ficou

| Peça | Onde |
|---|---|
| Formato, validação, escolha da versão, intervalo das consultas e endereços | `src/domain/catalog.ts` (puro) |
| Conteúdo de teste (fonte da verdade) | `content/catalog.pt-BR.json` |
| Cópia embutida | `src/features/content/embedded.ts` |
| Catálogo em uso e atualização remota | `src/features/content/catalogService.ts` |
| Atualização ao abrir e ao voltar do segundo plano | `useCatalogRefresh`, em `src/features/content/useCatalog.ts`, montado no `app/_layout.tsx` |
| Cache no banco | tabela `content_catalog`, migração `drizzle/0007_fase5_content_catalog.sql`; repositório `contentCatalog` (`get`, `save`, `touch`) |
| Endereço do conteúdo por variante | `variant.contentBaseUrl` (`src/config/variant.ts`), vindo de `extra.contentBaseUrl` no `app.config.ts` |
| Servidor falso | `scripts/content-serve.js` (`npm run content:serve`) |
| Ferramenta de teste | seção "Conteúdo" na tela "Monitoramento (base)": fonte e versão em uso, última consulta e "Atualizar o catálogo agora" |

### Regras da validação

- `formatVersion` maior que o suportado (1): o catálogo é ignorado (`unsupported_format`),
  mesmo que o resto pareça válido.
- Obrigatórios: `contentVersion` inteiro a partir de 1, `updatedAt` como dia válido, ao menos
  uma compulsão conhecida, e em cada marco dia, título, resumo, texto, referências (a lista
  pode ser vazia) e `free`. Dias inteiros de 1 a 3650, **únicos e crescentes**.
- Referências **só com https** e um domínio com ponto (recusa `http:`, `javascript:` e
  semelhantes, porque abrem no navegador).
- Vídeo opcional; o identificador é só de letras minúsculas e números (4 a 32), para não haver
  tema no nome nem como sair da pasta `videos/`.
- Campos e compulsões desconhecidos são ignorados: um app antigo aceita um catálogo do mesmo
  formato com campos ou compulsões a mais.
- Arquivo acima de 2 milhões de caracteres é recusado sem ler o JSON.
- O guardado no banco é validado de novo a cada leitura (uma vez por versão): se estiver
  corrompido, o app volta ao embutido e a próxima consulta válida o substitui.

### Interpretações (a confirmar na revisão)

1. **`fetched_at` é a hora da última consulta que trouxe um catálogo válido**, mesmo que não
   fosse mais novo. É ela que espaça as consultas em 24 horas entre aberturas do app, sem
   coluna nova. Por isso, na primeira consulta válida o remoto é guardado mesmo quando tem a
   mesma versão do embutido. O catálogo em uso é sempre o **mais novo entre o embutido e o
   guardado**; empate fica com o embutido. Um remoto mais velho que o guardado (servidor que
   voltou atrás) só atualiza a hora.
2. **"Sem novas tentativas em sequência":** depois de uma falha (sem rede, erro do servidor,
   catálogo inválido ou de formato maior), o app espera **1 hora** antes de tentar de novo no
   mesmo processo, mesmo voltando do segundo plano. A falha não fica no banco: na próxima
   abertura do app, tenta de novo. Espera de 15 s pela resposta.
3. **A `0007` só cria a `content_catalog`.** As outras tabelas da seção 5.9
   (`milestone_reaches`, `app_usage_hourly`, `monitoring_alerts` e os campos novos de
   `user_compulsions`) entram nos passos que as usam, como migrações `0008` em diante, como
   aconteceu na Fase 4 (a `0004` e depois a `0005` e a `0006`). **Decisão do responsável
   (22/11/2026): uma migração por passo.** A spec diz "a 0007"; o planejamento ajusta a
   seção 5.9 no fechamento da fase.
4. **Endereço por enquanto vem de `CONTENT_BASE_URL`** (vazio = só o embutido). O app aceita
   https em qualquer variante e `http://localhost` ou `127.0.0.1` só no desenvolvimento, para
   o servidor falso; um endereço fora disso derruba o app na abertura, para o erro não passar
   em silêncio. O endereço do `r2.dev` e a verificação que impede o `r2.dev` na produção são
   do passo 2.
5. **Gravar o catálogo avisa que os dados mudaram** (`contentCatalog.save` e `touch`, em
   `src/data/changes.ts`), e o app reenvia a configuração ao nativo. No passo 5 a
   configuração passa a levar os dias dos marcos, então é o comportamento certo; até lá é
   uma rodada a mais, uma vez por dia.
6. **A ferramenta de teste do catálogo (5.12) entrou já neste passo**, porque é ela que permite
   conferir a troca de versão no aparelho. "Versão remota" aparece como "guardado da última
   consulta", que é o que veio do servidor.
7. **"Apagar meus dados" mantém o catálogo** (conteúdo público, spec 04, 5.9), com teste.

### Conteúdo de teste (`content/catalog.pt-BR.json`)

Versão 1, gerado uma vez por um script descartável e formatado pelo Prettier. As duas
compulsões com os marcos de 1, 3, 7, 14, 30, 60, 90, 180 e 365 dias; títulos "Marco de teste
A" (abstinência) e "Marco de teste B" (moderação), para distinguir no aparelho sem citar o
tema; uma referência de exemplo em `https://example.com/referencia`; `free` até 7 dias; um
vídeo por marco até 30 dias (10 vídeos, identificadores aleatórios de 10 caracteres,
`durationSeconds: 12`), com `aiGenerated: true` só no de 3 dias da moderação. **Os vídeos
ainda não existem**: serão gerados com o `ffmpeg` no passo 2, com 12 s, para bater com o
catálogo. Um teste (`embedded.test.ts`) confere tudo isso, além de o embutido ser válido.

### Testes

- Jest: 874 testes (784 na `main` ao fim da Fase 4). Novos: `src/domain/catalog.test.ts` (47:
  validação, escolha, cache, intervalo e endereços), `src/features/content/embedded.test.ts`
  (6), `src/features/content/catalogService.test.ts` (19, com o banco de teste e um servidor
  falso: versão nova, mesma versão, mais velha, inválida, formato maior, JSON quebrado, erro
  do servidor, sem rede, limite de tempo, uma consulta por vez, espera de 24 horas entre
  aberturas, espera de 1 hora depois de falha, consulta forçada, guardado corrompido), mais
  repositório, migração (`content_catalog` criada), variante (`resolveContentBaseUrl`), a regra
  de nomes de `changes.ts` e a ferramenta na tela de conferência.
- **Mutação de controle:** cinco mudanças em `src/domain/catalog.ts` derrubam testes (guardar
  com a mesma versão, preferir o guardado no empate, tirar a espera depois de falha, aceitar
  dia repetido, aceitar formato maior). O arquivo foi restaurado e conferido.
- `lint` e `typecheck` ok.

### No aparelho (S22, 22/11, servidor falso e Metro com `CONTENT_BASE_URL`)

- **Migração sobre o banco existente: ok.** Lido do aparelho (cópia para o computador, só
  leitura): 8 migrações aplicadas; compulsões, recaídas, check-ins e interrupções preservados.
- **Consulta automática na abertura: ok.** O servidor registrou `GET /catalog.pt-BR.json 200`
  na primeira abertura; no banco, o catálogo v1 guardado às 18:50:52.
- **Troca de versão (P3, adiantado): ok.** Servidor com um catálogo v2 (um título mudado);
  "Atualizar o catálogo agora" mostrou "Catálogo atualizado." e "guardado da última consulta,
  versão 2" (Maestro).
- **Catálogo inválido (P4, adiantado): ok.** Servidor com dias repetidos e versão 3: o servidor
  entregou (200), o app mostrou "A consulta falhou" e continuou na versão 2.
- **Sem servidor: ok.** Mesma mensagem, continuou na versão 2.
- **Reabertura: ok pelo banco e pelo servidor.** Depois de fechar o app à força e reabrir, o
  servidor não recebeu pedido (dentro das 24 horas), e o banco continuava com a versão 2 de
  18:54:06 e o título novo. A tela depois da reabertura não foi vista: o Maestro não instalou
  o app auxiliar três vezes seguidas (AP4, abaixo).

### Problemas

- **AP4 voltou, três vezes seguidas** (22/11, às 18:55): `INSTALL_FAILED_VERIFICATION_FAILURE`
  ao instalar o `dev.mobile.maestro`. O `logcat` mostra o Play Protect terminando a verificação
  com `ALLOW` depois de a sessão já ter falhado, como em 07/11. Antes, na mesma tarde, o
  Maestro instalou normalmente. Fica para observar: se repetir, testar se esperar alguns
  minutos resolve.
- Rolagem do Maestro na tela de conferência: com o padrão (20 s, velocidade 40), ele para no
  meio. Os fluxos que forem até a seção "Conteúdo" precisam de `timeout: 90000` e
  `speed: 80` no `scrollUntilVisible` (para o passo 8).

### Comandos úteis

- Servidor falso: `npm run content:serve` (serve `content/` na porta 8090) ou
  `npm run content:serve -- <pasta> <porta>`; no aparelho, `adb reverse tcp:8090 tcp:8090`, e o
  Metro iniciado com `CONTENT_BASE_URL=http://localhost:8090`.
- Ler o banco copiado do aparelho no computador: o `sql.js` do projeto, em Node
  (`new SQL.Database(fs.readFileSync('app.db'))`), sem gravar nada.

## Fase 5 · Passo 2 · Hospedagem no Cloudflare R2 (22/11/2026)

Branch `fase5/hospedagem`. Conta, bucket (`quedo-conteudo`) e endereço `r2.dev` criados pelo
responsável em 22/11/2026, assim como o token e a credencial. Primeira publicação feita no
mesmo dia (seção "Primeira publicação", abaixo).

### Documentação oficial conferida (22/11/2026)

Páginas de developers.cloudflare.com: R2 pricing, get-started, buckets/public-buckets,
buckets/create-buckets, objects/upload-objects, api/tokens, local-development, Wrangler
(commands/r2 e commands/general) e billing. A página de perguntas frequentes do R2
(`r2/reference/faq/`) respondeu 404.

- **Plano gratuito, por mês:** 10 GB armazenados, 1 milhão de operações de classe A (gravar,
  listar) e 10 milhões de classe B (ler); **tráfego de saída sem cobrança**. Acima disso:
  US$ 0,015 por GB por mês, US$ 4,50 por milhão (A) e US$ 0,36 por milhão (B). O uso acima do
  gratuito é cobrado por mês; as páginas lidas **não citam teto de gasto para o R2**.
- **Cartão: não confirmado.** O R2 é ativado por uma "assinatura" ("Complete the checkout flow
  to add an R2 subscription"), e a página de tokens diz que é preciso "comprar" o R2 antes. A
  de cobrança diz para adicionar um meio de pagamento ao perfil, mas nenhuma página lida diz
  com todas as letras que o cartão é exigido para ficar no gratuito. Há "alertas de orçamento"
  por e-mail na cobrança, mas a página lida não diz se cobrem o R2.
- **Nome do bucket:** letras minúsculas, números e hífen; de 3 a 63 caracteres; sem hífen no
  começo ou no fim. A dica de localização só vale na criação; jurisdições (UE, FedRAMP)
  exigem endereços próprios e não são necessárias aqui.
- **`r2.dev`:** ligado em Settings > "Public Development URL" > Enable (digitar `allow`). Tem
  limite de taxa, é "para tráfego que não é de produção" e não tem cache nem regras de
  segurança. O formato exato do endereço não aparece na página.
- **Domínio próprio (antes da Fase 8):** o domínio precisa estar como zona na mesma conta;
  dá acesso ao cache da Cloudflare (por padrão só alguns tipos de arquivo; cache de tudo exige
  uma regra).
- **Envio:** pelo painel (Upload, arrastar os arquivos) ou pelo Wrangler,
  `wrangler r2 object put <bucket>/<chave> --file <arquivo> --content-type <tipo>
  --cache-control <valor>` (um arquivo por vez, até 315 MB; sem `--local`, grava no bucket
  real). `Content-Type` e `Cache-Control` ficam gravados por objeto.
- **Autenticação do Wrangler:** `wrangler login` (OAuth pelo navegador, com todas as permissões
  por padrão; `--scopes` limita). A credencial fica em texto num arquivo da configuração do
  Wrangler na pasta do usuário, ou cifrada no Gerenciador de Credenciais do Windows com
  `--use-keyring`; `wrangler logout` invalida e apaga. Os tokens do R2 com permissão só de
  objetos de um bucket valem só pela API compatível com S3, não pela API que o Wrangler usa.

### Escolhas do responsável (22/11/2026)

- **Publicação por script com o Wrangler**, sem o `wrangler login`, que dá acesso amplo à
  conta. No lugar dele, um **token de API só com a permissão do R2** ("Workers R2 Storage",
  Edit), criado no painel pelo responsável e guardado **fora do repositório**, no Gerenciador
  de Credenciais do Windows. O token nunca é colado no chat.
- Endereço público (não é segredo): `https://pub-5b56e05161b54d61b106e425fbeeb0df.r2.dev`.

### Documentação conferida para o token (22/11/2026)

Páginas: create-token (fundamentals), variáveis de ambiente do Wrangler, r2/api/tokens,
comandos do Wrangler para o R2, budget-alerts e r2/pricing (atualizada em 30/10/2026).

- **Token:** "My Profile" > "API Tokens" > "Create Token". Para token da conta, o caminho é
  "Manage Account" > "API Tokens". Permissões, recursos da conta, filtro de IP e validade
  podem ser escolhidos. **O valor aparece uma vez só.**
- **Ambiente:** o Wrangler lê `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. Com o ID da
  conta, ele não precisa consultar a lista de contas.
- **Permissões do R2 para tokens da conta:**
  - "Workers R2 Storage Write/Read" vale para a conta toda.
  - "Workers R2 Storage Bucket Item Write/Read" vale para um bucket só, mas a página **não
    confirma** que o Wrangler funciona com ela. Por isso usei a da conta.
  - Os "R2 API tokens" (chave de acesso e segredo) servem à API compatível com S3, não ao
    Wrangler.
- **`wrangler r2 object put`** (conferido no `--help` da 4.157.0): aceita `--file`,
  `--content-type`, `--cache-control` e `--remote` / `--local`. O script passa `--remote`
  sempre.
- **Alertas de orçamento:**
  - Caminho: "Manage Account" > "Billing" > "Billable Usage" > "Create budget alert" (nome,
    limite em US$ e e-mails).
  - Valem para o gasto de uso da conta toda e **só em contas com pagamento por uso**.
  - Só avisam, não param nada. O limite de gasto que para o uso vale para Workers e Durable
    Objects; a página não cita o R2.
- **Preços** (iguais aos já anotados): gratuito até 10 GB por mês, 1 milhão de operações A e
  10 milhões de B; saída sem cobrança; 100 mil buckets incluídos.

### Wrangler (dependência de desenvolvimento)

- **Versão:** `wrangler` **4.157.0**, exata (`npm install --save-dev --save-exact`). É a
  ferramenta de linha de comando oficial da Cloudflare. Fica só no computador e não entra no
  app (nem no bundle).
- **Por que essa versão:** a mais nova é a 4.166.0, de 20/11. Escolhi a 4.157.0 (03/11/2026)
  para usar uma versão com mais de duas semanas de uso. Exige Node 22.12 ou mais; temos 24.
- **Lockfile:** entraram 86 pacotes no `package-lock.json`. **Nenhuma versão existente
  mudou**, conferido comparando o lockfile antigo com o novo.
- **Scripts de instalação:** o npm 11.17 **não rodou** os do `esbuild` e do `workerd` (aviso
  `allow-scripts`). O `r2 object put` não usa nenhum dos dois, então deixei assim, que é o
  mais seguro.
- **Telemetria:** desligada no script (`WRANGLER_SEND_METRICS=false`).

### Credencial: onde fica e por quê

Credencial genérica `quedo-content-publish` no Gerenciador de Credenciais do Windows: o
usuário é o ID da conta e a senha é o token. O nome da credencial fica em
`scripts/content-hosting.json`.

- **Por que não uma variável de ambiente:**
  - A variável do usuário fica em texto no registro e é herdada por todo programa aberto
    depois (Metro, Gradle, terminais). Isso aumenta a chance de o token aparecer num log.
  - A credencial fica cifrada pelo Windows (DPAPI, presa ao login) e só é lida na hora de
    publicar.
  - Qualquer programa rodando como o usuário consegue lê-la, assim como a variável. O ganho
    é não espalhar o token.
- **Como o script usa:** lê a credencial pela API do Windows (`CredReadW`, pelo PowerShell,
  sem módulo extra) e passa o token **só ao processo do Wrangler**, sem nunca imprimi-lo. Se a
  saída do Wrangler trouxer o token por algum motivo, ele vira `<token>` antes de aparecer.
- **Alternativa:** o script também aceita `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no
  ambiente, e eles têm prioridade sobre a credencial.

### Publicação (`npm run content:publish`)

1. **Valida o catálogo** rodando os testes do catálogo (`src/domain/catalog.test.ts` e
   `src/features/content/embedded.test.ts`). Se falharem, nada é enviado.
2. **Confere que cada vídeo do catálogo existe** em `content/videos/`. Arquivos fora do
   catálogo não são enviados.
3. **Envia primeiro os vídeos e depois o catálogo.** Assim o app nunca recebe um catálogo que
   aponta para um vídeo ainda não enviado.
   - Catálogo: `application/json; charset=utf-8`, com `Cache-Control: public, max-age=300` (5
     min; o app já consulta no máximo uma vez por dia).
   - Vídeos: `video/mp4`, com `public, max-age=31536000, immutable` (o identificador muda
     quando o vídeo muda).
4. **Lê tudo de volta pelo endereço público** e confere: status 200, conteúdo idêntico ao do
   repositório e tipo e cache iguais aos enviados.

**Simulação:** `-- --dry-run` faz só os passos 1 e 2 e mostra o que seria enviado, sem
precisar da credencial.

**Conferido no computador** (em nenhum caso algo foi enviado):
- a simulação;
- catálogo inválido (`contentVersion: 0`): recusado pelos testes;
- vídeo faltando: recusado;
- sem credencial: o script para e mostra a instrução. A leitura do Gerenciador de Credenciais
  compilou e respondeu "não existe".

### Vídeos de teste (`npm run content:test-videos`)

- **ffmpeg 9.0.2:** build "essentials" de gyan.dev, o build para Windows indicado em
  ffmpeg.org. Instalado com `winget install --id Gyan.FFmpeg.Essentials -e --version 9.0.2`.
  - O atalho `ffmpeg` só vale em terminais abertos depois da instalação.
  - O script aceita `FFMPEG=<caminho>`. O executável fica em
    `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_...\bin`.
- **O que o script gera:** `scripts/content-test-videos.js` cria um MP4 por vídeo do catálogo
  em `content/videos/`.
  - Formato: 1280x720, 30 fps, H.264 High, `yuv420p`, CRF 28, sem áudio, sem metadados de
    origem, com `+faststart`.
  - Conteúdo: fundo de uma cor por compulsão, "Vídeo de teste", "A · 3 dias" (A = abstinência,
    B = moderação) e um contador de segundos, para ver que está tocando.
- **Conferência:** o script mede a duração de cada arquivo com o `ffprobe` e compara com o
  `durationSeconds` do catálogo (12 s). Resultado: 10 vídeos de 33 a 37 KB, cerca de 350 KB ao
  todo. Um quadro foi conferido visualmente.
- **Os vídeos de teste ficam no repositório** (`content/videos/`, binários pequenos), para a
  publicação não depender de gerá-los de novo. Os vídeos reais da Fase 7 serão maiores; decidir
  então se ficam fora do git.

### Verificação que impede o `r2.dev` na produção

- **Endereço por variante:** fica no `app.config.ts`, em `resolveContentConfig`.
  - Desenvolvimento e prévia usam o `r2.dev`.
  - A produção fica **sem endereço** (só o catálogo embutido) até o domínio próprio.
  - `CONTENT_BASE_URL` substitui o padrão (servidor falso).
- **Barreira no build:** se a produção apontar para o `r2.dev` ou um subdomínio dele, o
  `app.config.ts` lança erro e o build não sai. O Expo avalia esse arquivo no prebuild, no
  Metro e no EAS. Conferido:
  - `APP_ENV=production CONTENT_BASE_URL=https://pub-....r2.dev npx expo config` termina com
    "A produção não pode usar o endereço de teste do R2";
  - a prévia mostra o `r2.dev`;
  - a produção não mostra endereço nenhum.
- **Segunda barreira, no app:** `resolveContentBaseUrl` (`src/config/variant.ts`) também
  recusa o `r2.dev` na produção. Um domínio que só contém "r2.dev" no meio
  (`r2.dev.example.com`) passa, com teste.
- **Interpretação (a confirmar):** a produção **sem endereço** ainda é aceita, para o
  `check:manifest` de produção continuar funcionando sem o domínio. Quando o domínio existir
  (antes da Fase 8), dá para passar a exigir o endereço na produção.

### Problema encontrado: endereço nulo virava `{}` (defeito do passo 1)

- **O que acontecia:** a serialização da configuração do Expo (`serializeAndEvaluate`, no
  `@expo/config`) trata `null` como objeto (`typeof null === 'object'`) e o transforma em `{}`.
  Com `contentBaseUrl: null`, num Metro ou build sem `CONTENT_BASE_URL`, o app recebia `{}`, e
  `resolveContentBaseUrl` lançava "Endereço do conteúdo inválido" **ao abrir**.
- **Por que não apareceu antes:** no passo 1, o aparelho sempre rodou com o servidor falso
  configurado, e os testes simulam o `expo-constants`.
- **Correção:** sem endereço, a chave fica `undefined` e sai do JSON, com teste. Conferido no
  `expo config` da produção: o `extra` vem sem `contentBaseUrl`.

### Primeira publicação (22/11/2026, 22:30)

- **Token:** criado pelo responsável no painel novo ("Create token" > "Start from scratch" >
  "Start with an Account policy"). O painel mudou em relação à documentação: a política
  mostra a conta ("Include" e a conta do responsável) e uma busca de permissões, em que só
  "Workers R2 Storage" ficou marcada (Read e Edit; o Read vem junto). Validade de 90 dias,
  **até cerca de 20/02/2027**; depois disso, criar outro igual e trocar a senha da credencial.
  O token nunca passou pelo chat.
- **`npm run content:publish`:** catálogo validado, 10 vídeos e o catálogo enviados, e os 11
  conferidos pelo endereço público, todos com status 200, conteúdo igual ao do repositório e
  tipo e cache certos.
- **Leitura por partes** (como o player baixa o vídeo): `Range: bytes=0-99` num vídeo responde
  206, `bytes 0-99/35868`. A raiz do bucket e um vídeo que não existe respondem 404, ou seja,
  o bucket não lista os arquivos.
- **Rastro no computador:**
  - O Wrangler grava logs em `%APPDATA%\xdg.config\.wrangler\logs`. Neles não aparece
    `cfut_` (o começo dos tokens novos), `Bearer` nem `Authorization`.
  - O log confirma a telemetria desligada: "Dispatching disabled".
  - Nada foi criado no repositório: nem `.wrangler/` nem `.env`.
- **No S22** (Metro sem `CONTENT_BASE_URL`): o manifesto do Metro entrega
  `contentBaseUrl` = o `r2.dev`. Na tela de conferência, "Atualizar o catálogo agora"
  respondeu "Consulta feita, sem catálogo mais novo", e a última consulta válida passou de
  18:54:06 para 22:34:25.
  - O catálogo em uso continua o **guardado na versão 2**, que veio do servidor falso no teste
    do passo 1. O publicado é a versão 1 (mais velha): só a hora da consulta muda, como
    previsto (interpretação 1 do passo 1).
  - O aparelho de desenvolvimento fica com essa versão 2 até publicarmos uma versão maior.
- **`adb` travado de novo** antes do teste (`adb devices` sem resposta). Resolvido como no
  AP3: encerrar o `adb.exe` e `adb start-server`.
- **Prévia:** o `expo config` da prévia leva o `r2.dev`. O build de prévia no aparelho fica
  para o roteiro P15, no fim da fase.

### Testes

887 testes (874 no passo 1). Novos:
- `src/config/appConfig.test.ts`: endereço por variante, produção com `r2.dev` recusada e
  chave nunca `null`;
- casos do `r2.dev` em `variant.test.ts`.

`lint`, `typecheck` e `format:check` ok.

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

### AP4 · Maestro não instala o app auxiliar: verificação de desenvolvedor (07/11/2026)

**Sintoma:** `maestro test` cai antes do primeiro passo com
`INSTALL_FAILED_VERIFICATION_FAILURE: Install not allowed` ao instalar o
`dev.mobile.maestro` (o app auxiliar que o Maestro instala a cada execução).
Em 07/11, três instalações seguidas foram recusadas (10:39 a 10:41); as de
antes (10:37 e 10:38) e todas as de depois passaram, sem nenhuma mudança no
aparelho nem no fluxo.

**Causa (no `logcat`, `adb logcat -d | grep VerifyApps`):** é a verificação de
desenvolvedor do Android (`[ADV]` nas linhas do Play Protect, processo
`Finsky`), que o Google passou a aplicar no Brasil em 2026. A cada instalação, o
Play Protect consulta o serviço de verificação:
- respondeu a tempo: `Verifier app returned response ... verdict=1`, depois
  `VERIFICATION_ALLOW`;
- não respondeu em 5 s: `Verification task timed out`, o padrão é recusar
  (`Scan verdict: 18`, `VERIFICATION_REJECT`). A janela de "instalar mesmo
  assim" não aparece porque quem instala é o `adb` (`com.android.shell`), "em
  segundo plano".

**Solução usada:** tentar de novo. Não mexi em nenhuma configuração de
segurança do aparelho (Play Protect, "Verificar apps via USB"): isso é decisão
do responsável.

**Atenção:** o próprio app (`npm run android:install`, que também instala pelo
`adb`) pode cair na mesma verificação. Se um build terminar com esse erro, ver
o `logcat` antes de investigar o build.

**De novo em 07/11, às 14:18 a 14:20:** três recusas seguidas do
`dev.mobile.maestro` (ids 203 a 205), todas com `Verification task timed out`.
O `logcat` detalha a regra: `Dialog suppressed: true. Reason: installer is in
background and was not recently interacted with. installer: com.android.shell`
→ `VERIFICATION_REJECT`. A instalação do próprio app pelo Gradle, às 14:18:24,
passou. Para ler a tela sem o Maestro, `adb shell uiautomator dump` (já vem no
Android) e `adb shell input tap` resolvem.

### AP5 · Metro para de responder depois de um build do Gradle (07/11/2026)

**Sintoma:** depois do `gradlew installDebug`, o Metro (iniciado antes do
build) continua com a porta 8081 aberta, mas não responde: `curl
localhost:8081/status` estoura o tempo, e o app abre com a tela vazia. Aconteceu
duas vezes no mesmo dia, as duas logo depois de um build.

**Hipótese (não confirmada):** o vigia de arquivos do Metro olha o projeto
inteiro, e o Gradle escreve milhares de arquivos em `android/` e em
`modules/monitoring-android/android/build/`. Não mudei a configuração do Metro:
se continuar, testar um `blockList` para essas pastas.

**Solução usada:** parar o Metro inteiro (o processo dono da porta 8081, como
em "Cuidado: encerrar o Metro inteiro"), subir de novo, refazer o `adb
reverse` e abrir o app pelo link do dev client. Na dúvida, subir o Metro só
depois do build.


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
