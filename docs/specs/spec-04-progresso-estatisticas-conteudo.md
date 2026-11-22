# Spec 04: Progresso, estatísticas e conteúdo remoto (Fase 5)

> **Status:** rascunho v0.2 · **Última atualização:** 22/11/2026
> **Documentos base:** `docs/01-visao-e-escopo-mvp.md` (v0.11, seções 6.1, 6.3, 6.4, 6.6 e 6.8) · `docs/02-plano-tecnico.md` (v0.9, seções 2, 3, 5 e 8) · `docs/specs/spec-03-monitoramento-alertas-emergencia.md` (v0.3) · `NOTAS-APP.md`
> **Tipo:** código definitivo. **Só Android.** Sem VPN (D6).

---

## 1. Objetivo

Dar ao usuário a **jornada** e o **passado em números**:
- a aba **Progresso** mostra os marcos de cada compulsão, com benefício, referência científica e vídeo desbloqueado;
- o usuário é avisado quando alcança um marco (notificação neutra e celebração no app);
- a aba **Estatísticas** mostra uso, alertas, streaks, emergência e tempo recuperado;
- marcos, textos e vídeos vêm de **conteúdo remoto**, atualizável sem publicar nova versão nas lojas, e o app funciona sem internet.

Nesta fase o conteúdo é **de teste**. O conteúdo real (pesquisa científica e vídeos produzidos) entra na Fase 7, sem mudar o código.

---

## 2. Escopo

### 2.1 Dentro do escopo
- Catálogo de conteúdo: formato, validação, cópia embutida no app, cache local e atualização remota.
- Hospedagem no **Cloudflare R2**: catálogo (JSON) e vídeos (MP4), com o endereço de teste do R2 em desenvolvimento e prévia.
- Marcos: alcance, desbloqueio permanente, celebração no app e **notificação de marco** (nativo).
- Aba Progresso, com filtro por compulsão; o card do Início abre a aba filtrada (doc 01, 6.1).
- Player de vídeo (`expo-video`), com o selo de conteúdo gerado com IA.
- Histórico de uso por hora e por app, guardado no aparelho, com o que o sistema ainda tiver dos dias anteriores.
- Ponto de partida do "tempo recuperado".
- Aba Estatísticas.
- Conteúdo de teste neutro (textos e vídeos).

### 2.2 Fora do escopo
- Conteúdo real dos calendários e vídeos produzidos (Fase 7).
- Cadeado e regras do plano gratuito (Fase 6). Nesta fase o catálogo só **marca** o que é gratuito, e tudo fica liberado.
- Domínio próprio para o conteúdo (antes da Fase 8, seção 5.2).
- Supabase: **não entra** (decisão de 22/11/2026, doc 02).
- Sentry (Fase 8), iOS (Fase 10), VPN (D6).
- Download de vídeos para ver sem internet.

---

## 3. Decisões aplicadas (22/11/2026)

| # | Tema | Decisão |
|---|---|---|
| 1 | Onde fica o conteúdo | Arquivos estáticos (JSON) no **Cloudflare R2**, com a fonte versionada no repositório. Sem Supabase |
| 2 | Vídeos | **MP4** (720p) no mesmo R2, tocados com o **`expo-video`** (biblioteca da Expo com código nativo, confirmada pelo responsável) |
| 3 | Contas e domínio | Conta gratuita no Cloudflare nesta fase (responsável). Desenvolvimento e prévia usam o endereço de teste do R2 (`r2.dev`); produção exige domínio próprio, antes da Fase 8 |
| 4 | Marco alcançado | **Notificação neutra às 9h** (mesmo mecanismo do recomeço, dentro do limite de 6) e **celebração no app** |
| 5 | Marco alcançado de novo depois de uma quebra | **Celebra de novo.** O vídeo já desbloqueado continua; nada se perde |
| 6 | Ponto de partida do "tempo recuperado" | Média diária dos **7 dias antes do início**, lida do Android; sem dados suficientes, a **primeira semana** de uso |
| 7 | Estatísticas | Todos os itens do doc 01 (6.8). Comparação com os gatilhos na forma simples: faixas declaradas destacadas no gráfico de horários |
| 8 | Plano gratuito | O catálogo marca os marcos gratuitos (até 7 dias). Cadeado e regras na Fase 6 |
| 9 | Conteúdo de teste | Marcos 1, 3, 7, 14, 30, 60, 90, 180 e 365 dias, com textos e vídeos de teste neutros |

---

## 4. Arquitetura

### 4.1 Conteúdo
```
repositório: content/catalog.pt-BR.json  ──(publicação)──▶  R2: catalog.pt-BR.json
                    │                                        R2: videos/<id>.mp4
                    └──(build)──▶ cópia embutida no app
app: embutida ──▶ cache no banco (a versão mais nova válida) ──▶ telas
```

- **Fonte da verdade:** `content/catalog.pt-BR.json` no repositório, revisado por PR como o código. Um arquivo por idioma, preparado para tradução.
- **Cópia embutida:** o build inclui o catálogo do repositório. Na primeira abertura, sem internet, o app já tem marcos e textos (sem vídeos).
- **Atualização:** ao abrir o app e ao voltar do segundo plano, se a última consulta tiver mais de 24 horas, o app baixa o catálogo, valida e, se a versão for mais nova e válida, troca o cache. Falha de rede ou catálogo inválido: segue com o que tem, sem mensagem de erro ao usuário e sem novas tentativas em sequência.
- **Validação:** função pura em `src/domain/` (formato, campos obrigatórios, dias únicos e crescentes, versão do formato). Biblioteca de validação só com justificativa no `NOTAS-APP.md`.
- **Endereço do conteúdo:** por variante de build (`src/config/`). Uma verificação no build (como a do manifesto) **falha se a produção apontar para `r2.dev`**.
- **Sem SDK:** só requisições HTTP simples, sem cabeçalhos ou parâmetros que identifiquem o usuário ou o aparelho.

### 4.2 Formato do catálogo (mínimo)
```json
{
  "formatVersion": 1,
  "contentVersion": 3,
  "updatedAt": "2026-11-22",
  "compulsions": {
    "<tipo da compulsão, como no código>": {
      "milestones": [
        {
          "day": 7,
          "title": "...",
          "summary": "...",
          "body": "...",
          "references": [{ "label": "...", "url": "..." }],
          "free": true,
          "video": { "id": "v7a1", "durationSeconds": 75, "aiGenerated": true }
        }
      ]
    }
  }
}
```
- Os dias dos marcos vêm do catálogo e substituem a lista fixa de `src/domain/streak.ts` (a lista fica só como reserva, se o catálogo não tiver a compulsão).
- `formatVersion` maior que o suportado pelo app: o catálogo é ignorado (o app mantém o que tem).
- Vídeos com **identificador opaco** (`videos/<id>.mp4`), sem tema no nome do arquivo.

### 4.3 Marcos: quem decide o quê
| Camada | Responsabilidade |
|---|---|
| **JavaScript** | Calcula os alcances a partir do histórico (recaídas, dias reprovados, início), grava os alcances, mostra a celebração e a aba Progresso. Envia ao nativo, pela configuração, os dias dos marcos de cada compulsão |
| **Nativo (Kotlin)** | Com o app fechado, percebe que hoje é dia de marco e envia a notificação às 9h ou no primeiro desbloqueio depois das 9h, com as regras da seção 5.5. A base da streak é a **mais recente** entre a recebida do JS (`streakBaseDayKey`) e a **última quebra que o próprio nativo viu** (dia reprovado na tela de interrupção, "Tive uma recaída" na notificação), porque essas quebras acontecem com o app fechado |

As regras de "hoje é dia de marco", inclusive a base da streak com a quebra vista pelo nativo, entram nos **vetores compartilhados** (Jest e JUnit), como as regras do momento na Fase 4.

### 4.4 Histórico de uso
- O nativo, que já mede o uso para as regras, passa a guardar em disco os totais **por dia, hora, compulsão e app**, descontando o tempo diante da tela de interrupção, por pelo menos 14 dias.
- O JS consulta esse histórico ao abrir o app e ao voltar do segundo plano e grava no banco de forma **idempotente** (substitui o total da mesma hora; consultar duas vezes não duplica).
- **Dias anteriores:** quando o acesso ao uso está concedido e o histórico ainda está vazio (primeira abertura da Fase 5 ou permissão concedida depois), o nativo lê do Android o que ele ainda tiver dos dias anteriores, só dos apps monitorados. Conferir na documentação oficial quanto tempo o Android guarda os eventos de uso e registrar no `NOTAS-APP.md`.
- **Tela de interrupção nos dias anteriores:** com a sobreposição aberta, o Android continua contando o app que está por baixo. Ao gravar os dias anteriores, descontar o tempo das telas já registradas no banco (`shown_at` e `responded_at` de `interruption_events`).
- Um app nas duas listas conta nas duas compulsões, como nas regras.

---

## 5. Requisitos

### 5.1 Conteúdo de teste
- Marcos nos dias 1, 3, 7, 14, 30, 60, 90, 180 e 365, para as duas compulsões, com título, resumo, texto e uma referência de exemplo em cada um, todos **claramente de teste** e neutros (nenhum termo explícito, nenhuma alegação de saúde).
- `free: true` até 7 dias.
- Vídeos de teste curtos (10 a 20 s), gerados localmente (ex.: cor de fundo e o número do marco), sem pessoas, vozes ou músicas, com `aiGenerated: false`, menos um, marcado como `true` só para conferir o selo. Um vídeo por marco até 30 dias basta; os outros marcos ficam sem vídeo, para testar esse caso. Para gerá-los, o responsável autorizou instalar o `ffmpeg` no computador (ferramenta só da máquina, fora do app e do repositório); registrar o comando no `NOTAS-APP.md`.
- Textos de interface no i18n; textos de conteúdo só no catálogo.

### 5.2 Hospedagem (Cloudflare R2)
- O responsável cria a conta gratuita no Cloudflare (o Claude Code dá o passo a passo e explica o que cada passo faz). Nenhuma cobrança é ativada sem confirmação do responsável.
- Um bucket público para o conteúdo, com o endereço de teste `r2.dev` em desenvolvimento e prévia.
- **Publicação:** script local (ex.: `npm run content:publish`) que valida o catálogo e envia catálogo e vídeos, ou passo a passo pelo painel, à escolha do responsável. **Credenciais só na máquina do responsável**, nunca no repositório nem no CI.
- O catálogo é servido com cache curto (o app já limita a uma consulta por dia); os vídeos, com cache longo (o identificador muda quando o vídeo muda).
- **Pendência para antes da Fase 8:** domínio próprio (ex.: `conteudo.quedo.com.br`) gerenciado no Cloudflare e ligado ao bucket. Depende do registro do quedo.com.br pelo responsável.

### 5.3 Marcos: alcance, desbloqueio e celebração
- **Alcance:** a streak de uma compulsão chega ao dia de um marco. Cada sequência (desde a última quebra) alcança cada marco uma vez.
- **Desbloqueio:** o primeiro alcance de um marco desbloqueia o marco e o vídeo **para sempre** (doc 01, 6.4). Quebras não desfazem; "Desfazer" uma recaída também não.
- **Alcançado de novo** depois de uma quebra: nova celebração ("Você chegou de novo a 7 dias"), sem novo desbloqueio, **a partir do marco de 3 dias**. O de 1 dia é alcançado em todo recomeço (o dia da quebra é 0 e o seguinte é 1), então ele só é celebrado na primeira vez.
- **Recaída registrada hoje para ontem:** hoje já é o dia 1 da nova sequência e conta como dia de recomeço para os marcos: sem notificação de marco e sem celebração do 1 dia.
- **Marco alcançado no dia em que a sequência quebra** (moderação: dia reprovado depois da meia-noite em que o marco foi alcançado; abstinência: recaída registrada no próprio dia do marco): o alcance fica gravado e o marco desbloqueado. Se ainda não tiver sido celebrado, é marcado como celebrado **sem mostrar a tela**, para não aparecer uma celebração depois da quebra.
- **Início com dias já cumpridos** (abstinência com "Estou sem recair há N dias"): os marcos até N ficam desbloqueados no início, **sem notificação nem celebração**.
- **Primeira abertura depois de instalar a Fase 5** (quem já usava o app): os alcances do passado são gravados como já celebrados; só o de hoje, se houver, é celebrado.
- **Celebração no app:** ao abrir o app (ou tocar na notificação), cada alcance ainda não celebrado aparece numa tela de celebração, um por vez (ou um resumo, se forem mais de dois): dias, título do marco e os botões "Ver o marco" (abre o detalhe na aba Progresso) e "Fechar". Com leitor de tela, foco inicial no título. Celebrar uma vez marca o alcance como celebrado.
- Compulsão pausada (Fase 6) não alcança marcos enquanto pausada.

### 5.4 Aba Progresso
- **Filtro por compulsão** no topo, quando houver mais de uma ativa. No card do Início, **a área da streak e do próximo marco** abre a aba já filtrada na compulsão do card, com rótulo claro para o leitor de tela. O resto do card não muda, porque tem botões próprios (check-in, recaída, permissões).
- **Cabeçalho:** streak atual, próximo marco e quantos dias faltam.
- **Linha do tempo** com todos os marcos do catálogo, em quatro estados: alcançado nesta sequência; desbloqueado antes (alcançado numa sequência anterior); próximo; futuro.
- **Detalhe do marco:** dia, título, texto do benefício, referências, aviso de que o conteúdo não substitui acompanhamento profissional e o vídeo:
  - desbloqueado: botão para assistir;
  - ainda não: "Disponível ao chegar a N dias", sem mostrar o vídeo;
  - marco sem vídeo: nenhum espaço vazio.
- Referências com link abrem no navegador do aparelho.
- Sem catálogo da compulsão (não deveria acontecer, mas não pode quebrar): estado vazio com texto neutro.
- Tema claro e escuro, fonte até o máximo, leitor de tela em toda a linha do tempo.

### 5.5 Notificação de marco (nativo)
- **Quando:** no dia em que a streak de uma compulsão chega a um marco, às 9h se o celular estiver em uso; se estiver bloqueado, no primeiro desbloqueio depois das 9h (o mesmo mecanismo do recomeço, inclusive a conferência no desbloqueio). Sem desbloqueio no dia, expira à meia-noite.
- **Uma por dia:** duas compulsões com marco no mesmo dia geram uma notificação só.
- **Não no dia do recomeço:** o dia seguinte a uma quebra é também o dia 1 da nova sequência. Nesse dia sai **só o recomeço**, e a regra vale **para o aparelho inteiro**: nenhuma notificação de marco de nenhuma compulsão; as celebrações ficam no app. O dia de uma recaída registrada para ontem conta como dia de recomeço para esta regra (5.3).
- **Início com dias já cumpridos:** os marcos até N não geram notificação (5.3).
- **Limite de 6 por dia:** o marco usa a vaga garantida do recomeço, que nunca sai no mesmo dia. As preventivas continuam com no máximo 4.
- **Textos:** neutros, sem o nome da compulsão, vindos do i18n pela configuração. Tela bloqueada só com a versão neutra, como todas as notificações (spec 03, 5.4).
- Canal **Lembretes**. Tocar abre o app e mostra a celebração.
- Funciona **sem a permissão de uso**, como o check-in e o recomeço.
- "Desfazer" uma quebra no mesmo dia reavalia: se hoje voltou a ser dia de marco, a notificação pode sair.

### 5.6 Player de vídeo
- `expo-video`, instalado com `npx expo install` e registrado no `NOTAS-APP.md` (versão compatível com o SDK 58).
- Tela própria, aberta pelo detalhe do marco: tocar para começar (nunca automático), controles do sistema, tela cheia opcional.
- **Selo** "Conteúdo gerado com IA" quando `aiGenerated` for verdadeiro (doc 01, 6.4).
- Sem internet ou erro: mensagem neutra e botão para tentar de novo. Carregando: indicador.
- Cache do próprio player para não baixar de novo o que acabou de tocar. Sem download para ver sem internet nesta fase.
- O vídeo para ao sair da tela e quando o app vai para o segundo plano.
- Nenhuma permissão nova no manifesto (conferir com `check:manifest`). Sem reprodução em segundo plano nem imagem sobre imagem: se o `expo-video` acrescentar permissões ou serviços para isso, desligar pela configuração do plugin.

### 5.7 Histórico de uso e ponto de partida
- **Histórico:** seção 4.4.
- **Ponto de partida** (só na moderação, vídeos curtos), calculado uma vez e guardado na compulsão:
  - quando o acesso ao uso estiver concedido e o ponto de partida ainda não existir, o app pede ao nativo o uso dos apps escolhidos nos **7 dias antes do dia de início**;
  - com **pelo menos 3 dias** com dados, o ponto de partida é a média diária desses dias (origem `before_start`);
  - com menos, o ponto de partida é a média dos **7 primeiros dias completos** depois do início, com o acesso ao uso concedido (origem `first_week`). Até lá, a estatística mostra "Disponível a partir de <data>";
  - **quem começou antes da Fase 5** (os 7 dias antes do início já saíram do que o Android guarda, e o histórico próprio só começa agora): o ponto de partida é a média dos 7 primeiros dias completos depois de instalar a Fase 5 (origem `first_week`), com "Disponível a partir de <data>" até lá;
  - mudar os apps depois não recalcula o ponto de partida.
- **Tempo recuperado:** soma, desde o início, de quanto cada dia **com histórico** ficou abaixo do ponto de partida (dias acima não descontam; dias sem histórico não entram). Mostrado em horas e minutos, no total e na semana.

### 5.8 Aba Estatísticas
Filtro por compulsão, como no Progresso, mais uma seção geral.

**Vídeos curtos (moderação):**
- uso por dia (últimos 7 dias, barras com a linha do limite) e por semana (últimas 8 semanas), no total e por app;
- horários de maior uso (média por hora nos últimos 30 dias), com as **faixas de gatilho declaradas destacadas**;
- alertas respeitados e ignorados: respeitados são "Ir para a tela inicial" e "Emergência"; ignorados, "Continuar mesmo assim" e "Ignorar o limite por hoje";
- dias aprovados e dias reprovados desde o início (aprovado = dia já terminado e não reprovado; um dia pode passar do limite com um ou dois "Continuar" e ainda ser aprovado);
- tempo recuperado (5.7);
- histórico de sequências: atual, maior, e a lista com início, fim e duração.

**Pornografia (abstinência):**
- histórico de sequências e recaídas (atual, maior, lista);
- check-ins respondidos;
- alertas dos apps de risco: quantos avisos por notificação e quantas telas de interrupção, e em que horários aconteceram, com as faixas de gatilho declaradas destacadas. "Respeitado ou ignorado" vale só para as telas, porque a notificação não tem botões. **Sem minutos de uso** (doc 01, 6.8). O histórico dos avisos começa na Fase 5 (os da Fase 4 foram descartados na importação).

**Geral:** uso do botão de emergência (quantas vezes, de onde) e vitórias ("A vontade passou?" respondido com sim).

**Regras:**
- Minutos de navegador nunca aparecem (D6; navegador não é monitorado nesta versão).
- Tempo diante da tela de interrupção não conta; lançadores filtrados; borda de dia explícita (doc 01, 6.8).
- Hoje entra com os números até agora.
- Sem acesso ao uso: as estatísticas de minutos mostram o motivo e um botão para a tela de permissões; as outras continuam.
- Pouco histórico: estado vazio explicando a partir de quando aparecerá.
- **Gráficos sem biblioteca**, com componentes simples (barras com `View`). Biblioteca de gráficos só com justificativa e, se tiver código nativo, confirmação do responsável.
- Cada gráfico com descrição para o leitor de tela (os valores em texto).
- Cálculos em `src/domain/`, puros e testados.

### 5.9 Banco: migração da Fase 5
A `0007` (já existem as `0000` a `0006`). Só `CREATE TABLE` e `ALTER TABLE ... ADD`, sem recriar tabela-pai, passando no teste das tabelas filhas.

| Tabela | Campos |
|---|---|
| `content_catalog` (nova) | `locale` (único), `format_version`, `content_version`, `fetched_at`, `json`. Conteúdo público: pode ficar fora de "Apagar meus dados" |
| `milestone_reaches` (nova) | `id`, `compulsion_id` (cascata), `milestone_day`, `streak_base_day` (início da sequência), `reached_on`, `celebrated_at` (nulo até celebrar). Único em (`compulsion_id`, `milestone_day`, `streak_base_day`). Desbloqueado = existe ao menos um alcance daquele marco |
| `app_usage_hourly` (nova) | `day_key`, `hour` (0 a 23), `compulsion_id` (cascata), `app_package`, `seconds`. Único em (`day_key`, `hour`, `compulsion_id`, `app_package`) |
| `monitoring_alerts` (nova) | `id` (identificador do evento nativo, único), `compulsion_id` (cascata), `day_key`, `sent_at`, `kind` (`limit` \| `risk_app`), `app_package` (fica só no aparelho). Os eventos de aviso (`limit_reached`) passam a ser gravados aqui, em vez de descartados |
| `user_compulsions` (+ campos) | `baseline_minutes_per_day` (nulo até calcular), `baseline_source` (`before_start` \| `first_week`) |

### 5.10 Notificações e configuração
- A configuração enviada ao nativo ganha, por compulsão, os **dias dos marcos** do catálogo e os textos da notificação de marco.
- O evento de notificação enviada passa a ter o tipo `milestone`, importado como os outros.

### 5.11 Textos
- Interface no i18n (`src/i18n/pt-BR/`): abas, celebração, detalhe, player, estatísticas, notificação de marco.
- Neutros, acolhedores, sem termo explícito e sem alegação de saúde.
- **Listados no PR** para revisão do responsável, como nas fases anteriores.

### 5.12 Ferramentas de teste (só em desenvolvimento)
Na tela de conferência do monitoramento:
- simular uma streak de N dias numa compulsão (para ver marcos e celebração sem esperar);
- disparar agora a notificação de marco;
- forçar a atualização do catálogo e mostrar a versão em uso (embutida, cache ou remota);
- ver o histórico de uso guardado no nativo e o ponto de partida.

**Simular uma streak** altera dados reais do app de desenvolvimento (início ou recaídas). A ferramenta guarda os valores originais e tem "Desfazer a simulação", que também apaga os alcances de marco criados durante a simulação.

Nada disso em prévia ou produção.

### 5.13 Privacidade
- Nenhum dado pessoal sai do aparelho: histórico de uso, alcances e estatísticas ficam no banco local.
- O app baixa o **catálogo inteiro** (todas as compulsões), nunca só o da compulsão do usuário, para o servidor não saber qual ela é.
- Requisições sem identificador do usuário ou do aparelho. O pedido de um vídeo revela só um identificador opaco; isso é aceito.
- Nada de nomes de apps, marcos alcançados ou estatísticas no `logcat`.
- **"Apagar meus dados"** inclui as tabelas novas (menos o catálogo, que é público) e, no nativo, o histórico de uso e a última quebra vista; as duas listas de limpeza (JS e nativo) são atualizadas e testadas.

### 5.14 Pendência herdada da Fase 4
- Falha intermitente de suítes do Jest na primeira execução com cache frio: se voltar, rodar `npm test -- --runInBand`, registrar quais suítes caem e corrigir.

### 5.15 Testes
- **Jest:** validação e troca do catálogo (versão nova, inválida, formato maior), alcances e desbloqueios (quebra, alcance de novo, "Desfazer", início com N dias, primeira abertura da Fase 5), ponto de partida (as duas origens), tempo recuperado, estatísticas, importação idempotente do histórico, telas novas.
- **JUnit:** dia de marco, uma por dia, dia do recomeço, limite de 6, histórico por hora (sessão que atravessa a hora e a meia-noite), com os **vetores compartilhados**.
- **Mutação de controle** nos casos principais.
- **Maestro:** Progresso (filtro, detalhe, vídeo de teste), celebração com a ferramenta de streak, Estatísticas com e sem dados.

---

## 6. Ordem de execução

1. **Catálogo:** formato, validação, conteúdo de teste em `content/`, cópia embutida, cache no banco (migração), troca de versão. Endereço remoto configurável, testado com servidor falso.
2. **Hospedagem:** conta e bucket no Cloudflare com o responsável, publicação do catálogo e dos vídeos de teste, endereço `r2.dev` em desenvolvimento e prévia, verificação que impede `r2.dev` na produção.
3. **Marcos e aba Progresso:** alcances e desbloqueios, celebração, linha do tempo, detalhe, card do Início abrindo a aba filtrada.
4. **Vídeos:** `expo-video` (já confirmado), player, selo de IA.
5. **Notificação de marco** no nativo.
6. **Histórico de uso** no nativo, dias anteriores e ponto de partida.
7. **Aba Estatísticas.**
8. **Ferramentas de teste**, Maestro e roteiro manual (seção 7).

Uma branch e um PR por passo. Se um passo ficar grande, dividir em partes.

---

## 7. Roteiro de verificação manual (no S22)

| # | Roteiro | Esperado |
|---|---|---|
| P1 | Primeira abertura da Fase 5 sobre os dados atuais | Marcos já alcançados aparecem desbloqueados, sem chuva de celebrações; histórico de uso com os dias anteriores que o Android tinha |
| P2 | Modo avião, abrir o app instalado do zero | Marcos e textos do catálogo embutido; vídeo mostra a mensagem de sem internet |
| P3 | Publicar um catálogo com versão nova (texto de um marco alterado) | Depois da consulta (ou forçando pela ferramenta), o texto novo aparece; o antigo some |
| P4 | Publicar um catálogo inválido | O app ignora e continua com o anterior, sem erro na tela |
| P5 | Ferramenta: streak de 7 dias | Celebração ao abrir; marco desbloqueado; vídeo toca com o selo quando for o caso |
| P6 | Tocar no card do Início | Abre a aba Progresso filtrada na compulsão do card |
| P7 | Recaída e, depois, streak de 7 de novo | Celebração "de novo"; o vídeo continua disponível durante a quebra |
| P7b | Quebra com o app fechado (dia reprovado na tela ou "Tive uma recaída" na notificação) e, no dia seguinte, a ferramenta de marco | O nativo usa a quebra que viu: nenhuma notificação de marco com a streak antiga |
| P8 | Notificação de marco disparada pela ferramenta, com o S22 bloqueado | Só a versão neutra na tela bloqueada; completa no desbloqueio; tocar abre a celebração |
| P9 | Dia seguinte a uma recaída com streak; e uma recaída registrada para ontem | Só o recomeço (no primeiro caso); nenhuma notificação de marco nem celebração do 1 dia nos dois |
| P10 | Estatísticas de vídeos curtos depois de alguns dias de uso | Num dia **sem telas de interrupção**, totais por dia e por app batem com o "Tempo de uso" do Android (tolerância de 1 min por app); num dia com telas, o nosso é menor pelo tempo delas. Faixas de gatilho destacadas |
| P11 | Estatísticas sem o acesso ao uso | Minutos mostram o motivo e o botão; o resto continua |
| P12 | Tempo recuperado | Ponto de partida com a origem certa; valor coerente com os dias mostrados |
| P13 | Tema escuro, fonte no máximo e leitor de tela no Progresso, no detalhe e nas Estatísticas | Tudo legível, sem corte; gráficos lidos em texto |
| P14 | Ler todos os textos novos | Português correto, tom acolhedor, nenhum termo explícito |
| P15 | Build de prévia | Conteúdo pelo `r2.dev`, ferramentas de teste ausentes, `check:manifest` ok; build de produção recusado enquanto apontar para `r2.dev` |

---

## 8. Critérios de aceite

- [ ] Catálogo validado, embutido, em cache e atualizado do R2, com a fonte no repositório.
- [ ] Hospedagem no R2 com publicação sem credenciais no repositório; produção impedida de usar `r2.dev`.
- [ ] Marcos com alcance, desbloqueio permanente, celebração (inclusive "de novo") e as regras de início com N dias e primeira abertura.
- [ ] Aba Progresso completa, com o card do Início abrindo a aba filtrada.
- [ ] Vídeos com `expo-video`, selo de IA e estados de erro, sem permissão nova.
- [ ] Notificação de marco no nativo, com as regras da seção 5.5, a quebra vista pelo nativo e vetores compartilhados.
- [ ] Histórico de uso por hora e app, com os dias anteriores do sistema e importação idempotente.
- [ ] Ponto de partida e tempo recuperado.
- [ ] Aba Estatísticas completa, com cálculos em `src/domain/` testados e os avisos de monitoramento gravados.
- [ ] Migração testada em Jest e no aparelho sobre o banco existente.
- [ ] Ferramentas de teste ausentes em prévia e produção.
- [ ] Roteiro P1 a P15 executado com o responsável.
- [ ] `lint`, `typecheck` e `test` no CI; `NOTAS-APP.md` atualizado.

---

## 9. Instruções para o Claude Code

- Ler o `CLAUDE.md`, esta spec, as seções do doc 01 indicadas no topo e o `NOTAS-APP.md` antes do passo 1.
- **Consultar a documentação oficial atual** do Cloudflare R2, do `expo-video` (SDK 58) e do Android (`UsageStatsManager`, retenção dos eventos) antes de cada passo.
- Criar conta, ativar cobrança ou instalar biblioteca com código nativo além do `expo-video` exige explicação e confirmação do responsável.
- Credenciais do Cloudflare nunca no repositório, no CI ou em logs.
- Textos listados no PR para revisão do responsável.
- Não alterar `docs/01`, `docs/02` nem as specs. Divergências vão para o `NOTAS-APP.md` e para o chat de planejamento.
- Responder **sempre em português** (CLAUDE.md, seção 4).
- Nunca afirmar que algo funciona sem evidência.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 22/11/2026 | Primeira versão, com as decisões de 22/11/2026 |
| 0.2 | 22/11/2026 | Dez pontos da leitura do Claude Code: base da streak no nativo com a quebra que ele mesmo viu (4.3); avisos de monitoramento gravados em `monitoring_alerts` (5.8, 5.9); ponto de partida de quem começou antes da Fase 5 e tempo recuperado só com dias de histórico (5.7); desconto da tela de interrupção nos dias anteriores (4.4, P10); marco de 1 dia celebrado só na primeira vez e recaída para ontem como dia de recomeço (5.3); marco no dia da quebra sem celebração (5.3); regra do recomeço para o aparelho inteiro (5.5); dias aprovados e reprovados (5.8); só a área da streak abre o Progresso (5.4); `ffmpeg` autorizado e "Desfazer a simulação" (5.1, 5.12); migração 0007; `expo-video` sem segundo plano; "Apagar meus dados" com as tabelas novas |
