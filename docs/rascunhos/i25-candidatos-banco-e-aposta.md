# I-25 — candidatos de apps de banco e de aposta para a medição

> Preparação feita em 25/10/2026, **sem o aparelho conectado**. A medição em si
> ainda não foi feita. Responde à pendência "Apps de banco com a proteção do
> I-25" de `prototype/NOTAS.md`. Código descartável da Fase 1; não altera os
> documentos 01 e 02.

## O que se mede, em uma frase

Se a janela do app liga a proteção contra sobreposição de terceiros
(`setHideOverlayWindows`, bit `0x00080000` do `pfl` no `dumpsys window windows`),
o que apagaria a nossa tela de interrupção (A4). A varredura de 20/09 mediu 7
apps de redes sociais e navegadores: **nenhum protege**. Falta o grupo onde há
motivo para proteger: dinheiro.

## Por que esses grupos

Sobreposição é a técnica clássica de fraude em tela de pagamento, então bancos,
carteiras e casas de aposta são os que mais têm razão para ligar a proteção. E as
casas de aposta são exatamente o alvo mais importante do app definitivo (`docs/01`).
Se algum deles proteger, a tela própria (A4b) passa a ser a aposta principal.

## Lista de candidatos

A lista cobre perfis diferentes de propósito. **Não verifiquei nomes de pacote**
(as páginas da Play Store não abriram na pesquisa): a coluna de pacote é a
minha expectativa e **deve ser confirmada no aparelho** (seção "Achar o pacote").
Apps de aposta só entram se estiverem **na Play Store**: desde junho de 2025 o
Google aceita apps de apostas esportivas de operadoras licenciadas pela SPA, do
Ministério da Fazenda.

### Grupo A — bancos tradicionais

| App | Pacote esperado (confirmar) | Por que entra |
|---|---|---|
| Itaú | `com.itau` | Maior banco privado; tela de segurança forte |
| Bradesco | `com.bradesco` | Idem, com histórico de fraude por sobreposição |
| Banco do Brasil | `br.com.bb.android` | Público amplo |
| Caixa (e Caixa Tem) | confirmar no aparelho | Atende muito público sem conta em outros bancos; também tem as loterias |
| Santander | confirmar no aparelho | Quarto grande |

### Grupo B — bancos digitais e carteiras

| App | Pacote esperado (confirmar) | Por que entra |
|---|---|---|
| Nubank | `com.nu.production` | Maior base de usuários |
| Inter | `br.com.intermedium` | Super-app financeiro |
| C6 Bank | confirmar no aparelho | Perfil digital |
| PicPay | `com.picpay` | Carteira com uso para apostas e Pix |
| Mercado Pago | `com.mercadopago.wallet` | Carteira de e-commerce |

### Grupo C — casas de aposta (**o grupo que mais importa**)

Entram as que estiverem na Play Store e na lista de operadoras da SPA. Sugestão de
amostra, a ajustar pelo que existir na loja no dia:

| App | Observação |
|---|---|
| Bet365 | Noticiado na Play Store do Brasil; conferir |
| Betano | Conferir se há app na loja |
| Superbet | Conferir |
| Sportingbet | Conferir |
| KTO / Esportes da Sorte / outra | Completar para chegar a pelo menos 4 casas |

**Meta:** pelo menos **4 casas de aposta**, cobrindo operadoras diferentes (grupos
empresariais e tecnologias distintas). Uma só casa não generaliza.

### Grupo D — controle fora do eixo financeiro (opcional)

Uma corretora (XP, BTG) ou uma exchange, para ver se "financeiro" em geral
protege ou só "banco".

## Regras da medição

1. **Instalar só pela Play Store.** Para as casas de aposta, não baixar APK de
   site: é o caminho de maior risco de fraude e vai contra a regra de não instalar
   de fontes não confiáveis.
2. **Não criar conta, não depositar, não apostar.** Medir a **tela de abertura**
   (login, boas-vindas ou aviso de idade). Se o app não passar dessa tela sem
   cadastro, **parar ali** e registrar essa tela.
3. **Se for medir a tela depois do login** (a flag é por janela, e a tela do saldo
   pode ser diferente da de login): quem entra na conta é **você**, na hora, e o
   script só lê o `pfl`. Eu nunca vejo senha nem saldo, e essa parte é **opcional**.
   Para casas de aposta, só se você já tiver conta própria.
4. **Registrar só o necessário:** pacote, nome da activity, `protegida` e
   `FLAG_SECURE`. **Não versionar** `dumpsys` completo nem capturas de tela com
   saldo, nome ou dados de conta (regra de privacidade do `NOTAS.md`).
5. **Depuração USB ligada pode fazer apps de banco recusarem abrir.** É comum. Se
   o app fechar sozinho ou não criar janela, o script imprime `SEM JANELA`. Isso é
   um **resultado válido** (registrar como "bloqueia depuração"), não algo a
   contornar. Não usar nada para esconder a depuração.
6. `FLAG_SECURE` (bloqueia captura de tela) é **outra** proteção. Ela não impede a
   nossa sobreposição, mas impede evidência por captura. O script informa as duas.

## Como rodar

Pré-requisito: o aparelho no cabo e o "Procedimento de início de sessão" do
`NOTAS.md` (passo 1). Os apps precisam estar instalados.

### Achar o pacote

Se o pacote esperado não existir, procurar pelo nome:

```bash
adb shell pm list packages | grep -i nubank
```

Troque `nubank` pelo termo. Anote o que aparecer depois de `package:`.

### Medir

O script é [i25-scan.sh](../../prototype/scripts/i25-scan.sh). Ele abre cada app, espera
6 segundos, lê a janela e volta para a tela inicial.

```bash
cd prototype/scripts && ./i25-scan.sh com.nu.production com.itau
```

Para esperar mais (apps lentos), `WAIT=10 ./i25-scan.sh ...`.

Saída esperada, uma linha por janela:

```
com.exemplo.banco | com.exemplo.banco.Main | protegida=NAO | FLAG_SECURE=sim | pfl=10008840
```

Valores possíveis de `protegida`: `SIM` (apaga a nossa sobreposição), `NAO`, ou a
linha inteira como `NAO INSTALADO` / `SEM JANELA`.

**Estado do script:** rodou no S22 (Android 16) em 25/10/2026. A primeira versão
falhou: o Android 16 imprime `fl` e `pfl` em linhas separadas abaixo de `mAttrs`,
e o script devolveu `pfl` vazio. Corrigido e validado contra os dois controles do
dia (app de teste: `SIM`; Chrome: `NAO`), iguais aos de 20/09.

## Resultado da primeira rodada (25/10/2026)

Evidência em `docs/relatorios/evidencias/i25-bancos-e-apostas.txt`. Só a tela de
abertura, sem login e sem conta. Medidos os apps que **já estavam instalados**.

| App | Pacote | Tela medida | Protegida? | FLAG_SECURE |
|---|---|---|---|---|
| **Nubank** | `com.nu.production` | `LegacySplashActivity` | **SIM** | não |
| Inter | `br.com.intermedium` | `LoginActivity` | não | não |
| Caixa | `br.com.gabba.Caixa` | `HomeActivity_` | não | não |
| FGTS (Caixa) | `br.gov.caixa.fgts.trabalhador` | `BoasVindasLoginActivity` | não | não |
| Clear (XP) | `br.com.xpinc.clear.app.android` | `CommonsFlutterFragmentActivity` | não | não |
| Bet365 | `com.bet365Wrapper.Bet365_Application` | `MainActivity` | não | não |
| Binance | `com.binance.dev` | `NezhaNormalActivity` | não | não |

**Leitura:**
- **1 de 7 protege** (Nubank), e a janela principal que o usuário vê é a protegida
  (conferido duas vezes, até 20 s depois de abrir). É o primeiro app real, fora
  do nosso app de teste, que liga a proteção. O risco do I-25 deixa de ser só
  teórico.
- **O efeito foi provado no mesmo dia (23:51–23:57).** Com o Nubank na frente e
  limite de 2 min, o limite estourou e a notificação chegou, mas a sobreposição
  foi **suprimida duas vezes** (`interruption_suppressed`: janela adicionada e
  desenhada, **sem foco**), descartada em 20 s e reagendada pelo recuo de 1 e 2
  min. Mesma assinatura do app de teste de 19/09. **Nesse app, a sobreposição
  não entrega a interrupção; só a notificação chega.** Evidência no fim de
  `i25-bancos-e-apostas.txt`. Sem confirmação visual do responsável.
- **Só 1 casa de aposta medida** (Bet365: não protege, tela de abertura). A meta
  era 4 ou mais; **a conclusão sobre apostas ainda não vale.**
- Não instalados: Itaú, Bradesco, Banco do Brasil, Santander, C6, PicPay, Mercado
  Pago e as outras casas de aposta. Apps no outro perfil do aparelho (usuário 150,
  provavelmente Pasta Segura) não foram varridos.

## Como ler o resultado

| Resultado | Consequência para o desenho |
|---|---|
| **Nenhum** protege | Sobreposição segue viável; risco teórico, a repetir a cada versão dos apps |
| **Bancos protegem, apostas não** | Sobreposição serve para o alvo principal; ela falha em banco, que não é alvo |
| **Alguma casa de aposta protege** | A sobreposição não pode ser a única abordagem. A tela própria (A4b) vira a principal para esse app, com o custo do botão voltar (I-13) |
| **App se recusa a abrir com depuração** | Sem medição possível naquele app pelo cabo; considerar medir pelo Wi-Fi ou registrar como lacuna |

Qualquer resultado entra na seção de impactos do relatório de viabilidade, ao lado
do I-25.

## Para não esquecer

- A flag é **por janela**: o app pode proteger a tela do saldo e não a de login.
  Um "NAO" na tela de abertura não prova nada sobre as outras telas.
- É um retrato das versões de hoje. Os apps atualizam e podem ligar a proteção
  depois. No app definitivo, vale a detecção da própria supressão (I-28) como rede
  de segurança, em vez de depender desta lista.
