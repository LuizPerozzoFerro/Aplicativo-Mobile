# Protótipo técnico de monitoramento (Fase 1)

Código descartável para validar o que é possível fazer em iOS e Android antes de
construir o app definitivo. Não é o app.

| Documento | Para quê |
|---|---|
| [`NOTAS.md`](NOTAS.md) | Estado atual, decisões, achados, problemas e comandos. **Ler primeiro.** |
| [`../docs/specs/spec-00-prototipo-monitoramento.md`](../docs/specs/spec-00-prototipo-monitoramento.md) | Experimentos, critérios e ordem de execução |
| [`../docs/relatorios/evidencias/`](../docs/relatorios/evidencias/) | Evidências de cada experimento |
| [`../CLAUDE.md`](../CLAUDE.md) | Regras de trabalho |

Resumo do que há aqui:

- `src/app/index.tsx` — tela de laboratório, uma seção por experimento.
- `src/monitoring/` — interface comum de monitoramento (spec §5.2).
- `modules/lab-monitoring/` — módulo nativo próprio (Kotlin; esqueleto Swift que
  responde `unsupported`).

Roda como *development build* no Galaxy S22 pelo cabo USB. Não funciona no
Expo Go. O passo a passo de cada sessão está em "Procedimento de início de
sessão", no `NOTAS.md`.
