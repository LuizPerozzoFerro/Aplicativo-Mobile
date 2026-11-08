package br.com.quedo.monitoring

import java.io.File
import java.nio.file.Files
import org.json.JSONArray
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EventLogTest {
  private lateinit var dir: File
  private lateinit var file: File

  @Before
  fun setUp() {
    dir = Files.createTempDirectory("quedo-events").toFile()
    file = File(dir, "events.jsonl")
  }

  @After
  fun tearDown() {
    dir.deleteRecursively()
  }

  private fun pending(log: EventLog): JSONArray = JSONArray(log.pendingJson())

  @Test
  fun appendsWithUniqueIdAndTheFieldsOfTheEvent() {
    val log = EventLog(file)
    val first = log.append("service_started", 1000L, "2026-11-07", mapOf("origin" to "boot"))
    val second = log.append("limit_reached", 2000L, "2026-11-07", mapOf("compulsionId" to 2, "targetId" to null))
    assertNotEquals(first, second)

    val events = pending(log)
    assertEquals(2, events.length())
    val a = events.getJSONObject(0)
    assertEquals(first, a.getString("id"))
    assertEquals(1000L, a.getLong("at"))
    assertEquals("2026-11-07", a.getString("dayKey"))
    assertEquals("service_started", a.getString("type"))
    assertEquals("boot", a.getString("origin"))
    val b = events.getJSONObject(1)
    assertEquals(2, b.getInt("compulsionId"))
    assertTrue(b.isNull("targetId"))
  }

  @Test
  fun acknowledgeRemovesOnlyTheConfirmedOnes() {
    val log = EventLog(file)
    val a = log.append("service_started", 1L, "2026-11-07", mapOf("origin" to "app"))
    val b = log.append("service_started", 2L, "2026-11-07", mapOf("origin" to "boot"))
    val c = log.append("service_started", 3L, "2026-11-07", mapOf("origin" to "restart"))
    log.acknowledge(listOf(a, c, "desconhecido"))

    val events = pending(log)
    assertEquals(1, events.length())
    assertEquals(b, events.getJSONObject(0).getString("id"))
  }

  @Test
  fun survivesANewInstanceOverTheSameFile() {
    // O processo morre e volta: a fila continua no disco (I-31).
    val id = EventLog(file).append("service_started", 1L, "2026-11-07", mapOf("origin" to "app"))
    val reopened = EventLog(file)
    assertEquals(id, pending(reopened).getJSONObject(0).getString("id"))
    assertEquals(1, reopened.count())
  }

  @Test
  fun aboveTheCeilingTheOldestLeave() {
    val log = EventLog(file, maxEvents = 3)
    val ids = (1..5).map { log.append("service_started", it.toLong(), "2026-11-07", mapOf("origin" to "app")) }
    val kept = pending(log)
    assertEquals(3, kept.length())
    assertEquals(ids.takeLast(3), (0 until 3).map { kept.getJSONObject(it).getString("id") })
  }

  @Test
  fun unreadableLinesAreSkippedAndDroppedOnTheNextAcknowledge() {
    val log = EventLog(file)
    val id = log.append("service_started", 1L, "2026-11-07", mapOf("origin" to "app"))
    file.appendText("{meia linha\n")
    file.appendText("{\"type\":\"sem_id\"}\n")
    assertEquals(1, pending(log).length())

    log.acknowledge(emptyList())
    assertEquals(1, file.readLines().count { it.isNotBlank() })
    assertEquals(id, pending(log).getJSONObject(0).getString("id"))
  }

  @Test
  fun clearDeletesEverything() {
    val log = EventLog(file)
    log.append("service_started", 1L, "2026-11-07", mapOf("origin" to "app"))
    log.clear()
    assertEquals(0, pending(log).length())
    assertEquals(0, log.count())
  }
}
