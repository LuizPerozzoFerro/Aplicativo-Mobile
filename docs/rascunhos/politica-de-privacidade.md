# Rascunho — Política de Privacidade (app definitivo, sem VPN)

> Rascunho de 25/10/2026. **Revisão jurídica recomendada antes de publicar**: não
> sou advogado e o texto cita a LGPD de forma geral. Não altera os documentos 01 e
> 02. Tudo em `[colchetes]` falta definir. Os itens marcados **[CONFERIR]** devem
> bater com a declaração de Segurança de Dados (`privacidade-e-seguranca-de-dados.md`)
> e com o que o código realmente envia.
>
> **Discrição:** este texto vira uma página pública, linkada na loja e na tela de
> assinatura. Por isso ele **não cita o tema do app** (CLAUDE.md §9). Fala em
> "hábitos de uso do celular" e "aplicativos que você escolhe".

---

## Versão em português

# Política de Privacidade — [NOME DO APP]

**Vigente desde:** [data] · **Versão:** 1.0

## 1. Quem somos

[RAZÃO SOCIAL], CNPJ [00.000.000/0000-00], com sede em [cidade/UF], é a
responsável pelo [NOME DO APP] ("o app"). Para falar sobre privacidade, escreva
para **[e-mail de privacidade]**. Nosso encarregado de dados (DPO) é
[nome], contato no mesmo e-mail.

## 2. Resumo em linguagem simples

- O app ajuda você a acompanhar e limitar o tempo que passa nos aplicativos que
  **você mesmo escolhe**.
- **Os dados sobre o seu uso e as suas escolhas ficam só no seu celular.** Nós não
  recebemos, não guardamos e não vendemos essas informações.
- Do celular saem apenas poucos dados técnicos, necessários para a assinatura e
  para corrigir falhas (seção 4).
- O app não tem anúncios e não usa o seu identificador de publicidade.
- Você pode apagar tudo desinstalando o app, e pedir a exclusão dos dados que
  ficam conosco (seção 8).

## 3. O que fica somente no seu celular

Estes dados são processados no seu aparelho e **nunca são enviados** a nós nem a
terceiros:

- o tempo de uso de cada aplicativo que você escolheu acompanhar;
- a lista dos aplicativos que você escolheu;
- os limites, horários e pausas que você configurou;
- os textos e metas que você escreveu no app;
- o histórico de avisos e de pausas.

Para calcular o tempo de uso, o app lê apenas **quanto tempo cada aplicativo
fica aberto na tela**. O app **não lê o que você faz dentro dos outros
aplicativos**, nem mensagens, imagens, senhas, endereços de sites ou o conteúdo
da tela.

Esses dados são considerados sensíveis pela lei, porque podem revelar hábitos
pessoais. Por isso adotamos como regra que eles não saem do aparelho.

## 4. O que sai do seu celular

Somente o que está listado abaixo **[CONFERIR]**:

| Dado | Para quê | Quem recebe | Quando |
|---|---|---|---|
| Identificador anônimo de assinatura e histórico de compras | Confirmar que você tem assinatura ativa e liberar os recursos pagos | [RevenueCat, Inc.] e Google Play | Ao abrir o app, ao assinar e ao restaurar compras |
| Dados técnicos do aparelho e do app (modelo, versão do sistema, versão do app) e registro de falha | Descobrir e corrigir erros | [Sentry (Functional Software, Inc.)] | Quando o app falha |
| [Eventos de uso do app, sem dados pessoais] | [Entender quais telas funcionam, para melhorar o app] | [ferramenta de analytics] | [Ao usar o app] |
| Pedidos que você fizer por e-mail | Atender o pedido | Nós | Quando você escrever |

Os registros de falha **não contêm** os nomes dos aplicativos que você escolheu,
os limites que você definiu, os textos que você escreveu nem qualquer conteúdo de
tela. **[CONFERIR no código antes de publicar]**

O app também baixa **conteúdo público** (textos, calendários e vídeos de apoio)
de [Supabase / hospedagem]. Esse download não envia nenhuma informação sobre você
além do endereço de rede que qualquer conexão revela.

Não vendemos dados. Não os compartilhamos para publicidade. Não os usamos para
criar perfis.

## 5. Permissões que o app pede

O app só pede o que precisa para a função que você ativa. Você pode recusar ou
retirar qualquer uma nos Ajustes do aparelho. O app explica cada pedido antes de
abrir a tela de Ajustes.

| Permissão | Para que serve | O que o app não faz com ela |
|---|---|---|
| **Acesso ao uso dos apps** | Contar quanto tempo os aplicativos que você escolheu ficam abertos | Não lê conteúdo, só o tempo; não envia nada |
| **Exibir sobre outros apps** | Mostrar a tela de pausa quando você atinge o limite que definiu | Não desenha nada fora do momento do limite e não captura a tela |
| **Notificações** | Enviar o aviso do limite, com texto neutro que você pode alterar | — |
| **Serviço em primeiro plano** | Manter o acompanhamento ativo com o app fechado; o sistema mostra uma notificação fixa enquanto roda | Não usa a câmera, o microfone nem a localização |
| **Iniciar com o aparelho** | Religar o acompanhamento depois de reiniciar o celular | — |

O app **não** usa o serviço de acessibilidade, **não** lê a lista completa de
aplicativos instalados (apenas os que têm ícone na tela inicial, para você
escolher) e **não** usa localização, contatos, câmera ou microfone.

## 6. Base legal

Tratamos os dados da seção 4 para executar o contrato de assinatura que você
aceitou e para cumprir obrigações legais e fiscais. Para dados técnicos de falha
[e analytics], a base é o nosso legítimo interesse em manter o app funcionando
[ou o seu consentimento, quando o app o solicitar]. Os dados da seção 3 não são
tratados por nós, porque não saem do seu celular. Se algum dia um recurso
precisar enviá-los, pediremos o seu **consentimento específico e destacado**
antes, e você poderá retirá-lo a qualquer momento.

## 7. Por quanto tempo guardamos

- Dados da seção 3: até você apagar o app ou os dados dele.
- Assinatura e compras: pelo tempo da assinatura e pelo prazo exigido pela
  legislação fiscal e contábil [prazo].
- Registros de falha: [prazo, por exemplo 90 dias].
- E-mails de suporte: [prazo].

## 8. Seus direitos e como exercê-los

Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir: confirmação de que
tratamos dados seus, acesso, correção, anonimização ou eliminação, portabilidade,
informação sobre com quem compartilhamos e revogação do consentimento.

- **Apagar tudo do celular:** desinstale o app ou apague os dados dele em
  Ajustes → Apps → [NOME DO APP] → Armazenamento.
- **Pedir a exclusão dos dados que ficam conosco** (identificador de assinatura,
  registros de falha): escreva para [e-mail de privacidade] com o assunto
  "Privacidade". Respondemos em até [15] dias. Não é preciso ter conta, pois o
  app não exige cadastro.
- Para cancelar a assinatura, use a página de assinaturas do Google Play. Apagar
  o app não a cancela.

Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).

## 9. Segurança

As conexões do app usam criptografia (HTTPS). Mantemos os dados do celular no
armazenamento privado do app. Mesmo assim, nenhum sistema é totalmente seguro:
se houver um incidente que possa afetar você, avisaremos você e a ANPD nos
termos da lei.

## 10. Crianças e adolescentes

O app é destinado a maiores de 18 anos e não coleta dados de menores
intencionalmente. [Alinhar com a classificação indicativa definida na loja.]

## 11. Mudanças nesta política

Se mudarmos algo importante, avisaremos dentro do app antes de a mudança valer. A
data de vigência no alto mostra a versão atual.

## 12. Contato

[RAZÃO SOCIAL] · [e-mail de privacidade] · [endereço]

---

## English version (store listing)

# Privacy Policy — [APP NAME]

**Effective:** [date] · **Version:** 1.0

**Who we are.** [COMPANY NAME] ([country], tax ID [..]) operates [APP NAME]. Privacy
questions: **[privacy e-mail]**. Data protection officer: [name], same e-mail.

**In short.** The app helps you track and limit the time you spend in apps that
you choose yourself. Information about your usage and choices **stays on your
phone**: we do not receive, store or sell it. Only a small amount of technical
data leaves your device, for subscriptions and crash fixing. The app has no ads
and does not use your advertising ID.

**Stays on your device only.** The time you spend in the apps you selected, the
list of apps you selected, your limits, schedules and pauses, text you write in
the app, and your reminder history. To measure time, the app reads only how long
each selected app is in the foreground. It does not read what you do inside other
apps, nor messages, images, passwords, web addresses or screen content.

**What leaves your device.**

| Data | Purpose | Recipient |
|---|---|---|
| Anonymous subscription ID and purchase history | Confirm your subscription and unlock paid features | [RevenueCat, Inc.], Google Play |
| Device/app technical data and crash reports | Find and fix errors | [Sentry] |
| [Product events without personal data] | [Improve the app] | [analytics tool] |

Crash reports never contain the names of the apps you selected, your limits,
text you wrote, or screen content.

**Permissions.** Usage access (to count time in the apps you chose); display over
other apps (to show the pause screen when you reach your limit); notifications;
foreground service (to keep tracking while the app is closed, with a persistent
notification); start on boot. You can refuse or revoke any of them in system
Settings. The app does not use accessibility services, location, contacts, camera
or microphone, and does not read the full list of installed apps.

**Legal basis, retention and rights.** Subscription data is processed to perform
our contract with you and to meet tax obligations; technical data under our
legitimate interest [or your consent]. Under Brazil's LGPD you may request
access, correction, deletion, portability and withdrawal of consent by writing to
[privacy e-mail]; we reply within [15] days. No account is needed. To erase
on-device data, uninstall the app or clear its storage. Cancelling the
subscription is done in Google Play.

**Children.** The app is intended for people aged 18 or over.

**Changes.** We will notify you in the app before material changes take effect.
