package com.finora.app.notifications

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Encrypted app-private state. Notification bodies are parsed in memory and never persisted. */
internal class NotificationReaderStore(context: Context) {
    private val prefs = context.getSharedPreferences("notification_reader_v1", Context.MODE_PRIVATE)

    @Synchronized
    fun state(): JSONObject = try {
        val packed = prefs.getString(STATE_KEY, null) ?: return JSONObject()
        val bytes = Base64.decode(packed, Base64.NO_WRAP)
        val iv = bytes.copyOfRange(0, IV_BYTES)
        val payload = bytes.copyOfRange(IV_BYTES, bytes.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
        JSONObject(String(cipher.doFinal(payload), Charsets.UTF_8))
    } catch (_: Exception) {
        JSONObject()
    }

    @Synchronized
    fun save(value: JSONObject) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8))
        val packed = cipher.iv + encrypted
        prefs.edit { putString(STATE_KEY, Base64.encodeToString(packed, Base64.NO_WRAP)) }
    }

    fun isEnabled(): Boolean = state().optBoolean("enabled", false)

    fun isPackageSelected(packageName: String): Boolean =
        state().optJSONArray("packages").containsString(packageName)

    fun acceptCandidate(candidate: JSONObject, fingerprint: String): Boolean {
        val value = state()
        val seen = value.optJSONArray("seen") ?: JSONArray()
        if (seen.containsString(fingerprint)) return false
        val candidates = value.optJSONArray("candidates") ?: JSONArray()
        candidates.put(candidate)
        seen.put(fingerprint)
        while (seen.length() > MAX_SEEN) seen.remove(0)
        value.put("seen", seen)
        value.put("candidates", candidates)
        save(value)
        return true
    }

    fun candidates(): JSONArray = state().optJSONArray("candidates") ?: JSONArray()

    fun clearCandidates() {
        val value = state().put("candidates", JSONArray())
        save(value)
    }

    fun dismissCandidate(id: String) {
        val value = state()
        val current = value.optJSONArray("candidates") ?: JSONArray()
        val retained = JSONArray()
        for (index in 0 until current.length()) {
            val item = current.optJSONObject(index) ?: continue
            if (item.optString("id") != id) retained.put(item)
        }
        value.put("candidates", retained)
        save(value)
    }

    fun matchingCard(lastFour: String?): String? {
        return NotificationCardMatcher.matchCardId(lastFour, monitoredCardMatches())
    }

    fun matchingCardCurrency(lastFour: String?): String? {
        return NotificationCardMatcher.matchCurrency(lastFour, monitoredCardMatches())
    }

    private fun monitoredCardMatches(): List<MonitoredCardMatch> {
        val cards = state().optJSONArray("cards") ?: return emptyList()
        val matches = mutableListOf<MonitoredCardMatch>()
        for (index in 0 until cards.length()) {
            val card = cards.optJSONObject(index) ?: continue
            val id = card.optString("id")
            val lastFour = card.optString("lastFour").takeIf { it.isNotBlank() }
            val currency = card.optString("currency")
            if (id.isNotBlank() && currency.isNotBlank())
                matches.add(MonitoredCardMatch(id, lastFour, currency, card.optBoolean("monitoringEnabled")))
        }
        return matches
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    companion object {
        private const val STATE_KEY = "encrypted_state"
        private const val KEY_ALIAS = "finora_notification_reader_key"
        private const val IV_BYTES = 12
        private const val MAX_SEEN = 300
    }
}

internal fun JSONArray?.containsString(value: String): Boolean {
    if (this == null) return false
    for (index in 0 until length()) if (optString(index) == value) return true
    return false
}

internal fun stableHash(value: String): String = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray(Charsets.UTF_8))
    .joinToString("") { "%02x".format(it) }
