package expo.modules.labmonitoring

/**
 * O minimo de IPv4, UDP e DNS para o experimento A6, escrito a mao para nao trazer
 * biblioteca (CLAUDE.md secao 8.2).
 *
 * A VPN do A6 so recebe pacotes enderecados ao servidor de DNS falso: consultas
 * UDP na porta 53. Daqui sai o nome consultado e, na volta, o pacote de resposta
 * que o sistema espera ler da interface.
 */
object DnsPacket {

  private const val PROTOCOL_UDP = 17
  private const val DNS_PORT = 53
  private const val IPV4_HEADER = 20
  private const val UDP_HEADER = 8
  private const val DNS_HEADER = 12

  /** Uma consulta de DNS tirada de um pacote IPv4/UDP. */
  class Query(
    val source: ByteArray,
    val destination: ByteArray,
    val sourcePort: Int,
    val destinationPort: Int,
    /** A mensagem DNS inteira, como o sistema mandou. */
    val dns: ByteArray,
    /** Nome consultado, em minusculas e sem o ponto final; null se ilegivel. */
    val name: String?,
    val type: Int,
    /** Onde termina a pergunta dentro de [dns]; usado para montar o NXDOMAIN. */
    val questionEnd: Int
  )

  /**
   * Devolve a consulta, ou null se o pacote nao for IPv4/UDP para a porta 53. O
   * que chega de outro tipo (por exemplo, a sondagem TCP do DNS privado na porta
   * 853) e contado e descartado por quem chama.
   */
  fun parse(packet: ByteArray, length: Int): Query? {
    if (length < IPV4_HEADER + UDP_HEADER + DNS_HEADER) return null
    val version = (packet[0].toInt() shr 4) and 0x0F
    if (version != 4) return null
    val ipHeader = (packet[0].toInt() and 0x0F) * 4
    if (ipHeader < IPV4_HEADER || length < ipHeader + UDP_HEADER) return null
    if ((packet[9].toInt() and 0xFF) != PROTOCOL_UDP) return null

    val source = packet.copyOfRange(12, 16)
    val destination = packet.copyOfRange(16, 20)
    val sourcePort = u16(packet, ipHeader)
    val destinationPort = u16(packet, ipHeader + 2)
    if (destinationPort != DNS_PORT) return null

    val udpLength = u16(packet, ipHeader + 4)
    val dnsLength = minOf(udpLength - UDP_HEADER, length - ipHeader - UDP_HEADER)
    if (dnsLength < DNS_HEADER) return null
    val dns = packet.copyOfRange(ipHeader + UDP_HEADER, ipHeader + UDP_HEADER + dnsLength)

    val question = if (u16(dns, 4) == 1) readQuestion(dns) else null
    return Query(
      source = source,
      destination = destination,
      sourcePort = sourcePort,
      destinationPort = destinationPort,
      dns = dns,
      name = question?.first,
      type = question?.second ?: 0,
      questionEnd = question?.third ?: dns.size
    )
  }

  /** Nome, tipo e fim da primeira pergunta. Perguntas nao usam compressao. */
  private fun readQuestion(dns: ByteArray): Triple<String, Int, Int>? {
    val labels = mutableListOf<String>()
    var offset = DNS_HEADER
    var total = 0
    while (true) {
      if (offset >= dns.size) return null
      val size = dns[offset].toInt() and 0xFF
      if (size == 0) { offset++; break }
      if (size > 63) return null // ponteiro de compressao ou lixo
      if (offset + 1 + size > dns.size) return null
      total += size + 1
      if (total > 255) return null
      labels += String(dns, offset + 1, size, Charsets.US_ASCII).lowercase()
      offset += 1 + size
    }
    if (offset + 4 > dns.size) return null
    val type = u16(dns, offset)
    return Triple(labels.joinToString("."), type, offset + 4)
  }

  /**
   * Resposta "dominio inexistente" (RCODE 3) para o modo bloqueio: o cabecalho e a
   * pergunta da consulta, sem nenhum registro.
   */
  fun nxdomain(query: Query): ByteArray {
    val out = query.dns.copyOfRange(0, query.questionEnd)
    val flags = u16(query.dns, 2)
    val opcodeAndRd = flags and 0x7900 // opcode e "recursao desejada", como vieram
    val responseFlags = 0x8000 or opcodeAndRd or 0x0080 or 0x0003 // QR, RA, NXDOMAIN
    put16(out, 2, responseFlags)
    put16(out, 6, 0) // respostas
    put16(out, 8, 0) // autoridade
    put16(out, 10, 0) // adicionais
    return out
  }

  /**
   * Embrulha a resposta DNS num pacote IPv4/UDP de volta para quem perguntou:
   * enderecos e portas trocados, com as duas somas de verificacao calculadas.
   */
  fun response(query: Query, dns: ByteArray): ByteArray {
    val total = IPV4_HEADER + UDP_HEADER + dns.size
    val out = ByteArray(total)

    out[0] = 0x45 // IPv4, cabecalho de 20 bytes
    put16(out, 2, total)
    put16(out, 6, 0x4000) // nao fragmentar
    out[8] = 64 // TTL
    out[9] = PROTOCOL_UDP.toByte()
    System.arraycopy(query.destination, 0, out, 12, 4)
    System.arraycopy(query.source, 0, out, 16, 4)
    put16(out, 10, checksum(out, 0, IPV4_HEADER, 0))

    val udp = IPV4_HEADER
    put16(out, udp, query.destinationPort)
    put16(out, udp + 2, query.sourcePort)
    put16(out, udp + 4, UDP_HEADER + dns.size)
    System.arraycopy(dns, 0, out, udp + UDP_HEADER, dns.size)

    // Pseudo-cabecalho do UDP: origem, destino, protocolo e tamanho.
    var pseudo = 0L
    pseudo += u16(out, 12) + u16(out, 14) + u16(out, 16) + u16(out, 18)
    pseudo += PROTOCOL_UDP + UDP_HEADER + dns.size
    val udpSum = checksum(out, udp, UDP_HEADER + dns.size, pseudo)
    put16(out, udp + 6, if (udpSum == 0) 0xFFFF else udpSum)
    return out
  }

  /** Soma de verificacao da internet (RFC 1071), com um valor inicial opcional. */
  private fun checksum(data: ByteArray, offset: Int, length: Int, initial: Long): Int {
    var sum = initial
    var i = offset
    val end = offset + length
    while (i + 1 < end) {
      sum += u16(data, i)
      i += 2
    }
    if (i < end) sum += (data[i].toInt() and 0xFF) shl 8
    while (sum shr 16 != 0L) sum = (sum and 0xFFFF) + (sum shr 16)
    return (sum.inv() and 0xFFFF).toInt()
  }

  private fun u16(data: ByteArray, offset: Int): Int =
    ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

  private fun put16(data: ByteArray, offset: Int, value: Int) {
    data[offset] = (value shr 8).toByte()
    data[offset + 1] = value.toByte()
  }
}
