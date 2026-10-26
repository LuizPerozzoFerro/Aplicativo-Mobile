#!/usr/bin/env bash
# I-25: confere se a janela de um app liga a protecao contra sobreposicoes de
# terceiros (setHideOverlayWindows). Le so o pfl da janela no dumpsys; nao grava
# nem imprime titulo de tela alem do nome da activity.
#
# Uso: ./i25-scan.sh com.pacote.um com.pacote.dois ...
# Requer o aparelho no cabo (adb devices) e o app JA instalado.
# Fluxo por app: abre pela intencao LAUNCHER, espera, le a janela, volta a tela inicial.
# Quem entra em conta, se for o caso, e o responsavel; o script nunca digita nada.
#
# Bit 0x00080000 do pfl = SYSTEM_FLAG_HIDE_NON_SYSTEM_OVERLAY_WINDOWS (I-25).
# Bit 0x2000 do fl     = FLAG_SECURE (bloqueia captura de tela; informativo).

WAIT="${WAIT:-6}"

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 pacote [pacote ...]" >&2
  exit 1
fi

for pkg in "$@"; do
  if ! adb shell pm path "$pkg" 2>/dev/null | grep -q package:; then
    echo "$pkg | NAO INSTALADO"
    continue
  fi
  adb shell input keyevent KEYCODE_HOME
  sleep 1
  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep "$WAIT"

  # Linhas da janela do pacote: cabecalho "Window #N Window{... u0 pkg/Activity}:"
  # seguido de "mAttrs={...}". No Android 16 (medido em 25/10/2026) o fl e o pfl
  # vem em linhas separadas, abaixo do mAttrs ("      fl=81810100" e
  # "      pfl=100888c0"); em versoes antigas vinham na mesma linha. Os dois casos
  # sao tratados.
  out=$(adb shell dumpsys window windows | tr -d '\r' | awk -v pkg="$pkg" '
    /Window #[0-9]+ Window\{/ {
      cur = ""; fl = ""
      if (index($0, " u0 " pkg "/") > 0) {
        cur = $0
        sub(/.* u0 /, "", cur); sub(/\}:?$/, "", cur)
      }
    }
    cur != "" {
      if (match($0, /(^|[ \t])fl=[0-9a-fx]+/)) {
        s = substr($0, RSTART, RLENGTH); sub(/.*fl=/, "", s); fl = s
      }
      if (match($0, /(^|[ \t])pfl=[0-9a-fx]+/)) {
        s = substr($0, RSTART, RLENGTH); sub(/.*pfl=/, "", s)
        print cur "|" fl "|" s
        cur = ""
      }
    }')

  if [ -z "$out" ]; then
    echo "$pkg | SEM JANELA (o app nao abriu, fechou ou bloqueou a depuracao)"
    continue
  fi

  while IFS='|' read -r act fl pfl; do
    fl=${fl#0x}; pfl=${pfl#0x}
    prot="NAO"; sec="nao"
    if [ -n "$pfl" ] && [ $(( 16#$pfl & 16#00080000 )) -ne 0 ]; then prot="SIM"; fi
    if [ -n "$fl" ]  && [ $(( 16#$fl  & 16#2000 ))     -ne 0 ]; then sec="sim"; fi
    echo "$pkg | $act | protegida=$prot | FLAG_SECURE=$sec | pfl=$pfl"
  done <<< "$out"
done

adb shell input keyevent KEYCODE_HOME
