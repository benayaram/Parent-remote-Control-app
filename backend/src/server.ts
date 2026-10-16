import { getStorage } from "firebase-admin/storage";
import { cleanupImages, type ImageStore } from "./images.js";
import { getMessaging } from "firebase-admin/messaging";
import { dispatchOne } from "./notifications.js";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createApp } from "./app.js";
import { mongoStore } from "./store.js";
if (
  !process.env.MONGODB_URI ||
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_STORAGE_BUCKET
)
  throw new Error(
    "MONGODB_URI, FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET required; see .env.example",
  );
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const store = await mongoStore(process.env.MONGODB_URI);
const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
const images: ImageStore = {
  async put(path, data) {
    await bucket.file(path).save(data, {
      resumable: false,
      validation: "crc32c",
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "private,no-store",
      },
    });
  },
  async get(path) {
    return (await bucket.file(path).download({ validation: "crc32c" }))[0];
  },
  async remove(path) {
    await bucket.file(path).delete({ ignoreNotFound: true });
  },
};
const app = createApp(
  store,
  async (token) => {
    const d = await getAuth().verifyIdToken(token, true);
    return {
      uid: d.uid,
      emailVerified: d.email_verified === true,
      authTime: d.auth_time,
    };
  },
  Date.now,
  images,
);
const server = app.listen(
  Number(process.env.PORT ?? 8080),
  process.env.HOST ?? "127.0.0.1",
  () => console.info("FamilyGuard API listening"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));

let dispatching = false;
const notificationTimer = setInterval(async () => {
  if (dispatching) return;
  dispatching = true;
  try {
    await dispatchOne(store, async (tokens, data, visible) => {
      const result = await getMessaging().sendEachForMulticast({
        tokens,
        data,
        ...(visible
          ? {
              notification: {
                title: "FamilyGuard update",
                body: "Open the app to review your family alert.",
              },
            }
          : {}),
      });
      if (result.failureCount) throw new Error("FCM partial delivery");
    });
  } catch {
    console.warn("Notification delivery deferred");
  } finally {
    dispatching = false;
  }
}, 3000);
notificationTimer.unref();

let cleaning = false;
const imageTimer = setInterval(async () => {
  if (cleaning) return;
  cleaning = true;
  try {
    await cleanupImages(store, images);
  } catch {
    console.warn("Image cleanup deferred");
  } finally {
    cleaning = false;
  }
}, 60000);
imageTimer.unref();
