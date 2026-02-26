import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ADMIN_EMAILS } from "@/lib/constants";

export async function POST(request: NextRequest) {
    try {
        // 1. Parse request body
        const { userId, adminEmail } = await request.json();

        if (!userId || !adminEmail) {
            return NextResponse.json(
                { error: "Missing userId or adminEmail" },
                { status: 400 }
            );
        }

        // 2. Verify the requester is an admin
        const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(adminEmail.toLowerCase());
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized: Not an admin" },
                { status: 403 }
            );
        }

        // 3. Prevent deleting admin accounts
        try {
            const userRecord = await adminAuth.getUser(userId);
            if (userRecord.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(userRecord.email.toLowerCase())) {
                return NextResponse.json(
                    { error: "Cannot delete admin accounts" },
                    { status: 403 }
                );
            }
        } catch (authErr: any) {
            // User might not exist in Auth (already deleted), continue to clean Firestore
            if (authErr.code !== "auth/user-not-found") {
                console.error("Error checking user in Auth:", authErr);
            }
        }

        const results: { step: string; status: string }[] = [];

        // 4. Delete from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
            results.push({ step: "Firebase Auth", status: "deleted" });
        } catch (authErr: any) {
            if (authErr.code === "auth/user-not-found") {
                results.push({ step: "Firebase Auth", status: "not_found (already deleted)" });
            } else {
                results.push({ step: "Firebase Auth", status: `error: ${authErr.message}` });
            }
        }

        // 5. Delete Firestore: users/{uid}/progress/* (subcollection)
        try {
            const progressSnap = await adminDb.collection("users").doc(userId).collection("progress").get();
            const progressBatch = adminDb.batch();
            progressSnap.docs.forEach(doc => progressBatch.delete(doc.ref));
            if (progressSnap.size > 0) await progressBatch.commit();
            results.push({ step: "Firestore progress", status: `deleted ${progressSnap.size} docs` });
        } catch (err: any) {
            results.push({ step: "Firestore progress", status: `error: ${err.message}` });
        }

        // 6. Delete Firestore: users/{uid}/activity/* (subcollection)
        try {
            const activitySnap = await adminDb.collection("users").doc(userId).collection("activity").get();
            const activityBatch = adminDb.batch();
            activitySnap.docs.forEach(doc => activityBatch.delete(doc.ref));
            if (activitySnap.size > 0) await activityBatch.commit();
            results.push({ step: "Firestore activity", status: `deleted ${activitySnap.size} docs` });
        } catch (err: any) {
            results.push({ step: "Firestore activity", status: `error: ${err.message}` });
        }

        // 7. Delete Firestore: users/{uid} (main doc)
        try {
            await adminDb.collection("users").doc(userId).delete();
            results.push({ step: "Firestore user doc", status: "deleted" });
        } catch (err: any) {
            results.push({ step: "Firestore user doc", status: `error: ${err.message}` });
        }

        // NOTE: Enrollments are NOT deleted - they serve as payment/revenue records
        // NOTE: Chats are NOT deleted - they serve as communication history

        return NextResponse.json({
            success: true,
            message: "User account deleted successfully",
            details: results
        });

    } catch (error: any) {
        console.error("Delete user API error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
