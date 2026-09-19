package expo.modules.labmonitoring

import android.content.Context
import android.content.Intent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Saidas da tela de interrupcao comuns as duas abordagens do A4 (tela inicial,
 * emergencia, conferencia do retorno) e a pausa do A5 que vem depois do
 * "Continuar".
 */
object InterruptionExits {

  /**
   * Espera antes de conferir o app em primeiro plano. Na tela propria, o app
   * monitorado e reaberto por um intent e leva algumas centenas de milissegundos
   * para voltar; sem a espera, a leitura pegaria a transicao pela metade.
   */
  private const val LANDING_CHECK_DELAY_MS = 1_500L

  /**
   * Carencia depois de qualquer saida da interrupcao, durante a qual o servico nao
   * interrompe de novo. O servico decide pelo historico de uso, que chega dezenas
   * de milissegundos atrasado em relacao a tela: na rodada O3, o Instagram so
   * pausou 25 ms depois do toque em "Ir para a tela inicial", e o lancador so
   * voltou 65 ms depois. Uma verificacao que caisse nessa janela veria o
   * Instagram ainda na frente e reabriria a sobreposicao sobre a tela inicial.
   */
  private const val EXIT_GRACE_MS = 3_000L

  @Volatile private var lastExitAt = 0L

  /** Marca a saida da interrupcao, por botao ou por dispensa. */
  fun markExit() {
    lastExitAt = System.currentTimeMillis()
  }

  fun exitedRecently(now: Long): Boolean = now - lastExitAt < EXIT_GRACE_MS

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
   * "Emergencia": abre o laboratorio, que faz as vezes do fluxo de emergencia do
   * app definitivo (documento 01, secao 6.7). E o mesmo destino do botao da
   * notificacao (A3). Decisao do responsavel em 18/09/2026: sem pausa.
   */
  fun openLab(context: Context): Result<Unit> = runCatching {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: error("sem intent de abertura para ${context.packageName}")
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  /**
   * A5: o "Continuar mesmo assim" silencia os dois niveis de alerta por alguns
   * minutos. So o "Continuar" pausa: a tela inicial e a emergencia nao (decisao
   * do responsavel em 18/09/2026), e reabrir o app monitorado depois delas
   * interrompe de novo.
   */
  fun startPause(context: Context, source: String) {
    val minutes = LimitConfig.pauseMinutes(context)
    val until = System.currentTimeMillis() + minutes * 60_000L
    LimitConfig.setPausedUntil(context, until)

    EventLog.append(
      context = context,
      source = source,
      experiment = "A5",
      event = "pause_started",
      details = "$minutes min, ate ${SimpleDateFormat("HH:mm:ss", Locale.US).format(Date(until))}"
    )
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
