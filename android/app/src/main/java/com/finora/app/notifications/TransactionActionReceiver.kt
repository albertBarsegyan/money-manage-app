package com.finora.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TransactionActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        val candidateId = intent.getStringExtra(TransactionReviewActions.EXTRA_CANDIDATE_ID)?.trim().orEmpty()
        if (candidateId.isBlank()) return
        val store = NotificationReaderStore(context.applicationContext)
        when (action) {
            TransactionReviewActions.ACTION_ADD_DAILY ->
                approve(context, store, candidateId, TransactionReviewActions.BUDGET_DAILY)
            TransactionReviewActions.ACTION_ADD_GLOBAL ->
                approve(context, store, candidateId, TransactionReviewActions.BUDGET_GLOBAL)
            TransactionReviewActions.ACTION_DISMISS -> {
                store.dismissCandidate(candidateId)
                TransactionReviewNotifier.cancel(context, candidateId)
                NotificationReaderPlugin.publishDismissed(candidateId)
            }
        }
    }

    private fun approve(
        context: Context,
        store: NotificationReaderStore,
        candidateId: String,
        budgetMode: String,
    ) {
        val expense = store.approveCandidate(candidateId, budgetMode) ?: return
        TransactionReviewNotifier.cancel(context, candidateId)
        NotificationReaderPlugin.publishApproved(expense)
    }
}
