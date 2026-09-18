package expo.modules.labmonitoring

import android.content.Context
import android.graphics.Color
import android.os.Build
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Experimento A4, abordagem (a): sobreposicao desenhada por cima do app monitorado.
 *
 * Usa TYPE_APPLICATION_OVERLAY com WindowManager, o que exige a permissao
 * SYSTEM_ALERT_WINDOW ("Aparecer sobre outros apps"), concedida manualmente pelo
 * usuario nos Ajustes.
 *
 * A interface e montada em codigo, sem XML, porque um modulo Expo local nao tem
 * pipeline de recursos proprio -- e no protótipo o visual nao importa.
 *
 * Diferenca para a abordagem (b), InterruptionActivity: aqui nao ha troca de
 * activity nem mexida na pilha de tarefas. O app monitorado continua rodando
 * atras; so pintamos por cima. Isso torna o "continuar mesmo assim" trivial
 * (basta remover a view) e evita o risco de o usuario voltar para o lugar errado.
 */
object InterruptionOverlay {
  private var view: View? = null

  fun canDraw(context: Context): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true

  val isShowing: Boolean get() = view != null

  fun show(context: Context, motivation: String, onContinue: () -> Unit) {
    if (!canDraw(context)) {
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "overlay_denied",
        details = "SYSTEM_ALERT_WINDOW nao concedida"
      )
      return
    }
    if (isShowing) return

    val manager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F20B1220"))
      setPadding(64, 64, 64, 64)
    }

    root.addView(TextView(context).apply {
      text = "Momento de pausa"
      setTextColor(Color.parseColor("#F8FAFC"))
      textSize = 24f
      gravity = Gravity.CENTER
    })

    root.addView(TextView(context).apply {
      text = motivation
      setTextColor(Color.parseColor("#93C5FD"))
      textSize = 17f
      gravity = Gravity.CENTER
      setPadding(0, 40, 0, 56)
    })

    root.addView(Button(context).apply {
      text = "Continuar mesmo assim"
      setOnClickListener {
        EventLog.append(
          context = context,
          source = "InterruptionOverlay",
          experiment = "A4",
          event = "continue_tapped",
          details = "abordagem: sobreposicao"
        )
        hide(context)
        onContinue()
      }
    })

    root.addView(Button(context).apply {
      text = "Emergência"
      setOnClickListener {
        EventLog.append(
          context = context,
          source = "InterruptionOverlay",
          experiment = "A4",
          event = "emergency_tapped",
          details = "abordagem: sobreposicao"
        )
        hide(context)
      }
    })

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      },
      // Sem FLAG_NOT_TOUCHABLE: a sobreposicao precisa receber os toques, senao o
      // usuario continuaria interagindo com o app de tras.
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      android.graphics.PixelFormat.TRANSLUCENT
    )

    val result = runCatching { manager.addView(root, params) }
    if (result.isSuccess) {
      view = root
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "interruption_shown",
        details = "abordagem: sobreposicao"
      )
    } else {
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "interruption_failed",
        details = result.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
      )
    }
  }

  fun hide(context: Context) {
    val current = view ?: return
    val manager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    runCatching { manager.removeView(current) }
    view = null
  }
}
