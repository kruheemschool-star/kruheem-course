"use client";
import { useState } from "react";
import Certificate from "@/app/components/Certificate";

export default function TestCertificatePage() {
    const [show, setShow] = useState(true);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-4">Certificate Preview</h1>
            <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => setShow(true)}
            >
                Show Certificate
            </button>
            {show && (
                <Certificate
                    studentName="น้องใจดี เรียนเก่ง"
                    courseTitle="คอร์สตะลุยโจทย์คณิตศาสตร์ ป.6 สอบเข้า ม.1"
                    onClose={() => setShow(false)}
                />
            )}
        </div>
    );
}
