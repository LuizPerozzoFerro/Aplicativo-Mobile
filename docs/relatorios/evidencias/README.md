# Evidências da Fase 1

Material que sustenta cada resultado registrado em `prototype/NOTAS.md` e que
vai alimentar o relatório `docs/relatorios/01-viabilidade-monitoramento.md`.

Aparelho de todos os testes: Galaxy S22 (SM-S901E), Android 16 / API 36,
One UI 8.0.

| Arquivo | Experimento | O que mostra |
|---|---|---|
| `s1-tela-laboratorio.png` | S1 | App rodando no aparelho real |
| `s4-log-evento-nativo.png` | S4 | Evento escrito pelo Kotlin aparecendo na tela |
| `a1-ajustes-oneui-rota-targeted.png` | A1 | Intent direcionado abrindo a tela do próprio app nos Ajustes |
| `a1-bem-estar-digital-comparacao.png` | A1 | Números do Bem-estar digital usados como referência |
| `a1-antes-da-correcao-agregado.png`, `a1-antes-da-correcao-eventos.png` | A1 | Leituras antes da correção da regra de `STOPPED` |
| `a1-final-eventos-bate-com-sistema.png` | A1 | Leitura corrigida coincidindo com o sistema |
| `a1-linha-do-tempo.txt` | A1 | Recorte do `dumpsys` que desmentiu a conclusão sobre tela apagada |
| `a1-verificacao-final.txt` | A1 | Os três casos ambíguos de `STOPPED` e o vazamento de borda de dia |
| `a2-deteccao-de-limite.txt` | A2 | Detecção com o app fechado e latência de 9 s |
| `a3-alerta-notificacao.txt` | A3 | Notificação disparada pelo nativo, latência de ~6 s |
| `a4-tela-de-interrupcao.txt` | A4 | Sessão inicial e rodadas A–E: sobreposição e tela própria comparadas (voltar, início, barras, "Continuar", exceção de início em segundo plano, notificação do sistema) |
| `a4-instrumentacao-e-botao-inicio.txt` | A4 | Rodadas O1–O3 e T1–T5: retorno real após "Continuar", dispensa pelo voltar e pelo início registrada, um só `interruption_shown` apesar dos giros, botão "Ir para a tela inicial" nas duas abordagens |
| `a4-protecao-contra-sobreposicao.txt`, `a4-i25-alvo-protegido.png`, `a4-i25-alvo-desprotegido.png`, `a4-i25-mesmo-app-protegido.png` | A4 · I-25 | Um app comum, com `setHideOverlayWindows`, apaga a nossa tela de interrupção enquanto o log continua dizendo que ela apareceu; as duas capturas são a mesma janela com e sem a proteção do app da frente |
| `a4-notificacao-tela-cheia.txt` | A4 · I-26 | A notificação em tela cheia testada nas duas situações: com o aparelho em uso ela não abre a tela, e com o aparelho bloqueado ela abre atrás do bloqueio, com o usuário vendo só a tela de bloqueio |
| `a5-pausa.txt` | A5 | Pausa de 2 min depois do "Continuar": nenhum alerta durante a pausa, notificação e tela no fim; tela inicial e emergência sem pausa; pausa sobrevivendo à recriação do serviço |
| `a6-vpn-dns.txt` | A6 | VPN local de DNS: consentimento, detecção e notificação no modo alerta, NXDOMAIN no modo bloqueio, cache do navegador, DNS privado automático, consultas vistas pelo sistema |
| `a7-instagram-navegador.txt` | A7 | instagram.com no Chrome detectado "via: navegador", app do Instagram separado, e a rodada de 5 min que mede a estimativa de tempo no navegador (204 s para 180,6 s reais), recalculada para outros cortes |
| `a8-impacto-vpn.txt` | A8 | Navegação com e sem VPN (e o defeito do repasse corrigido), apps de banco, "Wi-Fi seguro" da Samsung derrubando a nossa VPN, DNS privado estrito deixando os apps sem DNS, DNS seguro do Chrome, queda do Wi-Fi, e a janela de 2h10 fora do cabo com o custo de CPU e de bateria |
| `a9-leitura-de-base.txt` | A9 | Estado do aparelho antes do teste de 2 h |
| `a9-sobrevivencia-e-custo.txt` | A9 | Doze profundo, custo de CPU, reinício do aparelho |
| `c2-textos-neutros.txt` | C2 | Os quatro textos de notificação lidos do registro do sistema, a prova de que o texto do alerta é configurável, e o que a tela de bloqueio mostra com e sem o "minimizar notificações" da Samsung |
| `t-roteiros-android.txt` | T1–T10 | Rodada Android dos roteiros de teste manual: cada passo com hora e evento do log, incluindo o que o T5 e o T10 revelaram (VPN que não volta depois do boot, e a perda de permissão que não gera aviso), e o T6: 21h59 fora do cabo sem nenhuma falha, o custo de bateria do dia comparado às janelas de 2 h, e o peso do laço do dev client medido por thread |
| `a10-politicas-google-play.txt` | A10 | Resumo das políticas do Google Play que valem para acesso ao uso, lista de apps, serviço em primeiro plano, sobreposição e VpnService, com links, datas de vigência e os riscos abertos |

## Privacidade

Nenhum arquivo aqui contém o histórico de uso completo do aparelho nem capturas
da gaveta de notificações — ambos expõem dados pessoais do responsável
(`CLAUDE.md` §9). Os arquivos `.txt` trazem apenas recortes com eventos de tela e
do próprio protótipo.
