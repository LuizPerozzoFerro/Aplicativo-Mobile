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
| `a5-pausa.txt` | A5 | Pausa de 2 min depois do "Continuar": nenhum alerta durante a pausa, notificação e tela no fim; tela inicial e emergência sem pausa; pausa sobrevivendo à recriação do serviço |
| `a6-vpn-dns.txt` | A6 | VPN local de DNS: consentimento, detecção e notificação no modo alerta, NXDOMAIN no modo bloqueio, cache do navegador, DNS privado automático, consultas vistas pelo sistema |
| `a7-instagram-navegador.txt` | A7 | (parcial) instagram.com no Chrome detectado "via: navegador", app do Instagram separado, prévia do rastreador de sessão e roteiro da rodada pendente |
| `a9-leitura-de-base.txt` | A9 | Estado do aparelho antes do teste de 2 h |
| `a9-sobrevivencia-e-custo.txt` | A9 | Doze profundo, custo de CPU, reinício do aparelho |

## Privacidade

Nenhum arquivo aqui contém o histórico de uso completo do aparelho nem capturas
da gaveta de notificações — ambos expõem dados pessoais do responsável
(`CLAUDE.md` §9). Os arquivos `.txt` trazem apenas recortes com eventos de tela e
do próprio protótipo.
