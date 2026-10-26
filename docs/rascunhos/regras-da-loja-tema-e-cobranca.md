# Pesquisa — regras do Google Play para o tema, a ficha e a cobrança

> Pesquisa documental de 25/10/2026, nas páginas de ajuda do Play Console. Fecha a
> lacuna deixada pelo A10 e pelos outros rascunhos. **Não altera os documentos 01 e
> 02.** Leitura minha das páginas, não parecer jurídico nem decisão de revisor: o
> Google analisa caso a caso. O que **não** consegui confirmar está na seção 7.

---

## 1. Resumo

| Pergunta | Resposta curta | Risco |
|---|---|---|
| O tema (apoio a quem quer parar de ver pornografia) é proibido? | **Não.** A política de Conteúdo Impróprio proíbe apps que *contêm ou promovem* conteúdo sexual. Um app de apoio não contém nem promove | Baixo, se a ficha e o app forem discretos |
| Posso usar as palavras do tema na ficha? | **Cuidado.** A política de Metadados não admite linguagem imprópria nem imagens sugestivas na ficha. Termos adultos explícitos em título, descrição ou capturas são arriscados | **Médio**, e conflita com a descoberta do app |
| Que classificação indicativa esperar? | Quem define é o questionário IARC (no Brasil, ClassInd). O app **não exibe** conteúdo sexual. A pontuação depende das respostas, e não é automático que saia "livre" | Médio, a medir no questionário |
| O app precisa de declaração de saúde? | **Sim**, a declaração de apps de saúde é obrigatória para todos os desenvolvedores. O app de apoio a compulsão cai perto da categoria "saúde mental e comportamental" | Médio |
| Preciso usar o faturamento do Google Play para a assinatura? | **Em regra, sim.** Assinaturas de conteúdo ou recursos digitais usam o Play Billing | Baixo, com RevenueCat |
| O Brasil muda alguma coisa? | **Sim**: verificação de comerciante (CPF/CNPJ), ECA Digital e filtro de apps 18+ para menores | Médio |

---

## 2. Conteúdo impróprio e o tema

**O que a política proíbe.** Apps que contêm ou promovem conteúdo sexual ou
palavrões, incluindo pornografia e conteúdo feito para gratificação sexual.
Admite nudez com finalidade educacional, documental, científica ou artística, sem
ser gratuita.

**Como isso se aplica.**
- O app **não** contém nem promove conteúdo sexual: monitora tempo de uso e
  alerta o usuário. O caminho do tema para a proibição seria a ficha e as telas.
- Os domínios de teste do protótipo são inofensivos (example.com), e o app não
  carrega nenhuma lista de sites adultos. **Isso fica assim também no app
  definitivo**: o monitoramento de domínios saiu da primeira versão (D6), o que
  elimina o ponto mais sensível desse tema.
- Conteúdo de apoio dentro do app (textos, calendários, vídeos de motivação,
  `docs/01`) precisa ser revisado cena a cena: nada de linguagem vulgar nem
  descrição explícita, mesmo para criticar o hábito.

**Conclusão:** o tema não é proibido. O risco está em *como se fala dele* nos
textos que o Google revisa.

---

## 3. Ficha da loja (Metadados)

Regras que valem para título, ícone, nome do desenvolvedor, descrições,
capturas de tela e vídeo:

- Adequados a **público geral**; sem imagens sexualmente sugestivas, sem
  linguagem vulgar ou imprópria.
- **Título de até 30 caracteres.** Sem emoji, sem maiúsculas fora de marca, sem
  símbolos repetidos, sem preços, descontos, rankings ou prêmios, sem "grátis".
- Sem palavras-chave repetidas ou sem relação, sem descrição longa demais, sem
  depoimentos anônimos.
- Capturas e vídeo devem mostrar a experiência real do app.
- Sem nome ou logotipo de terceiros sem permissão.

**Consequência para este projeto.**

| Tema do `CLAUDE.md` / `docs/01` | Na ficha |
|---|---|
| Nome do app neutro ("nunca referências ao tema") | Já coincide com a regra. Manter. Vale também para o **nome do desenvolvedor** |
| Mensagem de apoio sem expor o tema | Descrever como ajuda a "reduzir hábitos digitais indesejados", "acompanhar o tempo de uso" e "criar pausas" |
| Termos explícitos do tema como palavras-chave | **Evitar** em título e descrição. O ganho de descoberta não compensa o risco de rejeição |
| Capturas de tela | Mostrar as telas reais com textos neutros; nada de rostos, corpos ou cenas sugestivas |

Isso tem um custo de produto: o app **não aparecerá bem em buscas pelo termo
explícito do tema**. A descoberta virá por indicação, conteúdo externo e termos
neutros. É decisão de produto, e a registro como impacto a levar ao documento 01.

---

## 4. Classificação indicativa

- O Play usa o questionário **IARC**; no Brasil, o resultado vira a faixa da
  **ClassInd**. O questionário é obrigatório e deve ser refeito se uma mudança
  alterar as respostas.
- A página lista as faixas por conteúdo sexual (referências a partir de 12 anos,
  nudez a partir de 14, relações sexuais a partir de 16, relações explícitas aos
  18). O app **não exibe nenhum desses conteúdos**; o tema aparece só como
  contexto de apoio.
- Responder o questionário de forma **honesta** é obrigatório: descrição
  enganosa do conteúdo pode levar a remoção ou suspensão.
- O Google passou a **bloquear ou filtrar apps 18+ para menores no Brasil**. Se o
  app sair com classificação 18+, menores identificados não o veem.

**Ponto que pede decisão:** a classificação do app é independente do seu público
real. Um app que não tem conteúdo adulto pode sair com faixa baixa, mas ser
**procurado por adolescentes** justamente por causa do tema. Isso é relevante para
a próxima seção.

---

## 5. Saúde e bem-estar

- **Todos** os desenvolvedores preenchem a *declaração de apps de saúde* na página
  App content, inclusive quem não tem funcionalidade de saúde.
- A categoria "saúde mental e comportamental" inclui ferramentas de apoio e de
  programas de recuperação de dependência. O app de apoio a compulsão **se aproxima
  dela**. Decidir como declarar é parte da pesquisa de submissão.
- Apps de saúde que **não** são dispositivo médico devem trazer na descrição um
  aviso claro de que **não diagnosticam, tratam, curam nem previnem** condições, e
  lembrar o usuário de procurar um profissional de saúde.
- Não são permitidas **alegações de saúde enganosas ou potencialmente
  prejudiciais**. A ficha **não pode prometer cura**, nem resultados garantidos.
- Política de privacidade na ficha **e dentro do app** é exigida para apps de
  saúde. O rascunho da política já traz isso.
- **Não coletar dados de saúde que não sejam essenciais.** Nosso desenho coincide:
  o uso dos apps e a motivação ficam no aparelho.

**Texto de aviso sugerido** (para a descrição e para um lugar fixo dentro do app):

```
[APP NAME] is a self-help tool. It is not a medical device and does not diagnose,
treat, cure or prevent any condition. If you are struggling, please talk to a
qualified health professional.
```

Em português: *"O [NOME DO APP] é uma ferramenta de apoio pessoal. Não é um
dispositivo médico e não diagnostica, trata, cura nem previne qualquer condição.
Se você está com dificuldade, converse com um profissional de saúde."*

**Atenção para a coerência com o `docs/01`:** o escopo prevê acompanhamento de
abstinência com dias limpos, marcos e conteúdo de apoio. Qualquer frase que
sugira tratamento clínico ou cura precisa ser reescrita antes de ir para a loja.

---

## 6. Cobrança e Brasil

**Faturamento.** Assinaturas de conteúdo ou recursos digitais devem usar o
**Google Play Billing**; o RevenueCat do plano técnico usa esse faturamento. As
exceções (bens físicos, serviços clínicos regulados, vales-presente etc.) não
se aplicam.

**Escolha de faturamento no Brasil.** A ajuda do Google lista o Brasil entre os
mercados do piloto de *user choice billing* (faturamento alternativo ao lado do
Play). Para o MVP **não é necessário** e acrescenta trabalho. Registrar como
opção futura, não como requisito.

**Brasil, específico:**
1. **Verificação de comerciante** para receber pagamentos no Brasil: dados da
   empresa, sócios com mais de 25%, representantes, comprovante de endereço, CPF
   e CNPJ. Falhar nisso pode reter pagamentos e suspender a conta. A empresa
   precisa estar aberta (já consta como pendência da Fase 0 em `docs/02`).
2. **ECA Digital:** apps voltados a crianças e adolescentes **ou com probabilidade
   de acesso por eles** devem ingerir a faixa etária fornecida pela loja (Play Age
   Signals, em beta). A responsabilidade de decidir se o app se enquadra é do
   desenvolvedor.
3. **Filtro de apps 18+** para menores identificados, citado na seção 4.

**O ponto 2 é o que mais pesa.** Um app de apoio a quem quer largar a pornografia
tem forte chance de ser procurado por adolescentes. A pesquisa não permite dizer
se isso o enquadra como "com probabilidade de acesso por menores". **É uma
questão para o advogado**, junto com o desenho do público-alvo (18+ declarado,
verificação de idade, ou nenhuma).

---

## 7. O que não consegui confirmar

- As **perguntas exatas do questionário IARC** e a faixa que resulta delas para um
  app deste tema. Só dá para saber preenchendo o formulário no Console.
- A **data exata** em que o filtro de apps 18+ para menores no Brasil passa a
  valer. Uma versão da página aponta março de 2026; não consegui confirmar o texto
  em inglês.
- Se o app **se enquadra no ECA Digital** e o que exatamente muda no produto. É
  questão jurídica.
- Como o Console pede a **declaração de apps de saúde** para este caso e se
  a categoria "saúde mental e comportamental" gera exigências adicionais.
- As regras de **divulgação de preço, período de teste e cancelamento** da
  política de assinaturas. A página de Pagamentos que li remete a outra política
  que não li.
- A **App Store** (iOS) fica com o grupo do iOS.

---

## 8. Impactos para levar aos documentos 01 e 02

Decisão fora do Claude Code (`CLAUDE.md` §3). Para a seção de impactos do relatório:

1. **Posicionamento e nome:** a ficha precisa de linguagem neutra; o app não será
   encontrado pelo termo explícito do tema. Afeta a estratégia de aquisição.
2. **Conteúdo de apoio:** revisar todo o conteúdo planejado em `docs/01` contra a
   política de conteúdo impróprio e contra a de saúde (sem alegação de cura ou
   tratamento).
3. **Público-alvo e idade:** decidir 18+, o que fazer com menores e como tratar o
   ECA Digital. **Pendência jurídica.**
4. **Aviso de saúde** fixo no app e na ficha.
5. **Empresa aberta e verificada** antes de receber receita no Brasil.
6. **Faixa de classificação** a medir no questionário IARC antes de decidir o
   marketing.

## Fontes consultadas em 25/10/2026

- [Conteúdo impróprio](https://support.google.com/googleplay/android-developer/answer/9878810)
- [Metadados](https://support.google.com/googleplay/android-developer/answer/9898842)
- [Conteúdo de saúde e serviços](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Declaração de apps de saúde](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Requisitos por país ou região (Brasil)](https://support.google.com/googleplay/android-developer/answer/6223646)
- [Classificações de conteúdo](https://support.google.com/googleplay/android-developer/answer/9859655)
- [Política de pagamentos](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Faturamento alternativo](https://support.google.com/googleplay/answer/11174377)
