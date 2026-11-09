package com.finora.app.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Test

class TransactionNotificationParserTest {
    @Test
    fun cardMatchingHandlesMultipleCardsUnknownCardsAndAmbiguousLastFour() {
        val cards = listOf(
            MonitoredCardMatch("first", "1234", "USD", true),
            MonitoredCardMatch("second", "5678", "EUR", true),
            MonitoredCardMatch("disabled", "9999", "AMD", false),
        )
        assertEquals("first", NotificationCardMatcher.matchCardId("1234", cards))
        assertEquals("EUR", NotificationCardMatcher.matchCurrency("5678", cards))
        assertNull(NotificationCardMatcher.matchCardId("0000", cards))
        assertNull(NotificationCardMatcher.matchCardId("9999", cards))

        val ambiguous = cards + MonitoredCardMatch("third", "1234", "USD", true)
        assertNull(NotificationCardMatcher.matchCardId("1234", ambiguous))
        assertEquals("USD", NotificationCardMatcher.matchCurrency("1234", ambiguous))
    }

    @Test
    fun acceptsOnlyNotificationsThatMatchAnEnabledMonitoredCard() {
        val cards = listOf(
            MonitoredCardMatch("first", "1234", "USD", true),
            MonitoredCardMatch("disabled", "9999", "AMD", false),
            MonitoredCardMatch("no-digits", null, "EUR", true),
        )
        val matched = NotificationCardMatcher.resolveAccepted("1234", "USD", cards)
        assertEquals("first", matched?.cardId)
        assertEquals("USD", matched?.currency)

        // Currency can come from the monitored card when the notification omits it.
        assertEquals("USD", NotificationCardMatcher.resolveAccepted("1234", null, cards)?.currency)

        // Unknown, disabled, missing, or ambiguous last-four must be ignored.
        assertNull(NotificationCardMatcher.resolveAccepted("0000", "USD", cards))
        assertNull(NotificationCardMatcher.resolveAccepted("9999", "AMD", cards))
        assertNull(NotificationCardMatcher.resolveAccepted(null, "USD", cards))
        assertNull(
            NotificationCardMatcher.resolveAccepted(
                "1234",
                "USD",
                cards + MonitoredCardMatch("duplicate", "1234", "USD", true),
            ),
        )
    }

    @Test
    fun notificationFingerprintSuppressesRepeatedUpdatesInTheSameMinute() {
        val first = duplicateNotificationFingerprint("bank.app", "Purchase", "USD 10.00", 60_001L)
        val update = duplicateNotificationFingerprint("bank.app", "Purchase", "USD 10.00", 119_999L)
        val nextMinute = duplicateNotificationFingerprint("bank.app", "Purchase", "USD 10.00", 120_000L)
        assertEquals(first, update)
        assertNotNull(nextMinute)
        assertEquals(false, first == nextMinute)
    }

    @Test
    fun parsesWalletUsdAndCardDigits() {
        val parsed = TransactionNotificationParser.parse(
            "Google Wallet",
            "Payment at Cafe · USD 12.50 · card ending 1234",
        )
        assertNotNull(parsed)
        assertEquals(1_250L, parsed?.amountMinor)
        assertEquals("USD", parsed?.currency)
        assertEquals("1234", parsed?.lastFour)
        assertEquals("EXPENSE", parsed?.type)
    }

    @Test
    fun parsesRussianIncomingTransactionAndGroupedAmount() {
        val parsed = TransactionNotificationParser.parse(
            "Зачисление",
            "Получено: 1 200,50 AMD на карту ****1234",
        )
        assertNotNull(parsed)
        assertEquals(120_050L, parsed?.amountMinor)
        assertEquals("AMD", parsed?.currency)
        assertEquals("INCOME", parsed?.type)
    }

    @Test
    fun parsesEuroAndArmenianCurrencyFormats() {
        val euro = TransactionNotificationParser.parse("Card payment", "Paid €8,40 at Market")
        assertEquals(840L, euro?.amountMinor)
        assertEquals("EUR", euro?.currency)

        val dram = TransactionNotificationParser.parse("Վճարում", "Գումար՝ 12,000 ֏ քարտ ****5566")
        assertEquals(1_200_000L, dram?.amountMinor)
        assertEquals("AMD", dram?.currency)
    }

    @Test
    fun doesNotTreatCardDigitsOrDatesAsTransactionAmounts() {
        assertNull(
            TransactionNotificationParser.parse(
                "Google Wallet",
                "Payment received for card ending 1234",
            ),
        )
        assertNull(
            TransactionNotificationParser.parse(
                "Card payment",
                "Payment at Store on 2026-11-09 · card ending 1234",
            ),
        )
    }

    @Test
    fun leavesUnknownCurrencyUnresolvedForCardCurrencyMatching() {
        val parsed = TransactionNotificationParser.parse("Card purchase", "Purchase: 22.10 RUB")
        assertNotNull(parsed)
        assertNull(parsed?.currency)
    }
}
