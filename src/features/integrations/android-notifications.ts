import { isCurrency } from "../../entities/finance/validation";
import type { CurrencyCode } from "../../entities/finance/models";

/** Candidate data excludes raw notification bodies, authentication codes, and persistent history. */
export interface NotificationCandidate {
  id: string;
  packageName: string;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  occurredAt: string;
  reviewStatus: "PENDING_REVIEW";
}

export interface AndroidNotificationPayload {
  packageName: string;
  title: string;
  text: string;
  receivedAt: string;
}
export interface AndroidNotificationParser {
  parse(payload: AndroidNotificationPayload): NotificationCandidate | null;
}

/** Implemented by a future Capacitor/Kotlin bridge. This web build does not provide an implementation. */
export interface AndroidNotificationBridge {
  requestNotificationAccess(): Promise<boolean>;
  listAllowlistedPackages(): Promise<string[]>;
  setAllowlistedPackages(packages: string[]): Promise<void>;
  subscribe(listener: (payload: AndroidNotificationPayload) => void): () => void;
}

/** Runtime-only inbox. Native payloads are parsed immediately and never retained. */
export class NotificationCandidateInbox {
  private candidates: NotificationCandidate[] = [];

  receive(
    payload: AndroidNotificationPayload,
    allowlistedPackages: ReadonlySet<string>,
    parser: AndroidNotificationParser,
  ) {
    if (!allowlistedPackages.has(payload.packageName)) return;
    const candidate = parser.parse(payload);
    if (
      !candidate ||
      candidate.packageName !== payload.packageName ||
      candidate.reviewStatus !== "PENDING_REVIEW" ||
      !Number.isSafeInteger(candidate.amountMinor) ||
      candidate.amountMinor <= 0 ||
      !isCurrency(candidate.currency) ||
      !Number.isFinite(Date.parse(candidate.occurredAt))
    )
      return;
    this.candidates = [candidate, ...this.candidates.filter((item) => item.id !== candidate.id)];
  }

  list() {
    return this.candidates;
  }
  dismiss(id: string) {
    this.candidates = this.candidates.filter((item) => item.id !== id);
  }
  clear() {
    this.candidates = [];
  }
}
