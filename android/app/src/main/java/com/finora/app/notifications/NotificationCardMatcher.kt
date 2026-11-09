package com.finora.app.notifications

internal data class MonitoredCardMatch(
    val id: String,
    val lastFour: String?,
    val currency: String,
    val monitoringEnabled: Boolean,
)

internal object NotificationCardMatcher {
    fun matchCardId(lastFour: String?, cards: List<MonitoredCardMatch>): String? {
        if (lastFour == null) return null
        return cards.filter { it.monitoringEnabled && it.lastFour == lastFour }
            .map { it.id }
            .distinct()
            .singleOrNull()
    }

    fun matchCurrency(lastFour: String?, cards: List<MonitoredCardMatch>): String? {
        if (lastFour == null) return null
        return cards.filter { it.monitoringEnabled && it.lastFour == lastFour }
            .map { it.currency }
            .distinct()
            .singleOrNull()
    }
}
