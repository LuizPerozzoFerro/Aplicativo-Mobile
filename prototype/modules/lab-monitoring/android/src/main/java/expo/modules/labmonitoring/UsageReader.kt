package expo.modules.labmonitoring

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import java.util.Calendar

/**
 * Experimento A1: leitura do tempo de uso por app no Android.
 *
 * Toda a conversa com o UsageStatsManager e com o PackageManager fica aqui, para
 * o modulo Expo continuar sendo so a fachada exposta ao JavaScript.
 */
object UsageReader {

  /**
   * O acesso a dados de uso nao passa por requestPermissions: nao existe pop-up.
   * O jeito de descobrir se ele foi concedido e consultar o AppOpsManager.
   */
  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      ?: return false

    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    }

    // MODE_DEFAULT significa "o AppOps nao decidiu": nesse caso vale a permissao
    // declarada no manifesto. Sem este ramo o app reporta "negado" em aparelhos
    // onde o acesso na verdade existe.
    return if (mode == AppOpsManager.MODE_DEFAULT) {
      context.checkCallingOrSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    } else {
      mode == AppOpsManager.MODE_ALLOWED
    }
  }

  /** Qual variante do intent conseguiu abrir a tela de Ajustes. */
  enum class SettingsRoute { TARGETED, GENERIC, UNAVAILABLE }

  /**
   * Abre a tela de Ajustes onde o acesso e concedido.
   *
   * Tentamos primeiro apontar direto para o nosso app. Esse extra nao e
   * documentado: varios fabricantes o ignoram, e ha relatos de aparelhos em que a
   * tela abre em branco em vez de lancar excecao -- ou seja, o fallback nao seria
   * acionado. Por isso devolvemos qual rota foi usada e registramos no log.
   *
   * Verificado em 17/09/2026 no Galaxy S22 (One UI 8): a rota direcionada
   * funciona e leva direto a tela do proprio app, sem lista para percorrer.
   */
  fun openUsageAccessSettings(context: Context): SettingsRoute {
    val targeted = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      data = Uri.fromParts("package", context.packageName, null)
    }

    if (runCatching { context.startActivity(targeted) }.isSuccess) {
      return SettingsRoute.TARGETED
    }

    val generic = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    return try {
      context.startActivity(generic)
      SettingsRoute.GENERIC
    } catch (error: ActivityNotFoundException) {
      SettingsRoute.UNAVAILABLE
    }
  }

  /**
   * Minutos de uso de hoje, por app, pelo caminho agregado.
   *
   * NAO USAR PARA MEDIR USO REAL. Mantido apenas como termo de comparacao do
   * experimento A1 e como evidencia para o relatorio.
   *
   * Medido em 17/09/2026 no Galaxy S22: com o aparelho bloqueado por 67 minutos e
   * este app em primeiro plano, o totalTimeInForeground foi de 5 min para 1 h 09,
   * enquanto a reconstrucao por eventos foi de 5 para 6 minutos. Ou seja, ele
   * conta o tempo de tela apagada. Um limite diario baseado nele dispararia
   * alerta para quem so deixou o celular na mesa.
   *
   * Some-se a isso o atraso: os valores agregados demoram varios minutos para
   * refletir o uso recente. Para medir uso e para detectar limite, usar
   * getUsageTodayFromEvents.
   */
  fun getUsageToday(context: Context): List<Map<String, Any?>> {
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return emptyList()

    val start = startOfToday()
    val end = System.currentTimeMillis()

    val aggregated = manager.queryAndAggregateUsageStats(start, end)

    return aggregated.values
      .filter { it.totalTimeInForeground > 0 }
      .sortedByDescending { it.totalTimeInForeground }
      .map { stats ->
        mapOf(
          "packageName" to stats.packageName,
          "appLabel" to appLabel(context, stats.packageName),
          "milliseconds" to stats.totalTimeInForeground,
          "minutes" to (stats.totalTimeInForeground / 60_000.0),
          "lastTimeUsed" to stats.lastTimeUsed
        )
      }
  }

  /**
   * Mesma pergunta do getUsageToday, por outro caminho: reconstruir o tempo de
   * uso a partir do fluxo bruto de eventos, somando cada intervalo entre o app
   * entrar e sair do primeiro plano.
   *
   * Existe porque em 17/09/2026, no S22, o queryAndAggregateUsageStats devolveu
   * numeros congelados: duas leituras com tres minutos de diferenca deram
   * exatamente o mesmo valor, mesmo com o app medido em primeiro plano nesse
   * intervalo. Aqueles baldes agregados sao gravados em disco de tempos em
   * tempos, e nao servem para decidir "o usuario acabou de passar do limite".
   *
   * queryEvents le os eventos individuais, entao enxerga o que acabou de
   * acontecer. Custa mais processamento, porque percorre todos os eventos do dia.
   */
  fun getUsageTodayFromEvents(context: Context): List<Map<String, Any?>> {
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return emptyList()

    val start = startOfToday()
    val end = System.currentTimeMillis()

    val totals = HashMap<String, Long>()
    val openedAt = HashMap<String, Long>()

    val events = manager.queryEvents(start, end)
    val event = UsageEvents.Event()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName ?: continue

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          openedAt[packageName] = event.timeStamp
        }

        // ACTIVITY_STOPPED entra junto porque nem toda saida de primeiro plano
        // emite ACTIVITY_PAUSED -- bloquear a tela, por exemplo.
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED -> {
          val from = openedAt.remove(packageName)
          if (from != null && event.timeStamp > from) {
            totals[packageName] = (totals[packageName] ?: 0L) + (event.timeStamp - from)
          }
        }
      }
    }

    // Quem ainda esta em primeiro plano nao tem evento de saida: conta ate agora.
    openedAt.forEach { (packageName, from) ->
      if (end > from) {
        totals[packageName] = (totals[packageName] ?: 0L) + (end - from)
      }
    }

    return totals
      .filterValues { it > 0L }
      .entries
      .sortedByDescending { it.value }
      .map { (packageName, milliseconds) ->
        mapOf(
          "packageName" to packageName,
          "appLabel" to appLabel(context, packageName),
          "milliseconds" to milliseconds,
          "minutes" to (milliseconds / 60_000.0),
          "lastTimeUsed" to 0L
        )
      }
  }

  /**
   * Apps com icone na gaveta, para o usuario escolher o que monitorar.
   * Depende da declaracao <queries> no manifesto do modulo.
   */
  fun listLaunchableApps(context: Context): List<Map<String, Any?>> {
    val packageManager = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

    val resolved: List<ResolveInfo> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(
        intent,
        PackageManager.ResolveInfoFlags.of(0L)
      )
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }

    return resolved
      .mapNotNull { it.activityInfo?.packageName }
      .distinct()
      .map { packageName ->
        mapOf(
          "packageName" to packageName,
          "appLabel" to appLabel(context, packageName)
        )
      }
      .sortedBy { (it["appLabel"] as String).lowercase() }
  }

  private fun appLabel(context: Context, packageName: String): String {
    val packageManager = context.packageManager
    return runCatching {
      val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.getApplicationInfo(
          packageName,
          PackageManager.ApplicationInfoFlags.of(0L)
        )
      } else {
        @Suppress("DEPRECATION")
        packageManager.getApplicationInfo(packageName, 0)
      }
      packageManager.getApplicationLabel(info).toString()
    }.getOrDefault(packageName)
  }

  private fun startOfToday(): Long {
    val calendar = Calendar.getInstance().apply {
      timeInMillis = System.currentTimeMillis()
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    return calendar.timeInMillis
  }
}
