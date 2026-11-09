package com.finora.app.notifications

internal data class MonitoredCardMatch(
    val id: String,
    val lastFour: String?,
    val currency: String,
    val monitoringEnabled: Boolean,
    val accountId: String? = null,
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

    /**
     * Only notifications that uniquely match an enabled monitored card (by last four)
     * are eligible. Currency comes from the notification when present, otherwise the card.
     */
    fun resolveAccepted(
        lastFour: String?,
        parsedCurrency: String?,
        cards: List<MonitoredCardMatch>,
    ): AcceptedCardMatch? {
        val cardId = matchCardId(lastFour, cards) ?: return null
        val currency = parsedCurrency ?: matchCurrency(lastFour, cards) ?: return null
        return AcceptedCardMatch(cardId = cardId, currency = currency)
    }
}

internal data class AcceptedCardMatch(
    val cardId: String,
    val currency: String,
)
