package com.finora.app.notifications

import org.json.JSONObject
import java.util.UUID

internal object ApprovedExpenseFactory {
    fun fromCandidate(
        candidate: JSONObject,
        budgetMode: String,
        accountId: String?,
    ): JSONObject? {
        val amountMinor = candidate.optLong("amountMinor")
        val currency = candidate.optString("currency")
        val type = candidate.optString("type").ifBlank { "EXPENSE" }
        val merchant = candidate.optString("merchant").ifBlank { "Detected transaction" }
        val occurredAt = candidate.optString("occurredAt")
        val packageName = candidate.optString("packageName")
        val candidateId = candidate.optString("id")
        if (amountMinor <= 0L || currency.isBlank() || occurredAt.isBlank() || candidateId.isBlank()) return null
        val wallet = Regex("(?i)wallet|google.?pay").containsMatchIn(packageName)
        val resolvedBudget = if (type == "EXPENSE") {
            if (budgetMode == TransactionReviewActions.BUDGET_DAILY) {
                TransactionReviewActions.BUDGET_DAILY
            } else {
                TransactionReviewActions.BUDGET_GLOBAL
            }
        } else {
            null
        }
        return JSONObject().apply {
            put("id", UUID.randomUUID().toString())
            put("amountMinor", amountMinor)
            put("currency", currency)
            put("category", if (type == "INCOME") "Income" else "Other")
            if (accountId != null) put("accountId", accountId) else put("accountId", JSONObject.NULL)
            put("occurredAt", occurredAt)
            put("description", merchant)
            put("status", "CONFIRMED")
            put("type", type)
            put("source", if (wallet) "WALLET_SYNC" else "BANK_SYNC")
            put("reviewStatus", "CONFIRMED")
            if (resolvedBudget != null) put("budgetMode", resolvedBudget) else put("budgetMode", JSONObject.NULL)
            put("externalReference", candidateId)
        }
    }
}
