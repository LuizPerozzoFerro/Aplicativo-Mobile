package br.com.quedo.monitoring

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.media.AudioManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.view.WindowManager

/**
 * Mostra e tira a tela de interrupção (spec 03, 5.3). Tudo o que mexe em
 * janela roda na thread principal.
 *
 * - **Pedir não é aparecer (I-28):** a tela só conta depois de conferida na
 *   tela. Sem aparecer em 20 s, é descartada.
 * - **Reserva:** ver `InterruptionAttempts`.
 * - **Chamada:** a tela nunca cobre uma chamada. Enquanto está aberta, o modo
 *   de áudio é conferido a cada segundo (sem permissão).
 */
object InterruptionPresenter {
  private const val CHECK_MS = 500L
  private const val RETRY_MS = 1_000L
  private const val DEADLINE_MS = 20_000L
  private const val ACTIVITY_DEADLINE_MS = 5_000L

  /** Uma tela pedida, ainda não conferida ou já na frente do usuário. */
  class Session(
    val action: MomentRules.Action.ShowInterruption,
    val content: InterruptionContent,
    val mode: InterruptionAttempts.Mode,
  ) {
    var root: InterruptionRootView? = null
    var activity: InterruptionActivity? = null
    var interruptionId: String? = null
    val confirmed get() = interruptionId != null
  }

  private val main = Handler(Looper.getMainLooper())
  private val attempts = InterruptionAttempts()

  @Volatile
  var current: Session? = null
    private set

  val isBusy: Boolean get() = current != null

  @Synchronized
  fun canAttempt(now: Long): Boolean = attempts.canAttempt(now)

  fun isInCall(context: Context): Boolean {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
    return when (audio.mode) {
      AudioManager.MODE_RINGTONE,
      AudioManager.MODE_IN_CALL,
      AudioManager.MODE_IN_COMMUNICATION,
      AudioManager.MODE_CALL_SCREENING,
      -> true

      else -> false
    }
  }

  /** A cada verificação: fecha a tela se o usuário saiu do app e zera o recuo fora dos monitorados. */
  fun onCheck(context: Context, foreground: String?, monitored: Set<String>) {
    val app = context.applicationContext
    main.post {
      val session = current
      val interactive = (app.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
      if (
        session != null &&
        session.mode == InterruptionAttempts.Mode.OVERLAY &&
        session.confirmed &&
        interactive &&
        foreground != session.action.target
      ) {
        closeWithoutResponse(app)
      }
      if (interactive && (foreground == null || foreground !in monitored)) {
        synchronized(this) { attempts.reset() }
      }
    }
  }

  fun show(context: Context, action: MomentRules.Action.ShowInterruption, content: InterruptionContent) {
    val app = context.applicationContext
    main.post {
      if (current != null || !Settings.canDrawOverlays(app) || isInCall(app)) return@post
      val mode = synchronized(this) { attempts.mode }
      val session = Session(action, content, mode)
      current = session
      if (mode == InterruptionAttempts.Mode.OVERLAY) showOverlay(app, session) else showActivity(app, session)
    }
  }

  private fun windowManager(context: Context) =
    context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  private fun showOverlay(context: Context, session: Session) {
    val root = InterruptionScreen.build(context, session.content) { respond(context, it) }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      // Sem FLAG_NOT_FOCUSABLE: o foco é a prova de que apareceu (I-28), e o
      // voltar chega aqui.
      0,
      PixelFormat.OPAQUE,
    )
    if (runCatching { windowManager(context).addView(root, params) }.isFailure) {
      current = null
      return
    }
    session.root = root
    val addedAt = SystemClock.elapsedRealtime()
    lateinit var check: Runnable
    check = Runnable {
      if (current !== session) return@Runnable
      if (isInCall(context)) {
        closeWithoutResponse(context)
        return@Runnable
      }
      if (!session.confirmed && root.hasWindowFocus() && root.isShown) confirm(context, session)
      if (!session.confirmed && SystemClock.elapsedRealtime() - addedAt >= DEADLINE_MS) {
        removeOverlay(context, session)
        current = null
        synchronized(this) { attempts.overlayHidden(System.currentTimeMillis()) }
        return@Runnable
      }
      main.postDelayed(check, RETRY_MS)
    }
    main.postDelayed(check, CHECK_MS)
  }

  private fun showActivity(context: Context, session: Session) {
    val started = runCatching {
      context.startActivity(
        Intent(context, InterruptionActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }.isSuccess
    // Uma Activity barrada pelo sistema não gera erro: o prazo é o que diz.
    val failed = Runnable {
      if (current === session && !session.confirmed) {
        current = null
        synchronized(this) { attempts.activityFailed(System.currentTimeMillis()) }
      }
    }
    if (started) main.postDelayed(failed, ACTIVITY_DEADLINE_MS) else main.post(failed)
  }

  private fun confirm(context: Context, session: Session) {
    if (session.confirmed) return
    session.interruptionId =
      MomentRunner.onShown(context, session.action.compulsionId, session.action.target)
    synchronized(this) { attempts.reset() }
  }

  /** A tela própria ganhou o foco: apareceu. */
  fun onActivityFocused(activity: InterruptionActivity, session: Session) {
    session.activity = activity
    if (current === session) confirm(activity.applicationContext, session)
  }

  /** A tela própria saiu sem resposta (voltou ao início, chamada, recentes). */
  fun onActivityGone(activity: InterruptionActivity, session: Session) {
    if (current !== session) return
    current = null
    val app = activity.applicationContext
    if (session.confirmed) {
      MomentRunner.onDismissed(app)
    } else {
      synchronized(this) { attempts.activityFailed(System.currentTimeMillis()) }
    }
  }

  private fun removeOverlay(context: Context, session: Session) {
    session.root?.let { root -> runCatching { windowManager(context).removeView(root) } }
    session.root = null
  }

  /** Um botão da tela. A resposta é gravada antes de a tela sair (o serviço roda em outra thread). */
  fun respond(context: Context, response: String) {
    val app = context.applicationContext
    val session = current ?: return
    confirm(app, session)
    MomentRunner.respond(app, session.action.compulsionId, session.interruptionId, response)

    val target = session.action.target
    when (response) {
      "home" -> runCatching {
        app.startActivity(
          Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
      }

      "emergency" -> runCatching {
        ConfigStore.get(app)?.getJSONObject("links")?.getString("emergencyFromInterruption")?.let {
          app.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse(it))
              .setPackage(app.packageName)
              .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
          )
        }
      }

      // A sobreposição só precisa sair; a tela própria devolve ao app de antes.
      else -> if (session.mode == InterruptionAttempts.Mode.ACTIVITY) {
        runCatching {
          app.packageManager.getLaunchIntentForPackage(target)?.let {
            app.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
          }
        }
      }
    }

    current = null
    removeOverlay(app, session)
    session.activity?.finish()
  }

  private fun closeWithoutResponse(context: Context) {
    val session = current ?: return
    current = null
    removeOverlay(context, session)
    session.activity?.finish()
    if (session.confirmed) MomentRunner.onDismissed(context)
  }

  /** Ferramenta de teste (spec 03, 5.10): sai do recuo e volta à tentativa normal. */
  @Synchronized
  fun resetAttempts() = attempts.reset()

  /** O serviço parou ou o usuário apagou os dados. */
  fun close(context: Context) {
    val app = context.applicationContext
    main.post { closeWithoutResponse(app) }
  }
}
