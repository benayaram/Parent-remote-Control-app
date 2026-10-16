/** Acceptance audit for master-spec sections A/B/H/J and privacy retention.
 * Separate from the original suite so known failures remain visible without
 * silently changing the definition of the existing CI checks.
 * All identities/device keys/object stores here are synthetic test fixtures.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import sharp from "sharp";
import { generateKeyPairSync, createHash, sign, randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { MemoryStore, type Store } from "../src/store.js";
import { cleanupImages, type ImageStore } from "../src/images.js";
import { dispatchOne } from "../src/notifications.js";
function fixture(images?: ImageStore) {
  let clock = Date.parse("2026-10-16T10:00:00Z");
  const store = new MemoryStore();
  const api = request(
    createApp(
      store,
      async (uid) => ({ uid, emailVerified: true, authTime: clock / 1000 }),
      () => clock,
      images,
    ),
  );
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = publicKey.export({ format: "pem", type: "spki" }).toString();
  const parent = (method: string, path: string, body?: any, uid = "parent-a") =>
    (api as any)
      [method]("/api/v1" + path)
      .set("Authorization", "Bearer " + uid)
      .send(body);
  const child = (
    method: string,
    path: string,
    deviceId: string,
    body?: any,
  ) => {
    const raw = body === undefined ? "" : JSON.stringify(body),
      time = String(clock),
      nonce = randomUUID(),
      url = "/api/v1" + path;
    const message = [
      method.toUpperCase(),
      url,
      time,
      nonce,
      createHash("sha256").update(raw).digest("hex"),
    ].join("\n");
    return (api as any)
      [method](url)
      .set({
        "x-device-id": deviceId,
        "x-device-time": time,
        "x-device-nonce": nonce,
        "x-device-signature": sign(
          "sha256",
          Buffer.from(message),
          privateKey,
        ).toString("base64"),
      })
      .send(body);
  };
  async function family() {
    return (
      await parent("post", "/families", { name: "Synthetic family" }).expect(
        201,
      )
    ).body.id;
  }
  async function pair(familyId?: string) {
    familyId ??= await family();
    const session = (
      await parent("post", "/pairing/sessions", {
        familyId,
        childName: "Test child",
      }).expect(201)
    ).body;
    const claim = (
      await api
        .post("/api/v1/pairing/claim")
        .send({
          code: session.code,
          publicKey: pem,
          disclosureAccepted: true,
          deviceName: "Fixture",
          androidApi: 35,
          manufacturer: "Fixture",
        })
        .expect(201)
    ).body;
    const paired = (
      await parent("post", "/pairing/confirm", {
        sessionId: session.sessionId,
        claimId: claim.claimId,
      }).expect(200)
    ).body;
    return { deviceId: paired.deviceId, familyId };
  }
  return {
    api,
    parent,
    child,
    store,
    family,
    pair,
    advance: (ms: number) => (clock += ms),
  };
}
test("SPEC-B: reject 48 hours of foreground usage in a single calendar day", async () => {
  const f = fixture(),
    { deviceId } = await f.pair();
  const response = await f.child(
    "post",
    `/devices/${deviceId}/usage`,
    deviceId,
    {
      timezone: "UTC",
      localDate: "2026-10-16",
      samples: [
        {
          packageName: "org.example.app",
          foregroundSeconds: 172800,
          sourceQuality: "sampled",
        },
      ],
    },
  );
  assert.equal(
    response.status,
    400,
    "A single UTC calendar day cannot contain 172800 foreground seconds for one app",
  );
});
test("SPEC-privacy: expired image cleanup must reach rows beyond the Mongo adapter page limit", async () => {
  const store = new MemoryStore();
  const now = Date.parse("2026-10-16T10:00:00Z");
  for (let i = 0; i < 2000; i++)
    await store.put("images", {
      id: String(i),
      storagePath: `test/${i}`,
      expiresAt: new Date(now + 86400000),
    });
  await store.put("images", {
    id: "expired-after-page",
    storagePath: "test/expired",
    expiresAt: new Date(now - 1),
  });
  // Reproduce MongoStore.find's documented .limit(2000), without claiming a live Mongo test.
  const bounded: Store = {
    get: store.get.bind(store),
    find: async (c, q) => (await store.find(c, q)).slice(0, 2000),
    put: store.put.bind(store),
    remove: store.remove.bind(store),
    transaction: (fn) => store.transaction(() => fn(bounded)),
  };
  const removed: string[] = [];
  const images: ImageStore = {
    async put() {},
    async get() {
      return Buffer.alloc(0);
    },
    async remove(path) {
      removed.push(path);
    },
  };
  await cleanupImages(bounded, images, now);
  assert.deepEqual(
    removed,
    ["test/expired"],
    "Expired Storage objects must not be starved by 2000 earlier unexpired rows",
  );
});
test("SPEC-API: family creation records the required audit event", async () => {
  const f = fixture();
  const familyId = await f.family();
  const events = await f.store.find("audit_events", { familyId });
  assert.ok(
    events.some((e) => e.actorUid === "parent-a" && e.result === "accepted"),
    "The document requires audit logs for every endpoint; family creation currently has none",
  );
});
test("SPEC-A: signature from one child cannot access another child URL", async () => {
  const f = fixture(),
    first = await f.pair(),
    second = await f.pair(first.familyId);
  await f
    .child("get", `/devices/${second.deviceId}/policy`, first.deviceId)
    .expect(404);
});
test("SPEC-commands: one child cannot acknowledge another child command", async () => {
  const f = fixture(),
    first = await f.pair(),
    second = await f.pair(first.familyId);
  const command = (
    await f
      .parent("post", `/devices/${first.deviceId}/commands`, {
        type: "sync_policy",
        payload: {},
        idempotencyKey: randomUUID(),
      })
      .expect(201)
  ).body;
  await f
    .child("post", `/commands/${command.id}/ack`, second.deviceId, {
      status: "applied",
    })
    .expect(404);
});
test("SPEC-H: a location upload without explicit consent is rejected", async () => {
  const f = fixture(),
    { deviceId } = await f.pair();
  await f
    .child("post", `/devices/${deviceId}/location`, deviceId, {
      lat: 12,
      lng: 77,
      accuracyMeters: 10,
      capturedAt: "2026-10-16T10:00:00Z",
      consent: false,
    })
    .expect(400);
});
test("SPEC-B: denying extra time does not create a grant", async () => {
  const f = fixture(),
    { deviceId } = await f.pair();
  const r = (
    await f
      .child("post", `/devices/${deviceId}/time-requests`, deviceId, {
        minutes: 15,
        reason: "Synthetic request",
      })
      .expect(201)
  ).body;
  await f
    .parent("post", `/time-requests/${r.id}/decision`, { approved: false })
    .expect(200);
  const policy = (
    await f.child("get", `/devices/${deviceId}/policy`, deviceId).expect(200)
  ).body;
  assert.equal(policy.extraTime, undefined);
});
test("SPEC-B: expired extra-time requests cannot be approved", async () => {
  const f = fixture(),
    { deviceId } = await f.pair();
  const r = (
    await f
      .child("post", `/devices/${deviceId}/time-requests`, deviceId, {
        minutes: 15,
        reason: "Synthetic request",
      })
      .expect(201)
  ).body;
  f.advance(3600001);
  await f
    .parent("post", `/time-requests/${r.id}/decision`, { approved: true })
    .expect(409);
});
test("SPEC-privacy: export excludes data from another family", async () => {
  const f = fixture(),
    first = await f.pair(),
    second = await f.pair();
  const exported = (
    await f.parent("post", `/families/${first.familyId}/export`, {}).expect(200)
  ).body;
  assert.deepEqual(
    exported.devices.map((d: any) => d.id),
    [first.deviceId],
  );
  assert.equal(
    exported.devices.some((d: any) => d.id === second.deviceId),
    false,
  );
  assert.equal(exported.devices[0].publicKey, undefined);
});
test("SPEC-images: failed Storage upload keeps a durable object cleanup job", async () => {
  const objects = new Map<string, Buffer>();
  const images: ImageStore = {
    async put(p, b) {
      objects.set(p, b);
      throw Error("synthetic interrupted upload");
    },
    async get(p) {
      return objects.get(p)!;
    },
    async remove(p) {
      objects.delete(p);
    },
  };
  const f = fixture(images),
    { deviceId } = await f.pair();
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await f
    .child("post", `/devices/${deviceId}/images`, deviceId, {
      base64: bytes.toString("base64"),
      childConfirmedShare: true,
    })
    .expect(500);
  assert.equal((await f.store.find("images", {})).length, 0);
  assert.equal((await f.store.find("storage_cleanup", {})).length, 1);
  await cleanupImages(f.store, images);
  assert.equal(objects.size, 0);
});
test("SPEC-J: revoked co-parent receives no subsequent FCM alert hints", async () => {
  const f = fixture(),
    { deviceId, familyId } = await f.pair();
  const inv = (
    await f.parent("post", `/families/${familyId}/invitations`, {}).expect(201)
  ).body;
  await f
    .parent("post", "/invitations/accept", { code: inv.code }, "parent-b")
    .expect(200);
  await f
    .parent("post", "/notifications/register", {
      token: "synthetic-token-parent-a-long-enough",
    })
    .expect(200);
  await f
    .parent(
      "post",
      "/notifications/register",
      { token: "synthetic-token-parent-b-long-enough" },
      "parent-b",
    )
    .expect(200);
  await f
    .parent("post", `/families/${familyId}/members/parent-b/revoke`, {})
    .expect(200);
  await f.child("post", `/devices/${deviceId}/sos`, deviceId, {}).expect(201);
  const sent: string[][] = [];
  await dispatchOne(f.store, async (tokens) => {
    sent.push(tokens);
  });
  assert.deepEqual(sent, [["synthetic-token-parent-a-long-enough"]]);
});
test("SPEC-API: safe JSON errors carry a request identifier", async () => {
  const f = fixture();
  const response = await f.api
    .post("/api/v1/families")
    .set("Authorization", "Bearer parent-a")
    .set("Content-Type", "application/json")
    .send("{broken")
    .expect(400);
  assert.equal(response.body.error, "invalid_json");
  assert.ok(response.headers["x-request-id"]);
  assert.equal(JSON.stringify(response.body).includes("stack"), false);
});
