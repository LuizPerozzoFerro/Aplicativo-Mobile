package br.com.quedo.monitoring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Religa o monitoramento depois de reiniciar o aparelho ou de atualizar o app,
 * sem o usuário precisar abri-lo (spec 03, seção 5.1; A9 do protótipo).
 *
 * Os dois eventos estão entre as exceções que deixam iniciar um serviço em
 * primeiro plano a partir do segundo plano, e o `specialUse` não está entre os
 * tipos que o Android 15 proibiu de iniciar no `BOOT_COMPLETED` (documentação
 * oficial conferida em 07/11/2026).
 *
 * Janela cega aceita: o `BOOT_COMPLETED` só chega depois do primeiro
 * desbloqueio, ~2,5 min depois de ligar (A9). Já é avisada no onboarding.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) {
      return
    }
    val now = System.currentTimeMillis()
    val result = when {
      !MonitoringState.isActive(context) -> MonitoringState.BootResult.INACTIVE
      // Sem acesso ao uso o serviço não tem o que fazer. A vigilância das
      // permissões (passo 7) avisa o usuário.
      !Permissions.hasUsageAccess(context) -> MonitoringState.BootResult.NO_USAGE_ACCESS
      runCatching {
        val origin = if (action == Intent.ACTION_BOOT_COMPLETED) {
          MonitoringService.Origin.BOOT
        } else {
          MonitoringService.Origin.UPDATE
        }
        MonitoringService.start(context, origin)
      }.isSuccess ->
        MonitoringState.BootResult.STARTED
      else -> MonitoringState.BootResult.FAILED
    }
    MonitoringState.recordBoot(context, now, result)
  }
}
