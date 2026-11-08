package br.com.quedo.monitoring

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.window.OnBackInvokedDispatcher

/**
 * Reserva da sobreposição (spec 03, 5.3): tentada uma vez quando outro app
 * esconde a sobreposição (I-25). Fora dos recentes, sem histórico, com
 * `taskAffinity` vazio e retrato fixo (manifesto do módulo). O conteúdo vem da
 * sessão em `InterruptionPresenter`; sem sessão, não há o que mostrar.
 */
class InterruptionActivity : Activity() {
  private var session: InterruptionPresenter.Session? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val current = InterruptionPresenter.current
    if (current == null || current.mode != InterruptionAttempts.Mode.ACTIVITY) {
      finish()
      return
    }
    session = current
    setContentView(
      InterruptionScreen.build(this, current.content) { InterruptionPresenter.respond(this, it) },
    )
    // Voltar preditivo: esta tela ligou o `enableOnBackInvokedCallback` no
    // manifesto; o callback vazio impede o gesto de fechá-la sem uma escolha.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(
        OnBackInvokedDispatcher.PRIORITY_DEFAULT,
      ) { }
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) session?.let { InterruptionPresenter.onActivityFocused(this, it) }
  }

  /** Caminho antigo do voltar (Android 12 ou anterior). */
  @Deprecated("Caminho antigo do voltar; ver onCreate.")
  override fun onBackPressed() = Unit

  override fun onDestroy() {
    if (!isChangingConfigurations) session?.let { InterruptionPresenter.onActivityGone(this, it) }
    super.onDestroy()
  }
}
