# labtarget — app de teste do impacto I-25

App mínimo, **fora do protótipo**, usado no experimento A4 para responder uma
pergunta que o laboratório sozinho não responde: um app comum consegue esconder
a nossa tela de interrupção?

Ele faz uma coisa só: liga na própria janela a proteção
`Window.setHideOverlayWindows(true)` (API 31+), com um botão para alternar. A
permissão que isso exige, `HIDE_OVERLAY_WINDOWS`, é de **nível normal**: sai
concedida na instalação, sem perguntar nada ao usuário.

Precisa ser um app separado porque, entre janelas do mesmo UID, o sistema se
comportou como se a proteção não existisse (rodada 1 da evidência). Com este
app, de outro UID, a nossa sobreposição foi escondida — ver
`docs/relatorios/evidencias/a4-protecao-contra-sobreposicao.txt`.

Não faz parte do app do MVP nem do módulo `lab-monitoring`. É descartável, como
o resto da Fase 1.

## Como compilar e instalar

O projeto não versiona o wrapper do Gradle. Copie o do protótipo e rode:

```bash
cp -r ../android/gradle ../android/gradlew.bat .
./gradlew.bat assembleDebug
adb install -r build/outputs/apk/debug/labtarget-debug.apk
```

## Como usar no teste

1. No laboratório (seção A2), escolha **Alvo do laboratorio** entre os apps
   monitorados, com um limite baixo, e toque em "Iniciar limite".
2. Abra o app de teste e deixe-o na frente. Ele já abre protegido.
3. Confira a flag no sistema — o bit `0x00080000` aparece no `pfl` da janela:

   ```bash
   adb shell dumpsys window windows
   ```

4. Quando o limite estourar, o log do laboratório registra
   `interruption_shown`, mas a sobreposição fica com
   `mForceHideNonSystemOverlayWindow=true`, `isVisible=false`.
5. Toque em "Alternar protecao": a mesma janela aparece na hora.

## Remover do aparelho

```bash
adb uninstall com.norte.labtarget
```
