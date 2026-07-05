import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

function getAdminApp(): App {
    if (_adminApp) return _adminApp;
    if (getApps().length > 0) {
        _adminApp = getApps()[0];
        return _adminApp;
    }

    // Use service account from environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Missing Firebase Admin environment variables. " +
            "Please set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env.local"
        );
    }

    _adminApp = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
    return _adminApp;
}

// Lazy getters — only initialize when actually called at runtime (not at build time)
export const adminAuth: Auth = new Proxy({} as Auth, {
    get(_, prop) {
        if (!_adminAuth) _adminAuth = getAuth(getAdminApp());
        return (_adminAuth as any)[prop];
    }
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
    get(_, prop) {
        if (!_adminDb) _adminDb = getFirestore(getAdminApp());
        return (_adminDb as any)[prop];
    }
});

export const adminStorage: Storage = new Proxy({} as Storage, {
    get(_, prop) {
        if (!_adminStorage) _adminStorage = getStorage(getAdminApp());
        return Reflect.get(_adminStorage as object, prop);
    }
});

// The default Storage bucket name (e.g. "my-project.appspot.com"), shared with
// the client config. Used by /api/download-pdf to sign the private master PDF.
export const ADMIN_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
