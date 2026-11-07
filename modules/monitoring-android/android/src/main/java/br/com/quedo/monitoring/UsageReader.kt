package br.com.quedo.monitoring

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build

/**
 * Leitura do uso e da lista de apps. A conta fica em `UsageTimeline`, que é
 * pura e testada; aqui só a conversa com o `UsageStatsManager` e o
 * `PackageManager`.
 */
object UsageReader {

  /**
   * Quanto antes da meia-noite começar a ler: um app aberto antes dela e
   * ainda na tela só aparece pelo seu RESUMED. A tela apagada fecha tudo,
   * então 24 horas cobrem qualquer sessão real (A4 do protótipo).
   */
  private const val LOOKBACK_MS = 24 * 60 * 60_000L

  fun readToday(context: Context, now: Long = System.currentTimeMillis()): UsageTimeline.Result {
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return UsageTimeline.Result(emptyMap(), null)
    val dayStart = DayBoundary.startOfDay(now)
    val events = readEvents(manager, dayStart - LOOKBACK_MS, now)
    return UsageTimeline.compute(events, dayStart, now, launcherPackages(context))
  }

  private fun readEvents(manager: UsageStatsManager, from: Long, to: Long): List<UsageTimeline.Event> {
    val result = ArrayList<UsageTimeline.Event>()
    val events = manager.queryEvents(from, to) ?: return result
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val kind = when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> UsageTimeline.Kind.RESUMED
        UsageEvents.Event.ACTIVITY_PAUSED -> UsageTimeline.Kind.PAUSED
        UsageEvents.Event.ACTIVITY_STOPPED -> UsageTimeline.Kind.STOPPED
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> UsageTimeline.Kind.SCREEN_OFF
        else -> null
      } ?: continue
      result.add(UsageTimeline.Event(kind, event.timeStamp, event.packageName, event.className))
    }
    return result
  }

  /** Telas iniciais instaladas (I-8). Depende do `<queries>` HOME do manifesto. */
  fun launcherPackages(context: Context): Set<String> =
    Launchers.select(
      query(context, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
        .mapNotNull { info -> info.activityInfo?.packageName?.let { Launchers.Candidate(it, info.priority) } }
    )

  /**
   * Apps com ícone na gaveta, para o usuário escolher. `<queries>`
   * MAIN/LAUNCHER, nunca `QUERY_ALL_PACKAGES` (spec 03, seção 5.1). O próprio
   * app fica fora.
   */
  fun listLaunchableApps(context: Context): List<Map<String, Any?>> =
    resolve(context, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER))
      .filter { it != context.packageName }
      .map { packageName -> mapOf("id" to packageName, "label" to appLabel(context, packageName)) }
      .sortedBy { (it["label"] as String).lowercase() }

  private fun resolve(context: Context, intent: Intent): List<String> =
    query(context, intent).mapNotNull { it.activityInfo?.packageName }.distinct()

  private fun query(context: Context, intent: Intent): List<ResolveInfo> {
    val packageManager = context.packageManager
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }
  }

  private fun appLabel(context: Context, packageName: String): String {
    val packageManager = context.packageManager
    return runCatching {
      val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0L))
      } else {
        @Suppress("DEPRECATION")
        packageManager.getApplicationInfo(packageName, 0)
      }
      packageManager.getApplicationLabel(info).toString()
    }.getOrDefault(packageName)
  }
}
