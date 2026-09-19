package expo.modules.labmonitoring

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.ParcelFileDescriptor
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import android.system.StructPollfd
import java.io.FileDescriptor
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Experimento A6: perceber o acesso a um dominio da lista sem bloquear a navegacao.
 *
 * E uma VPN local que so enxerga DNS. A interface recebe um unico destino, um
 * servidor de DNS falso (10.111.222.2) que o sistema passa a usar para todos os
 * apps. Cada consulta que chega e lida (so o nome), comparada com a lista e
 * repassada ao DNS da propria rede; a resposta volta pela mesma interface. O resto
 * do trafego nao tem rota na VPN e segue direto pela rede de verdade: o prototipo
 * nunca ve conteudo, URL nem pacote que nao seja consulta de DNS.
 *
 * O que o Android cobra de uma VPN, registrado para o relatorio (guia oficial de
 * VPN, consultado em 18/09/2026):
 * - consentimento do usuario numa caixa do sistema (VpnService.prepare);
 * - chave de VPN na barra de status enquanto ela existir;
 * - uma so VPN por usuario: ligar esta desliga qualquer outra (assunto do A8);
 * - notificacao permanente, e o tipo systemExempted no Android 14+.
 */
class LabVpnService : VpnService() {

  companion object {
    const val ACTION_START = "expo.modules.labmonitoring.VPN_START"
    const val ACTION_STOP = "expo.modules.labmonitoring.VPN_STOP"

    /** Interface e DNS falso numa faixa privada, longe das redes domesticas comuns. */
    private const val TUN_ADDRESS = "10.111.222.1"
    private const val FAKE_DNS = "10.111.222.2"

    private const val UPSTREAM_TIMEOUT_MS = 4_000
    private const val MAX_PACKET = 32_767

    /** Um alerta por item da lista a cada minuto: uma pagina gera varias consultas. */
    private const val ALERT_COOLDOWN_MS = 60_000L

    @Volatile var isRunning = false
      private set

    /** Contadores da sessao atual, para a tela do laboratorio e para o vpn_stopped. */
    val stats = Stats()
  }

  class Stats {
    val queries = AtomicInteger()
    val forwarded = AtomicInteger()
    val failed = AtomicInteger()
    val detected = AtomicInteger()
    val blocked = AtomicInteger()
    val suppressed = AtomicInteger()
    val otherPackets = AtomicInteger()
    /** A7: consultas a dominios de rede social, de qualquer app. */
    val social = AtomicInteger()
    private val upstreamMicros = AtomicLong()

    fun addLatency(micros: Long) {
      upstreamMicros.addAndGet(micros)
    }

    /** Media do tempo de ida e volta ao DNS da rede, em milissegundos. */
    fun averageMillis(): Double {
      val count = forwarded.get()
      return if (count == 0) 0.0 else upstreamMicros.get() / 1000.0 / count
    }

    fun reset() {
      listOf(queries, forwarded, failed, detected, blocked, suppressed, otherPackets, social)
        .forEach { it.set(0) }
      upstreamMicros.set(0)
    }

    fun summary(): String =
      "consultas: ${queries.get()} · repassadas: ${forwarded.get()} · " +
        "sem resposta: ${failed.get()} · na lista: ${detected.get()} " +
        "(alertas suprimidos: ${suppressed.get()}, bloqueadas: ${blocked.get()}) · " +
        "redes sociais: ${social.get()} · " +
        "outros pacotes descartados: ${otherPackets.get()} · " +
        "ida e volta media ao DNS da rede: ${"%.1f".format(averageMillis())} ms"

    fun toMap(): Map<String, Any> = mapOf(
      "queries" to queries.get(),
      "forwarded" to forwarded.get(),
      "failed" to failed.get(),
      "detected" to detected.get(),
      "blocked" to blocked.get(),
      "suppressed" to suppressed.get(),
      "otherPackets" to otherPackets.get(),
      "social" to social.get(),
      "averageUpstreamMs" to averageMillis()
    )
  }

  private var tun: ParcelFileDescriptor? = null
  private var output: FileOutputStream? = null
  private var reader: Thread? = null
  private var workers: ExecutorService? = null
  private var callback: ConnectivityManager.NetworkCallback? = null

  /** Ponta de escrita do pipe que acorda o poll() na hora de parar. */
  private var interruptWrite: FileDescriptor? = null

  @Volatile private var mode = DomainWatchConfig.MODE_ALERT
  @Volatile private var domains: List<String> = emptyList()

  /**
   * A7: a consulta de DNS nao diz qual app perguntou, e o proprio app do Instagram
   * consulta os mesmos dominios que o site. O que separa navegador de app e o app
   * em primeiro plano no momento da consulta (leitura do A1).
   */
  @Volatile private var socialDomains: List<String> = emptyList()
  @Volatile private var browsers: Set<String> = emptySet()
  private val lastSocial = HashMap<String, Long>()
  @Volatile private var foregroundAt = 0L
  @Volatile private var foregroundCached: String? = null

  /** A7: sessoes de rede social no navegador, para estimar o tempo de uso. */
  @Volatile private var tracker: BrowserSessionTracker? = null

  /** Rede de verdade (nao VPN) e os servidores de DNS dela, trocados a cada mudanca. */
  @Volatile private var upstreamNetwork: Network? = null
  @Volatile private var upstreamServers: List<InetAddress> = emptyList()

  private val lastAlert = HashMap<String, Long>()

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopVpn(reason = "laboratorio")
      return START_NOT_STICKY
    }
    startVpn(startedBy = if (intent?.action == ACTION_START) "laboratorio" else "sistema")
    return START_STICKY
  }

  private fun startVpn(startedBy: String) {
    if (!DomainWatchConfig.isActive(this)) {
      stopSelf()
      return
    }
    // Sem consentimento, o tipo systemExempted seria recusado com excecao. Por isso
    // a checagem vem antes de startForeground.
    if (prepare(this) != null) {
      EventLog.append(this, "LabVpnService", "A6", "vpn_not_authorized", "iniciada por: $startedBy")
      DomainWatchConfig.setActive(this, false)
      stopSelf()
      return
    }
    startForegroundCompat()

    // Reconfigurar com a VPN no ar: fecha a interface antiga antes de abrir a nova,
    // e registra os numeros da sessao que acabou.
    if (isRunning) {
      isRunning = false
      closeTunnel()
      EventLog.append(this, "LabVpnService", "A6", "vpn_stopped", "motivo: nova configuracao · ${stats.summary()}")
    }

    mode = DomainWatchConfig.mode(this)
    domains = DomainWatchConfig.domains(this)
    socialDomains = DomainWatchConfig.socialDomains(this)
    browsers = findBrowsers()
    tracker = BrowserSessionTracker(this, { browsers }, { currentForeground() })
    synchronized(lastAlert) { lastAlert.clear() }
    synchronized(lastSocial) { lastSocial.clear() }
    stats.reset()
    if (callback == null) registerUpstream()

    val builder = Builder()
      .setSession("Norte Lab")
      .addAddress(TUN_ADDRESS, 32)
      .addDnsServer(FAKE_DNS)
      .addRoute(FAKE_DNS, 32)
      // Sem isto, uma VPN que so declara IPv4 BLOQUEIA todo o IPv6 do aparelho
      // (referencia de VpnService.Builder.allowFamily).
      .allowFamily(OsConstants.AF_INET6)
    // VPN de app com targetSdk 29+ e "limitada" por padrao, e o Wi-Fi passaria a
    // parecer rede tarifada para todos os apps (setMetered).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) builder.setMetered(false)
    // O proprio prototipo fica fora da VPN: o repasse ao DNS da rede sai direto.
    runCatching { builder.addDisallowedApplication(packageName) }

    val established = runCatching { builder.establish() }
    val fd = established.getOrNull()
    if (fd == null) {
      EventLog.append(
        this, "LabVpnService", "A6", "vpn_failed",
        established.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
          ?: "establish() devolveu null: VPN nao autorizada ou revogada"
      )
      stopVpn(reason = "falha ao abrir a interface")
      return
    }

    tun = fd
    output = FileOutputStream(fd.fileDescriptor)
    workers = Executors.newFixedThreadPool(4)
    val pipe = Os.pipe()
    interruptWrite = pipe[1]
    reader = Thread({ readLoop(fd.fileDescriptor, pipe[0]) }, "lab-vpn-reader").also { it.start() }
    isRunning = true

    EventLog.append(
      this, "LabVpnService", "A6", "vpn_started",
      "modo: ${modeLabel()} · dominios: ${domains.joinToString(", ")} · " +
        "redes sociais: ${socialDomains.joinToString(", ")} · " +
        "navegadores: ${browsers.size} · iniciada por: $startedBy"
    )
  }

  /**
   * Le a interface ate o pipe de interrupcao fechar. A interface fica no modo nao
   * bloqueante (o padrao) e o poll() espera pelas duas pontas: fechar so a
   * interface nao acordaria uma leitura bloqueada.
   */
  private fun readLoop(tunFd: FileDescriptor, interruptRead: FileDescriptor) {
    val buffer = ByteArray(MAX_PACKET)
    val tunPoll = StructPollfd().apply { fd = tunFd; events = OsConstants.POLLIN.toShort() }
    val stopPoll = StructPollfd().apply { fd = interruptRead; events = OsConstants.POLLIN.toShort() }
    try {
      while (true) {
        try {
          Os.poll(arrayOf(tunPoll, stopPoll), -1)
        } catch (e: ErrnoException) {
          if (e.errno == OsConstants.EINTR) continue else throw e
        }
        if (stopPoll.revents.toInt() != 0) break
        if (tunPoll.revents.toInt() and OsConstants.POLLIN == 0) continue

        while (true) {
          val length = try {
            Os.read(tunFd, buffer, 0, buffer.size)
          } catch (e: ErrnoException) {
            if (e.errno == OsConstants.EAGAIN) 0 else throw e
          }
          if (length <= 0) break
          onPacket(buffer, length)
        }
      }
    } catch (e: Exception) {
      if (isRunning) {
        EventLog.append(this, "LabVpnService", "A6", "vpn_error", "${e.javaClass.simpleName}: ${e.message}")
      }
    } finally {
      runCatching { Os.close(interruptRead) }
    }
  }

  private fun onPacket(buffer: ByteArray, length: Int) {
    val query = DnsPacket.parse(buffer, length)
    if (query == null) {
      // Tudo o que nao e consulta UDP na porta 53, como a sondagem TCP do DNS
      // privado na porta 853. Descartar faz o sistema cair no DNS comum.
      stats.otherPackets.incrementAndGet()
      return
    }
    stats.queries.incrementAndGet()
    runCatching { workers?.execute { answer(query) } }
  }

  private fun answer(query: DnsPacket.Query) {
    val match = query.name?.let { DomainWatchConfig.match(it, domains) }
    val block = match != null && mode == DomainWatchConfig.MODE_BLOCK
    if (match != null) onMatch(query, match, block)

    // A7: rede social so e registrada; a consulta segue normalmente em qualquer modo.
    query.name?.let { DomainWatchConfig.match(it, socialDomains) }?.let { onSocial(query, it) }

    val reply = if (block) {
      stats.blocked.incrementAndGet()
      DnsPacket.nxdomain(query)
    } else {
      // Sem resposta, o sistema repete a consulta sozinho.
      forward(query.dns) ?: run { stats.failed.incrementAndGet(); return }
    }
    val packet = DnsPacket.response(query, reply)
    runCatching { synchronized(this) { output?.write(packet) } }
  }

  /** Repassa a consulta ao DNS da rede de verdade, fora da VPN. */
  private fun forward(dns: ByteArray): ByteArray? {
    val network = upstreamNetwork ?: return null
    for (server in upstreamServers.take(2)) {
      val result = runCatching {
        DatagramSocket().use { socket ->
          protect(socket)
          network.bindSocket(socket)
          socket.soTimeout = UPSTREAM_TIMEOUT_MS
          val started = System.nanoTime()
          socket.send(DatagramPacket(dns, dns.size, InetSocketAddress(server, 53)))
          val buffer = ByteArray(4096)
          val packet = DatagramPacket(buffer, buffer.size)
          socket.receive(packet)
          stats.addLatency((System.nanoTime() - started) / 1000)
          buffer.copyOf(packet.length)
        }
      }.getOrNull()
      // A resposta tem de ter o mesmo identificador da pergunta.
      if (result != null && result.size >= 2 && result[0] == dns[0] && result[1] == dns[1]) {
        stats.forwarded.incrementAndGet()
        return result
      }
    }
    return null
  }

  private fun onMatch(query: DnsPacket.Query, match: String, block: Boolean) {
    stats.detected.incrementAndGet()
    val now = System.currentTimeMillis()
    synchronized(lastAlert) {
      if (now - (lastAlert[match] ?: 0L) < ALERT_COOLDOWN_MS) {
        stats.suppressed.incrementAndGet()
        return
      }
      lastAlert[match] = now
    }

    // Privacidade: so o dominio. A consulta de DNS nao carrega URL nem conteudo.
    EventLog.append(
      this, "LabVpnService", "A6", "adult_domain_detected",
      "dominio: $match · consulta: ${query.name} (${typeName(query.type)}) · " +
        "modo: ${if (block) "bloqueio" else "alerta"}"
    )
    val sent = runCatching { Notifier.sendDomainAlert(this) }
    EventLog.append(
      this, "LabVpnService", "A6",
      if (sent.isSuccess) "notification_sent" else "notification_failed",
      sent.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
    )
  }

  /**
   * A7: registra a consulta a um dominio de rede social e quem estava na tela. Um
   * registro por dominio e por app em primeiro plano a cada minuto: o app do
   * Instagram consulta esses dominios o tempo todo.
   */
  private fun onSocial(query: DnsPacket.Query, match: String) {
    stats.social.incrementAndGet()
    val now = System.currentTimeMillis()
    val foreground = currentForeground()
    // Toda consulta entra na estimativa de tempo; o registro abaixo e que e espacado.
    tracker?.onQuery(match, now, foreground)

    val key = "$match|$foreground"
    synchronized(lastSocial) {
      if (now - (lastSocial[key] ?: 0L) < ALERT_COOLDOWN_MS) return
      lastSocial[key] = now
    }

    val via = when {
      foreground == null -> "desconhecido"
      foreground in browsers -> "navegador"
      else -> "outro app"
    }
    EventLog.append(
      this, "LabVpnService", "A7", "social_domain_detected",
      "dominio: $match · consulta: ${query.name} (${typeName(query.type)}) · " +
        "via: $via · em primeiro plano: ${foreground ?: "desconhecido"}"
    )
  }

  /**
   * App em primeiro plano, lido no maximo a cada 2 s: a leitura percorre eventos de
   * uso (A1) e uma pagina dispara dezenas de consultas quase juntas.
   */
  private fun currentForeground(): String? {
    val now = System.currentTimeMillis()
    if (now - foregroundAt < 2_000L) return foregroundCached
    val fresh = runCatching { UsageReader.currentForegroundPackage(this) }.getOrNull()
    foregroundCached = fresh
    foregroundAt = now
    return fresh
  }

  /**
   * Apps que abrem links https: e a definicao pratica de navegador. A consulta
   * funciona porque o manifesto do app declara essa intencao em <queries> (vem do
   * template do Expo).
   */
  private fun findBrowsers(): Set<String> {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"))
      .addCategory(Intent.CATEGORY_BROWSABLE)
    val resolved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(
        intent,
        PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_ALL.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, PackageManager.MATCH_ALL)
    }
    return resolved.mapNotNull { it.activityInfo?.packageName }.toSet()
  }

  /**
   * Acompanha a melhor rede de verdade (nao VPN) e os servidores de DNS dela. E
   * isto que mantem o repasse funcionando quando o aparelho troca de Wi-Fi para
   * dados moveis: o servidor do roteador de casa deixa de responder na rua.
   */
  private fun registerUpstream() {
    val manager = getSystemService(ConnectivityManager::class.java) ?: return
    val request = NetworkRequest.Builder()
      .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
      .build()

    val networkCallback = object : ConnectivityManager.NetworkCallback() {
      override fun onLinkPropertiesChanged(network: Network, properties: LinkProperties) {
        val servers = properties.dnsServers
        if (network == upstreamNetwork && servers == upstreamServers) return
        upstreamNetwork = network
        upstreamServers = servers
        val transport = manager.getNetworkCapabilities(network)?.let {
          when {
            it.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            it.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "dados moveis"
            else -> "outra"
          }
        } ?: "desconhecida"
        EventLog.append(
          this@LabVpnService, "LabVpnService", "A6", "upstream_changed",
          "rede: $transport · ${servers.size} servidor(es) de DNS: " +
            servers.joinToString(", ") { it.hostAddress ?: "?" }
        )
      }

      override fun onLost(network: Network) {
        if (network != upstreamNetwork) return
        upstreamNetwork = null
        upstreamServers = emptyList()
        EventLog.append(this@LabVpnService, "LabVpnService", "A6", "upstream_lost")
      }
    }

    val handler = Handler(mainLooper)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      manager.registerBestMatchingNetworkCallback(request, networkCallback, handler)
    } else {
      manager.registerNetworkCallback(request, networkCallback, handler)
    }
    callback = networkCallback
  }

  private fun unregisterUpstream() {
    val current = callback ?: return
    runCatching { getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(current) }
    callback = null
    upstreamNetwork = null
    upstreamServers = emptyList()
  }

  private fun closeTunnel() {
    tracker?.stop()
    tracker = null
    interruptWrite?.let { runCatching { Os.close(it) } }
    interruptWrite = null
    runCatching { reader?.join(1_000) }
    reader = null
    workers?.shutdownNow()
    workers = null
    runCatching { output?.close() }
    output = null
    runCatching { tun?.close() }
    tun = null
  }

  private fun stopVpn(reason: String) {
    val wasRunning = isRunning
    isRunning = false
    DomainWatchConfig.setActive(this, false)
    closeTunnel()
    unregisterUpstream()
    if (wasRunning) {
      EventLog.append(this, "LabVpnService", "A6", "vpn_stopped", "motivo: $reason · ${stats.summary()}")
    }
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  /**
   * O usuario desligou a VPN nos Ajustes, ou outra VPN tomou o lugar desta. Pode
   * chegar fora da thread principal (guia oficial).
   */
  override fun onRevoke() {
    EventLog.append(this, "LabVpnService", "A6", "vpn_revoked")
    stopVpn(reason = "revogada pelo sistema")
    super.onRevoke()
  }

  override fun onDestroy() {
    if (isRunning) stopVpn(reason = "servico destruido")
    super.onDestroy()
  }

  private fun startForegroundCompat() {
    val notification = Notifier.vpnNotification(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        Notifier.VPN_NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED
      )
    } else {
      startForeground(Notifier.VPN_NOTIFICATION_ID, notification)
    }
  }

  private fun modeLabel() = if (mode == DomainWatchConfig.MODE_BLOCK) "bloqueio" else "alerta"

  private fun typeName(type: Int) = when (type) {
    1 -> "A"
    5 -> "CNAME"
    28 -> "AAAA"
    65 -> "HTTPS"
    else -> "tipo $type"
  }
}
