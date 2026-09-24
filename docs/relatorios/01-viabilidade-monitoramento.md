# Relatório de Viabilidade — Monitoramento

> **Versão 0.3 · 24/09/2026 ·** entregável da Fase 1, na estrutura da seção 9 da
> `docs/specs/spec-00-prototipo-monitoramento.md`.
>
> **Cobertura:** Android completo — S1, S4, A1 a A10, C2 e os roteiros T1 a T8 e
> T10. **O iOS não foi iniciado:** a conta Apple Developer pessoal não destravou,
> e com ela ficaram S2, S3, I1 a I14, C1 e T9.
>
> **Aparelho:** Galaxy S22 (SM-S901E), Android 16 / API 36, One UI 8.0. Um único
> aparelho físico; o emulador está bloqueado pela virtualização desligada na BIOS.
>
> **Protótipo:** Expo SDK 57, React Native 0.86.3, módulo nativo próprio em
> Kotlin (`prototype/modules/lab-monitoring`), build local de Android.
>
> **Origem dos números:** `prototype/NOTAS.md` (diário técnico, com os achados na
> íntegra) e `docs/relatorios/evidencias/` (recortes de log, `dumpsys` e capturas).
> Nada aqui é afirmado sem evidência no log do aparelho, na saída do sistema ou em
> confirmação do responsável.

---

## 1. Resumo executivo

**Funciona, no Android, e a bateria não é o problema.** O limite é detectado com
o app fechado em 3 a 9 s (A2), a notificação sai 14 ms depois (A3), a tela de
interrupção aparece sobre o app monitorado e o "Continuar mesmo assim" devolve o
usuário ao mesmo ponto (A4), a pausa funciona (A5) e o acesso a um domínio da
lista é detectado **sem bloquear** (A6). Um dia inteiro com tudo ligado custou
1,11 mAh — 0,16% do consumo do aparelho — sem nenhuma falha (T6).

**Não funciona, ou não é garantido, em três frentes.** A loja é o risco
principal: a política de VPN pressupõe servidor remoto e criptografia até o
túnel, que não existem num desenho local (I-19), e tanto a sobreposição quanto o
serviço `specialUse` dependem de revisão humana (I-7, I-2). A tela de
interrupção não é garantida: qualquer app a esconde com uma linha de código
(I-25). E a detecção por DNS é indício, não prova (I-20) — o tempo de rede
social no navegador só se estima por aproximação (I-21).

**O iOS não foi iniciado**, porque a conta Apple Developer não destravou. R1, R2
e T7 seguem sem resposta: este relatório autoriza decisões de produto no Android
e nenhuma no iOS.

---

## 2. Respostas às perguntas Q1–Q9

| ID | Resposta iOS | Resposta Android | Impacto no produto |
|---|---|---|---|
| **Q1** — detectar tempo de uso e agir no limite, com o app fechado | **Não testado.** Depende de S2, S3 e I1–I6; R1 segue aberto | **✅ Sim.** `queryEvents` coincide com a contabilidade do sistema (A1) e o serviço em primeiro plano detecta o limite com o protótipo fechado em 3 a 9 s, num ciclo de 20 s (A2, A9) | Exige serviço em primeiro plano com **notificação permanente** o dia inteiro (I-1), contra o princípio P7. Não existe API de aviso de limite: `registerAppUsageObserver` não é pública, então só resta perguntar periodicamente |
| **Q2** — detectar conteúdo adulto e **alertar sem bloquear** | **Não testado.** R2 aberto | **⚠️ Sim, com limitações.** VPN local só de DNS: `adult_domain_detected` e notificação 10 a 15 ms depois, com a página carregando normalmente (A6). O modo bloqueio também funciona | O DNS é indício, não prova (I-20): pré-carregamento alerta sem visita, página em cache abre sem consulta, e o próprio app da rede social consulta em segundo plano. **Nunca tratar detecção como recaída automática.** Risco alto de loja (I-19) |
| **Q3** — tela de interrupção com motivação e "continuar mesmo assim" | **Não testado.** R4 aberto no iOS | **⚠️ Sim, com limitações.** As duas abordagens cumprem o critério (A4): a tela aparece sobre o Instagram com o protótipo fechado, mostra a motivação, e "Continuar" grava `continue_tapped` e devolve ao mesmo post | A sobreposição é a única em que "continuar" é de fato uma escolha (o voltar não escapa dela), mas **qualquer app pode escondê-la** (I-25) e o evento não prova que o usuário viu (I-28, corrigido no protótipo). A tela própria é a reserva — e vira a principal se o alvo for aposta |
| **Q4** — monitorar redes sociais pelo **navegador** | **Não testado** | **⚠️ Em parte.** O acesso a instagram.com pelo Chrome é detectado e separado do uso pelo app (A7). O **tempo**, só por estimativa: +13% numa rodada de 5 min, resolução de ~1 min, e erro de −99% a +67% fora de uma faixa estreita de ajuste | Decidir entre contar o navegador no limite com precisão baixa ou usá-lo só como **gatilho de alerta** depois que o limite do app estoura (recomendado, seção 7). Hoje o limite não reage ao navegador, porque o Chrome não é app monitorado (T3, I-21) |
| **Q5** — mostrar minutos de uso na nossa interface | **Não testado.** O doc 02 §4 prevê extensão de relatório isolada; é o risco T3 | **✅ Sim, sem restrição.** A leitura coincidiu com o sistema no mesmo minuto (A1) | Cards e estatísticas podem usar o dado à vontade no Android. Duas correções obrigatórias: calcular a **borda do dia** explicitamente (I-4) e **descontar** o tempo diante da tela de interrupção, que conta como uso do app monitorado (I-10) |
| **Q6** — sobrevive em segundo plano, após reinício e com economia de bateria | **Não testado** (é o T9/I12) | **✅ Sim, com ressalvas.** 2 h 05 desconectado, 114 min em Doze profundo, detecção em 3 s (A9); **um dia inteiro sem nenhuma falha** (T6); economia de energia ligada em todas as janelas (T7). Volta sozinho após o reinício (T5) | Há **janela cega** a cada reinício: ~2,5 min até o `BOOT_COMPLETED` e só depois do primeiro desbloqueio (I-5). E **a VPN não volta** depois do boot (I-29): a detecção de domínios fica desligada em silêncio. O app precisa religá-la e avisar quando não conseguir |
| **Q7** — build de desenvolvimento no iPhone desconectado dispara eventos do Screen Time | **Não testado.** É o T9; depende da conta Apple | Não se aplica | O risco T7 do doc 02 segue aberto, e é ele que decide se dá para desenvolver o iOS sem Mac ou se será preciso antecipar o entitlement de distribuição / Mac na nuvem |
| **Q8** — biblioteca pronta ou módulo próprio | **Em aberto** (I13, não avaliado) | **Módulo próprio** (decisão D2). A biblioteca candidata cobria só o A1; serviço, notificação, sobreposição e VPN precisaram ser escritos de qualquer forma | O módulo do protótipo é base direta para a Fase 4 do doc 02, com as correções da seção 7. O build local (32 s incrementais) foi o que tornou a iteração viável (D1) |
| **Q9** — permissões, declarações e risco de rejeição | **Não pesquisado** (I14) | Tabela completa na seção 5 (A10): dois riscos **altos** (VpnService e sobreposição) e um alto de execução (`specialUse`) | O desenho local paga bem: a seção de segurança de dados pode ser declarada **sem coleta** (I-27). Mas duas aprovações dependem de revisor humano, e a decisão de submeter uma VPN local precisa ser tomada antes da Fase 9 |

---

## 3. Resultados dos experimentos

Evidências em `docs/relatorios/evidencias/`; os achados completos, com o que foi
tentado e não funcionou, estão em `prototype/NOTAS.md`.

### 3.1 Setup

| ID | Resultado | Evidência | Observações |
|---|---|---|---|
| S1 | ✅ Funciona | `s1-tela-laboratorio.png` | Development build no S22. O emulador não entrou: virtualização desligada na BIOS (P2) |
| S2 | ⛔ Não iniciado | — | Development build no iPhone via EAS. Depende da conta Apple Developer pessoal |
| S3 | ⛔ Não iniciado | — | Extensões do Screen Time compiladas sem Mac. Depende de S2 |
| S4 | ✅ Funciona | `s4-log-evento-nativo.png` | Log JSONL em `filesDir`, escrito por serviço e VPN sob o mesmo UID. **Sobrevive à reinstalação do app** |

### 3.2 Android

| ID | Resultado | Evidência | Observações |
|---|---|---|---|
| A1 | ✅ Funciona | `a1-verificacao-final.txt`, `a1-final-eventos-bate-com-sistema.png` | Leitura por `queryEvents` bateu com o sistema no mesmo minuto (1:41:10). O caminho agregado (`queryAndAggregateUsageStats`) foi **descartado** por dois defeitos medidos: vaza uso do dia anterior e atrasa minutos. O tratamento do evento `STOPPED` custou dois erros (63 e 15 min) até a regra certa |
| A2 | ✅ Funciona | `a2-deteccao-de-limite.txt` | `threshold_reached` com o protótipo fora dos recentes, 9 s após cruzar o limite (ciclo de 20 s); 3 s na rodada após 2 h de Doze. Tipo de serviço `specialUse`, único disponível para "observar o uso de outros apps" |
| A3 | ⚠️ Funciona com limitações | `a3-alerta-notificacao.txt` | Notificação disparada pelo Kotlin **14 ms** após a detecção, flutuando sobre o Instagram, com texto neutro configurável. **O botão "Emergência" só aparece se a notificação for expandida** — dois toques, contra o princípio P3 (I-3) |
| A4 | ⚠️ Funciona com limitações | `a4-tela-de-interrupcao.txt`, `a4-instrumentacao-e-botao-inicio.txt`, `a4-protecao-contra-sobreposicao.txt`, `a4-notificacao-tela-cheia.txt` | Sobreposição e tela própria comparadas ponta a ponta. Sobreposição: o voltar não escapa, mas o sistema publica "exibido sobre outros apps" e o app monitorado segue em primeiro plano por baixo (I-10, I-11). Tela própria: o voltar dispensa sem escolha (I-13). **I-25: um app comum apaga a sobreposição**; **I-28: o evento não provava que a janela apareceu** — corrigido com quatro sondas, descarte em 20 s e recuo progressivo de 1, 2, 5 e 15 min. Notificação em tela cheia testada e **descartada** (I-26) |
| A5 | ✅ Funciona | `a5-pausa.txt` | Pausa de 2 min após "Continuar": nenhum alerta em 6 verificações, notificação no fim e tela no ciclo seguinte. O fim da pausa é notado com até 20 s de atraso (medido: 14 s). "Tela inicial" e "Emergência" não pausam. A pausa sobreviveu à recriação do serviço |
| A6 | ⚠️ Funciona com limitações | `a6-vpn-dns.txt` | VPN local só de DNS, sem biblioteca (D5). Detecção e notificação em 10 a 15 ms, com a página carregando; modo bloqueio devolve `NXDOMAIN`. Limitações do próprio DNS (I-20) e do sistema: só uma VPN por vez, chave na barra de status, e a caixa de consentimento diz que a VPN "permite monitorar o tráfego da rede" (I-17) |
| A7 | ⚠️ Funciona com limitações | `a7-instagram-navegador.txt` | Acesso detectado e atribuído ao navegador pelo cruzamento com o app em primeiro plano — a consulta de DNS não diz quem perguntou. Tempo estimado por heurística: 204 s para 180,6 s reais (+13%), resolução de ~1 min, e o acerto depende de um corte numa faixa estreita (I-21) |
| A8 | ⚠️ Funciona com limitações | `a8-impacto-vpn.txt` | Navegação geral e apps de banco ok (mediana de 49 ms com VPN, contra 15 a 38 ms sem, depois de corrigido o repasse — I-23). **Outra VPN derruba a nossa, que não volta sozinha** (I-18). **DNS privado estrito + nossa VPN deixa os apps sem DNS** (I-22). DNS seguro do Chrome ainda deixa ver o endereço principal. Atravessa Doze profundo e economia de energia |
| A9 | ⚠️ Funciona com limitações | `a9-sobrevivencia-e-custo.txt`, `t-roteiros-android.txt` (T6) | 2 h 05 desconectado sem recriação do serviço e detecção em 3 s; noite inteira armado. Volta após reinício via `BOOT_COMPLETED`, com janela cega (I-5). Custo confirmado no T6 e numa janela de 3d17h. Com **três dias sem o app ser aberto**, a Samsung não o colocou para dormir (bucket ACTIVE, sem restrição de segundo plano). No meio deles, uma atualização do WebView matou o processo e o sistema recriou os dois serviços em 2,5 s, inclusive a VPN (I-31) |
| A10 | ⚠️ Tabela pronta, riscos abertos | `a10-politicas-google-play.txt` | Pesquisa documental nas páginas oficiais em 19/09/2026. Resultado na seção 5. Achado técnico no caminho: `setHideOverlayWindows` (I-25). Rotas fechadas pela política: notificação em tela cheia, serviço de acessibilidade e isenção de otimização de bateria |

### 3.3 iOS

| ID | Resultado | Evidência | Observações |
|---|---|---|---|
| I1 a I14 | ⛔ Não iniciados | — | Bloqueados pela conta Apple Developer pessoal. O módulo já existe como esqueleto Swift, e **toda função responde `unsupported` de forma explícita**, como a spec §5.2 exige |

### 3.4 Comum

| ID | Resultado | Evidência | Observações |
|---|---|---|---|
| C1 | ⛔ Não concluído | `prototype/src/monitoring/types.ts` | A interface comum existe e o lado Android a cumpre inteira. Sem iOS não há comparação; a leitura parcial está na seção 7 |
| C2 | ✅ Funciona | `c2-textos-neutros.txt` | Os quatro textos, lidos do registro do sistema, são neutros, e o do alerta é configurável ponta a ponta. Na tela de bloqueio, na configuração mais exposta, o cartão mostra só título e texto — **sem o nome do app**. O que continua exposto (chave de VPN, ícone, aviso de sobreposição) não vem do texto |

---

## 4. Resultados dos roteiros de teste T1–T10

Rodados no S22 em 20/09/2026, das 18:11 às 19:33, com o responsável operando o
aparelho, mais o T6, que correu fora do cabo de 20/09 às 19:38 a 21/09 às 17:37.
Evidência completa em `t-roteiros-android.txt`.

| # | Roteiro | Android | iOS |
|---|---|---|---|
| T1 | Limite de 2 min, protótipo fechado, 3 min de Instagram | ✅ Notificação 18 ms depois do limite e tela 20,6 s depois, com as quatro sondas de visibilidade positivas | Pendente |
| T2 | "Continuar mesmo assim" e mais uso | ✅ Pausa de 2 min sem nenhum alerta em 6 verificações; notificação de fim e tela no ciclo seguinte | Pendente |
| T3 | instagram.com no navegador com o limite ativo | ✅ com limitação. O acesso é detectado e atribuído ao navegador, mas **o limite não reage**: o Chrome não é app monitorado (I-21) | Pendente |
| T4 | Domínio da lista em modo alerta | ✅ Duas detecções com notificação 7 a 9 ms depois, páginas carregando. Ressalva: o responsável não percebeu os avisos chegarem | Pendente |
| T5 | Reiniciar o aparelho e repetir o T1 sem abrir o protótipo | ✅ com achado. O serviço volta ~2min50s depois do boot, já sabendo que o limite fora atingido, e interrompe sozinho. **A VPN não volta** (I-29) | Pendente |
| T6 | Um dia de uso normal: bateria e falhas | ✅ com ressalva. 21h59 fora do cabo, **nenhuma falha**, 1,11 mAh (0,16% do consumo). Ressalva: dia leve, 29 min de tela. Detalhes na seção 6 | Pendente |
| T7 | Economia de bateria ligada | ✅ O T1 inteiro rodou com ela ligada; na comparação, a tela apareceu ~4 s depois com ela desligada e dentro de um ciclo com ela religada | — |
| T8 | Outra VPN (Wi-Fi seguro da Samsung) | ✅ Confirma o I-18: `vpn_revoked` no instante em que a outra subiu, e a nossa não volta sozinha | — |
| T9 | Repetir o T1 com o iPhone desconectado | — | **Pendente**: é o Q7 |
| T10 | Revogar permissões pelo sistema | ⚠️ **Detecta quando perguntado, não informa nunca** (I-30) | Pendente |

**O que os roteiros acrescentaram aos experimentos.** Três achados só apareceram
aqui, porque só o uso seguido os produz:

- **I-29 — a VPN não volta depois do boot.** O `BootReceiver` religa apenas o
  serviço do limite. A detecção de domínios fica cega, sem avisar ninguém.
- **I-30 — perder uma permissão não gera aviso nenhum.** Com a sobreposição
  revogada enquanto a tela estava na frente, o sistema a apagou e o protótipo
  continuou achando que estava mostrando; com o acesso a dados de uso revogado, o
  serviço seguiu consultando e sendo negado a cada ciclo. Nenhuma linha no log
  nos dois casos.
- **O app de Ajustes do próprio Android protege as telas dele** contra
  sobreposição, o que entra na lista do I-25 ao lado dos financeiros.

---

## 5. Permissões e requisitos das lojas

Pesquisa documental do A10, nas páginas oficiais de política do Google Play e de
referência do Android, em 19/09/2026. Links e datas de vigência em
`a10-politicas-google-play.txt`. **As políticas mudam:** reconferir antes de
submeter.

| Plataforma | Permissão/recurso | Exigência na loja | Risco de rejeição |
|---|---|---|---|
| Android | `PACKAGE_USAGE_STATS` (acesso ao uso) | Permissão restrita: tudo que vem dela é dado pessoal e sensível. Divulgação destacada **dentro** do app antes de pedir, uso só para funcionalidade central promovida na ficha, e política de privacidade. Sem formulário próprio | **Baixo**, se o onboarding fizer a divulgação antes de mandar o usuário aos Ajustes |
| Android | `<queries>` MAIN/LAUNCHER (lista de apps) | `QUERY_ALL_PACKAGES` é proibida quando uma consulta direcionada resolve; métodos que *aproximem* a visibilidade ampla também ficam restritos à funcionalidade central | **Baixo/médio.** A nossa consulta lista todos os apps com ícone. A justificativa ("o usuário escolhe o que monitorar") precisa estar escrita na ficha e no app |
| Android | `FOREGROUND_SERVICE_SPECIAL_USE` + tipo `specialUse` | `<property>` no manifesto com justificativa em texto livre lida por **revisor humano**, mais declaração no Play Console (descrição, impacto se a tarefa for adiada, vídeo) e os cinco critérios da política de serviços em primeiro plano | **Alto de execução.** O quinto critério é "rodar só o tempo necessário", e o monitoramento roda o dia inteiro. Os outros quatro dão defesa: o usuário liga, a notificação é perceptível, ele desliga quando quiser, e adiar significa não avisar na hora do risco (I-2) |
| Android | `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` + tipo `systemExempted` (VPN) | O Android só libera esse tipo para casos listados, entre eles apps de VPN; fora deles, exceção em tempo de execução. Em troca, a política **isenta** esse tipo dos cinco critérios | **Médio.** A isenção só vale enquanto somos a VPN ativa. Se outra VPN revogar a nossa (A8), subir o serviço de novo pode estourar exceção |
| Android | `SYSTEM_ALERT_WINDOW` (sobreposição) | Permissão especial: mandar o usuário aos Ajustes sem manipulação, só para funcionalidade central promovida na ficha. A política de comportamento enganoso proíbe imitar avisos do sistema. A própria referência do Android diz que pouquíssimos apps deveriam usá-la | **Alto.** Some-se que a documentação enquadra "atividade sobre o app em uso" como sequestro de interface (I-7). A tela precisa se identificar como nossa, sem parecer aviso do Android |
| Android | `VpnService` | Funcionalidade central de VPN **ou** uma das exceções, que incluem "acompanhamento de uso de apps". Documentar na ficha, **criptografar os dados até o ponto final do túnel**, e preencher formulário no Play Console com dois vídeos de até 90 s. Na página de tipos de conta, o Google recomenda conta de **organização** para apps aprovados a usar o VpnService ([tipos de conta](https://support.google.com/googleplay/android-developer/answer/13634885)) | **Alto.** A seção de VPN vale desde 01/01/2026 e pressupõe servidor remoto e túnel, que **não existem** num desenho local. Há leitura favorável ("App usage tracking" é opção do formulário, e a nossa privacidade é maior do que a política pressupõe), mas a decisão é de um revisor humano (I-19). A releitura do texto integral em 24/09/2026 confirma que as exceções pressupõem servidor remoto e que a criptografia vai até o ponto final do túnel ([política](https://support.google.com/googleplay/android-developer/answer/16558241)) |
| Android | `POST_NOTIFICATIONS` | Permissão de runtime comum; degradar com elegância se negada | **Baixo**, já tratado (I-6) |
| Android | `RECEIVE_BOOT_COMPLETED` | Nível normal, sem declaração | Nenhum |
| Android | `HIDE_OVERLAY_WINDOWS` | Nível normal, concedida na instalação | Nenhum para nós — o problema é que **qualquer outro app** a tem (I-25) |
| iOS | Entitlement Family Controls (Distribution), bundle IDs de extensões, regras do Screen Time | **Não pesquisado** (I14). O que se sabe vem do doc 02: o entitlement é exigido para TestFlight e App Store, por bundle ID e por extensão (T2) | **Não avaliado** |
| Android | Tema sensível, saúde, idade e cobrança (Google Play) | **Conteúdo sexual:** a política proíbe apps que contenham ou promovam pornografia, inclusive texto explícito e palavras adultas na ficha e no app ([Inappropriate Content](https://support.google.com/googleplay/android-developer/answer/9878810)). Não achei menção a apps de bloqueio ou recuperação. **Saúde:** o app deve entrar na política de apps de saúde, que inclui o bem-estar mental ([categorias](https://support.google.com/googleplay/android-developer/answer/13996367)); isso é dedução, ainda não confirmada. Nesse caso são exigidos a declaração no Play Console, a política de privacidade na loja e no app e, com afirmações de saúde, o aviso de que não é dispositivo médico ([Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511)). **Cobrança:** assinatura exige o Google Play Billing e proíbe levar o usuário a outro meio de pagamento ([Payments](https://support.google.com/googleplay/android-developer/answer/9858738)). Assinaturas pagam 15% no Brasil ([taxas](https://support.google.com/googleplay/android-developer/answer/112622)). Preço, renovação, teste e cancelamento têm regras próprias ([Subscriptions](https://support.google.com/googleplay/android-developer/answer/9900533)). **Idade:** o Digital ECA obriga apps voltados a menores, ou provavelmente acessados por eles, a usar a faixa etária fornecida pelas lojas. O Play bloqueia ou filtra apps classificados 18+ para menores no Brasil, e cabe ao desenvolvedor decidir como a lei se aplica ao app ([requisitos por país](https://support.google.com/googleplay/android-developer/answer/6223646)). **Classificação e declarações:** todo app precisa responder ao questionário de classificação (IARC), que só aparece dentro do Play Console. O resultado inclui a nota da ClassInd no Brasil, a resposta precisa ser exata e a autoridade pode alterar a nota ([classificação](https://support.google.com/googleplay/android-developer/answer/9859655)). A declaração de recursos financeiros é obrigatória mesmo para apps sem esses recursos ([declaração](https://support.google.com/googleplay/android-developer/answer/13849271)). A política de jogos de azar trata de apps que permitem ou facilitam apostar com dinheiro, o que o nosso não faz ([política](https://support.google.com/googleplay/android-developer/answer/9877032)). **Recebimento no Brasil:** o vendedor precisa informar dados da empresa e dos responsáveis, e empresas brasileiras enviam CPF e CNPJ (mesma página dos requisitos por país) | **Médio, controlável.** Depende da redação da ficha, das telas e dos vídeos e das declarações. O questionário de classificação só pode ser lido dentro do Play Console, e a política de jogos de azar não se aplica ao que o app faz. Tema na App Store não pesquisado (R6 do doc 01) |

**O que o desenho local paga a favor.** A política define "coletar" como
transmitir dado para fora do aparelho, e dado processado **apenas** no aparelho
não precisa ser declarado como coletado: a seção de segurança de dados pode ser
declarada **sem coleta** (I-27). Os exemplos de spyware giram em torno de
transmitir dados, e nada sai daqui. E na métrica de bateria que o Play trata
como qualidade desde 01/03/2026 — wake lock parcial com a tela apagada — o
protótipo mediu **zero** (A8 e T6). Nada disso dispensa política de privacidade,
divulgação destacada no app, nem exclusão de conta dentro do app e na web, que
passa a valer por ser assinatura.

---

## 6. Bateria e confiabilidade

### 6.1 Bateria

Quatro janelas medidas com o `batterystats`, sempre com o modo economia de
energia ligado:

| Métrica | A9 · 2h05, parado | A8 · 2h10, parado | **T6 · 21h59, dia de uso leve** | **A9 · 3d17h, parado** |
|---|---|---|---|---|
| Componentes ligados | serviço do limite | serviço + VPN | serviço + VPN | serviço + VPN |
| Doze profundo | ~91% | 91,4% | 97,2% | 99,3% |
| Ciclo de trabalho de CPU | 0,138% | 0,366% | **0,044%** | **0,034%** |
| mAh do UID, fora a tela | 0,476 | 1,32 | **1,09** | 5,90 |
| Parte do consumo do aparelho | 0,65% | 1,4% | **0,15%** | **0,3%** |
| Por dia | ~5,5 mAh (projeção) | ~11 a 15 mAh (projeção) | **1,2 mAh (medido)** | **1,6 mAh (medido)** |
| Wakelock parcial | nenhum | nenhum | nenhum | 39 ms, uma vez |

A última coluna é a janela mais longa: de 20/09 às 19:38 a 24/09 às 13:16, com o
aparelho praticamente intocado (30 min de tela em quase quatro dias, dos quais 29
são do próprio T6, que está contido nela). Ela custou **5,93 mAh, 0,3% dos
2010 mAh que o aparelho gastou**, e traz um detalhe novo: **1,03 mAh vieram de
sensores**. Não há uma linha de sensor no módulo Kotlin do protótipo; a origem
provável é o detector de chacoalhada do React Native, que registra o acelerômetro
para abrir o menu de desenvolvimento — mais uma peça do ambiente de
desenvolvimento, que não existirá em produção. Sem ela, a conta cai para 1,3 mAh
por dia.

**O custo é desprezível, e menor do que as janelas curtas faziam supor.** A
projeção linear do A8 superestimou o dia real em 9 a 12 vezes. A razão é que
tanto o serviço quanto o laço de reconexão do ambiente de desenvolvimento usam
`Handler`, que **não acorda o aparelho**: o custo acompanha o tempo de CPU
acordada — 58 min em 22 h no T6 — e não o relógio. Em Doze ninguém está usando
app nenhum, e não há o que detectar.

**Três ressalvas honestas sobre esses números:**

1. **São teto, não custo real.** O build de desenvolvimento, sem o cabo, fica
   tentando reconectar ao servidor Metro a cada 2 s (P8). Medido por thread no
   aparelho: com a CPU acordada, esse laço gasta 0,44 s de CPU por minuto, **dez
   vezes** a verificação do limite (0,04 s por minuto, ~13 ms por verificação).
   Um número limpo exige um build sem o cliente de desenvolvimento.
2. **O dia foi leve:** 29 min de tela e 11 s do app monitorado. Por conta, e não
   por medida, um dia de 4 h de tela ficaria em ~4 mAh, 0,1% da bateria. Além
   disso, cada verificação relê os eventos do dia inteiro, então **fica mais cara
   conforme o dia avança** — num dia com muita troca de app, mais ainda. O app
   definitivo precisa acumular incrementalmente.
3. **O `batterystats` cobra de cada UID a CPU das próprias threads.** O que o
   sistema gasta para responder às nossas consultas de uso é cobrado dele, não de
   nós, e o dump não traz o componente que redistribuiria esse custo.

### 6.2 Confiabilidade

**O que não falhou em 22 h ininterruptas (T6):** o serviço em primeiro plano
rodou a janela inteira sem recomeçar uma vez, o processo não morreu, a VPN
manteve a mesma instância e atravessou uma queda de Wi-Fi de 2m43s — percebeu a
queda em 9 ms e pegou a rede de volta 1,6 s depois da reassociação. Das 601
consultas de DNS da janela, 598 foram repassadas e 3 ficaram sem resposta (0,5%).
Nenhum crash.

**O que aconteceu nos três dias seguintes, sem ninguém abrir o app (A9).** Duas
respostas e um achado:

- **A Samsung não colocou o app para dormir.** Depois de 2 dias e 19 h sem o
  protótipo ser aberto, o bucket de standby estava em ACTIVE, sem restrição de
  segundo plano, com os dois serviços vivos e detecção todos os dias. Ressalva: o
  app manteve um serviço em primeiro plano o tempo todo, que é o cenário do
  produto — não foi testado um app de fato parado.
- **Uma atualização do WebView matou o nosso processo** às 01:21 de 22/09. O
  Play atualizou um pacote compartilhado e o Android derrubou o protótipo junto.
- **O sistema consertou em 2,5 segundos.** Os dois serviços foram recriados
  sozinhos, e **a VPN voltou sem pedir consentimento de novo** — a autorização
  fica guardada. Isso delimita o I-29: **morte de processo o sistema conserta;
  reinício do aparelho, não**, porque depois do boot não há serviço para recriar
  e o nosso receptor religa só o serviço do limite (I-31).

**O que falha, e precisa de tratamento no app definitivo:**

| # | Falha | Consequência |
|---|---|---|
| I-5 | Após o reinício, o serviço só volta ~2,5 min depois do boot, e só depois do primeiro desbloqueio | Janela cega a cada reinício. Não dá para eliminar sem tornar o app *direct boot aware* |
| I-29 | Após o reinício, **a VPN não volta** | A detecção de domínios fica desligada em silêncio |
| I-18 | Outra VPN derruba a nossa, e ela não volta sozinha | Quem já usa VPN perde a detecção sem saber |
| I-22 | Com DNS privado no modo estrito, ligar a nossa VPN deixa os apps **sem DNS** | O aparelho fica sem internet. Detectar o modo antes de ligar é obrigatório |
| I-30 | Perder uma permissão não gera aviso nenhum | O app para de proteger exatamente quando mais precisa, e ninguém fica sabendo |
| I-25 | Qualquer app esconde a sobreposição | A tela de interrupção pode simplesmente não aparecer |
| I-28 | O evento de interrupção não provava que a janela apareceu | Estatísticas de alertas seriam falsas. Corrigido no protótipo; levar as três regras (conferir visibilidade, descartar em 20 s, recuar progressivamente) para o produto |
| I-31 | O processo morre quando um pacote compartilhado do sistema é atualizado | O sistema recria os serviços em segundos, mas o app não pode supor que o processo vive para sempre: todo estado precisa estar em disco, e a recriação é caminho normal, não exceção |

**Comportamento em Doze e economia de energia:** o monitoramento sobrevive aos
dois, sem isenção de otimização de bateria — que, aliás, a política do Play não
permite pedir no nosso caso. Em Doze profundo as verificações ficam adiadas, o
que é o comportamento desejável: se o aparelho está dormindo, não há uso de app
para detectar.

**Limites da medição:** um único aparelho, um fabricante, uma versão de Android.
O doc 02 já prevê que restrições de bateria de outros fabricantes podem
interromper o monitoramento; isso continua sem validação.

---

## 7. Recomendação técnica

### 7.1 Biblioteca pronta ou módulo próprio

- **Android: módulo próprio** (D2), e a decisão está fechada. A biblioteca
  candidata (`@brighthustle/react-native-usage-stats-manager`) cobria só a
  leitura de uso; serviço em primeiro plano, notificação nativa, sobreposição e
  VPN precisariam ser escritos de qualquer jeito, e todos precisam escrever no
  mesmo log. O módulo do protótipo (`lab-monitoring`) é base
  direta para a Fase 4, com as correções de 7.2.
- **iOS: decisão adiada** (I13). Avaliar ao menos uma biblioteca de Screen Time
  assim que a conta destravar, pelos critérios da spec: manutenção recente,
  compatibilidade com Expo/EAS e cobertura dos experimentos I1–I12. O esqueleto
  Swift atual só responde `unsupported`.

### 7.2 Abordagem recomendada por funcionalidade (Android)

| Funcionalidade | Recomendação | Correções obrigatórias vindas da Fase 1 |
|---|---|---|
| **Limite de uso** | `queryEvents` com a regra de pendências do `STOPPED`, dentro de serviço em primeiro plano `specialUse`, com verificação periódica | Acumular incrementalmente em vez de reler o dia (custo cresce ao longo do dia); calcular a borda do dia explicitamente (I-4); filtrar lançadores (I-8); descontar o tempo de interrupção (I-10); contador de verificações no serviço, que hoje não existe |
| **Conteúdo adulto** | VPN local só de DNS, **em modo alerta**, com lista local | Detectar DNS privado estrito **antes** de ligar e enquanto estiver ligada (I-22); religar após o boot (I-29); perceber a revogação por outra VPN e avisar (I-18); repasse concorrente com nova tentativa curta (I-23); tratar detecção como indício, nunca recaída (I-20) |
| **Tela de interrupção** | **Sobreposição como principal**, tela própria como reserva — e **tela própria como principal se o alvo for aposta** (I-25) | Fundo opaco; voltar tratado explicitamente e testado com o voltar preditivo (I-14); `taskAffinity=""` e retrato fixo na tela própria; conferir visibilidade, descartar em 20 s e recuar progressivamente (I-28); aceitar a notificação de nível 1 como rede de segurança |
| **Navegador** | **Gatilho de alerta, não contagem de tempo:** detectar o acesso ao domínio e alertar depois que o limite do app estourou | Não prometer minutos de navegador nas estatísticas; se um dia for necessário, o erro da heurística precisa entrar na decisão de produto (I-21) |
| **Exibir minutos de uso** | Livre no Android, direto do módulo | As mesmas correções de borda de dia e desconto de interrupção |
| **Permissões** | Vigilância ativa: o app confere periodicamente e **avisa** quando perder alguma | É o I-30, hoje o buraco mais visível do protótipo |

### 7.3 Viabilidade da interface comum (C1, parcial)

A interface da spec §5.2 existe em `prototype/src/monitoring/types.ts` e o lado
Android a cumpre inteira. **Sem iOS não há comparação**, mas três pontos já dão
para antecipar, e valem como hipótese a confirmar:

- `selectTargets()` **não terá o mesmo formato**: no Android é lista própria de
  apps instalados; no iOS o usuário escolhe no seletor da Apple e o app recebe
  identificadores opacos. A interface precisa devolver uma seleção opaca nas duas
  plataformas, e o nome legível do app passa a ser um detalhe do Android.
- `getUsageToday()` deve responder `unsupported` no iOS, onde os minutos só podem
  ser exibidos por extensão de relatório (T3 do doc 02).
- `startAdultContentWatch({ mode })` pode não ter modo `alert` no iOS (R2). Se
  confirmado, a diferença sobe para o produto, não fica escondida na interface.

O que a Fase 1 mostrou do lado Android é que **o formato sobrevive**: funções
assíncronas, estado lido por consulta e eventos gravados num log comum. A prova
final depende do iOS.

---

## 8. Impactos nos documentos 01 e 02

Lista objetiva do que precisa mudar. Os identificadores I-1 a I-30 remetem à
tabela completa em `prototype/NOTAS.md`, com a evidência de cada um. **Estas
mudanças são decisão do responsável, fora do Claude Code.**

### 8.1 Funcionalidades (doc 01 §6)

- **§6.5 — Monitoramento e alertas.** Documentar a **pausa** depois do "continuar
  mesmo assim": duração, quais saídas pausam, o que volta no fim e se há teto
  diário de interrupções (I-16). Hoje o documento não fala de pausa nem de
  reinterrupção, e no protótipo **cada** reabertura acima do limite interrompe de
  novo.
- **§6.5 — terceiro botão.** Incluir "Ir para a tela inicial" na tela de
  interrupção, ao lado de "Emergência" e "Continuar mesmo assim" (I-15), e
  definir se ela conta como vitória nas estatísticas.
- **§6.5 — alerta de conteúdo adulto.** Deixar escrito que a detecção é
  **indício**: nunca vira recaída automática, e o alerta é lembrete (I-20).
- **§6.2 e §6.8 — estatísticas e streak.** Descontar o tempo diante da tela de
  interrupção (I-10), calcular a borda do dia explicitamente (I-4) e filtrar
  lançadores da lista de uso (I-8).
- **§6.7 — emergência.** A emergência pela notificação **não** cumpre o princípio
  P3 no One UI, porque o botão exige expandir a notificação (I-3). A um toque, só
  pela tela de interrupção.
- **§6.9 — modo degradado.** O app precisa **vigiar as permissões e avisar**
  quando perder alguma, e explicar o que parou de funcionar (I-6, I-30).

### 8.2 Onboarding (doc 01 §4)

- Preparar o usuário para **três caixas do sistema** que o app não controla: a
  divulgação destacada antes do acesso a dados de uso, a de sobreposição, e a da
  VPN, cujo texto diz que ela "permite monitorar o tráfego da rede" (I-17, I-19).
- Explicar a **notificação permanente** e a **chave de VPN na barra de status**,
  que ficam visíveis o dia inteiro (I-1, I-11) — é o custo de discrição do P7.
- Detectar o **DNS privado estrito** antes de ligar a VPN, e orientar em vez de
  deixar o aparelho sem internet (I-22).
- Avisar sobre a **janela cega após reiniciar o aparelho** ou aceitar como
  limitação declarada (I-5, I-29).

### 8.3 Telas

- **Tela de interrupção:** precisa se identificar como nossa, sem imitar aviso do
  sistema (exigência de política, I-7); fundo opaco; o gesto de voltar tratado
  explicitamente (I-13, I-14).
- **Perfil / estado do monitoramento:** uma tela onde o usuário veja se o
  monitoramento está de fato ativo — permissões, VPN e serviço — porque hoje a
  única forma de descobrir uma falha é abrir o app e olhar (I-30).

### 8.4 Planos gratuito e premium (doc 01 §8.2)

- Monitoramento e tela de interrupção são premium. Isso significa que, ao fim do
  teste de 7 dias sem assinatura, o app precisa **desligar o serviço em primeiro
  plano e a VPN** — e o usuário vai ver a notificação permanente e a chave de VPN
  sumirem. A transição prometida como "clara e explicada" (§8.3) passa a ter um
  sinal visível no sistema, o que ajuda.
- Esse mesmo desligamento é **defesa na loja**: reforça que o serviço só roda
  enquanto o usuário quer, que é um dos cinco critérios do `specialUse` (I-2).
- A permissão de sobreposição continua concedida depois de o usuário voltar ao
  gratuito; o app precisa parar de usá-la por conta própria.

### 8.5 Riscos (doc 01 §10 e doc 02 §10)

- **R1** (uso por app no iOS): **continua aberto**, sem nenhuma validação.
- **R2** (alertar sem bloquear no iOS): **continua aberto**.
- **R3** (VPN local no Android): **confirmado e agravado.** Não é só revisão
  rigorosa: a política pressupõe servidor remoto e criptografia até o túnel, que
  não existem no nosso desenho (I-19).
- **R4** (tela de interrupção): **validado com ressalva grave.** Funciona, mas
  qualquer app pode escondê-la (I-25).
- **R5** (navegador): **confirmado.** Acesso sim, tempo não (I-21).
- **R7** (excesso de notificações): ganha um caso concreto — acima do limite e
  fora da pausa, cada reabertura interrompe (I-16).
- **T4** (bateria no Android): **risco rebaixado.** 0,16% do consumo num dia
  inteiro, sem wakelock. Falta um dia pesado e outros fabricantes.
- **Risco novo, para a Fase 2:** os apps mais propensos a ligar a proteção contra
  sobreposição são os **financeiros e as casas de aposta** — exatamente o alvo da
  Fase 2 (I-25).

### 8.6 Fases (doc 02 §8)

- **Fase 1:** só metade concluída. O critério de saída ("relatório concluído e
  docs 01 e 02 atualizados") depende do iOS.
- **Fase 4:** entra com a lista de correções da seção 7.2 deste relatório, mais o
  contador de verificações e a vigilância de permissões.
- **Fase 8 (beta):** incluir teste em aparelho de outro fabricante e um dia de
  uso pesado com medição de bateria.
- **Fase 9 (publicação):** preparar os dois vídeos da VpnService, a justificativa
  em texto livre do `specialUse` e a divulgação destacada. Decidir **antes** se
  vale submeter uma VPN local.
- **Fase 2 (escopo de apostas):** medir uma amostra de apps de aposta e de banco
  com a proteção do I-25 antes de fechar o desenho da tela de interrupção.

---

## 9. Pendências e dúvidas

### 9.1 Critérios de conclusão da Fase 1 (spec §10)

- [x] Experimentos Android com resultado registrado, inclusive limitações e
      tentativas malsucedidas.
- [ ] **Experimentos iOS** — nenhum iniciado. Fora do critério de saída da Fase 1
      (decisão de 24/09/2026): passam para a fase iOS, depois da primeira versão
      Android.
- [x] Roteiros T1 a T8 e T10 executados no aparelho real.
- [ ] **T9 e a repetição dos roteiros no iPhone** — fora do critério de saída da
      Fase 1, pelo mesmo motivo.
- [ ] **Q1 a Q9 respondidas para as duas plataformas** — hoje só para o Android.
      O critério da Fase 1 passa a exigir só o Android.
- [x] Relatório de viabilidade escrito.
- [ ] Revisão no chat de planejamento e atualização dos documentos 01 e 02.

### 9.2 Bloqueado por terceiros

- **Conta Apple Developer pessoal.** Trava S2, S3, I1 a I14, C1, T9 e a repetição
  dos roteiros no iPhone. É a maior pendência do projeto: enquanto durar, os
  riscos R1, R2 e T7 seguem sem resposta.
- **Virtualização desligada na BIOS.** Trava o emulador Android, que serviria de
  segundo aparelho de teste (P2 em `NOTAS.md`).

### 9.3 Android: o que ficou por medir

- **Um dia de uso pesado**, com bateria medida num build sem o cliente de
  desenvolvimento — que hoje entra na conta por dois caminhos, o laço de
  reconexão e o acelerômetro (T6, A9).
- **Um app de fato parado**, sem serviço em primeiro plano, para saber se a
  Samsung o colocaria para dormir. Não é o cenário do produto, mas é o que
  faltou para fechar a pergunta.
- **Apps de aposta e de banco** com a proteção do I-25 — o mais importante para a
  Fase 2.
- **Chamada recebida** com a sobreposição na tela: é hipótese, e é segurança.
- **Voltar preditivo** ligado: tudo o que medimos do gesto de voltar passou pelo
  caminho antigo (I-14).
- **Força-parada pelo usuário**, que desligaria o religamento automático.
- **Segundo aparelho físico, de outro fabricante**, e outra versão de Android.
- **Troca de Wi-Fi para dados móveis** com a VPN ligada: o S22 de teste está sem
  serviço de celular.

### 9.4 Pesquisa que falta

- **Tema (Google Play):** feito em 24/09/2026, com o resultado na seção 5. Falta
  a checagem jurídica de como o Digital ECA se aplica ao app. O questionário de
  classificação só pode ser respondido dentro do Play Console.
- **Google Play Billing:** feito em 24/09/2026. É obrigatório para a assinatura,
  e o Brasil paga 15%. Falta confirmar no Play Console se há cobrança
  alternativa para o Brasil, porque as fontes divergem.
- Políticas equivalentes da **App Store**, incluindo o pedido de Family Controls
  (Distribution) e casos de rejeição (I14).

### 9.5 A preparar para a submissão ao Google Play

- **Conta de desenvolvedor:** decisão pendente entre pessoa física e empresa. O
  Google recomenda conta de organização para apps com VpnService, e a
  organização exige CNPJ e número D-U-N-S.
- **Verificação de desenvolvedor Android:** a partir de 30/09/2026, no Brasil, os
  apps precisam estar registrados por um desenvolvedor verificado para instalar
  em aparelhos certificados. Instalação por adb não é afetada.
- **Três vídeos:** dois para a VPN, de até 90 s cada (o app com a VPN em uso, e a
  divulgação destacada com os fluxos de consentimento e de recusa), e um para o
  serviço em primeiro plano.
- **Declarações no Play Console:** VpnService, serviço em primeiro plano,
  recursos financeiros (sem recursos), questionário de classificação e, se
  confirmado, apps de saúde.
- **Verificação de vendedor no Brasil:** dados da empresa e dos responsáveis, com
  CPF e CNPJ para empresas brasileiras.
- **Google Play Billing** na assinatura, com as regras de assinatura da seção 5.
- **Redação da ficha e das telas** sem termos explícitos nem nomes de sites, e
  domínio de teste neutro nos vídeos.
- **Build sem VPN** como plano B, sem substituir a revisão do Google.

### 9.6 Decisões do responsável (24/09/2026)

Decididas em 24/09/2026, em conversa com o Claude sobre este relatório. Elas
respondem às cinco perguntas que estavam em aberto e registram as definições que
surgiram na conversa.

| Tema | Decisão |
|---|---|
| Ordem de lançamento | Android primeiro. O iOS segue depois de publicada a primeira versão Android |
| VPN local no Google Play | Direção: submeter a VPN local ao Google Play. Formato: build com VPN declarada e uma variante sem VPN como plano B (ver abaixo) |
| Navegador | Não conta no limite. O acesso a domínios da lista pelo navegador só gera alerta |
| O que conta como interrupção | Toda tela de interrupção exibida. "Emergência" não conta |
| Teto de interrupções | Depois da terceira interrupção, a tela oferece o botão "Ignorar o limite por hoje" |
| Reprovação do dia | Só reprovam o dia, zerando o streak: "Ignorar o limite por hoje" e o terceiro "Continuar mesmo assim" |
| Depois de ignorar | Nenhum alerta adicional no resto do dia |
| Duração da pausa | 5 minutos depois de "Continuar mesmo assim" |
| "Ir para a tela inicial" | Conta como vitória, porque o usuário interrompeu o uso da rede social |
| Notificação de motivação | Enviar uma notificação especial no começo do dia seguinte à quebra do streak |
| Ícone e nome visíveis | Manter o atual por enquanto, neutro e sem esconder. O teste de importância mínima do canal pode ser reavaliado no beta |

**Confirmadas pelo responsável em 24/09/2026.** Propostas feitas na conversa e
aceitas:

- Depois do terceiro "Continuar mesmo assim", o app também deixa de interromper
  até a meia-noite, como no "Ignorar o limite por hoje".
- Avisar na tela, antes do terceiro "Continuar mesmo assim", que ele encerra a
  meta do dia.
- Só "Continuar mesmo assim" pausa. "Ir para a tela inicial" e "Emergência" não
  pausam, como no protótipo.
- Notificação do dia seguinte: texto neutro, enviada só quando havia streak a
  perder, com agendamento que sobreviva ao reinício do aparelho.
- VPN em build separado, com uma variante sem VPN como plano B. Isso não
  substitui a revisão do Google, e o build com VPN é sempre declarado.
- Redefinir o critério de saída da Fase 1 para Android, registrar o iOS como fase
  posterior e refletir as decisões acima nos documentos 01 e 02.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 24/09/2026 | Primeira versão. Android completo; iOS não iniciado |
| 0.2 | 24/09/2026 | Fecha o A9 com os três dias parados: a Samsung não suspendeu o app, e uma atualização do WebView matou o processo, com os serviços recriados em 2,5 s (I-31). Acrescenta a janela de bateria de 3d17h |
| 0.3 | 24/09/2026 | Seção 5: conta de organização recomendada para o `VpnService` e releitura da política de VPN; o tema sensível deixa de ser lacuna, com conteúdo sexual, saúde, cobrança, idade e classificação no Google Play. Seção 9: o critério de saída da Fase 1 passa a ser só Android, entra "A preparar para a submissão ao Google Play" e as decisões do responsável viram tabela |
