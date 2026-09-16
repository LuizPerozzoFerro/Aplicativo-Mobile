# 01 — Visão do Produto e Escopo do MVP

> **Status:** revisado v0.2 · **Última atualização:** 15/09/2026
> **Nome do app:** a definir (ver seção 11)
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

---

## 3. Conceito central: Compulsão

O sistema deve modelar **Compulsão** como uma entidade genérica desde o início, para permitir adicionar novas compulsões no futuro sem reescrever o app.

Cada compulsão possui:
- **Tipo de mecânica:** `abstinencia` ou `moderacao`;
- **Calendário de benefícios** próprio;
- **Marcos e vídeos** próprios;
- **Fonte de detecção:** o que é monitorado (apps, sites, nenhum);
- **Regra de streak** própria;
- **Textos** de alertas, notificações e check-in.

### 3.1 Compulsões do MVP

| Compulsão | Mecânica | O que é monitorado | Regra de streak |
|---|---|---|---|
| Pornografia | Abstinência | Acesso a conteúdo adulto (sites) **e** tempo de uso em redes sociais de risco (ex.: X, Reddit) | Dias sem recaída |
| Vídeos curtos / redes sociais | Moderação | Tempo de uso por app (ex.: Instagram, TikTok, YouTube, Kwai) e versões web quando possível | Dias dentro do limite diário definido |

### 3.2 Regras gerais
- O usuário pode ter **uma ou mais** compulsões ativas simultaneamente (sujeito ao plano, ver seção 8).
- Cada compulsão tem **streak, calendário e marcos independentes**. Recair em uma não afeta a outra.
- O usuário só vê calendário, marcos e vídeos das compulsões que escolheu.
- Compulsões podem ser adicionadas ou removidas depois do onboarding, pelo Perfil.
- Monitoramento é feito **no nível do app**: não é necessário distinguir Reels, Stories ou Feed.
- **Apps de risco da pornografia** (ex.: X, Reddit): como o app não sabe o que está sendo consumido, tempo de uso nesses apps gera **alerta preventivo**, nunca recaída automática. O alerta é mais enfático dentro de janelas de gatilho declaradas. A lista de apps de risco é editável pelo usuário.
- Um mesmo app pode estar monitorado por mais de uma compulsão (ex.: X em pornografia e em vídeos curtos). Nesse caso, os alertas devem ser unificados, sem duplicidade.

---

## 4. Onboarding

### 4.1 Objetivos
Configurar o plano personalizado do usuário e obter as permissões necessárias, explicando claramente o que é monitorado e por quê.

### 4.2 Etapas (ordem sugerida, a validar no design)
1. **Boas-vindas** e proposta do app, com linguagem acolhedora e sem julgamento.
2. **Escolha das compulsões:** pornografia, vídeos curtos/redes sociais ou ambas.
3. **Configuração por compulsão:**
   - Vídeos curtos: quais apps monitorar e limite diário aceitável;
   - Pornografia: há quanto tempo está sem recair (opcional, para iniciar a streak) e quais redes sociais de risco monitorar.
4. **Gatilhos:**
   - Horários de vulnerabilidade (ex.: depois do trabalho, antes de dormir);
   - Dias de maior risco (ex.: fins de semana);
   - Estados emocionais associados (ex.: tédio, solidão, estresse, ansiedade), usados para personalizar os textos dos alertas.
   - **Não** usar gatilhos de localização.
5. **Motivação pessoal:** texto curto escrito pelo usuário ("Por que eu quero mudar?"), exibido em alertas e no botão de emergência.
6. **Permissões:** explicação transparente seguida do pedido de permissão de monitoramento e de notificações. O app deve funcionar (em modo reduzido) se o usuário negar.
7. **Resumo do plano:** o que o app vai fazer por ele, e início do teste premium (ver seção 8.3).

### 4.3 Regras
- Todas as respostas podem ser editadas depois pelo Perfil.
- O onboarding deve ser rápido; perguntas opcionais devem ser claramente marcadas.

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
  - Status do dia (ex.: "42 min de 60 no Instagram" para moderação; "Dia 12" para abstinência);
  - Próximo marco do calendário.
- Tocar no card abre a aba **Progresso filtrada naquela compulsão** (evitar tela duplicada).
- **Botão de emergência** sempre visível.

### 6.2 Streak e check-in
- **Moderação (vídeos curtos):** streak calculada automaticamente com base no tempo de uso monitorado. Um dia conta se o uso ficou dentro do limite.
- **Abstinência (pornografia):** streak **parcialmente automática**. O monitoramento detecta acessos a conteúdo adulto no aparelho, mas não detecta tudo (ex.: outros aparelhos). Por isso existe um **check-in periódico de um toque**, preferencialmente respondido na própria notificação.
- Sem permissão de monitoramento, a streak depende apenas do check-in.
- Tocar em "continuar mesmo assim" num alerta **não é recaída automática**: é registrado como sinal, e o app faz um check-in gentil posteriormente para o usuário confirmar.
- Recaída zera a streak atual, mas mantém histórico, marcos e vídeos já desbloqueados.

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
Intervenção em **dois níveis**:

1. **Notificação:** quando o uso se aproxima ou ultrapassa o limite (moderação) ou quando há acesso a conteúdo adulto (abstinência, onde tecnicamente possível), o app envia uma notificação lembrando o objetivo.
2. **Tela de interrupção:** se o uso continuar, uma tela sobre o app exibe a motivação pessoal e oferece as opções "Abrir botão de emergência" e "Continuar mesmo assim".

Regras:
- Uso dentro de uma **janela de gatilho declarada** justifica um alerta mais enfático.
- O app nunca bloqueia definitivamente o acesso (P4).
- Textos de notificação devem ser **discretos** (P7): nada que exponha o tema na tela bloqueada.

> ⚠️ A viabilidade técnica difere entre iOS e Android e deve ser validada em protótipo antes do restante do desenvolvimento. Ver seção 10.

### 6.6 Notificações por gatilho
- Com base nos horários e dias declarados, o app envia notificações preventivas (ex.: gatilho "depois do trabalho" → notificação às 17h).
- Estados emocionais declarados personalizam o texto.
- Notificações agendadas funcionam mesmo sem permissão de monitoramento.
- **Coordenação de notificações:** usuários com mais de uma compulsão não devem receber o dobro de alertas. Deve existir um limite diário global e agrupamento de mensagens.
- Notificações devem incluir ação rápida para o botão de emergência e, quando aplicável, para o check-in.

### 6.7 Botão de emergência
Disponível na tela Início, na tela de interrupção e nas notificações de gatilho. **Sempre gratuito.** Não usa IA e não armazena conteúdo sensível.

Fluxo:
1. Exibe imediatamente a motivação pessoal do usuário;
2. Exercício de respiração guiado (~1 minuto);
3. Cronômetro de espera de alguns minutos com sugestões rápidas (sair do ambiente, beber água, falar com alguém);
4. Pergunta final: "A vontade passou?" → resposta positiva é registrada como vitória nas estatísticas.

### 6.8 Estatísticas
- Tempo de uso por dia e semana (vídeos curtos);
- Horários de maior uso;
- Alertas respeitados vs. ignorados;
- Uso do botão de emergência e vitórias;
- Histórico de streaks e recaídas;
- Tempo recuperado em relação ao ponto de partida;
- Comparação entre gatilhos declarados e padrões observados.

### 6.9 Perfil
- Compulsões ativas (adicionar/remover);
- Gatilhos e motivação pessoal;
- Limites e apps monitorados;
- Permissões de monitoramento e notificações;
- Assinatura e plano;
- Idioma (preparado para o futuro; apenas português no MVP);
- Privacidade: explicação do que é coletado, exclusão de dados e conta.

---

## 7. Requisitos não funcionais

### 7.1 Plataformas
- iOS e Android, a partir de uma base de código compartilhada sempre que possível.
- Monitoramento exigirá **código nativo** em cada plataforma.

### 7.2 Internacionalização
- Nenhum texto fixo no código: todos os textos em arquivos de tradução.
- Datas, números e moedas formatados conforme o idioma.
- Conteúdo remoto (calendário, vídeos) com suporte a múltiplos idiomas.

### 7.3 Privacidade e LGPD
- Dados sobre hábitos e compulsões são tratados como **sensíveis**.
- Minimização: coletar apenas o necessário para as funcionalidades.
- Preferir processamento e armazenamento local no aparelho.
- Política de privacidade clara, consentimento explícito e opção de exclusão de dados.

### 7.4 Discrição
- Nome do app e nome do desenvolvedor **neutros**, sem referência ao tema.
- Ícone neutro.
- Notificações discretas na tela bloqueada.
- Descrição da cobrança nas lojas sem referência ao tema.

### 7.5 Saúde e conteúdo
- Nenhuma promessa de cura ou alegação médica sem fonte.
- Aviso de que o app não substitui acompanhamento profissional.

---

## 8. Monetização

### 8.1 Modelo
Freemium com assinatura via App Store e Google Play.

### 8.2 Gratuito vs. Premium

| Recurso | Gratuito | Premium |
|---|---|---|
| Streak e check-in | ✅ | ✅ |
| Botão de emergência | ✅ completo | ✅ |
| Compulsões ativas | 1 | Todas |
| Calendário de benefícios | Marcos até 7 dias | Completo |
| Vídeos por marco | Marcos até 7 dias | Todos |
| Monitoramento de apps e alertas | ❌ | ✅ |
| Tela de interrupção | ❌ | ✅ |
| Notificações por gatilho | 1 lembrete diário simples | Personalizadas por gatilho |
| Estatísticas | Resumo semanal | Histórico completo e padrões |

### 8.3 Período de teste
- **Teste invertido:** ao concluir o onboarding, o usuário recebe **7 dias de Premium** sem cadastrar cartão.
- Ao fim do teste, sem assinatura, a conta passa ao plano Gratuito.
- A transição deve ser **clara e explicada**: o usuário precisa entender o que mudou (ex.: monitoramento desativado), sem sentir que o app quebrou.
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
| Apostas | Fase 2 |
| Compulsões não digitais (cigarro, maconha e outras) | Fase futura, com mecânica baseada em check-in e gatilhos |
| Outros idiomas | Fase futura (arquitetura já preparada) |
| Bloqueio definitivo de apps e sites | Fora do conceito do produto |
| Gatilhos por localização | Fora do escopo |
| Comunidade / recursos sociais | Não discutido |

---

## 10. Riscos e premissas a validar

| # | Risco / premissa | Impacto | Como validar |
|---|---|---|---|
| R1 | **Monitoramento de tempo por app no iOS** depende da Screen Time API (Family Controls / Device Activity), que exige autorização especial da Apple para produção | Alto | Solicitar o entitlement cedo e construir protótipo técnico |
| R2 | **Alertas de conteúdo adulto no iOS:** o filtro nativo bloqueia, mas pode não permitir alertar sem bloquear para uma lista ampla de sites | Alto | Protótipo técnico; definir solução alternativa para iOS se necessário |
| R3 | **Detecção de conteúdo adulto no Android** via VPN local exige declaração específica e passa por revisão rigorosa no Google Play | Alto | Estudar políticas do Google Play e prototipar |
| R4 | **Tela de interrupção** sobre outros apps: viabilidade e limites em cada plataforma | Médio | Protótipo técnico |
| R5 | Uso de redes sociais pelo **navegador** pode escapar do monitoramento por app | Médio | Avaliar monitoramento de domínios web |
| R6 | Rejeição nas lojas por **tema sensível** ou alegações de saúde | Médio | Revisar diretrizes das lojas antes da submissão |
| R7 | **Excesso de notificações** leva o usuário a silenciar o app | Médio | Limite global e testes com usuários |
| R8 | **Baixa conversão** do gratuito para o premium | Médio | Métricas de funil e testes de oferta após lançamento |
| R9 | **Evidências científicas** sobre abstinência de pornografia são menos sólidas que de outras compulsões | Médio | Curadoria rigorosa das fontes e redação cautelosa |

> **Premissa crítica:** R1 a R4 devem ser validados em um **protótipo técnico de monitoramento** antes do desenvolvimento das demais funcionalidades.

---

## 11. Questões em aberto

- [ ] Nome do app, ícone e identidade visual (neutros)
- [ ] Apps de vídeo curto monitorados por padrão
- [ ] Limite diário sugerido por padrão para vídeos curtos
- [ ] Frequência e formato do check-in de pornografia
- [ ] Marcos exatos e conteúdo de cada calendário (depende das fontes científicas)
- [ ] Limite diário global de notificações
- [ ] Ferramenta de IA para produção dos vídeos
- [ ] Necessidade de conta/login ou uso anônimo no MVP
- [ ] Framework multiplataforma, backend e hospedagem de conteúdo (documento técnico)
- [ ] Comportamento do app sem permissão de monitoramento (detalhar)

---

## 12. Contexto de negócio (referência, não é requisito técnico)

- Publicação nas lojas como **pessoa jurídica**, com nome de desenvolvedor neutro.
- **MEI não é permitido** para licenciamento/desenvolvimento de software; caminho previsto: **Microempresa (ex.: SLU) no Simples Nacional**, a confirmar com contador (CNAE, tributação de receita das lojas, Fator R).
- Abrir a empresa algumas semanas antes de criar as contas de desenvolvedor, para obter o número D-U-N-S exigido pela Apple.
- Aderir aos programas de comissão reduzida das lojas para pequenos desenvolvedores, conferindo condições vigentes.

---

## Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 0.1 | 15/09/2026 | Primeira versão consolidando o brainstorm inicial |
| 0.2 | 15/09/2026 | Redes sociais de risco (X, Reddit) monitoradas para pornografia; plano gratuito com marcos e vídeos até 7 dias |
