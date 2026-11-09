package com.finora.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.finora.app.MainActivity
import com.finora.app.R
import org.json.JSONObject
import java.util.Locale

internal object TransactionReviewNotifier {
    fun show(context: Context, candidate: JSONObject) {
        ensureChannel(context)
        val candidateId = candidate.optString("id")
        if (candidateId.isBlank()) return
        val amountMinor = candidate.optLong("amountMinor")
        val currency = candidate.optString("currency")
        val merchant = candidate.optString("merchant").ifBlank { "Detected transaction" }
        val amountLabel = formatAmount(amountMinor, currency)
        val typeLabel = if (candidate.optString("type") == "INCOME") "Income" else "Expense"
        val summary = "$typeLabel · $amountLabel · $merchant"

        val openIntent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(TransactionReviewActions.EXTRA_CANDIDATE_ID, candidateId)
        val openPending = PendingIntent.getActivity(
            context,
            TransactionReviewActions.notificationIdFor(candidateId),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(context, TransactionReviewActions.CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Approve transaction")
            .setContentText(summary)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$summary\nAdd as daily spending, or as a global expense."))
            .setContentIntent(openPending)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)

        if (candidate.optString("type") != "INCOME") {
            builder.addAction(
                0,
                "Add daily",
                actionPending(context, TransactionReviewActions.ACTION_ADD_DAILY, candidateId, 1),
            )
            builder.addAction(
                0,
                "Add global",
                actionPending(context, TransactionReviewActions.ACTION_ADD_GLOBAL, candidateId, 2),
            )
        } else {
            builder.addAction(
                0,
                "Add income",
                actionPending(context, TransactionReviewActions.ACTION_ADD_GLOBAL, candidateId, 2),
            )
        }
        builder.addAction(
            0,
            "Dismiss",
            actionPending(context, TransactionReviewActions.ACTION_DISMISS, candidateId, 3),
        )

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(TransactionReviewActions.notificationIdFor(candidateId), builder.build())
    }

    fun cancel(context: Context, candidateId: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(TransactionReviewActions.notificationIdFor(candidateId))
    }

    private fun actionPending(
        context: Context,
        action: String,
        candidateId: String,
        requestSalt: Int,
    ): PendingIntent {
        val intent = Intent(context, TransactionActionReceiver::class.java)
            .setAction(action)
            .setPackage(context.packageName)
            .putExtra(TransactionReviewActions.EXTRA_CANDIDATE_ID, candidateId)
        val requestCode = TransactionReviewActions.notificationIdFor("$candidateId|$action|$requestSalt")
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            TransactionReviewActions.CHANNEL_ID,
            "Transaction review",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Approve detected Wallet or bank transactions in the background."
        }
        manager.createNotificationChannel(channel)
    }

    private fun formatAmount(amountMinor: Long, currency: String): String {
        val major = amountMinor / 100.0
        return String.format(Locale.US, "%.2f %s", major, currency)
    }
}
