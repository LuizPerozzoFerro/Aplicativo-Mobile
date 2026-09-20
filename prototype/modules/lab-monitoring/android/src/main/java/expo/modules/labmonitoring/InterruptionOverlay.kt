package expo.modules.labmonitoring

import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewTreeObserver
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

  /**
   * Quanto esperamos, depois de adicionar a janela, para conferir se ela chegou
   * mesmo a tela (impacto I-28). Meio segundo e o suficiente para o sistema
   * decidir, e curto o bastante para quase nunca alcancar um toque do usuario.
   */
  private const val VISIBILITY_CHECK_MS = 500L

  /** De quanto em quanto tempo insistimos, enquanto a janela nao aparece. */
  private const val VISIBILITY_RETRY_MS = 1_000L

  /**
   * Prazo de validade da janela suprimida (decisao do responsavel, 19/09/2026).
   * Passou disso sem aparecer, ela e descartada: mostrar a interrupcao minutos
   * depois, quando o app protegido sai da frente, e pior do que nao mostrar. A
   * rede de seguranca e a notificacao de nivel 1, que ja foi enviada e que o app
   * monitorado nao consegue suprimir.
   */
  private const val VISIBILITY_DEADLINE_MS = 20_000L

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
    if (result.isFailure) {
      EventLog.append(
        context = context,
        source = "InterruptionOverlay",
        experiment = "A4",
        event = "interruption_failed",
        details = result.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
      )
      return
    }

    view = root
    confirmOnScreen(context, root)
  }

  /**
   * Impacto I-28: adicionar a view NAO prova que o usuario viu alguma coisa.
   *
   * Um app na frente pode chamar setHideOverlayWindows(true) e o sistema esconde
   * a nossa janela sem avisar: nao ha excecao, nao ha retorno de erro, e o
   * addView continua "bem-sucedido". Medido no A4 em 19/09/2026.
   *
   * Por isso o `interruption_shown` so e gravado depois de conferir a propria
   * view. As quatro sondas vao no detalhe do evento nos dois casos, para o
   * experimento mostrar qual delas percebe a supressao.
   */
  private fun confirmOnScreen(context: Context, root: View) {
    var drew = false
    val onDraw = ViewTreeObserver.OnDrawListener { drew = true }
    runCatching { root.viewTreeObserver.addOnDrawListener(onDraw) }

    val addedAt = SystemClock.elapsedRealtime()
    var reportedSuppression = false

    lateinit var check: () -> Unit
    check = {
      val elapsed = SystemClock.elapsedRealtime() - addedAt

      when {
        // Ja foi fechada: estava na tela, alguem a fechou. Os botoes registram
        // o proprio evento; aqui so fechamos o par do interruption_shown.
        view !== root -> {
          runCatching { root.viewTreeObserver.removeOnDrawListener(onDraw) }
          if (!reportedSuppression) {
            EventLog.append(
              context = context,
              source = "InterruptionOverlay",
              experiment = "A4",
              event = "interruption_shown",
              details = "abordagem: sobreposicao · fechada antes da conferencia"
            )
          }
        }

        else -> {
          val focused = root.hasWindowFocus()
          val windowVisible = root.windowVisibility == View.VISIBLE
          val shown = root.isShown
          val probes = "foco: ${yesNo(focused)} · janela visivel: ${yesNo(windowVisible)} · " +
            "isShown: ${yesNo(shown)} · desenhou: ${yesNo(drew)}"

          if (focused && windowVisible && shown) {
            runCatching { root.viewTreeObserver.removeOnDrawListener(onDraw) }
            EventLog.append(
              context = context,
              source = "InterruptionOverlay",
              experiment = "A4",
              event = "interruption_shown",
              details = if (reportedSuppression) {
                "abordagem: sobreposicao · apareceu depois de ${elapsed / 1000.0} s · $probes"
              } else {
                "abordagem: sobreposicao · $probes"
              }
            )
          } else {
            if (!reportedSuppression) {
              reportedSuppression = true
              EventLog.append(
                context = context,
                source = "InterruptionOverlay",
                experiment = "A4",
                event = "interruption_suppressed",
                details = "abordagem: sobreposicao · $probes"
              )
            }

            if (elapsed >= VISIBILITY_DEADLINE_MS) {
              // Prazo de validade: descartar em vez de aparecer fora de contexto.
              runCatching { root.viewTreeObserver.removeOnDrawListener(onDraw) }
              hide(context)
              EventLog.append(
                context = context,
                source = "InterruptionOverlay",
                experiment = "A4",
                event = "interruption_discarded",
                details = "abordagem: sobreposicao · suprimida por ${elapsed / 1000} s · " +
                  "a notificacao de nivel 1 fica como rede de seguranca"
              )
            } else {
              root.postDelayed({ check() }, VISIBILITY_RETRY_MS)
            }
          }
        }
      }
    }

    root.postDelayed({ check() }, VISIBILITY_CHECK_MS)
  }

  private fun yesNo(value: Boolean) = if (value) "sim" else "nao"

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
