package com.finora.app.notifications

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.LauncherApps
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(
    name = "NotificationReader",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class NotificationReaderPlugin : Plugin() {
    private val store by lazy { NotificationReaderStore(context) }

    override fun load() {
        activePlugin = this
    }

    override fun handleOnDestroy() {
        if (activePlugin === this) activePlugin = null
    }

    @com.getcapacitor.PluginMethod
    fun getStatus(call: PluginCall) {
        val state = store.state()
        call.resolve(JSObject().apply {
            put("accessGranted", hasListenerAccess())
            put("enabled", state.optBoolean("enabled", false))
            put("selectedPackages", state.optJSONArray("packages") ?: JSONArray())
            put("notificationsAllowed", areNotificationsAllowed())
        })
    }

    @com.getcapacitor.PluginMethod
    fun openAccessSettings(call: PluginCall) {
        try {
            context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            call.resolve()
        } catch (error: Exception) {
            call.reject("Could not open notification access settings.", error)
        }
    }

    @com.getcapacitor.PluginMethod
    fun setMonitoringEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        val state = store.state().put("enabled", enabled)
        store.save(state)
        call.resolve(JSObject().put("enabled", enabled))
    }

    @com.getcapacitor.PluginMethod
    fun setSelectedPackages(call: PluginCall) {
        val packages = call.getArray("packages") ?: JSArray()
        val selected = JSONArray()
        for (index in 0 until packages.length()) {
            val name = packages.optString(index).trim()
            if (name.isNotBlank() && name != context.packageName && !selected.containsString(name)) selected.put(name)
        }
        val state = store.state().put("packages", selected)
        store.save(state)
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun setMonitoredCards(call: PluginCall) {
        val cards = call.getArray("cards") ?: JSArray()
        val safe = JSONArray()
        for (index in 0 until cards.length()) {
            val card = cards.optJSONObject(index) ?: continue
            val lastFour = card.optString("lastFour").takeIf { it.matches(Regex("\\d{4}")) }
            safe.put(JSONObject().apply {
                put("id", card.optString("id"))
                put("lastFour", lastFour ?: JSONObject.NULL)
                put("currency", card.optString("currency"))
                put("monitoringEnabled", card.optBoolean("monitoringEnabled"))
            })
        }
        val state = store.state().put("cards", safe)
        store.save(state)
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val result = JSArray()
        val launcherApps = context.getSystemService(LauncherApps::class.java)
        launcherApps.getActivityList(null, Process.myUserHandle())
            .distinctBy { it.applicationInfo.packageName }
            .filterNot { it.applicationInfo.packageName == context.packageName }
            .sortedBy { it.label.toString().lowercase() }
            .forEach { info ->
                result.put(JSObject().apply {
                    put("packageName", info.applicationInfo.packageName)
                    put("name", info.label.toString())
                })
            }
        call.resolve(JSObject().put("apps", result))
    }

    @com.getcapacitor.PluginMethod
    fun getPendingCandidates(call: PluginCall) {
        call.resolve(JSObject().put("candidates", store.candidates()))
    }

    @com.getcapacitor.PluginMethod
    fun dismissCandidate(call: PluginCall) {
        store.dismissCandidate(call.getString("id") ?: "")
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun clearPendingCandidates(call: PluginCall) {
        store.clearCandidates()
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 33 || areNotificationsAllowed()) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult")
    }

    @PermissionCallback
    private fun notificationPermissionResult(call: PluginCall) {
        call.resolve(JSObject().put("granted", areNotificationsAllowed()))
    }

    private fun hasListenerAccess(): Boolean {
        val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
        val component = ComponentName(context, TransactionNotificationListener::class.java).flattenToString()
        return enabled.split(':').any { it.equals(component, ignoreCase = true) }
    }

    private fun areNotificationsAllowed(): Boolean =
        androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()

    companion object {
        @Volatile private var activePlugin: NotificationReaderPlugin? = null

        internal fun publish(candidate: JSONObject) {
            val payload = JSObject.fromJSONObject(candidate)
            activePlugin?.notifyListeners("transactionDetected", payload)
        }
    }
}
