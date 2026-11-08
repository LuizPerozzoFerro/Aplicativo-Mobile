package br.com.quedo.monitoring

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject

/** Os textos da tela, já escolhidos para esta exibição. Vêm do i18n, pela configuração. */
data class InterruptionContent(
  val brand: String,
  val title: String,
  val phrase: String,
  val motivationLabel: String,
  val motivation: String?,
  val warning: String?,
  val emergency: String,
  val home: String,
  val continueAnyway: String,
  val ignoreToday: String?,
) {
  companion object {
    /** Varia a frase de apoio pelo número da tela no dia (spec 03, 5.9). */
    fun from(config: JSONObject, action: MomentRules.Action.ShowInterruption, screenNumber: Int): InterruptionContent {
      val texts = config.getJSONObject("texts").getJSONObject("interruption")
      val phrases = texts.getJSONArray("phrases")
      return InterruptionContent(
        brand = texts.getString("brand"),
        title = texts.getString("title"),
        phrase = phrases.getString(screenNumber.mod(phrases.length())),
        motivationLabel = texts.getString("motivationLabel"),
        motivation = if (config.isNull("motivation")) null else config.getString("motivation"),
        warning = if (action.warnsEndOfDay) texts.getString("endOfDayWarning") else null,
        emergency = texts.getString("emergency"),
        home = texts.getString("home"),
        continueAnyway = texts.getString("continue"),
        ignoreToday = if (action.canIgnore) texts.getString("ignoreToday") else null,
      )
    }
  }
}

/** Raiz da tela: o voltar não fecha sem uma escolha (spec 03, 5.3). */
class InterruptionRootView(context: Context) : FrameLayout(context) {
  /** Um `OnBackInvokedCallback`, que só existe a partir do Android 13. */
  private var ignoreBack: Any? = null

  override fun dispatchKeyEvent(event: KeyEvent): Boolean =
    event.keyCode == KeyEvent.KEYCODE_BACK || super.dispatchKeyEvent(event)

  // Com o voltar preditivo ligado, o sistema não entrega a tecla: só o callback.
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val callback = android.window.OnBackInvokedCallback { }
      ignoreBack = callback
      findOnBackInvokedDispatcher()?.registerOnBackInvokedCallback(
        OnBackInvokedDispatcher.PRIORITY_DEFAULT,
        callback,
      )
    }
  }

  override fun onDetachedFromWindow() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      (ignoreBack as? android.window.OnBackInvokedCallback)?.let {
        findOnBackInvokedDispatcher()?.unregisterOnBackInvokedCallback(it)
      }
    }
    super.onDetachedFromWindow()
  }
}

/**
 * A tela, montada em código e usada tanto na sobreposição quanto na tela
 * própria. Fundo opaco, cores do design system (tema claro e escuro, pelos
 * recursos `values` e `values-night`), texto em sp para acompanhar a fonte do
 * sistema e rolagem para caber com a fonte no máximo.
 */
object InterruptionScreen {
  private fun dp(context: Context, value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), context.resources.displayMetrics).toInt()

  private fun text(context: Context, value: String, sizeSp: Float, color: Int, bold: Boolean = false): TextView =
    TextView(context).apply {
      text = value
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      setTextColor(color)
      gravity = Gravity.CENTER
      if (bold) paint.isFakeBoldText = true
    }

  private fun button(
    context: Context,
    label: String,
    background: Int,
    foreground: Int,
    outline: Int?,
    onPress: () -> Unit,
  ): Button = Button(context).apply {
    text = label
    isAllCaps = false
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
    setTextColor(foreground)
    minimumHeight = dp(context, 48)
    stateListAnimator = null
    this.background = GradientDrawable().apply {
      cornerRadius = dp(context, 12).toFloat()
      setColor(background)
      if (outline != null) setStroke(dp(context, 1), outline)
    }
    setPadding(dp(context, 16), dp(context, 12), dp(context, 16), dp(context, 12))
    setOnClickListener { onPress() }
  }

  /** @param onResponse recebe `emergency`, `home`, `continue` ou `ignore_today`. */
  fun build(context: Context, content: InterruptionContent, onResponse: (String) -> Unit): InterruptionRootView {
    val background = context.getColor(R.color.quedo_interruption_background)
    val textColor = context.getColor(R.color.quedo_interruption_text)
    val muted = context.getColor(R.color.quedo_interruption_text_muted)
    val primary = context.getColor(R.color.quedo_interruption_primary)
    val onPrimary = context.getColor(R.color.quedo_interruption_on_primary)
    val outline = context.getColor(R.color.quedo_interruption_outline)
    val danger = context.getColor(R.color.quedo_interruption_danger)

    val title = text(context, content.title, 26f, textColor, bold = true).apply {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) isAccessibilityHeading = true
    }

    val column = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      val side = dp(context, 24)
      setPadding(side, dp(context, 48), side, dp(context, 48))
    }
    val gap = dp(context, 12)
    fun add(view: View, top: Int = gap) {
      column.addView(
        view,
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          topMargin = top
        },
      )
    }

    add(text(context, content.brand, 16f, primary, bold = true), 0)
    add(title, dp(context, 16))
    add(text(context, content.phrase, 18f, textColor), dp(context, 16))
    content.motivation?.let {
      add(text(context, content.motivationLabel, 14f, muted), dp(context, 24))
      add(text(context, it, 18f, textColor, bold = true), dp(context, 4))
    }
    content.warning?.let { add(text(context, it, 16f, danger, bold = true), dp(context, 24)) }

    add(button(context, content.emergency, primary, onPrimary, null) { onResponse("emergency") }, dp(context, 32))
    add(button(context, content.home, background, textColor, outline) { onResponse("home") })
    add(button(context, content.continueAnyway, background, textColor, outline) { onResponse("continue") })
    content.ignoreToday?.let {
      add(button(context, it, background, textColor, outline) { onResponse("ignore_today") })
    }

    val scroll = ScrollView(context).apply {
      isFillViewport = true
      addView(
        FrameLayout(context).apply {
          addView(
            column,
            FrameLayout.LayoutParams(
              ViewGroup.LayoutParams.MATCH_PARENT,
              ViewGroup.LayoutParams.WRAP_CONTENT,
              Gravity.CENTER,
            ),
          )
        },
      )
    }

    return InterruptionRootView(context).apply {
      setBackgroundColor(background)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) accessibilityPaneTitle = content.brand
      addView(scroll)
      // Leitor de tela começa no título (spec 03, 5.3).
      title.post {
        title.performAccessibilityAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS, null)
      }
    }
  }
}
