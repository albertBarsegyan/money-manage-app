package com.finora.app.notifications

internal object TransactionReviewActions {
    const val ACTION_ADD_DAILY = "com.finora.app.notifications.ACTION_ADD_DAILY"
    const val ACTION_ADD_GLOBAL = "com.finora.app.notifications.ACTION_ADD_GLOBAL"
    const val ACTION_DISMISS = "com.finora.app.notifications.ACTION_DISMISS"
    const val EXTRA_CANDIDATE_ID = "candidateId"
    const val CHANNEL_ID = "transaction-review"
    const val BUDGET_DAILY = "DAILY"
    const val BUDGET_GLOBAL = "GLOBAL"

    fun notificationIdFor(candidateId: String): Int {
        val hash = candidateId.hashCode()
        return if (hash == Int.MIN_VALUE) 1 else kotlin.math.abs(hash).coerceAtLeast(1)
    }
}
