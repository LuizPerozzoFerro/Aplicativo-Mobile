# Rascunho — política de privacidade e Segurança de Dados (Google Play)

> Rascunho de trabalho de 25/10/2026, **não** altera os documentos 01 e 02. Parte
> do desenho do plano técnico (`docs/02`, seções de stack e privacidade) e da
> decisão **D6**: a primeira versão publicada sai **sem a VPN**. Tudo o que é
> `[entre colchetes]` depende de dados que ainda não existem (nome do app,
> empresa, contato). Nome do app segue neutro, sem referência ao tema.

---

## 1. Correção do que o A10 deixou implícito

O A10 diz que a seção de segurança de dados "pode ser declarada sem coleta". Isso
vale para **o protótipo**, onde nada sai do aparelho. **Não vale para o app
definitivo** como o plano técnico o descreve:

| Componente (docs/02) | O que sai do aparelho |
|---|---|
| RevenueCat (assinatura) | Identificador anônimo, histórico de compra, identificadores do aparelho |
| Sentry (erros) | Registros de falha, informações do aparelho e do app |
| Analytics (a decidir) | Eventos de uso do app, conforme a ferramenta escolhida |
| Supabase (conteúdo) | Só leitura de conteúdo público; nenhum dado do usuário sobe |

Então a declaração do app definitivo **tem coleta**, ainda que pequena. O que
continua valendo é o desenho sobre o que **nunca** sai: o uso dos outros apps, a
lista de apps escolhidos, o limite, a motivação e os gatilhos. Esses dados são
processados só no aparelho e, pela definição do Play ("coletar" é transmitir
para fora), não entram na declaração. **Isso só é verdade se as regras do
`docs/02` §163 forem cumpridas à risca:** Sentry e analytics não podem receber
nome de app monitorado, domínio, compulsão escolhida nem motivação.

---

## 2. Segurança de Dados — proposta de respostas

Conferir contra o formulário vivo do Console antes de enviar; os nomes das
categorias abaixo são os que conheço da política, mas o formulário muda.

**Pergunta de partida:** o app coleta ou compartilha dados do usuário? **Sim**
(apenas os itens abaixo).

| Categoria do Play | Tipo de dado | Origem | Coletado | Compartilhado | Finalidade | Opcional? |
|---|---|---|---|---|---|---|
| Informações financeiras | Histórico de compras | RevenueCat | Sim | Sim, com o provedor de assinatura | Funcionalidade do app, gestão de conta | Não, se assinar |
| Desempenho do app | Registros de falha e diagnósticos | Sentry | Sim | Sim, com o provedor de monitoramento | Análise, estabilidade | Avaliar um desligamento |
| Identificadores | ID de dispositivo ou outro ID | RevenueCat, Sentry | Sim | Sim | Funcionalidade, análise | Não |
| Atividade no app | Interações, se houver analytics | Ferramenta a decidir | A decidir | A decidir | Análise | A decidir |

Pontos para a resposta:

- **Criptografia em trânsito:** sim, em todas as chamadas.
- **Exclusão:** o plano não prevê login. Mesmo assim, definir como o usuário pede
  a exclusão do identificador de assinatura (e-mail ou formulário). A exigência
  do Play de exclusão de conta no app e na web vale para apps que criam conta;
  **confirmar** se se aplica a uma conta anônima da loja.
- **Dados sensíveis:** o uso de outros apps e a escolha de compulsão nunca
  entram em nenhuma linha acima. Isso é o que sustenta a declaração, e por isso
  vira **teste de revisão obrigatório** de todo evento de analytics e de erro.
- **Anúncios:** o app não tem. Responder que não usa ID de publicidade.

---

## 3. Política de privacidade — esqueleto

Escrita para o público leigo, em português, com versão em inglês para a loja.
LGPD: o `docs/01` §7.3 já trata hábitos e compulsões como dado **sensível**,
exige consentimento explícito e opção de exclusão.

1. **Quem somos.** `[Razão social]`, CNPJ `[…]`, contato `[e-mail]`, encarregado
   (DPO) `[nome/e-mail]`.
2. **O que o app faz, em uma frase neutra.** Ajuda você a acompanhar e limitar o
   tempo em aplicativos que você escolhe.
3. **O que fica só no seu aparelho.** O tempo de uso dos apps escolhidos, a
   lista de apps, o limite e as mensagens que você define. Nada disso é enviado
   a nós nem a terceiros.
4. **O que sai do aparelho**, em lista curta e com o motivo de cada item
   (assinatura, falhas, analytics, se houver) e quem recebe. Esta é a seção que
   precisa bater **exatamente** com a Segurança de Dados.
5. **Permissões que o app pede e por quê:** acesso ao uso, exibir sobre outros
   apps, notificações, serviço em primeiro plano. Usar os textos de divulgação
   de `play-console-justificativas.md`.
6. **Base legal e consentimento** para os dados que saem; como retirar.
7. **Seus direitos (LGPD):** acesso, correção, exclusão, portabilidade; como
   exercer, prazo de resposta.
8. **Retenção** de cada item, e o que acontece ao desinstalar.
9. **Crianças:** o app não é voltado a menores de 18 anos. Alinhar com a
   classificação indicativa, que ainda não foi pesquisada.
10. **Alterações da política** e data de vigência.

**Regra de ouro da redação:** a política **não pode citar o tema** em nenhum
trecho que apareça fora do app (ficha da loja, link na tela de pagamento). Vale
a mesma discrição das notificações (CLAUDE.md §9). O link da política será
público; escrever o texto pensando em quem o abre sem querer.

---

## 4. Itens em aberto

- **Analytics:** ferramenta ainda "a decidir" no `docs/02`. Cada candidata muda a
  tabela da seção 2. Decidir antes de submeter a Segurança de Dados.
- **Sentry:** com ou sem coleta padrão de dados do aparelho? Configurar para
  **não** enviar nome de app nem texto de tela.
- **Nome do app, empresa, contato e DPO** para fechar a política.
- **Ficha da loja e classificação indicativa para o tema.** Mesma lacuna do
  rascunho de justificativas; é a mais importante que sobra.
- **Google Play Billing.** A assinatura via RevenueCat usa o faturamento do Play;
  confirmar se há outra obrigação de declaração.
- Se a **VPN** voltar numa versão posterior, a Segurança de Dados e a política
  ganham a seção de histórico de navegação (domínios consultados), com a
  divulgação destacada específica descrita no outro rascunho.
