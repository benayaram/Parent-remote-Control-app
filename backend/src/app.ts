import { normalizeImage, type ImageStore } from "./images.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  createHash,
  randomBytes,
  randomUUID,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import { z } from "zod";
import { type Store, type Row, collections } from "./store.js";
import { policySchema, commandSchema, resultStates } from "./contracts.js";
export type Identity = {
  uid: string;
  emailVerified: boolean;
  authTime: number;
};
export type VerifyToken = (token: string) => Promise<Identity>;
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
const fail = (status: number, code: string): never => {
  throw new ApiError(status, code);
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const date = (x: any) => new Date(x).getTime();
const id = z.string().uuid();
const capabilities = z
  .object({
    usage: z.boolean(),
    lock: z.boolean(),
    location: z.boolean(),
    suspend: z.boolean(),
    kiosk: z.boolean(),
    uninstall: z.boolean(),
  })
  .strict();
export function createApp(
  store: Store,
  verifyToken: VerifyToken,
  now = () => Date.now(),
  imageStore?: ImageStore,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use((req, res, next) => {
    res.setHeader("x-request-id", randomUUID());
    next();
  });
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/v1/devices/:id/images",
    express.json({
      limit: "3mb",
      verify: (req: any, _res, buf) => {
        req.raw = buf.toString("utf8");
      },
    }),
  );
  app.use(
    express.json({
      limit: "256kb",
      verify: (req: any, _res, buf) => {
        req.raw = buf.toString("utf8");
      },
    }),
  );
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "familyguard", version: 1 }),
  );
  const parent = async (req: Request): Promise<Identity> => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) fail(401, "authentication_required");
    let user: Identity;
    try {
      user = await verifyToken(token!);
    } catch {
      fail(401, "invalid_token");
    }
    if (!user!.emailVerified) fail(403, "verified_email_required");
    return user!;
  };
  const recent = (u: Identity) => {
    if (now() / 1000 - u.authTime > 300 || u.authTime > now() / 1000 + 30)
      fail(403, "reauthentication_required");
  };
  const member = async (s: Store, uid: string, familyId: string) => {
    const m = await s.get("family_memberships", familyId + ":" + uid);
    if (!m || m.revokedAt) fail(404, "not_found");
    return m!;
  };
  const device = async (s: Store, deviceId: string) => {
    const d = await s.get("devices", id.parse(deviceId));
    if (!d || d.revokedAt) fail(404, "not_found");
    return d!;
  };
  const signed = async (req: Request, s: Store): Promise<Row> => {
    const deviceId = id.parse(req.header("x-device-id"));
    const d = await device(s, deviceId);
    const time = req.header("x-device-time") ?? "";
    const nonce = id.parse(req.header("x-device-nonce"));
    const sig = req.header("x-device-signature") ?? "";
    if (!/^\d{13}$/.test(time) || Math.abs(now() - Number(time)) > 90000)
      fail(401, "stale_signature");
    const message = [
      req.method,
      req.originalUrl,
      time,
      nonce,
      hash((req as any).raw ?? ""),
    ].join("\n");
    let valid = false;
    try {
      valid = verifySignature(
        "sha256",
        Buffer.from(message),
        d.publicKey,
        Buffer.from(sig, "base64"),
      );
    } catch {}
    if (!valid) fail(401, "invalid_signature");
    const replayId = deviceId + ":" + nonce;
    if (await s.get("nonces", replayId)) fail(409, "replay");
    await s.put("nonces", {
      id: replayId,
      familyId: d.familyId,
      expiresAt: new Date(now() + 180000),
    });
    return d;
  };
  const parentDevice = async (req: Request, s: Store, deviceId: string) => {
    const u = await parent(req),
      d = await device(s, deviceId);
    await member(s, u.uid, d.familyId!);
    return { u, d };
  };
  const audit = async (
    s: Store,
    uid: string,
    familyId: string,
    action: string,
    targetId: string,
  ) =>
    s.put("audit_events", {
      id: randomUUID(),
      actorUid: uid,
      familyId,
      action,
      targetId,
      result: "accepted",
      createdAt: new Date(now()),
    });
  const route = (
    method: "get" | "post" | "put" | "delete",
    path: string,
    fn: (req: Request, s: Store) => Promise<any>,
    status = 200,
  ) => {
    app[method](
      "/api/v1" + path,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const value = await store.transaction((s) => fn(req, s));
          res.status(status).json(value);
        } catch (e) {
          next(e);
        }
      },
    );
  };
  route(
    "post",
    "/families",
    async (req, s) => {
      const u = await parent(req);
      const body = z
        .object({ name: z.string().trim().min(1).max(80) })
        .strict()
        .parse(req.body);
      const family = {
        id: randomUUID(),
        name: body.name,
        createdBy: u.uid,
        createdAt: new Date(now()),
      };
      await s.put("families", family);
      await s.put("users", {
        id: u.uid,
        firebaseUid: u.uid,
        status: "active",
        createdAt: new Date(now()),
      });
      await s.put("family_memberships", {
        id: family.id + ":" + u.uid,
        familyId: family.id,
        uid: u.uid,
        role: "primary_parent",
        verifiedAt: new Date(now()),
        revokedAt: null,
      });
      return family;
    },
    201,
  );
  route("get", "/families/:id", async (req, s) => {
    const u = await parent(req);
    const f = id.parse(req.params.id);
    await member(s, u.uid, f);
    return {
      ...(await s.get("families", f)),
      devices: (await s.find("devices", { familyId: f })).map(
        ({ publicKey, pushToken, ...d }) => d,
      ),
    };
  });
  route(
    "post",
    "/families/:id/invitations",
    async (req, s) => {
      const u = await parent(req);
      recent(u);
      const f = id.parse(req.params.id);
      const m = await member(s, u.uid, f);
      if (m.role !== "primary_parent") fail(403, "primary_parent_required");
      const code = randomBytes(16).toString("hex");
      await s.put("invitations", {
        id: hash(code),
        familyId: f,
        role: "co_parent",
        expiresAt: new Date(now() + 86400000),
        issuedBy: u.uid,
      });
      return { code, expiresAt: new Date(now() + 86400000) };
    },
    201,
  );
  route("post", "/invitations/accept", async (req, s) => {
    const u = await parent(req);
    recent(u);
    const { code } = z
      .object({ code: z.string().length(32) })
      .strict()
      .parse(req.body);
    const inv = await s.get("invitations", hash(code));
    if (!inv || date(inv.expiresAt) <= now() || inv.consumedAt)
      fail(400, "invalid_invitation");
    const existing = await s.get(
      "family_memberships",
      inv!.familyId + ":" + u.uid,
    );
    if (existing && !existing.revokedAt) fail(409, "already_a_member");
    await s.put("family_memberships", {
      id: inv!.familyId + ":" + u.uid,
      familyId: inv!.familyId,
      uid: u.uid,
      role: "co_parent",
      verifiedAt: new Date(now()),
      revokedAt: null,
    });
    await s.put("invitations", { ...inv!, consumedAt: new Date(now()) });
    return { familyId: inv!.familyId, role: "co_parent" };
  });
  route("post", "/families/:id/members/:uid/revoke", async (req, s) => {
    const u = await parent(req);
    recent(u);
    const f = id.parse(req.params.id);
    const m = await member(s, u.uid, f);
    if (m.role !== "primary_parent") fail(403, "primary_parent_required");
    const target = String(req.params.uid);
    if (target === u.uid) fail(400, "cannot_revoke_primary");
    const other = await member(s, target, f);
    await s.put("family_memberships", { ...other, revokedAt: new Date(now()) });
    return { revoked: true };
  });
  route(
    "post",
    "/pairing/sessions",
    async (req, s) => {
      const u = await parent(req);
      recent(u);
      const b = z
        .object({ familyId: id, childName: z.string().trim().min(1).max(80) })
        .strict()
        .parse(req.body);
      await member(s, u.uid, b.familyId);
      const code = randomBytes(12).toString("hex").toUpperCase(),
        sessionId = randomUUID();
      await s.put("pairing_sessions", {
        id: sessionId,
        ...b,
        codeHash: hash(code),
        issuedBy: u.uid,
        expiresAt: new Date(now() + 300000),
        state: "pending",
      });
      return { sessionId, code, expiresAt: new Date(now() + 300000) };
    },
    201,
  );
  route(
    "post",
    "/pairing/claim",
    async (req, s) => {
      const b = z
        .object({
          code: z.string().length(24),
          publicKey: z.string().max(2048),
          disclosureAccepted: z.literal(true),
          deviceName: z.string().min(1).max(80),
          androidApi: z.number().int().min(26).max(100),
          manufacturer: z.string().max(80),
        })
        .strict()
        .parse(req.body);
      let key;
      try {
        key = createPublicKey(b.publicKey);
      } catch {
        fail(400, "p256_key_required");
      }
      if (
        key!.asymmetricKeyType !== "ec" ||
        key!.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      )
        fail(400, "p256_key_required");
      const sessions = await s.find("pairing_sessions", {
        codeHash: hash(b.code.toUpperCase()),
      });
      const p = sessions[0];
      if (!p || date(p.expiresAt) <= now() || p.state !== "pending")
        fail(400, "invalid_pairing_code");
      const claimId = randomUUID();
      await s.put("pairing_sessions", {
        ...p,
        state: "claimed",
        claimId,
        claim: { ...b, code: undefined },
      });
      return { claimId, state: "awaiting_parent_confirmation" };
    },
    201,
  );
  route("post", "/pairing/confirm", async (req, s) => {
    const u = await parent(req);
    recent(u);
    const b = z.object({ sessionId: id, claimId: id }).strict().parse(req.body);
    const p = await s.get("pairing_sessions", b.sessionId);
    if (
      !p ||
      p.state !== "claimed" ||
      p.claimId !== b.claimId ||
      date(p.expiresAt) <= now()
    )
      fail(400, "invalid_claim");
    await member(s, u.uid, p!.familyId!);
    const deviceId = randomUUID(),
      childId = randomUUID();
    await s.put("children", {
      id: childId,
      familyId: p!.familyId,
      name: p!.childName,
    });
    const d = {
      id: deviceId,
      childId,
      familyId: p!.familyId,
      name: p!.claim.deviceName,
      publicKey: p!.claim.publicKey,
      androidApi: p!.claim.androidApi,
      manufacturer: p!.claim.manufacturer,
      managementMode: "standard",
      capabilities: {
        usage: false,
        lock: false,
        location: false,
        suspend: false,
        kiosk: false,
        uninstall: false,
      },
      lastSeenAt: null,
      revokedAt: null,
    };
    await s.put("devices", d);
    await s.put("pairing_sessions", { ...p!, state: "consumed", deviceId });
    await audit(s, u.uid, d.familyId!, "pairing.confirm", deviceId);
    return { deviceId, childId, state: "paired" };
  });
  // Public claim status contains only a random device ID, never credentials or personal details.
  route("get", "/pairing/claims/:id", async (req, s) => {
    const claimId = id.parse(req.params.id);
    const p = (await s.find("pairing_sessions", { claimId }))[0];
    if (!p || date(p.expiresAt) <= now()) fail(404, "not_found");
    return {
      state: p!.state,
      deviceId: p!.state === "consumed" ? p!.deviceId : undefined,
    };
  });
  route("get", "/devices/:id", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    const { publicKey, pushToken, ...safe } = d;
    return safe;
  });
  route("get", "/devices/:id/capabilities", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    return { mode: d.managementMode, capabilities: d.capabilities };
  });
  route("post", "/devices/:id/heartbeat", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({
        capabilities,
        managementMode: z.enum(["standard", "managed"]),
        battery: z.number().int().min(0).max(100).optional(),
      })
      .strict()
      .parse(req.body);
    await s.put("devices", { ...d, ...b, lastSeenAt: new Date(now()) });
    return { received: true, serverTime: now() };
  });
  route("post", "/devices/:id/revoke", async (req, s) => {
    const { u, d } = await parentDevice(req, s, String(req.params.id));
    recent(u);
    await s.put("devices", { ...d, revokedAt: new Date(now()) });
    for (const c of await s.find("commands", { deviceId: d.id }))
      if (["pending", "delivered"].includes(c.status))
        await s.put("commands", { ...c, status: "cancelled" });
    await audit(s, u.uid, d.familyId!, "device.revoke", d.id);
    return { revoked: true };
  });
  route("get", "/devices/:id/policy", async (req, s) => {
    let d: Row;
    if (req.header("x-device-id")) {
      d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
    } else d = (await parentDevice(req, s, String(req.params.id))).d;
    return (
      (await s.get("policies", d.id)) ?? {
        deviceId: d.id,
        version: 0,
        timezone: "UTC",
        dailyMinutes: 120,
        appRules: [],
        studyWindows: [],
        bedtimeWindows: [],
        webRules: { allow: [], deny: [] },
      }
    );
  });
  route("put", "/devices/:id/policy", async (req, s) => {
    const { u, d } = await parentDevice(req, s, String(req.params.id));
    const b = policySchema.parse(req.body);
    const old = await s.get("policies", d.id);
    const p = {
      ...b,
      id: d.id,
      deviceId: d.id,
      familyId: d.familyId,
      version: (old?.version ?? 0) + 1,
      updatedBy: u.uid,
      updatedAt: new Date(now()),
    };
    await s.put("policies", p);
    await audit(s, u.uid, d.familyId!, "policy.update", d.id);
    return p;
  });
  route(
    "post",
    "/devices/:id/commands",
    async (req, s) => {
      const { u, d } = await parentDevice(req, s, String(req.params.id));
      recent(u);
      const b = commandSchema.parse(req.body);
      if (b.type === "lock" && !d.capabilities.lock)
        fail(409, "capability_unavailable");
      const existing = (
        await s.find("commands", {
          deviceId: d.id,
          idempotencyKey: b.idempotencyKey,
        })
      )[0];
      if (existing) return existing;
      const c = {
        id: randomUUID(),
        deviceId: d.id,
        familyId: d.familyId,
        ...b,
        issuedBy: u.uid,
        issuedAt: new Date(now()),
        expiresAt: new Date(now() + 120000),
        status: "pending",
      };
      await s.put("commands", c);
      await s.put("notification_outbox", {
        id: c.id,
        familyId: d.familyId,
        deviceId: d.id,
        target: "child",
        type: "command_available",
        status: "pending",
        attempts: 0,
        createdAt: new Date(now()),
      });
      await audit(s, u.uid, d.familyId!, "command." + b.type, c.id);
      return c;
    },
    201,
  );
  route("get", "/devices/:id/commands", async (req, s) => {
    let d: Row;
    const child = !!req.header("x-device-id");
    if (child) {
      d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
    } else d = (await parentDevice(req, s, String(req.params.id))).d;
    const out = [];
    for (let c of await s.find("commands", { deviceId: d.id })) {
      if (
        ["pending", "delivered"].includes(c.status) &&
        date(c.expiresAt) <= now()
      ) {
        c = { ...c, status: "expired" };
        await s.put("commands", c);
      }
      if (child && c.status === "pending") {
        c = { ...c, status: "delivered" };
        await s.put("commands", c);
      }
      if (!child || c.status === "delivered") out.push(c);
    }
    return out;
  });
  route("post", "/commands/:id/ack", async (req, s) => {
    const d = await signed(req, s);
    const c = await s.get("commands", id.parse(req.params.id));
    if (!c || c.deviceId !== d.id) fail(404, "not_found");
    const b = z
      .object({
        status: z.enum(resultStates),
        reason: z.string().max(200).optional(),
      })
      .strict()
      .parse(req.body);
    if (date(c!.expiresAt) <= now()) fail(409, "command_expired");
    if (!["pending", "delivered"].includes(c!.status)) {
      if (c!.status === b.status) return c;
      fail(409, "terminal_command");
    }
    const updated = { ...c!, ...b, acknowledgedAt: new Date(now()) };
    await s.put("commands", updated);
    await s.put("command_acknowledgements", {
      id: c!.id,
      deviceId: d.id,
      familyId: d.familyId,
      ...b,
      createdAt: new Date(now()),
    });
    return updated;
  });
  route("post", "/devices/:id/usage", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({
        timezone: policySchema.shape.timezone,
        localDate: z.iso.date(),
        samples: z
          .array(
            z
              .object({
                packageName: z.string().min(3).max(200),
                foregroundSeconds: z.number().int().min(0).max(172800),
                sourceQuality: z.enum(["sampled", "partial"]),
              })
              .strict(),
          )
          .max(200),
      })
      .strict()
      .parse(req.body);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: b.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now()));
    if (b.localDate > today || now() - Date.parse(b.localDate) > 32 * 86400000)
      fail(400, "invalid_usage_date");
    for (const sample of b.samples) {
      const recordId = d.id + ":" + b.localDate + ":" + sample.packageName;
      await s.put("usage_summaries", {
        id: recordId,
        deviceId: d.id,
        familyId: d.familyId,
        localDate: b.localDate,
        timezone: b.timezone,
        ...sample,
        syncedAt: new Date(now()),
        expiresAt: new Date(now() + 30 * 86400000),
      });
    }
    return { received: b.samples.length };
  });
  route("get", "/devices/:id/usage", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    return (await s.find("usage_summaries", { deviceId: d.id })).filter(
      (x) => date(x.expiresAt) > now(),
    );
  });
  route("post", "/devices/:id/location", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracyMeters: z.number().min(0).max(100000),
        capturedAt: z.iso.datetime(),
        consent: z.literal(true),
      })
      .strict()
      .parse(req.body);
    if (
      date(b.capturedAt) > now() + 60000 ||
      date(b.capturedAt) < now() - 48 * 3600000
    )
      fail(400, "stale_location");
    await s.put("location_samples", {
      id: randomUUID(),
      deviceId: d.id,
      familyId: d.familyId,
      ...b,
      expiresAt: new Date(date(b.capturedAt) + 48 * 3600000),
    });
    return { received: true };
  });
  route("get", "/devices/:id/location", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    const samples = (await s.find("location_samples", { deviceId: d.id }))
      .filter((x) => date(x.expiresAt) > now())
      .sort((a, b) => date(b.capturedAt) - date(a.capturedAt));
    return { sample: samples[0] ?? null };
  });
  route(
    "post",
    "/devices/:id/sos",
    async (req, s) => {
      const d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
      z.object({}).strict().parse(req.body);
      const alert = {
        id: randomUUID(),
        familyId: d.familyId,
        deviceId: d.id,
        type: "sos",
        createdAt: new Date(now()),
        delivery: "stored_not_guaranteed",
      };
      await s.put("alerts", alert);
      await s.put("notification_outbox", {
        id: alert.id,
        familyId: d.familyId,
        deviceId: d.id,
        target: "parents",
        type: "sos",
        status: "pending",
        attempts: 0,
        createdAt: new Date(now()),
      });
      return alert;
    },
    201,
  );
  route("get", "/families/:id/alerts", async (req, s) => {
    const u = await parent(req);
    const f = id.parse(req.params.id);
    await member(s, u.uid, f);
    return await s.find("alerts", { familyId: f });
  });
  route(
    "post",
    "/devices/:id/time-requests",
    async (req, s) => {
      const d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
      const b = z
        .object({
          minutes: z.number().int().min(5).max(120),
          reason: z.string().max(200),
        })
        .strict()
        .parse(req.body);
      const request = {
        id: randomUUID(),
        deviceId: d.id,
        familyId: d.familyId,
        ...b,
        status: "pending",
        createdAt: new Date(now()),
        expiresAt: new Date(now() + 3600000),
      };
      await s.put("time_requests", request);
      await s.put("notification_outbox", {
        id: request.id,
        familyId: d.familyId,
        deviceId: d.id,
        target: "parents",
        type: "time_request",
        status: "pending",
        attempts: 0,
        createdAt: new Date(now()),
      });
      return request;
    },
    201,
  );
  route("get", "/devices/:id/time-requests", async (req, s) => {
    let d: Row;
    if (req.header("x-device-id")) {
      d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
    } else d = (await parentDevice(req, s, String(req.params.id))).d;
    return await s.find("time_requests", { deviceId: d.id });
  });
  route("post", "/time-requests/:id/decision", async (req, s) => {
    const u = await parent(req);
    const r = await s.get("time_requests", id.parse(req.params.id));
    if (!r) fail(404, "not_found");
    await member(s, u.uid, r!.familyId!);
    if (r!.status !== "pending" || date(r!.expiresAt) <= now())
      fail(409, "request_closed");
    const b = z.object({ approved: z.boolean() }).strict().parse(req.body);
    const updated = {
      ...r!,
      status: b.approved ? "approved" : "denied",
      decidedBy: u.uid,
      decidedAt: new Date(now()),
    };
    await s.put("time_requests", updated);
    await s.put("notification_outbox", {
      id: updated.id,
      familyId: r!.familyId,
      deviceId: r!.deviceId,
      target: "child",
      type: "policy_updated",
      status: "pending",
      attempts: 0,
      createdAt: new Date(now()),
    });
    if (b.approved) {
      const p = (await s.get("policies", r!.deviceId)) ?? {
        id: r!.deviceId,
        deviceId: r!.deviceId,
        familyId: r!.familyId,
        version: 0,
        timezone: "UTC",
        dailyMinutes: 120,
        appRules: [],
        studyWindows: [],
        bedtimeWindows: [],
        webRules: { deny: [], allow: [] },
      };
      await s.put("policies", {
        ...p,
        version: p.version + 1,
        extraTime: {
          minutes: r!.minutes,
          expiresAt: new Date(now() + 3600000),
        },
        updatedBy: u.uid,
        updatedAt: new Date(now()),
      });
    }
    await audit(s, u.uid, r!.familyId!, "time_request.decision", r!.id);
    return updated;
  });
  route("post", "/families/:id/export", async (req, s) => {
    const u = await parent(req);
    recent(u);
    const f = id.parse(req.params.id);
    await member(s, u.uid, f);
    const out: Record<string, any> = {};
    for (const c of collections.filter(
      (c) => !["nonces", "pairing_sessions"].includes(c),
    )) {
      out[c] = (await s.find(c, { familyId: f })).map(
        ({ publicKey, pushToken, token, ...safe }) => safe,
      );
    }
    out.family = await s.get("families", f);
    return out;
  });
  route("delete", "/families/:id/data", async (req, s) => {
    const u = await parent(req);
    recent(u);
    const f = id.parse(req.params.id);
    const m = await member(s, u.uid, f);
    if (m.role !== "primary_parent") fail(403, "primary_parent_required");
    for (const c of collections) {
      let rows;
      do {
        rows = await s.find(c, { familyId: f });
        for (const row of rows) {
          if (c === "images")
            await s.put("storage_cleanup", {
              id: row.id,
              storagePath: row.storagePath,
            });
          await s.remove(c, row.id);
        }
      } while (rows.length > 0);
    }
    await s.remove("families", f);
    return { deleted: true };
  });
  route("post", "/notifications/register", async (req, s) => {
    const u = await parent(req);
    const b = z
      .object({ token: z.string().min(20).max(4096) })
      .strict()
      .parse(req.body);
    await s.put("push_tokens", {
      id: hash(b.token),
      uid: u.uid,
      token: b.token,
      updatedAt: new Date(now()),
    });
    return { registered: true };
  });
  route("post", "/devices/:id/push-token", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({ token: z.string().min(20).max(4096) })
      .strict()
      .parse(req.body);
    await s.put("devices", { ...d, pushToken: b.token });
    return { registered: true };
  });
  route("get", "/devices/:id/geofences", async (req, s) => {
    let d: Row;
    if (req.header("x-device-id")) {
      d = await signed(req, s);
      if (d.id !== req.params.id) fail(404, "not_found");
    } else d = (await parentDevice(req, s, String(req.params.id))).d;
    return await s.find("geofences", { deviceId: d.id });
  });
  route("put", "/devices/:id/geofences", async (req, s) => {
    const { u, d } = await parentDevice(req, s, String(req.params.id));
    const b = z
      .object({
        zones: z
          .array(
            z
              .object({
                name: z.string().trim().min(1).max(60),
                lat: z.number().min(-90).max(90),
                lng: z.number().min(-180).max(180),
                radiusMeters: z.number().min(100).max(10000),
              })
              .strict(),
          )
          .max(20),
      })
      .strict()
      .parse(req.body);
    for (const old of await s.find("geofences", { deviceId: d.id }))
      await s.remove("geofences", old.id);
    const zones = [];
    for (const zone of b.zones) {
      const row = {
        id: randomUUID(),
        deviceId: d.id,
        familyId: d.familyId,
        ...zone,
      };
      await s.put("geofences", row);
      zones.push(row);
    }
    await audit(s, u.uid, d.familyId!, "geofences.update", d.id);
    return zones;
  });
  route("post", "/devices/:id/geofence-events", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({
        geofenceId: id,
        transition: z.enum(["enter", "exit"]),
        capturedAt: z.iso.datetime(),
      })
      .strict()
      .parse(req.body);
    const zone = await s.get("geofences", b.geofenceId);
    if (!zone || zone.deviceId !== d.id) fail(404, "not_found");
    if (Math.abs(date(b.capturedAt) - now()) > 3600000)
      fail(400, "stale_transition");
    const alert = {
      id: randomUUID(),
      deviceId: d.id,
      familyId: d.familyId,
      type: "geofence",
      ...b,
      createdAt: new Date(now()),
    };
    await s.put("alerts", alert);
    await s.put("notification_outbox", {
      id: alert.id,
      familyId: d.familyId,
      deviceId: d.id,
      target: "parents",
      type: "geofence",
      status: "pending",
      attempts: 0,
      createdAt: new Date(now()),
    });
    return { stored: true };
  });
  app.post(
    "/api/v1/devices/:id/images",
    async (req: Request, res: Response, next: NextFunction) => {
      let imageId: string | undefined;
      let storagePath: string | undefined;
      try {
        if (!imageStore) fail(503, "image_storage_not_configured");
        const d = await store.transaction(async (s) => {
          const d = await signed(req, s);
          if (d.id !== req.params.id) fail(404, "not_found");
          return d;
        });
        const b = z
          .object({
            base64: z.string().max(2800000),
            childConfirmedShare: z.literal(true),
          })
          .strict()
          .parse(req.body);
        let data: Buffer;
        try {
          data = await normalizeImage(b.base64);
        } catch {
          fail(400, "invalid_image");
        }
        imageId = randomUUID();
        storagePath = `families/${d.familyId}/devices/${d.id}/${imageId}.jpg`;
        await store.transaction((s) =>
          s.put("images", {
            id: imageId!,
            familyId: d.familyId,
            deviceId: d.id,
            storagePath,
            createdAt: new Date(now()),
            expiresAt: new Date(now() + 86400000),
            status: "uploading",
          }),
        );
        await imageStore!.put(storagePath, data!);
        await store.transaction(async (s) => {
          const row = await s.get("images", imageId!);
          const current = await s.get("devices", d.id);
          if (!row || !current || current.revokedAt)
            fail(409, "supervision_revoked");
          await s.put("images", {
            ...row!,
            status: "ready",
            bytes: data!.length,
          });
        });
        res.status(201).json({
          id: imageId,
          expiresAt: new Date(now() + 86400000),
          shared: true,
        });
      } catch (e) {
        if (imageId && storagePath)
          await store.transaction(async (s) => {
            await s.put("storage_cleanup", { id: imageId!, storagePath });
            await s.remove("images", imageId!);
          });
        next(e);
      }
    },
  );
  route("get", "/devices/:id/images", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    return (await s.find("images", { deviceId: d.id }))
      .filter((r) => r.status === "ready" && date(r.expiresAt) > now())
      .map(({ storagePath, ...safe }) => safe);
  });
  app.get(
    "/api/v1/images/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!imageStore) fail(503, "image_storage_not_configured");
        const row = await store.transaction(async (s) => {
          const u = await parent(req);
          const row = await s.get("images", id.parse(req.params.id));
          if (!row || row.status !== "ready" || date(row.expiresAt) <= now())
            fail(404, "not_found");
          await member(s, u.uid, row!.familyId!);
          return row!;
        });
        const bytes = await imageStore!.get(row.storagePath);
        res.setHeader("Cache-Control", "no-store");
        res.json({ mime: "image/jpeg", base64: bytes.toString("base64") });
      } catch (e) {
        next(e);
      }
    },
  );
  route("post", "/devices/:id/apps", async (req, s) => {
    const d = await signed(req, s);
    if (d.id !== req.params.id) fail(404, "not_found");
    const b = z
      .object({
        partial: z.literal(true),
        apps: z
          .array(
            z
              .object({
                packageName: z.string().min(3).max(200),
                label: z.string().max(200),
                version: z.string().max(100),
                visibility: z.literal("partial"),
              })
              .strict(),
          )
          .max(200),
      })
      .strict()
      .parse(req.body);
    await s.put("app_inventory", {
      id: d.id,
      deviceId: d.id,
      familyId: d.familyId,
      ...b,
      updatedAt: new Date(now()),
    });
    return { received: b.apps.length, partial: true };
  });
  route("get", "/devices/:id/apps", async (req, s) => {
    const { d } = await parentDevice(req, s, String(req.params.id));
    return (
      (await s.get("app_inventory", d.id)) ?? {
        apps: [],
        partial: true,
        updatedAt: null,
      }
    );
  });
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((e: any, _req: Request, res: Response, _next: NextFunction) => {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "invalid_input" });
    if (e instanceof ApiError)
      return res.status(e.status).json({ error: e.code });
    if (e?.type === "entity.too.large")
      return res.status(413).json({ error: "payload_too_large" });
    if (e?.type === "entity.parse.failed")
      return res.status(400).json({ error: "invalid_json" });
    return res.status(500).json({ error: "internal_error" });
  });
  return app;
}
