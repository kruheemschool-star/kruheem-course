"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import type { ExamPaper } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { Download, Clock, Loader2, Search, ShoppingBag, ArrowRight, XCircle, ListChecks, FileText } from "lucide-react";

// Cover accent gradients, cycled per paper (design-spec §2.2).
const COVER_ACCENTS = [
    { from: "#0D9488", to: "#0F766E" }, // teal
    { from: "#6366F1", to: "#4338CA" }, // purple
    { from: "#F59E0B", to: "#B45309" }, // orange
    { from: "#F43F5E", to: "#BE123C" }, // red
];

// Stable colour per paper — hash the id so a card keeps its colour regardless
// of list order or filtering.
function accentFor(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return COVER_ACCENTS[h % COVER_ACCENTS.length];
}

interface PaperFileLite { id: string; label: string }

interface PaperItem {
    id: string;         // enrollment id
    paperId: string;
    title: string;
    level: string;
    category: string;
    questionCount: number;
    files: PaperFileLite[];   // downloadable sets in this purchase
    status: "pending" | "approved" | "rejected" | "suspended";
}

/** Generated A4-style PDF cover — colored band on top, skeleton body below. */
function PaperCover({ level, accent }: { level: string; accent: { from: string; to: string } }) {
    return (
        <div
            className="relative w-[92px] h-[122px] rounded-[13px] overflow-hidden shrink-0"
            style={{ boxShadow: "0 8px 20px -12px rgba(15,23,42,0.35)" }}
        >
            {/* top colored band (~53%) */}
            <div
                className="relative h-[65px] px-2.5 pt-2"
                style={{ background: `linear-gradient(140deg, ${accent.from}, ${accent.to})` }}
            >
                <div className="text-[6.5px] font-bold tracking-wide text-white/80">ครูฮีม MATH</div>
                <div className="font-mero text-white text-[19px] leading-none mt-1.5">{level || "PDF"}</div>
                {/* faint math-symbol watermark */}
                <div className="absolute right-1.5 bottom-1 text-white/25 text-[13px] leading-none select-none" aria-hidden>∑ π</div>
                <div className="absolute right-2 top-1.5 text-white/20 text-[11px] leading-none select-none" aria-hidden>√ △</div>
            </div>
            {/* body */}
            <div className="h-[57px] bg-white px-2.5 py-2 flex flex-col justify-between">
                <div className="space-y-1">
                    <div className="h-[3px] rounded-full bg-slate-200 w-full" />
                    <div className="h-[3px] rounded-full bg-slate-200 w-4/5" />
                    <div className="h-[3px] rounded-full bg-slate-200 w-full" />
                    <div className="h-[3px] rounded-full bg-slate-200 w-2/3" />
                </div>
                <div className="text-[6.5px] font-bold" style={{ color: accent.from }}>✓ เฉลยละเอียด</div>
            </div>
        </div>
    );
}

export default function MyExamPapersPage() {
    const { user, loading: authLoading } = useUserAuth();
    const [items, setItems] = useState<PaperItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState("ทั้งหมด");

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Read own enrollments + the (public) examPapers catalog, then merge so
            // each card gets its rich fields (level/category/questionCount).
            const [enrollSnap, papersSnap] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("userId", "==", user.uid))),
                getDocs(collection(db, "examPapers")),
            ]);
            const paperById = new Map<string, ExamPaper>();
            papersSnap.docs.forEach((d) => paperById.set(d.id, { id: d.id, ...(d.data() as object) } as ExamPaper));

            const rows: PaperItem[] = enrollSnap.docs
                .map((d): Record<string, unknown> => ({ id: d.id, ...d.data() }))
                .filter((d) => d.productType === "examPaper" && d.paperId)
                .map((d) => {
                    const paper = paperById.get(d.paperId as string);
                    // New products list their files; old ones have a single legacy file.
                    const files: PaperFileLite[] = paper?.files?.length
                        ? paper.files.map((f) => ({ id: f.id, label: f.label }))
                        : (paper?.pdfPath ? [{ id: "legacy", label: "ดาวน์โหลด" }] : []);
                    return {
                        id: d.id as string,
                        paperId: d.paperId as string,
                        title: paper?.title || ((d.courseTitle as string) || "ข้อสอบ PDF").replace(/^ข้อสอบ PDF:\s*/, ""),
                        level: paper?.level || "",
                        category: paper?.category || "",
                        questionCount: Number(paper?.questionCount || 0),
                        files,
                        status: (d.status as PaperItem["status"]) || "pending",
                    };
                });
            setItems(rows);
        } catch (e) {
            console.error(e);
            toast.error("โหลดรายการไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

    const levels = useMemo(
        () => ["ทั้งหมด", ...Array.from(new Set(items.map((i) => i.level).filter(Boolean)))],
        [items],
    );

    const filtered = useMemo(
        () => items.filter(
            (i) =>
                (levelFilter === "ทั้งหมด" || i.level === levelFilter) &&
                (!search.trim() || i.title.toLowerCase().includes(search.trim().toLowerCase())),
        ),
        [items, levelFilter, search],
    );

    const readyCount = items.filter((i) => i.status === "approved").length;

    const download = async (paperId: string, fileId: string) => {
        if (!auth.currentUser) return;
        setDownloadingId(`${paperId}:${fileId}`);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch("/api/download-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ paperId, fileId }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) {
                toast.error(data.error === "not purchased" ? "ยังไม่ได้รับสิทธิ์ดาวน์โหลด" : "ดาวน์โหลดไม่สำเร็จ");
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="khep min-h-screen bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />
            <Toaster position="top-center" />
            <main className="pt-24 flex-1">
                <div className="max-w-[920px] mx-auto px-4 md:px-6 pb-20">
                    {/* header */}
                    <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--ep-teal)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ep-teal)" }} /> คลังข้อสอบของฉัน
                    </div>
                    <h1 className="text-[34px] md:text-[44px] leading-tight mt-2" style={{ color: "var(--ep-ink)" }}>ข้อสอบของฉัน</h1>
                    <p className="mt-2 text-[15px] md:text-[17px]" style={{ color: "var(--ep-ink2)" }}>
                        ไฟล์ PDF ที่คุณซื้อไว้ ดาวน์โหลดซ้ำได้ตลอด พร้อมเฉลยละเอียดทุกข้อ
                    </p>

                    {/* summary row */}
                    {user && !loading && items.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 mt-6">
                            <div className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border" style={{ background: "var(--ep-surface)", borderColor: "var(--ep-line)", boxShadow: "var(--ep-shadow-sm)" }}>
                                <FileText size={16} style={{ color: "var(--ep-ink3)" }} />
                                <span className="text-sm" style={{ color: "var(--ep-ink2)" }}><b className="font-mero" style={{ color: "var(--ep-ink)" }}>{items.length}</b> ชุดที่ซื้อไว้</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border" style={{ background: "var(--ep-surface)", borderColor: "var(--ep-line)", boxShadow: "var(--ep-shadow-sm)" }}>
                                <Download size={16} style={{ color: "var(--ep-teal)" }} />
                                <span className="text-sm" style={{ color: "var(--ep-ink2)" }}><b className="font-mero" style={{ color: "var(--ep-ink)" }}>{readyCount}</b> ชุดพร้อมโหลด</span>
                            </div>
                            <Link href="/exam-papers" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all" style={{ color: "var(--ep-teal)" }}>
                                ซื้อข้อสอบเพิ่ม <ArrowRight size={16} />
                            </Link>
                        </div>
                    )}

                    {/* search + level filters */}
                    {user && !loading && items.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5">
                            <div className="relative flex-1">
                                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ep-ink3)" }} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหาข้อสอบ..."
                                    className="w-full rounded-2xl pl-11 pr-4 py-3 text-[15px] outline-none border transition-colors"
                                    style={{ background: "var(--ep-surface)", borderColor: "var(--ep-line)", color: "var(--ep-ink)" }}
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {levels.map((l) => {
                                    const active = levelFilter === l;
                                    return (
                                        <button
                                            key={l}
                                            onClick={() => setLevelFilter(l)}
                                            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors border"
                                            style={active
                                                ? { background: "var(--ep-ink)", color: "var(--ep-paper)", borderColor: "var(--ep-ink)" }
                                                : { background: "var(--ep-surface)", color: "var(--ep-ink2)", borderColor: "var(--ep-line)" }}
                                        >
                                            {l}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* body */}
                    <div className="mt-6">
                        {authLoading || (loading && user) ? (
                            <div className="flex items-center justify-center py-24" style={{ color: "var(--ep-ink3)" }}>
                                <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
                            </div>
                        ) : !user ? (
                            <EmptyState
                                title="กรุณาเข้าสู่ระบบ"
                                desc="เข้าสู่ระบบเพื่อดูข้อสอบ PDF ที่คุณซื้อไว้"
                                cta={<Link href="/login?redirect=/my-exam-papers" className="ep-btn-primary">เข้าสู่ระบบ</Link>}
                            />
                        ) : items.length === 0 ? (
                            <EmptyState
                                title="ยังไม่มีข้อสอบที่ซื้อไว้"
                                desc="เลือกซื้อข้อสอบ PDF พร้อมเฉลย ดาวน์โหลดเก็บไว้ได้ตลอด"
                                cta={<Link href="/exam-papers" className="ep-btn-primary">ไปเลือกซื้อข้อสอบ</Link>}
                            />
                        ) : filtered.length === 0 ? (
                            <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: "var(--ep-line)", color: "var(--ep-ink3)" }}>
                                ไม่พบข้อสอบที่ค้นหา ลองเปลี่ยนคำค้นหรือตัวกรอง
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {filtered.map((it) => {
                                    const accent = accentFor(it.paperId);
                                    return (
                                        <div
                                            key={it.id}
                                            className="ep-card group flex items-start gap-4 sm:gap-5 rounded-[20px] border p-4 sm:p-5 transition-all"
                                            style={{ background: "var(--ep-surface)", borderColor: "var(--ep-line)", boxShadow: "var(--ep-shadow-sm)", ["--ep-accent" as string]: accent.from }}
                                        >
                                            <PaperCover level={it.level} accent={accent} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {it.level && (
                                                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: accent.from }}>{it.level}</span>
                                                    )}
                                                    {it.category && (
                                                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--ep-surface2)", color: "var(--ep-ink2)" }}>{it.category}</span>
                                                    )}
                                                </div>
                                                <h3 className="text-[17px] sm:text-[19px] font-bold mt-1.5 leading-snug line-clamp-2" style={{ color: "var(--ep-ink)", fontFamily: "var(--font-ibm-loop)" }}>{it.title}</h3>
                                                <div className="flex items-center gap-3 mt-1.5 text-[13px]" style={{ color: "var(--ep-ink3)" }}>
                                                    {it.questionCount > 0 && <span className="flex items-center gap-1.5"><ListChecks size={14} /> {it.questionCount} ข้อ</span>}
                                                    {it.status === "approved" && it.files.length > 1 && <span className="flex items-center gap-1.5"><FileText size={14} /> {it.files.length} ชุด</span>}
                                                </div>

                                                <div className="mt-3">
                                                    {it.status === "approved" ? (
                                                        it.files.length === 0 ? (
                                                            <span className="text-sm" style={{ color: "var(--ep-ink3)" }}>ไฟล์ยังไม่พร้อม</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {it.files.map((f) => {
                                                                    const busy = downloadingId === `${it.paperId}:${f.id}`;
                                                                    return (
                                                                        <button
                                                                            key={f.id}
                                                                            onClick={() => download(it.paperId, f.id)}
                                                                            disabled={busy}
                                                                            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                                                                            style={{ borderColor: "var(--ep-line)", color: "var(--ep-ink)", background: "var(--ep-surface)" }}
                                                                        >
                                                                            {busy
                                                                                ? <><Loader2 className="animate-spin" size={15} /> กำลังเตรียม...</>
                                                                                : <><Download size={15} style={{ color: "var(--ep-teal)" }} /> {f.label}</>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )
                                                    ) : it.status === "rejected" ? (
                                                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--ep-ink3)" }}>
                                                            <XCircle size={16} /> ไม่อนุมัติ
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold" style={{ background: "var(--ep-amber-soft)", color: "var(--ep-amber)" }}>
                                                            <Clock size={16} /> รอครูอนุมัติ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function EmptyState({ title, desc, cta }: { title: string; desc: string; cta: React.ReactNode }) {
    return (
        <div className="text-center py-20">
            <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--ep-surface2)" }}>
                <ShoppingBag size={26} style={{ color: "var(--ep-ink3)" }} />
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--ep-ink)" }}>{title}</div>
            <p className="mt-1.5 mb-6 text-[15px]" style={{ color: "var(--ep-ink2)" }}>{desc}</p>
            {cta}
        </div>
    );
}
