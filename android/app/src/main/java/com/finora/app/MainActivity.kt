package com.finora.app

import com.getcapacitor.BridgeActivity
import com.finora.app.notifications.NotificationReaderPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(NotificationReaderPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
