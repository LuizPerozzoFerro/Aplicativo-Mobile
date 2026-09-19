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
  // Lida tambem pela thread do servico (A5), para nao empilhar interrupcoes.
  @Volatile private var view: View? = null

  fun canDraw(context: Context): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true

  val isShowing: Boolean get() = view != null

  /**
   * @param interruptedPackage app que estava na tela quando a interrupcao foi
   * disparada. Serve para conferir, depois do "Continuar", se o usuario de fato
   * voltou a ele.
   */
  fun show(context: Context, motivation: String, interruptedPackage: String?) {
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
        // A pausa comeca ANTES de a janela sair: o servico roda em outra thread e,
        // sem ela, poderia ver o Instagram na tela e interromper de novo.
        InterruptionExits.startPause(context, source = "InterruptionOverlay")
        InterruptionExits.markExit()
        hide(context)
        InterruptionExits.logReturn(
          context = context,
          source = "InterruptionOverlay",
          approach = "sobreposicao",
          expected = interruptedPackage
        )
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
        // Como na tela inicial: abre o destino antes de a janela sair.
        InterruptionExits.openLab(context).onFailure {
          EventLog.append(
            context = context,
            source = "InterruptionOverlay",
            experiment = "A4",
            event = "emergency_failed",
            details = "${it.javaClass.simpleName}: ${it.message}"
          )
        }
        InterruptionExits.markExit()
        hide(context)
      }
    })

    // I-15: saida que respeita o limite sem passar pela emergencia. O lancador e
    // aberto ANTES de remover a sobreposicao, para o app monitorado nao reaparecer
    // por um instante entre uma coisa e outra.
    root.addView(Button(context).apply {
      text = "Ir para a tela inicial"
      setOnClickListener {
        EventLog.append(
          context = context,
          source = "InterruptionOverlay",
          experiment = "A4",
          event = "home_tapped",
          details = "abordagem: sobreposicao"
        )
        InterruptionExits.goHome(context).onFailure {
          EventLog.append(
            context = context,
            source = "InterruptionOverlay",
            experiment = "A4",
            event = "home_failed",
            details = "${it.javaClass.simpleName}: ${it.message}"
          )
        }
        InterruptionExits.markExit()
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

  /**
   * Remove a sobreposicao. Os botoes registram o proprio evento; [reason] e para
   * os fechamentos por codigo (servico parado, botao do laboratorio), para toda
   * interruption_shown terminar com um evento de saida no log.
   */
  fun hide(context: Context, reason: String? = null) {
    val current = view ?: return
    val manager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val removed = runCatching { manager.removeView(current) }
    view = null

    if (removed.isFailure) {
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "interruption_close_failed",
        details = removed.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
      )
    } else if (reason != null) {
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "interruption_closed",
        details = "abordagem: sobreposicao · motivo: $reason"
      )
    }
  }
}
