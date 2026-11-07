package br.com.quedo.monitoring

import br.com.quedo.monitoring.Launchers.Candidate
import org.junit.Assert.assertEquals
import org.junit.Test

class LaunchersTest {
  @Test
  fun fallbackHomeOfSettingsIsNotALauncher() {
    // O que o S22 devolve para MAIN/HOME (07/11/2026).
    val result = Launchers.select(
      listOf(
        Candidate("com.sec.android.app.launcher", 0),
        Candidate("com.android.settings", -1000),
      )
    )
    assertEquals(setOf("com.sec.android.app.launcher"), result)
  }

  @Test
  fun everyRealLauncherCounts() {
    val result = Launchers.select(
      listOf(
        Candidate("com.example.launcher.one", 0),
        Candidate("com.example.launcher.two", 0),
      )
    )
    assertEquals(setOf("com.example.launcher.one", "com.example.launcher.two"), result)
  }
}
