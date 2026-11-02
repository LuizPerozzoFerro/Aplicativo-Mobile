# NOTAS-APP — diário técnico do app definitivo

Decisões, problemas, tentativas e comandos do app da Fase 2 em diante. O diário
do protótipo continua em `prototype/NOTAS.md`.

---

## Divergências a levar ao chat de planejamento

### DV1 · Docs 01, 02 e spec 01 citam o relatório v0.2 e não incorporam a D6 (01/11/2026)

- O relatório no repositório é a **v0.4 (31/10/2026)**, mantida por decisão do
  responsável em 01/11/2026. A cópia exportada do Doc de trabalho era a v0.2
  (24/09/2026).
- Os docs 01 e 02 (v0.4) e a spec 01 citam `relatorios/01-viabilidade-monitoramento.md`
  como **v0.2**.
- A v0.4 traz a **decisão D6 (25/10/2026)**: a primeira versão publicada sai
  **sem a VPN** (A6, A7 e A8 ficam para uma versão posterior). Os docs ainda
  seguem a direção de 24/09:
  - doc 01, risco R3: "submeter a VPN declarada, com uma variante de build sem
    VPN como plano B";
  - doc 02: "Variantes de build com e sem VPN" (Fase 2), "Se a VPN for recusada:
    avaliar recurso e, se preciso, publicar a variante sem VPN" e risco T9.
- A v0.4 também registra o **I-25 medido em app real** (o Nubank apaga a nossa
  sobreposição), que não aparece nos docs.
- **Status:** **resolvida em 01/11/2026** no chat de planejamento. Docs 01 e 02
  passaram à v0.5 e a spec 01 à v0.3, todos citando o relatório v0.4: a D6 está
  no doc 01 (seção 3.2) e no doc 02 (seção 3.4, build único sem VPN); não há
  variante de VPN, só a flag `features.domainMonitoring` (sempre `false`) e a
  verificação do manifesto contra `BIND_VPN_SERVICE`,
  `FOREGROUND_SERVICE_SYSTEM_EXEMPTED` e `HIDE_OVERLAY_WINDOWS` (spec 4.3).

## Decisões do responsável (01/11/2026)

- Pontos 4 a 7 da leitura da spec aprovados e incorporados na spec v0.3
  (`src/config/`, voltar do Android no onboarding, `age_confirmed_at` nulo até a
  Fase 3, enums técnicos nunca em logs).
- **Sentry:** fica para antes da Fase 8. Não instalar agora.
- **Banco:** Drizzle ORM sobre `expo-sqlite`, com o teste de duas migrações no
  aparelho (V11).
