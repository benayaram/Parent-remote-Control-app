import { randomUUID } from "node:crypto";
import type { Store, Row } from "./store.js";
export type Push = (
  tokens: string[],
  data: Record<string, string>,
  visible: boolean,
) => Promise<void>;
// Durable at-least-once outbox. FCM is a hint; duplicate wakeups are harmless.
export async function dispatchOne(store: Store, push: Push, now = Date.now()) {
  const job = await store.transaction(async (s) => {
    const candidates = [
      ...(await s.find("notification_outbox", { status: "pending" })),
      ...(await s.find("notification_outbox", { status: "sending" })),
    ];
    const row = candidates.find(
      (r) =>
        (!r.retryAt || new Date(r.retryAt).getTime() <= now) &&
        (!r.leaseUntil || new Date(r.leaseUntil).getTime() < now),
    );
    if (!row) return undefined;
    const leased: Row = {
      ...row,
      status: "sending",
      lease: randomUUID(),
      leaseUntil: new Date(now + 60000),
    };
    await s.put("notification_outbox", leased);
    return leased;
  });
  if (!job) return false;
  const tokens = await store.transaction(async (s) => {
    const d = await s.get("devices", job.deviceId);
    if (!d || d.revokedAt) return [];
    if (job.target === "child") return d.pushToken ? [d.pushToken] : [];
    const members = (
      await s.find("family_memberships", { familyId: job.familyId })
    ).filter((m) => !m.revokedAt);
    const out: string[] = [];
    for (const m of members)
      for (const t of await s.find("push_tokens", { uid: m.uid }))
        out.push(t.token);
    return [...new Set(out)].slice(0, 500);
  });
  try {
    if (tokens.length)
      await push(
        tokens,
        { type: job.type, deviceId: job.deviceId },
        job.target === "parents",
      );
    await store.transaction(async (s) => {
      const current = await s.get("notification_outbox", job.id);
      if (current && current.lease === job.lease)
        await s.put("notification_outbox", {
          ...current,
          status: tokens.length ? "sent" : "no_registered_recipients",
          leaseUntil: null,
          sentAt: new Date(now),
        });
    });
  } catch {
    await store.transaction(async (s) => {
      const current = await s.get("notification_outbox", job.id);
      if (!current || current.lease !== job.lease) return;
      const attempts = (current.attempts ?? 0) + 1;
      await s.put("notification_outbox", {
        ...current,
        status: attempts >= 5 ? "failed" : "pending",
        attempts,
        leaseUntil: null,
        retryAt: new Date(now + Math.min(300000, 1000 * 2 ** attempts)),
      });
    });
  }
  return true;
}
