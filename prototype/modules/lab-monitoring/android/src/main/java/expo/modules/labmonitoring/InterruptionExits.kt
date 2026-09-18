package expo.modules.labmonitoring

import android.content.Context
import android.content.Intent

/**
 * Saidas da tela de interrupcao comuns as duas abordagens do A4: ir para a tela
 * inicial e conferir onde o usuario realmente foi parar.
 */
object InterruptionExits {

  /**
   * Espera antes de conferir o app em primeiro plano. Na tela propria, o app
   * monitorado e reaberto por um intent e leva algumas centenas de milissegundos
   * para voltar; sem a espera, a leitura pegaria a transicao pela metade.
   */
  private const val LANDING_CHECK_DELAY_MS = 1_500L

  /**
   * "Ir para a tela inicial" (I-15). Abre o lancador do aparelho pelo intent de
   * HOME, o mesmo que o gesto de inicio usa.
   *
   * Um inicio de activity barrado pelas restricoes de segundo plano nao lanca
   * excecao: o sistema so registra "Background activity launch blocked!" no
   * logcat. Por isso o sucesso aqui significa apenas "nao houve excecao", e a
   * prova de que o usuario chegou a tela inicial vem do sistema.
   */
  fun goHome(context: Context): Result<Unit> {
    val intent = Intent(Intent.ACTION_MAIN)
      .addCategory(Intent.CATEGORY_HOME)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return runCatching { context.startActivity(intent) }
  }

  /**
   * Depois do "Continuar", registra o app que esta de fato em primeiro plano, em
   * vez de presumir o retorno (achado A4, instrumentacao, item 1). Na rodada B do
   * A4 o usuario tinha ido para a tela inicial com a sobreposicao aberta, e o log
   * afirmou que ele voltou ao Instagram.
   */
  fun logReturn(context: Context, source: String, approach: String, expected: String?) {
    val appContext = context.applicationContext
    Thread {
      Thread.sleep(LANDING_CHECK_DELAY_MS)
      val foreground = UsageReader.currentForegroundPackage(appContext)
      val returned = expected != null && foreground == expected

      EventLog.append(
        context = appContext,
        source = source,
        experiment = "A4",
        event = if (returned) "returned_to_app" else "not_returned_to_app",
        details = if (returned) {
          "$foreground · abordagem: $approach"
        } else {
          "em primeiro plano: ${foreground ?: "desconhecido"} · " +
            "esperado: ${expected ?: "desconhecido"} · abordagem: $approach"
        }
      )
    }.start()
  }
}
