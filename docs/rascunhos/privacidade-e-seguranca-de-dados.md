# Rascunho — Segurança de Dados (Google Play)

> Rascunho de trabalho de 25/10/2026, **não** altera os documentos 01 e 02. Parte
> do desenho do plano técnico (`docs/02`) e da decisão **D6**: a primeira versão
> publicada sai **sem a VPN**. A política de privacidade completa está em
> `politica-de-privacidade.md` e **precisa dizer exatamente o mesmo** que este
> arquivo. Nomes de categoria e de campo vêm da política do Play e do formulário
> que conheço; **conferir no Console vivo** antes de enviar, que muda.

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

Então a declaração **tem coleta**, ainda que pequena. O que continua valendo é o
desenho do que **nunca** sai: o uso dos outros apps, a lista de apps escolhidos, o
limite, a motivação e os gatilhos. Pela definição do Play, "coletar" é transmitir
dado para fora do aparelho; dado processado **apenas** no aparelho não entra na
declaração. Isso só é verdade se as regras do `docs/02` §163 forem cumpridas à
risca: Sentry e analytics não podem receber nome de app monitorado, domínio,
compulsão escolhida nem motivação.

---

## 2. Respostas, na ordem do formulário

### 2.1 Visão geral

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dado exigidos? | **Sim** |
| Todos os dados coletados são criptografados em trânsito? | **Sim** (HTTPS; **[CONFERIR]** que RevenueCat, Sentry e a ferramenta de analytics usam TLS, o que é padrão) |
| O app oferece forma de o usuário pedir a exclusão dos dados? | **Sim**, por e-mail (sem conta). Informar a URL da política, que descreve o caminho |
| O app segue a política de Famílias? | **Não**: público-alvo é de maiores de 18 anos |

### 2.2 Tipos de dado

Duas definições do Play que mudam a coluna "compartilhado": enviar dado a um
**prestador de serviço que o trata em nome do desenvolvedor** (RevenueCat e Sentry,
se configurados assim) **não** conta como "compartilhar". Compartilhar é
transferir a um terceiro para uso próprio dele. Por isso a coluna abaixo é "não"
onde o terceiro só presta serviço. **[CONFERIR]** nos contratos e na
configuração de cada ferramenta.

| Categoria | Tipo | Coletado | Compartilhado | Tratado só durante a sessão? | Obrigatório ou opcional | Finalidades |
|---|---|---|---|---|---|---|
| Informações financeiras | Histórico de compras | Sim | Não | Não | Obrigatório (para assinar) | Funcionalidade do app; gestão de conta |
| Informações e desempenho do app | Registros de falha | Sim | Não | Não | Obrigatório | Análise; funcionalidade do app |
| Informações e desempenho do app | Diagnósticos | Sim | Não | Não | Obrigatório | Análise |
| Dispositivo ou outros IDs | ID do dispositivo ou outro ID | Sim | Não | Não | Obrigatório | Funcionalidade do app; análise |
| Atividade no app | Interações no app | **[Só se houver analytics]** | Não | Não | [Opcional?] | Análise |

Não declarar (e não coletar): localização, contatos, mensagens, fotos, áudio,
arquivos, calendário, saúde, histórico de navegação, **atividade em outros apps**,
informações pessoais (nome, e-mail, telefone), IDs de publicidade.

**Sobre o e-mail de suporte.** Quem escreve para pedir exclusão ou ajuda envia o
próprio endereço por iniciativa própria. O Play não pede para declarar isso como
coleta do app; manter o procedimento no texto da política.

### 2.3 O que sustenta "não coleta atividade em outros apps"

O app lê o tempo em primeiro plano dos apps escolhidos pelo `UsageStatsManager` e
guarda no armazenamento privado do app. Para a declaração continuar correta:

1. Nenhuma chamada de rede leva esses números, a lista de apps, os limites ou os
   textos do usuário.
2. **Sentry** é configurado para não anexar dados de tela, para remover o texto
   das mensagens que possam citar um nome de app, e para não enviar *breadcrumbs*
   com navegação do usuário.
3. **Analytics**, se existir, tem lista fechada de eventos revisados um a um
   (`docs/02` §163) e nunca recebe nome de app, domínio, limite ou texto livre.
4. **Teste de revisão obrigatório:** capturar o tráfego de rede do app durante um
   fluxo completo (escolher app, definir limite, estourar o limite, assinar) e
   conferir que nenhum campo carrega esses dados. Isso vira evidência para a
   declaração e para a revisão de privacidade interna.

### 2.4 Divulgação destacada (dentro do app)

A política de Dados do Usuário pede divulgação destacada, **dentro do app e
antes do pedido**, para o acesso a dados sensíveis, mesmo que processados só no
aparelho. O texto proposto para o acesso ao uso e para a sobreposição está em
`play-console-justificativas.md`, seção 4. A política de privacidade é exigida
também sem coleta, e **não** substitui a divulgação.

---

## 3. Itens em aberto

- **Analytics:** ferramenta ainda "a decidir" no `docs/02`. Cada candidata muda a
  tabela da seção 2.2. Decidir antes de submeter. Uma opção é **não ter analytics
  na primeira versão**: o formulário fica menor e a política também.
- **RevenueCat e Sentry como prestadores de serviço:** confirmar nos termos de
  cada um que tratam os dados em nome do desenvolvedor, o que sustenta a coluna
  "compartilhado = não".
- **Exclusão de dados sem conta:** a exigência do Play de exclusão de conta no app
  e na web vale para apps que criam conta. Como o MVP não tem login, confirmar com
  o Console se o campo "URL para pedir exclusão" é obrigatório e usar o e-mail da
  política.
- **Ficha da loja e classificação indicativa para o tema:** mesma lacuna do outro
  rascunho; é a mais importante que sobra.
- **Nome do app, razão social, contato e DPO** para fechar a política.
- Se a **VPN** voltar numa versão posterior, esta declaração ganha **histórico de
  navegação** (domínios consultados) e a divulgação destacada específica da VPN.
