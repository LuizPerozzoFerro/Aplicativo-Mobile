package expo.modules.labmonitoring

import android.content.Context

/**
 * Configuracao da vigilancia de dominios (experimento A6), em SharedPreferences.
 *
 * Fica em disco pelo mesmo motivo do LimitConfig: o sistema pode recriar o
 * servico de VPN (inclusive pela VPN sempre ativa) sem o laboratorio aberto.
 *
 * Privacidade (CLAUDE.md secao 9): a lista e de dominios de TESTE inofensivos,
 * configurada pelo responsavel. Nada aqui sai do aparelho.
 */
object DomainWatchConfig {
  private const val PREFS = "lab-domains"
  private const val KEY_ACTIVE = "active"
  private const val KEY_MODE = "mode"
  private const val KEY_DOMAINS = "domains"
  private const val KEY_SOCIAL = "socialDomains"

  /** 'alert': detecta e deixa passar. 'block': detecta e responde "dominio inexistente". */
  const val MODE_ALERT = "alert"
  const val MODE_BLOCK = "block"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun save(context: Context, mode: String, domains: List<String>, socialDomains: List<String>) {
    prefs(context).edit()
      .putBoolean(KEY_ACTIVE, true)
      .putString(KEY_MODE, if (mode == MODE_BLOCK) MODE_BLOCK else MODE_ALERT)
      .putStringSet(KEY_DOMAINS, normalize(domains).toSet())
      .putStringSet(KEY_SOCIAL, normalize(socialDomains).toSet())
      .apply()
  }

  fun setActive(context: Context, active: Boolean) {
    prefs(context).edit().putBoolean(KEY_ACTIVE, active).apply()
  }

  fun isActive(context: Context) = prefs(context).getBoolean(KEY_ACTIVE, false)

  fun mode(context: Context): String = prefs(context).getString(KEY_MODE, null) ?: MODE_ALERT

  fun domains(context: Context): List<String> =
    prefs(context).getStringSet(KEY_DOMAINS, emptySet())?.sorted() ?: emptyList()

  /**
   * A7: dominios de rede social vigiados no navegador. So registram o acesso:
   * nunca alertam nem bloqueiam, em nenhum modo.
   */
  fun socialDomains(context: Context): List<String> =
    prefs(context).getStringSet(KEY_SOCIAL, emptySet())?.sorted() ?: emptyList()

  /**
   * Dominios em minusculas, sem espacos, sem "http://", sem caminho e sem o ponto
   * final. O que sobra e o que a consulta de DNS carrega: so o nome.
   */
  fun normalize(domains: List<String>): List<String> =
    domains
      .map { it.trim().lowercase() }
      .map { it.substringAfter("://") }
      .map { it.substringBefore('/').trimEnd('.') }
      .filter { it.isNotEmpty() && it.contains('.') }
      .distinct()

  /**
   * O item da lista que cobre o nome consultado, ou null. Vale o proprio dominio e
   * qualquer subdominio dele, sempre na fronteira de um rotulo: "example.com"
   * cobre "www.example.com", mas nao "notexample.com".
   */
  fun match(name: String, domains: List<String>): String? =
    domains.firstOrNull { name == it || name.endsWith(".$it") }
}
