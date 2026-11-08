# Kotlin and Capacitor plugins

## Current native bridge

The current Android entry point is `MainActivity.kt`, which extends Capacitor `BridgeActivity`. No custom Kotlin plugin is registered. Web/native integration currently goes through maintained Capacitor APIs wrapped by `src/lib/native/`.

Do not implement a native feature just because a bridge is possible. Confirm a product requirement first and prefer an official Capacitor plugin. A custom plugin needs an Android implementation, a typed TypeScript contract, permission/error handling, browser fallback where possible, and device testing.

## Minimal custom plugin pattern

This example shows the Capacitor 8 shape for a native method. It is documentation only; it is not currently registered or used by Finora.

```kotlin
package com.finora.app.plugins

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Example")
class ExamplePlugin : Plugin() {
    @PluginMethod
    fun getStatus(call: PluginCall) {
        try {
            val result = JSObject()
            result.put("available", true)
            call.resolve(result)
        } catch (error: Exception) {
            call.reject("Could not read native status", error)
        }
    }
}
```

For manual registration, register the plugin in `MainActivity` before the bridge is created:

```kotlin
package com.finora.app

import com.finora.app.plugins.ExamplePlugin
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(ExamplePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

Check the installed Capacitor version's official plugin documentation and generated Android API before copying this pattern into production; lifecycle signatures can change between major releases.

## TypeScript wrapper pattern

Keep direct plugin calls in `src/lib/native/`, not scattered in UI components. Define a typed wrapper that checks platform support, validates inputs, catches bridge failures, and returns a safe result. For browser mode, provide a meaningful fallback or return an explicit unsupported result. Never silently pretend that a native capability worked.

When an official community plugin is selected, install its TypeScript package and native Android dependency using its documented steps, then run:

```bash
npm run android:sync
```

Review the merged manifest and dependency license before release. Test the bridge on a real Android device or suitable emulator; a successful compile alone does not prove runtime behavior.

## Permission handling

Declare only permissions needed for a shipped feature. Request runtime permissions in context, explain why they are needed, handle denial and permanent denial, and support devices without the capability. The current Finora app does not request runtime permissions. See [permissions.md](permissions.md).
