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
   * Limitacao confirmada em 17/09/2026 no Galaxy S22: os valores chegam com
   * atraso de varios minutos. Duas leituras as 12:03 e as 12:06 devolveram
   * exatamente os mesmos numeros, com o app sendo usado no intervalo; as 12:14 ja
   * haviam mudado. Serve para exibir um total do dia, mas nao para decidir "o
   * usuario acabou de passar do limite" -- para isso, ver
   * getUsageTodayFromEvents.
   *
   * O que este metodo faz com o tempo de tela apagada ainda NAO foi medido.
   * Chegamos a concluir que ele contava, mas a conclusao vinha de um teste mal
   * controlado e foi retirada; ver "Achado A1" em NOTAS.md.
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

    // Intervalos abertos, indexados por pacote|classe.
    val openedAt = HashMap<String, Long>()
    val ownerOf = HashMap<String, String>()

    // Quantos ACTIVITY_STOPPED ainda sao esperados para uma chave por conta de um
    // ACTIVITY_PAUSED ja processado. E o que resolve a ambiguidade descrita abaixo.
    val pendingStops = HashMap<String, Int>()

    fun close(key: String, at: Long) {
      val from = openedAt.remove(key) ?: return
      val packageName = ownerOf.remove(key) ?: return
      if (at > from) {
        totals[packageName] = (totals[packageName] ?: 0L) + (at - from)
      }
    }

    val events = manager.queryEvents(start, end)
    val event = UsageEvents.Event()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName ?: continue
      val key = "$packageName|${event.className.orEmpty()}"

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          openedAt[key] = event.timeStamp
          ownerOf[key] = packageName
        }

        UsageEvents.Event.ACTIVITY_PAUSED -> {
          close(key, event.timeStamp)
          // O STOPPED correspondente vira depois, as vezes ja com outra instancia
          // em primeiro plano. Anotamos para nao deixa-lo fechar o intervalo errado.
          pendingStops[key] = (pendingStops[key] ?: 0) + 1
        }

        UsageEvents.Event.ACTIVITY_STOPPED -> {
          val pending = pendingStops[key] ?: 0
          if (pending > 0) {
            // Este STOPPED e o par de um PAUSED ja contabilizado. Ignorar.
            pendingStops[key] = pending - 1
          } else {
            // STOPPED sem PAUSED antes: o app foi morto (numa reinstalacao, por
            // exemplo). Aqui ele e o unico sinal de que o uso terminou.
            close(key, event.timeStamp)
          }
        }

        // Rede de seguranca: tela apagando fecha tudo. No S22 o ACTIVITY_PAUSED ja
        // chega no mesmo segundo do desligamento da tela, entao na pratica isto
        // nao muda o resultado -- mas nem todo fabricante se comporta assim, e
        // contar tela apagada como uso seria o pior erro possivel neste produto.
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
          openedAt.keys.toList().forEach { openKey -> close(openKey, event.timeStamp) }
        }
      }
    }

    // Quem ainda esta em primeiro plano nao tem evento de saida: conta ate agora.
    openedAt.forEach { (key, from) ->
      val packageName = ownerOf[key]
      if (packageName != null && end > from) {
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
   * Qual app esta em primeiro plano agora, ou null.
   *
   * Usado pelo A4 para decidir se vale interromper: so faz sentido mostrar a tela
   * se o usuario ainda estiver no app monitorado. Aplica a mesma regra de
   * pendencia de STOPPED descrita no achado A1.
   */
  fun currentForegroundPackage(context: Context): String? {
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return null

    val end = System.currentTimeMillis()
    val events = manager.queryEvents(end - 5 * 60_000L, end)
    val event = UsageEvents.Event()

    val openedAt = HashMap<String, Long>()
    val ownerOf = HashMap<String, String>()
    val pendingStops = HashMap<String, Int>()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName ?: continue
      val key = "$packageName|${event.className.orEmpty()}"

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          openedAt[key] = event.timeStamp
          ownerOf[key] = packageName
        }
        UsageEvents.Event.ACTIVITY_PAUSED -> {
          openedAt.remove(key); ownerOf.remove(key)
          pendingStops[key] = (pendingStops[key] ?: 0) + 1
        }
        UsageEvents.Event.ACTIVITY_STOPPED -> {
          val pending = pendingStops[key] ?: 0
          if (pending > 0) {
            pendingStops[key] = pending - 1
          } else {
            openedAt.remove(key); ownerOf.remove(key)
          }
        }
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
          openedAt.clear(); ownerOf.clear()
        }
      }
    }

    // Se sobrar mais de um intervalo aberto, o mais recente e o que esta na tela.
    val latest = openedAt.maxByOrNull { it.value }?.key ?: return null
    return ownerOf[latest]
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
