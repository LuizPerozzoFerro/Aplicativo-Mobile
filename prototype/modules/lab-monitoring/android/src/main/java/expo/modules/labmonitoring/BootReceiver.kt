package expo.modules.labmonitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Experimento A9: fazer o monitoramento voltar sozinho depois de reiniciar o
 * aparelho, sem o usuario precisar abrir o app.
 *
 * O Android 15 proibiu que receptores de BOOT_COMPLETED iniciem alguns tipos de
 * servico em primeiro plano: dataSync, camera, mediaPlayback, phoneCall,
 * mediaProjection e microphone. Verificado na documentacao oficial em
 * 17/09/2026: **specialUse nao esta na lista**, entao o nosso caso e permitido.
 *
 * Limitacao conhecida: em aparelhos com bloqueio de tela, o BOOT_COMPLETED so e
 * enviado depois do primeiro desbloqueio -- antes disso o armazenamento do app
 * nem esta acessivel. Ou seja, entre ligar o aparelho e desbloquear, o
 * monitoramento fica parado. Isso precisa constar no relatorio: nao ha como
 * evitar sem tornar o app "direct boot aware", o que traz outras complicacoes.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) {
      return
    }

    if (!LimitConfig.isActive(context)) {
      EventLog.append(
        context = context,
        source = "BootReceiver",
        experiment = "A9",
        event = "boot_received",
        details = "monitoramento estava inativo; nada a religar"
      )
      return
    }

    val service = Intent(context, UsageLimitService::class.java)
    val started = runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(service)
      } else {
        context.startService(service)
      }
    }

    EventLog.append(
      context = context,
      source = "BootReceiver",
      experiment = "A9",
      event = if (started.isSuccess) "service_restarted" else "service_restart_failed",
      details = buildString {
        append("acao: ")
        append(action.substringAfterLast('.'))
        started.exceptionOrNull()?.let { append(" · erro: ${it.javaClass.simpleName}: ${it.message}") }
      }
    )
  }
}
