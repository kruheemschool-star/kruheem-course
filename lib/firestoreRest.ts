// Read Firestore collections from server-side route handlers via the REST API
// instead of the Firebase *client* SDK.
//
// Why this exists: the Firebase client SDK (`firebase/firestore`) is built for
// the browser and is unreliable inside Next.js route handlers on Vercel — it
// was resolving with an EMPTY snapshot for the heavier `courses`/`posts` feeds,
// which then got frozen into the ISR cache and blanked the homepage grid. The
// Admin SDK is the usual server-side answer, but its production credentials are
// not reliably configured here (see /api/exam-averages returning 500 in prod).
// The REST API is plain HTTPS + the public web API key (the same `read: if true`
// path the browser uses), works in every runtime, and — via `mask.fieldPaths` —
// does true server-side field projection, so we ship only the fields the UI
// needs rather than every document's full body.

type FsValue =
    | { stringValue: string }
    | { integerValue: string }
    | { doubleValue: number }
    | { booleanValue: boolean }
    | { timestampValue: string }
    | { nullValue: null }
    | { arrayValue: { values?: FsValue[] } }
    | { mapValue: { fields?: Record<string, FsValue> } };

function decode(v: FsValue): unknown {
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("timestampValue" in v) return v.timestampValue; // ISO 8601 string
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decode);
    if ("mapValue" in v) {
        const o: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v.mapValue.fields ?? {})) o[k] = decode(val);
        return o;
    }
    return undefined;
}

export interface FsDoc {
    id: string;
    [field: string]: unknown;
}

/**
 * fetch() with a hard timeout. Server-side reads on the homepage critical path
 * must never hang forever: the homepage server component awaits getActivePromotion
 * (→ getDocument) BEFORE rendering anything, so an unbounded fetch that stalls
 * leaves the `/` RSC response hanging and makes navigation (e.g. clicking the
 * logo) appear stuck on the current page. On timeout the request aborts and
 * throws, which callers already treat as "no data" (getActivePromotion catches
 * it and returns null → the page renders without the promo). Cache hits resolve
 * before any network call, so the timeout only bounds the slow/revalidation path.
 */
async function fetchFs(
    url: string,
    revalidate: number,
    label: string,
    timeoutMs = 8000,
    noStore = false,
): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        // `noStore` bypasses Next.js's fetch data cache. Use it for responses
        // larger than the 2MB cache limit (e.g. reading exams *with* their full
        // `questions` arrays): Next can't cache those and logs a noisy
        // "items over 2MB can not be cached" error on every revalidation.
        const init: RequestInit = noStore
            ? { cache: "no-store", signal: ctrl.signal }
            : { next: { revalidate }, signal: ctrl.signal };
        return await fetch(url, init);
    } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
            throw new Error(`Firestore REST ${label}: timed out after ${timeoutMs}ms`);
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * List a Firestore collection via REST, projecting only `fields` server-side.
 * Returns decoded plain objects shaped { id, ...fields }. Follows pagination.
 */
export async function listCollection(
    collectionId: string,
    fields: string[],
    opts: { pageSize?: number; revalidate?: number; noStore?: boolean } = {}
): Promise<FsDoc[]> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!projectId || !apiKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_API_KEY"
        );
    }

    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`;
    const out: FsDoc[] = [];
    let pageToken: string | undefined;

    do {
        const params = new URLSearchParams({
            key: apiKey,
            pageSize: String(opts.pageSize ?? 300),
        });
        for (const f of fields) params.append("mask.fieldPaths", f);
        if (pageToken) params.set("pageToken", pageToken);

        const res = await fetchFs(`${base}?${params.toString()}`, opts.revalidate ?? 300, collectionId, 8000, opts.noStore ?? false);
        if (!res.ok) {
            throw new Error(`Firestore REST ${collectionId}: HTTP ${res.status}`);
        }

        const json = (await res.json()) as {
            documents?: { name: string; fields?: Record<string, FsValue> }[];
            nextPageToken?: string;
        };

        for (const d of json.documents ?? []) {
            const doc: FsDoc = { id: d.name.split("/").pop() ?? "" };
            for (const [k, v] of Object.entries(d.fields ?? {})) doc[k] = decode(v);
            out.push(doc);
        }
        pageToken = json.nextPageToken;
    } while (pageToken);

    return out;
}

/**
 * Read a SINGLE Firestore document via REST (e.g. "settings/homepage_promotion").
 * Returns { id, ...fields } decoded, or null if the document does not exist.
 * Subject to security rules (public web key) — the doc must allow public read.
 */
export async function getDocument(
    path: string,
    opts: { revalidate?: number } = {}
): Promise<FsDoc | null> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!projectId || !apiKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_API_KEY"
        );
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}`;
    const res = await fetchFs(url, opts.revalidate ?? 300, path);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore REST ${path}: HTTP ${res.status}`);

    const json = (await res.json()) as { name?: string; fields?: Record<string, FsValue> };
    const doc: FsDoc = { id: (json.name ?? "").split("/").pop() ?? "" };
    for (const [k, v] of Object.entries(json.fields ?? {})) doc[k] = decode(v);
    return doc;
}
