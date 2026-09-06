import type { ExamPaperAnalysis } from "@/types";

/**
 * "วิเคราะห์แนวข้อสอบ" — หมวดขายตัวจริงของหน้าขายชุดข้อสอบ PDF (ธีม Studio)
 *
 * โชว์ว่าบทไหนออกบ่อยที่สุดจากการนับข้อสอบจริงย้อนหลัง แล้วบอกว่าชุดนี้
 * ครอบคลุมแนวนั้นกี่เปอร์เซ็นต์ ไม่มีแถวข้อมูลก็ไม่ต้องขึ้นทั้งหมวด —
 * สินค้าที่ไม่ได้ทำวิเคราะห์มา (เช่น เอกสารสรุปบท) ต้องไม่ขึ้นพาดหัว
 * "วิเคราะห์จากข้อสอบจริง" เพราะเป็นการพูดเกินจริง
 *
 * แท่งยืดตามการเลื่อนหน้าด้วย CSS ล้วน (view-timeline ใน .khps-chart ที่
 * globals.css) — ไม่ใช้ JavaScript และไม่เล่นครั้งเดียวตอนโหลด
 */
export default function ExamAnalysisSection({ analysis }: { analysis?: ExamPaperAnalysis }) {
    const chapters = (analysis?.chapters || []).filter((c) => c.name?.trim()).slice(0, 10);
    if (chapters.length === 0) return null;

    const max = Math.max(...chapters.map((c) => c.percent || 0), 1);
    // ไล่เข้มตามอันดับ เพื่อให้บทที่ออกบ่อยที่สุดอ่านได้ก่อนโดยไม่ต้องใช้สีที่สอง
    const shade = (i: number) => (i < 2 ? "#0A5147" : i < 4 ? "#3E7A6E" : "#8FB3AB");
    const coverage = typeof analysis?.coverage === "number" && analysis.coverage > 0
        ? Math.round(analysis.coverage)
        : null;

    return (
        <section className="khps-sec">
            <div className="khps-eyebrow">
                วิเคราะห์จากข้อสอบจริง{analysis?.years ? ` ${analysis.years} ปีล่าสุด` : ""}
            </div>
            <h2 className="khps-h2 mt-3.5" style={{ maxWidth: "20ch" }}>
                {analysis?.headline || "บทไหนออกบ่อยที่สุด?"}
            </h2>
            {(analysis?.totalQuestions || analysis?.years) && (
                <p className="mt-4 text-[15px] font-light khps-muted" style={{ maxWidth: "62ch" }}>
                    {analysis?.totalQuestions
                        ? `นับจากข้อสอบจริง รวม ${analysis.totalQuestions.toLocaleString()} ข้อ — `
                        : ""}
                    เก็งจากข้อมูล ไม่ใช่เดา
                </p>
            )}

            <div
                className="grid gap-5 mt-9 items-start"
                style={{ gridTemplateColumns: coverage ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr" }}
            >
                <div className="khps-chart khps-card p-7 md:p-9" style={{ gridColumn: coverage ? "span 1" : "auto" }}>
                    <div className="flex flex-col gap-6">
                        {chapters.map((c, i) => (
                            <div key={`${c.name}-${i}`} data-row className="khps-chartrow">
                                <span className="text-[14.5px] font-medium leading-snug">{c.name}</span>
                                <span
                                    className="text-[14.5px] font-semibold tabular-nums"
                                    style={{ color: "var(--kp-accent)" }}
                                >
                                    {Math.round(c.percent)}%
                                </span>
                                <div className="khps-track">
                                    <div
                                        data-grow
                                        className="khps-fill"
                                        style={{
                                            width: `${Math.max(4, (c.percent / max) * 100)}%`,
                                            background: shade(i),
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {coverage !== null && (
                    <div
                        className="rounded-3xl p-8 md:p-9 text-white h-full flex flex-col justify-center"
                        style={{ background: "var(--kp-accent)" }}
                    >
                        <div className="khps-stat">{coverage}%</div>
                        <div className="mt-5 text-[17px] font-normal leading-snug" style={{ textWrap: "pretty" }}>
                            ชุดเก็งนี้ครอบคลุมแนวที่ออกบ่อย {coverage}%
                        </div>
                        <p
                            className="mt-3 text-[14.5px] font-light leading-relaxed"
                            style={{ color: "rgba(255,255,255,0.72)", textWrap: "pretty" }}
                        >
                            {analysis?.note || "ออกโจทย์ให้ตรงกับบทที่สถิติบอกว่าออกจริง — ฝึกตรงจุด ไม่เสียเวลา"}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
