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
      }
    })

    root.addView(Button(this).apply {
      text = "Emergência"
      setOnClickListener {
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

    setContentView(root)

    EventLog.append(
      context = this,
      source = "InterruptionActivity",
      experiment = "A4",
      event = "interruption_shown",
      details = "abordagem: activity" + (returnTo?.let { " · voltar para $it" } ?: "")
    )
  }
}
