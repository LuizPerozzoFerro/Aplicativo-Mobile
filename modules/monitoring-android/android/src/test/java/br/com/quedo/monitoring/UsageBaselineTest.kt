package br.com.quedo.monitoring

import org.junit.Assert.assertEquals
import org.junit.Test

class UsageBaselineTest {
  private val day = "2026-11-08"

  @Test
  fun `desconta o que já estava contado`() {
    assertEquals(
      mapOf("a" to 30_000L, "b" to 5_000L),
      UsageBaseline.subtract(mapOf("a" to 90_000L, "b" to 5_000L), mapOf("a" to 60_000L)),
    )
  }

  @Test
  fun `nunca fica negativo`() {
    assertEquals(mapOf("a" to 0L), UsageBaseline.subtract(mapOf("a" to 10L), mapOf("a" to 60L)))
  }

  @Test
  fun `vale no mesmo dia`() {
    val json = UsageBaseline.toJson(day, mapOf("a" to 60_000L)).toString()
    assertEquals(mapOf("a" to 60_000L), UsageBaseline.forDay(json, day))
  }

  @Test
  fun `no dia seguinte não vale mais`() {
    val json = UsageBaseline.toJson(day, mapOf("a" to 60_000L)).toString()
    assertEquals(emptyMap<String, Long>(), UsageBaseline.forDay(json, "2026-11-09"))
  }

  @Test
  fun `sem nada gravado ou com lixo, não desconta`() {
    assertEquals(emptyMap<String, Long>(), UsageBaseline.forDay(null, day))
    assertEquals(emptyMap<String, Long>(), UsageBaseline.forDay("{", day))
  }
}
