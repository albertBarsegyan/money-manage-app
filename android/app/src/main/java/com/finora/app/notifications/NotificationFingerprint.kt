package com.finora.app.notifications

internal fun duplicateNotificationFingerprint(
    packageName: String,
    title: String,
    text: String,
    receivedAtMillis: Long,
): String = stableHash(
    "$packageName|${title.trim()}|${text.trim()}|${receivedAtMillis / 60_000L}",
)
