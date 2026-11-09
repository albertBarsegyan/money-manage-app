package com.finora.app.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TransactionNotificationListener : NotificationListenerService() {
    private val store by lazy { NotificationReaderStore(applicationContext) }

    override fun onNotificationPosted(statusBarNotification: StatusBarNotification) {
        if (!store.isEnabled()) return
        val packageName = statusBarNotification.packageName ?: return
        if (!store.isPackageSelected(packageName)) return
        val notification = statusBarNotification.notification ?: return
        val extras = notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val bodyParts = mutableListOf<String>()
        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let(bodyParts::add)
        extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { bodyParts.add(it.toString()) }
        val text = bodyParts.filter(String::isNotBlank).distinct().joinToString(" ")
        if (title.isBlank() && text.isBlank()) return

        val parsed = TransactionNotificationParser.parse(title, text) ?: return
        // Drop anything that does not uniquely match an enabled card from the user's list.
        val accepted = store.resolveAcceptedCard(parsed.lastFour, parsed.currency) ?: return
        val timestamp = statusBarNotification.postTime.takeIf { it > 0L } ?: System.currentTimeMillis()
        val candidate = parsed.copy(
            id = stableHash("$packageName|${parsed.amountMinor}|${accepted.currency}|${parsed.merchant.lowercase(Locale.ROOT)}|${timestamp / 60_000L}"),
            packageName = packageName,
            currency = accepted.currency,
            occurredAt = formatUtc(timestamp),
            cardId = accepted.cardId,
        )
        val dedupeKey = duplicateNotificationFingerprint(packageName, title, text, timestamp)
        if (!store.acceptCandidate(candidate.toJson(), dedupeKey)) return

        val payload = candidate.toJson()
        NotificationReaderPlugin.publish(payload)
        // Always post an actionable review notification so background / recents users can approve.
        TransactionReviewNotifier.show(applicationContext, payload)
    }

    private fun formatUtc(timestamp: Long): String = SimpleDateFormat(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        Locale.ROOT,
    ).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(timestamp))
}

internal data class ParsedNotification(
    val id: String = "",
    val packageName: String = "",
    val amountMinor: Long,
    val currency: String?,
    val merchant: String,
    val occurredAt: String = "",
    val type: String,
    val lastFour: String?,
    val cardId: String?,
) {
    fun toJson() = org.json.JSONObject().apply {
        put("id", id)
        put("packageName", packageName)
        put("amountMinor", amountMinor)
        put("currency", currency)
        put("merchant", merchant)
        put("occurredAt", occurredAt)
        put("type", type)
        put("lastFour", lastFour ?: org.json.JSONObject.NULL)
        put("cardId", cardId ?: org.json.JSONObject.NULL)
        put("reviewStatus", "PENDING_REVIEW")
    }
}

internal object TransactionNotificationParser {
    private val transactionWords = Regex(
        "(?i)purchase|payment|pay|paid|charged|spent|withdraw|deposit|received|refund|transfer|transaction|" +
            "покупк|оплат|списан|списание|зачисл|перевод|сняти|возврат|գնում|վճար|փոխանց|մուտք|ելք|գործարք",
    )
    private val incomeWords = Regex("(?i)received|deposit|refund|credited|зачисл|возврат|մուտք|վերադարձ")
    private val amountRegex = Regex("(?i)([$€£֏]\\s*)?([0-9][0-9., ]{0,15})\\s*(USD|EUR|GBP|AMD|֏|դր(?:ամ)?|\\$|€|£)?")
    private val cardRegex = Regex("(?i)(?:ending(?:\\s+in)?|card|карта|հաշվեհամար|քարտ)\\D{0,12}(\\d{4})|\\*{2,}(\\d{4})")

    fun parse(title: String, text: String): ParsedNotification? {
        val combined = "$title $text".trim().lowercase(Locale.ROOT)
        if (!transactionWords.containsMatchIn(combined)) return null
        val card = cardRegex.find(combined)
        val lastFour = (card?.groupValues?.getOrNull(1)?.takeIf(String::isNotBlank)
            ?: card?.groupValues?.getOrNull(2)?.takeIf(String::isNotBlank))
        val usableMatches = amountRegex.findAll(combined).filter { match ->
            val overlapsCard = card != null && match.range.first <= card.range.last && match.range.last >= card.range.first
            val partOfDate = (match.range.first > 0 && combined[match.range.first - 1] in "-/") ||
                (match.range.last + 1 < combined.length && combined[match.range.last + 1] in "-/")
            !overlapsCard && !partOfDate
        }.toList()
        val amountMatch = usableMatches.firstOrNull { match ->
            val nearbyPrefix = combined.substring((match.range.first - 10).coerceAtLeast(0), match.range.first)
            match.groupValues[1].isNotBlank() || match.groupValues[3].isNotBlank() ||
                Regex("(?i)\\b(?:USD|EUR|GBP|AMD)\\b").containsMatchIn(nearbyPrefix)
        } ?: usableMatches.firstOrNull { match ->
            val localContext = combined.substring((match.range.first - 28).coerceAtLeast(0), match.range.first)
            Regex("(?i)amount|total|purchase|payment|pay|paid|charged|spent|withdraw|deposit|оплат|списан|գումար|վճար").containsMatchIn(localContext)
        } ?: return null
        val amount = parseMinor(amountMatch.groupValues[2]) ?: return null
        val currencyToken = "${amountMatch.groupValues[1]} ${amountMatch.groupValues[3]}"
        val symbolCurrency = when {
            currencyToken.contains("֏") || currencyToken.contains("դր", true) || currencyToken.contains("AMD", true) -> "AMD"
            currencyToken.contains("€") || currencyToken.contains("EUR", true) -> "EUR"
            currencyToken.contains("£") || currencyToken.contains("GBP", true) -> "GBP"
            currencyToken.contains('$') || currencyToken.contains("USD", true) -> "USD"
            combined.contains("֏") || combined.contains("դր", true) || Regex("(?i)\\bAMD\\b").containsMatchIn(combined) -> "AMD"
            combined.contains("€") || Regex("(?i)\\bEUR\\b").containsMatchIn(combined) -> "EUR"
            combined.contains("£") || Regex("(?i)\\bGBP\\b").containsMatchIn(combined) -> "GBP"
            combined.contains('$') || Regex("(?i)\\bUSD\\b").containsMatchIn(combined) -> "USD"
            else -> null
        }
        val merchant = title.trim().takeIf { it.isNotBlank() } ?: text.trim().take(80)
        return ParsedNotification(
            amountMinor = amount,
            currency = symbolCurrency,
            merchant = merchant,
            type = if (incomeWords.containsMatchIn(combined)) "INCOME" else "EXPENSE",
            lastFour = lastFour,
            cardId = null,
        )
    }

    private fun parseMinor(raw: String): Long? {
        val value = raw.replace(" ", "")
        val decimal = value.lastIndexOfAny(charArrayOf('.', ','))
        val normalized = if (decimal >= 0 && value.length - decimal - 1 in 1..2) {
            value.substring(0, decimal).replace(",", "").replace(".", "") + "." + value.substring(decimal + 1)
        } else value.replace(",", "").replace(".", "")
        val major = normalized.toBigDecimalOrNull() ?: return null
        if (major <= java.math.BigDecimal.ZERO) return null
        val minor = try { major.movePointRight(2).setScale(0, java.math.RoundingMode.UNNECESSARY).longValueExact() }
        catch (_: ArithmeticException) { return null }
        return minor.takeIf { it <= 9_007_199_254_740_991L }
    }
}
