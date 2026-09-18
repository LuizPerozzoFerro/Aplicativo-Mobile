package expo.modules.labmonitoring

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Experimento A4, abordagem (b): abrir uma tela propria por cima do app monitorado.
 *
 * Ao contrario da sobreposicao, isto e uma Activity de verdade. Iniciar uma
 * activity estando em segundo plano e restrito desde o Android 10; a excecao que
 * nos serve e justamente ter SYSTEM_ALERT_WINDOW concedida -- ou seja, as duas
 * abordagens dependem da MESMA permissao.
 *
 * Diferencas em relacao a sobreposicao, para o relatorio:
 * - troca de app de verdade: o Instagram vai para segundo plano e passa a contar
 *   como "nao usado", o que mexe na propria medicao do A1;
 * - aparece na lista de apps recentes;
 * - o "continuar mesmo assim" precisa devolver o usuario ao app certo, o que exige
 *   saber qual era;
 * - em compensacao, e uma tela comum, com ciclo de vida e navegacao normais.
 */
class InterruptionActivity : Activity() {

  companion object {
    const val EXTRA_MOTIVATION = "motivation"
    const val EXTRA_RETURN_TO = "returnTo"
  }

  /** Verdadeiro depois do toque num dos botoes, que registram o proprio evento. */
  private var resolved = false

  /**
   * Por que a tela saiu sem toque em botao, quando da para saber. Achado A4,
   * instrumentacao, item 3: o voltar e o inicio a dispensavam sem deixar rastro.
   */
  private var leaveReason: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val motivation = intent.getStringExtra(EXTRA_MOTIVATION) ?: Notifier.DEFAULT_MESSAGE
    val returnTo = intent.getStringExtra(EXTRA_RETURN_TO)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0B1220"))
      setPadding(64, 64, 64, 64)
    }

    root.addView(TextView(this).apply {
      text = "Momento de pausa"
      setTextColor(Color.parseColor("#F8FAFC"))
      textSize = 24f
      gravity = Gravity.CENTER
    })

    root.addView(TextView(this).apply {
      text = motivation
      setTextColor(Color.parseColor("#93C5FD"))
      textSize = 17f
      gravity = Gravity.CENTER
      setPadding(0, 40, 0, 56)
    })

    root.addView(Button(this).apply {
      text = "Continuar mesmo assim"
      setOnClickListener {
        resolved = true
        EventLog.append(
          context = this@InterruptionActivity,
          source = "InterruptionActivity",
          experiment = "A4",
          event = "continue_tapped",
          details = "abordagem: activity"
        )

        // Devolver o usuario ao app de onde ele veio. Numa sobreposicao isso seria
        // automatico; aqui precisa ser explicito.
        if (returnTo != null) {
          packageManager.getLaunchIntentForPackage(returnTo)?.let { startActivity(it) }
        }
        finish()
        InterruptionExits.logReturn(
          context = this@InterruptionActivity,
          source = "InterruptionActivity",
          approach = "activity",
          expected = returnTo
        )
      }
    })

    root.addView(Button(this).apply {
      text = "Emergência"
      setOnClickListener {
        resolved = true
        EventLog.append(
          context = this@InterruptionActivity,
          source = "InterruptionActivity",
          experiment = "A4",
          event = "emergency_tapped",
          details = "abordagem: activity"
        )
        finish()
      }
    })

    // I-15: saida que respeita o limite sem passar pela emergencia.
    root.addView(Button(this).apply {
      text = "Ir para a tela inicial"
      setOnClickListener {
        resolved = true
        EventLog.append(
          context = this@InterruptionActivity,
          source = "InterruptionActivity",
          experiment = "A4",
          event = "home_tapped",
          details = "abordagem: activity"
        )
        InterruptionExits.goHome(this@InterruptionActivity).onFailure {
          EventLog.append(
            context = this@InterruptionActivity,
            source = "InterruptionActivity",
            experiment = "A4",
            event = "home_failed",
            details = "${it.javaClass.simpleName}: ${it.message}"
          )
        }
        finish()
      }
    })

    setContentView(root)

    // Achado A4, instrumentacao, item 2: um giro recria a activity e passa por aqui
    // de novo. So a primeira criacao chega sem estado salvo.
    if (savedInstanceState == null) {
      EventLog.append(
        context = this,
        source = "InterruptionActivity",
        experiment = "A4",
        event = "interruption_shown",
        details = "abordagem: activity" + (returnTo?.let { " · voltar para $it" } ?: "")
      )
    }
  }

  /**
   * Caminho antigo do voltar. Continua valendo porque o template do Expo desliga o
   * voltar preditivo (enableOnBackInvokedCallback="false"); sem essa desativacao,
   * o Android 16 nao chama este metodo (I-14) e o motivo sai como "outro".
   */
  @Deprecated("Caminho antigo do voltar; ver comentario acima.")
  override fun onBackPressed() {
    leaveReason = "voltar"
    super.onBackPressed()
  }

  /** Chamado quando o usuario sai por escolha propria: inicio ou recentes. */
  override fun onUserLeaveHint() {
    if (leaveReason == null) leaveReason = "inicio ou recentes"
    super.onUserLeaveHint()
  }

  /**
   * Com noHistory, a tela e encerrada pelo sistema assim que deixa de ser visivel
   * (exceto com a tela apagada), entao toda saida sem botao termina aqui. A
   * recriacao por giro tambem passa por aqui, e nao conta como saida.
   */
  override fun onDestroy() {
    if (!resolved && !isChangingConfigurations) {
      EventLog.append(
        context = this,
        source = "InterruptionActivity",
        experiment = "A4",
        event = "interruption_dismissed",
        details = "abordagem: activity · motivo: ${leaveReason ?: "outro"}"
      )
    }
    super.onDestroy()
  }
}
