/**
 * Report Formatter — แปลงข้อมูลสถิติเป็น Markdown สำหรับส่งให้ AI วิเคราะห์
 *
 * Pure functions — ไม่มี side effects, ไม่ดึง Firestore เพิ่ม
 */

import type { CourseCompletionData, EngagingLesson, DropOffPoint, ActiveStudent } from "@/hooks/useAdminLearningStats";

export type ReportRange = "day" | "week" | "month" | "year";

// ---------- Stats shape (subset of useAdminStats memo output) ----------
export interface ReportRevenueStats {
    totalRevenue: number;
    totalStudents: number;
    revenueGrowth: number;
    aov: number;
    ltv: number;
    retentionRate: number;
    monthlyData: { month: string; revenue: number; students: number; prevRevenue: number }[];
    courseData: { title: string; revenue: number; students: number }[];
    dailyData: { date: string; revenue: number; students: number }[];
}

export interface ReportInput {
    range: ReportRange;
    selectedYear: number;
    selectedMonth?: number; // 0-11, used when range === "month"
    adminEmail: string;
    generatedAt: Date;

    // Traffic
    dailyVisits: Record<string, number>; // "YYYY-MM-DD" -> count
    totalVisits: number;
    deviceStats: { mobile: number; tablet: number; desktop: number };
    sourceStats: Record<string, number>;
    pageViewStats: Record<string, number>;

    // Revenue (computed in useAdminStats.stats)
    revenue: ReportRevenueStats;

    // Pending
    pendingCount: number;
    ticketsCount: number;

    // Learning (optional — undefined if user ไม่ได้กดโหลด)
    learning?: {
        overallCompletionRate: number;
        averageActiveDays: number;
        activeStudentsTrend: { date: string; count: number }[];
        courseCompletionRates: CourseCompletionData[];
        mostEngagingLessons: EngagingLesson[];
        dropOffPoints: DropOffPoint[];
        topActiveStudents: ActiveStudent[];
    };
}

// ===================== Helpers =====================

const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function toISODate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtThaiDate(d: Date, opts?: { withYear?: boolean }): string {
    const day = d.getDate();
    const month = TH_MONTHS_SHORT[d.getMonth()];
    if (opts?.withYear) return `${day} ${month} ${d.getFullYear() + 543}`;
    return `${day} ${month}`;
}

function fmtThaiDateTime(d: Date): string {
    return `${fmtThaiDate(d, { withYear: true })} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtNumber(n: number): string {
    return n.toLocaleString("en-US");
}

function fmtBaht(n: number): string {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} บาท`;
}

function fmtPercent(n: number, digits = 1): string {
    return `${n.toFixed(digits)}%`;
}

// ===================== Range helpers =====================

export function getRangeBoundaries(
    range: ReportRange,
    selectedYear: number,
    selectedMonth?: number,
    now = new Date()
): { from: Date; to: Date } {
    const to = new Date(now);
    let from: Date;

    switch (range) {
        case "day": {
            from = new Date(now);
            from.setHours(0, 0, 0, 0);
            break;
        }
        case "week": {
            from = new Date(now);
            from.setDate(from.getDate() - 6);
            from.setHours(0, 0, 0, 0);
            break;
        }
        case "month": {
            const m = selectedMonth ?? now.getMonth();
            const y = selectedYear ?? now.getFullYear();
            from = new Date(y, m, 1, 0, 0, 0, 0);
            // Last day of selected month
            const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
            return { from, to: end < now ? end : (from.getFullYear() === now.getFullYear() && from.getMonth() === now.getMonth() ? now : end) };
        }
        case "year": {
            from = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
            const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
            return { from, to: end < now ? end : now };
        }
    }
    return { from, to };
}

export function getRangeLabel(
    range: ReportRange,
    selectedYear: number,
    selectedMonth?: number,
    now = new Date()
): string {
    const { from, to } = getRangeBoundaries(range, selectedYear, selectedMonth, now);
    switch (range) {
        case "day":
            return `รายวัน (${fmtThaiDate(now, { withYear: true })})`;
        case "week":
            return `รายสัปดาห์ (${fmtThaiDate(from)} – ${fmtThaiDate(to, { withYear: true })})`;
        case "month":
            return `รายเดือน (${TH_MONTHS_SHORT[from.getMonth()]} ${from.getFullYear() + 543})`;
        case "year":
            return `รายปี (พ.ศ. ${selectedYear + 543})`;
    }
}

function filterDailyVisits(dailyVisits: Record<string, number>, from: Date, to: Date): { date: string; count: number }[] {
    const list: { date: string; count: number }[] = [];
    const d = new Date(from);
    while (d <= to) {
        const key = toISODate(d);
        list.push({ date: key, count: dailyVisits[key] || 0 });
        d.setDate(d.getDate() + 1);
    }
    return list;
}

function filterDailyRevenue(
    dailyData: { date: string; revenue: number; students: number }[],
    from: Date,
    to: Date
): { date: string; revenue: number; students: number }[] {
    const fromKey = toISODate(from);
    const toKey = toISODate(to);
    return dailyData.filter(d => d.date >= fromKey && d.date <= toKey);
}

// ===================== Section formatters =====================

function formatHeader(input: ReportInput): string {
    const lines = [
        `# 📊 รายงานสถิติ KruHeem Math`,
        ``,
        `- **ช่วงเวลา:** ${getRangeLabel(input.range, input.selectedYear, input.selectedMonth, input.generatedAt)}`,
        `- **สร้างเมื่อ:** ${fmtThaiDateTime(input.generatedAt)}`,
        `- **ผู้ส่งออก:** ${input.adminEmail}`,
        ``,
        `> รายงานนี้รวมข้อมูลสถิติ aggregated เพื่อนำไปวิเคราะห์ — ไม่มี PII (Personally Identifiable Information) ของนักเรียน`,
        ``,
    ];
    return lines.join("\n");
}

function formatTrafficSection(input: ReportInput): string {
    const { from, to } = getRangeBoundaries(input.range, input.selectedYear, input.selectedMonth, input.generatedAt);
    const daily = filterDailyVisits(input.dailyVisits, from, to);
    const total = daily.reduce((s, d) => s + d.count, 0);
    const avg = daily.length > 0 ? Math.round(total / daily.length) : 0;
    const peak = daily.reduce((max, d) => (d.count > max.count ? d : max), { date: "-", count: 0 });
    const lowest = daily.reduce((min, d) => (d.count < min.count ? d : min), { date: "-", count: Number.MAX_SAFE_INTEGER });

    // Devices
    const totalDev = input.deviceStats.mobile + input.deviceStats.tablet + input.deviceStats.desktop || 1;
    const devicePct = {
        mobile: Math.round((input.deviceStats.mobile / totalDev) * 100),
        desktop: Math.round((input.deviceStats.desktop / totalDev) * 100),
        tablet: Math.round((input.deviceStats.tablet / totalDev) * 100),
    };

    // Sources sorted desc
    const totalSrc = Object.values(input.sourceStats).reduce((s, v) => s + v, 0) || 1;
    const sourceList = Object.entries(input.sourceStats)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, pct: Math.round((count / totalSrc) * 100) }));

    // Top pages
    const topPages = Object.entries(input.pageViewStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const lines: string[] = [];
    lines.push(`## 🌐 ยอดเข้าชมเว็บไซต์`);
    lines.push(``);
    lines.push(`- **ยอดรวมในช่วง:** ${fmtNumber(total)} ครั้ง`);
    lines.push(`- **เฉลี่ย/วัน:** ${fmtNumber(avg)} ครั้ง`);
    if (peak.count > 0) lines.push(`- **วันที่เข้าชมสูงสุด:** ${peak.date} (${fmtNumber(peak.count)} ครั้ง)`);
    if (lowest.count !== Number.MAX_SAFE_INTEGER && daily.length > 1) {
        lines.push(`- **วันที่เข้าชมต่ำสุด:** ${lowest.date} (${fmtNumber(lowest.count)} ครั้ง)`);
    }
    lines.push(`- **ยอดเข้าชมสะสม (all-time):** ${fmtNumber(input.totalVisits)} ครั้ง`);
    lines.push(``);

    // Daily breakdown — ALWAYS list every single day (per user request)
    if (daily.length > 0) {
        // Group by month for year/long ranges to make navigation easier, but always include every day
        if (daily.length > 31) {
            // Monthly summary first (overview)
            lines.push(`### สรุปรายเดือน (Overview)`);
            const monthMap: Record<string, number> = {};
            daily.forEach(d => {
                const m = d.date.slice(0, 7);
                monthMap[m] = (monthMap[m] || 0) + d.count;
            });
            lines.push(`| เดือน | ยอดเข้าชม |`);
            lines.push(`|-------|-----------|`);
            Object.entries(monthMap).forEach(([m, c]) => lines.push(`| ${m} | ${fmtNumber(c)} |`));
            lines.push(``);

            // Then daily details grouped by month
            lines.push(`### รายวันแบ่งตามเดือน`);
            const byMonth: Record<string, { date: string; count: number }[]> = {};
            daily.forEach(d => {
                const m = d.date.slice(0, 7);
                if (!byMonth[m]) byMonth[m] = [];
                byMonth[m].push(d);
            });
            Object.entries(byMonth).forEach(([m, days]) => {
                lines.push(`#### ${m}`);
                lines.push(`| วันที่ | ยอดเข้าชม |`);
                lines.push(`|--------|-----------|`);
                days.forEach(d => lines.push(`| ${d.date} | ${fmtNumber(d.count)} |`));
                lines.push(``);
            });
        } else {
            // Short range — single flat table
            lines.push(`### รายวัน`);
            lines.push(`| วันที่ | ยอดเข้าชม |`);
            lines.push(`|--------|-----------|`);
            daily.forEach(d => lines.push(`| ${d.date} | ${fmtNumber(d.count)} |`));
            lines.push(``);
        }
    }

    // Devices
    lines.push(`### อุปกรณ์ที่ใช้เข้าชม`);
    lines.push(`| อุปกรณ์ | จำนวน | สัดส่วน |`);
    lines.push(`|---------|-------|---------|`);
    lines.push(`| Mobile | ${fmtNumber(input.deviceStats.mobile)} | ${devicePct.mobile}% |`);
    lines.push(`| Desktop | ${fmtNumber(input.deviceStats.desktop)} | ${devicePct.desktop}% |`);
    lines.push(`| Tablet | ${fmtNumber(input.deviceStats.tablet)} | ${devicePct.tablet}% |`);
    lines.push(``);

    // Sources
    if (sourceList.length > 0) {
        lines.push(`### ช่องทางที่มาเยือน (Traffic Sources)`);
        lines.push(`| ช่องทาง | จำนวน | สัดส่วน |`);
        lines.push(`|---------|-------|---------|`);
        sourceList.forEach(s => lines.push(`| ${s.name} | ${fmtNumber(s.count)} | ${s.pct}% |`));
        lines.push(``);
    }

    // Top pages
    if (topPages.length > 0) {
        lines.push(`### หน้าที่มีคนเข้าชมมากที่สุด (Top 10)`);
        lines.push(`| อันดับ | หน้า | ยอดเข้าชม |`);
        lines.push(`|-------|------|-----------|`);
        topPages.forEach(([page, views], i) => lines.push(`| ${i + 1} | \`${page}\` | ${fmtNumber(views)} |`));
        lines.push(``);
    }

    return lines.join("\n");
}

function formatRevenueSection(input: ReportInput): string {
    const r = input.revenue;
    const { from, to } = getRangeBoundaries(input.range, input.selectedYear, input.selectedMonth, input.generatedAt);
    const dailyRev = filterDailyRevenue(r.dailyData, from, to);
    const rangeRevenue = dailyRev.reduce((s, d) => s + d.revenue, 0);
    const rangeStudents = dailyRev.reduce((s, d) => s + d.students, 0);

    const lines: string[] = [];
    lines.push(`## 💰 รายได้และยอดขาย`);
    lines.push(``);
    lines.push(`### สรุปช่วงที่เลือก`);
    lines.push(`- **รายได้ในช่วง:** ${fmtBaht(rangeRevenue)}`);
    lines.push(`- **นักเรียนใหม่ในช่วง:** ${fmtNumber(rangeStudents)} คน`);
    lines.push(``);
    lines.push(`### สรุปทั้งปี (พ.ศ. ${input.selectedYear + 543})`);
    lines.push(`- **รายได้รวม:** ${fmtBaht(r.totalRevenue)}`);
    lines.push(`- **จำนวนนักเรียนสมัครคอร์ส:** ${fmtNumber(r.totalStudents)} คน`);
    lines.push(`- **Average Order Value (AOV):** ${fmtBaht(r.aov)}`);
    lines.push(`- **Lifetime Value (LTV) เฉลี่ย/นักเรียน:** ${fmtBaht(r.ltv)}`);
    lines.push(`- **Retention Rate (ซื้อมากกว่า 1 คอร์ส):** ${fmtPercent(r.retentionRate)}`);
    lines.push(`- **Revenue Growth (MoM):** ${fmtPercent(r.revenueGrowth)}`);
    lines.push(``);

    // Monthly summary (always include for year context)
    if (input.range === "year") {
        lines.push(`### รายได้รายเดือน (12 เดือน)`);
        lines.push(`| เดือน | รายได้ | นักเรียน | รายได้ปีก่อน |`);
        lines.push(`|-------|--------|----------|---------------|`);
        r.monthlyData.forEach(m => {
            lines.push(`| ${m.month} | ${fmtBaht(m.revenue)} | ${m.students} | ${fmtBaht(m.prevRevenue)} |`);
        });
        lines.push(``);
    }

    // Daily revenue — ALWAYS list every day in the selected range
    // Note: useAdminStats only computes last 90 days of dailyData; older days = 0
    if (dailyRev.length > 0) {
        if (dailyRev.length > 31) {
            lines.push(`### รายได้รายวัน (แบ่งตามเดือน)`);
            const byMonth: Record<string, typeof dailyRev> = {};
            dailyRev.forEach(d => {
                const m = d.date.slice(0, 7);
                if (!byMonth[m]) byMonth[m] = [];
                byMonth[m].push(d);
            });
            Object.entries(byMonth).forEach(([m, days]) => {
                lines.push(`#### ${m}`);
                lines.push(`| วันที่ | รายได้ | นักเรียนใหม่ |`);
                lines.push(`|--------|--------|---------------|`);
                days.forEach(d => lines.push(`| ${d.date} | ${fmtBaht(d.revenue)} | ${d.students} |`));
                lines.push(``);
            });
            if (input.range === "year") {
                lines.push(`> หมายเหตุ: ข้อมูลรายวันมีเฉพาะ 90 วันล่าสุด (ก่อนหน้านั้นใช้สรุปรายเดือนด้านบน)`);
                lines.push(``);
            }
        } else {
            lines.push(`### รายได้รายวัน`);
            lines.push(`| วันที่ | รายได้ | นักเรียนใหม่ |`);
            lines.push(`|--------|--------|---------------|`);
            dailyRev.forEach(d => lines.push(`| ${d.date} | ${fmtBaht(d.revenue)} | ${d.students} |`));
            lines.push(``);
        }
    }

    // Top courses
    if (r.courseData.length > 0) {
        lines.push(`### คอร์สที่ทำรายได้สูงสุด (Top 10)`);
        lines.push(`| อันดับ | คอร์ส | รายได้ | นักเรียน |`);
        lines.push(`|-------|------|--------|----------|`);
        r.courseData.slice(0, 10).forEach((c, i) => {
            lines.push(`| ${i + 1} | ${c.title} | ${fmtBaht(c.revenue)} | ${c.students} |`);
        });
        lines.push(``);
    }

    return lines.join("\n");
}

function formatLearningSection(input: ReportInput): string {
    if (!input.learning) {
        return `## 📚 สถิติการเรียน\n\n_ยังไม่ได้โหลดข้อมูลส่วนนี้ — กดปุ่ม "โหลดข้อมูลการเรียน" ในหน้าก่อน export เพื่อดึงข้อมูล_\n`;
    }
    const l = input.learning;
    const lines: string[] = [];
    lines.push(`## 📚 สถิติการเรียน (Learning Health)`);
    lines.push(``);
    lines.push(`- **ความคืบหน้าเฉลี่ยทุกคอร์ส:** ${fmtPercent(l.overallCompletionRate)}`);
    lines.push(`- **จำนวนวัน active เฉลี่ย/นักเรียน (14 วันล่าสุด):** ${l.averageActiveDays} วัน`);
    lines.push(``);

    // Active students trend
    if (l.activeStudentsTrend.length > 0) {
        lines.push(`### นักเรียน Active รายวัน (14 วันล่าสุด)`);
        lines.push(`| วันที่ | จำนวนนักเรียน |`);
        lines.push(`|--------|----------------|`);
        l.activeStudentsTrend.forEach(t => lines.push(`| ${t.date} | ${t.count} |`));
        lines.push(``);
    }

    // Course completion
    if (l.courseCompletionRates.length > 0) {
        lines.push(`### Completion Rate รายคอร์ส (Top 10 ตามจำนวนนักเรียน)`);
        lines.push(`| คอร์ส | บทเรียนทั้งหมด | นักเรียน | เรียนจบ | Completion % | Avg Progress % |`);
        lines.push(`|------|----------------|----------|---------|--------------|------------------|`);
        l.courseCompletionRates.slice(0, 10).forEach(c => {
            const completionRate = c.totalStudents > 0 ? (c.completedStudents / c.totalStudents) * 100 : 0;
            lines.push(`| ${c.title} | ${c.totalLessons} | ${c.totalStudents} | ${c.completedStudents} | ${fmtPercent(completionRate)} | ${fmtPercent(c.avgProgress)} |`);
        });
        lines.push(``);
    }

    // Engaging lessons
    if (l.mostEngagingLessons.length > 0) {
        lines.push(`### บทเรียนที่มีคนเรียนจบมากสุด (Top 10)`);
        lines.push(`| อันดับ | บทเรียน | คอร์ส | จำนวนคนเรียนจบ |`);
        lines.push(`|-------|----------|-------|------------------|`);
        l.mostEngagingLessons.forEach((les, i) => {
            const courseTitle = (les as any).courseTitle || "-";
            lines.push(`| ${i + 1} | ${les.title} | ${courseTitle} | ${les.completionCount} |`);
        });
        lines.push(``);
    }

    // Drop-off
    if (l.dropOffPoints.length > 0) {
        lines.push(`### จุด Drop-off (บทเรียนที่นักเรียนหยุดเรียนเยอะสุด)`);
        lines.push(`| อันดับ | คอร์ส | บทเรียน | ลำดับ | นักเรียนถึงบทนี้ | Drop-off % |`);
        lines.push(`|-------|-------|----------|-------|--------------------|-------------|`);
        l.dropOffPoints.forEach((d, i) => {
            lines.push(`| ${i + 1} | ${d.courseTitle} | ${d.lessonTitle} | ${d.lessonIndex + 1}/${d.totalLessons} | ${d.studentsReachedHere}/${d.studentsTotal} | ${d.dropOffPercent}% |`);
        });
        lines.push(``);
    }

    // Top active students (anonymized — name only, no email)
    if (l.topActiveStudents.length > 0) {
        lines.push(`### Top 10 นักเรียน Active สุด`);
        lines.push(`| อันดับ | ชื่อ | บทเรียนที่จบ | คอร์ส | วัน Active | Streak |`);
        lines.push(`|-------|-----|---------------|-------|-----------|--------|`);
        l.topActiveStudents.forEach((s, i) => {
            const lessons = (s as any).lessonsCompleted ?? "-";
            const courses = (s as any).coursesEnrolled ?? "-";
            const days = (s as any).activeDays ?? "-";
            lines.push(`| ${i + 1} | ${s.name} | ${lessons} | ${courses} | ${days} | ${s.streak} |`);
        });
        lines.push(``);
    }

    return lines.join("\n");
}

function formatPendingSection(input: ReportInput): string {
    const lines: string[] = [];
    lines.push(`## 📌 งานค้าง (Pending Actions)`);
    lines.push(``);
    lines.push(`- **สลิปรออนุมัติ:** ${input.pendingCount} รายการ`);
    lines.push(`- **Support Ticket รอตอบ:** ${input.ticketsCount} รายการ`);
    lines.push(``);
    return lines.join("\n");
}

function formatAIPromptsSection(input: ReportInput): string {
    const rangeLabel = getRangeLabel(input.range, input.selectedYear, input.selectedMonth, input.generatedAt);
    const lines: string[] = [];
    lines.push(`## 🤖 คำสั่งแนะนำสำหรับให้ AI วิเคราะห์`);
    lines.push(``);
    lines.push(`คัดลอกรายงานข้างบนทั้งหมดไปวางใน AI (ChatGPT / Claude / Gemini) แล้วต่อด้วยคำสั่งต่อไปนี้ — เลือกใช้ตามวัตถุประสงค์`);
    lines.push(``);

    lines.push(`### 1. วิเคราะห์ภาพรวม (Executive Summary)`);
    lines.push("```");
    lines.push(`จากข้อมูลรายงาน ${rangeLabel} ของเว็บไซต์ KruHeem Math ข้างบน ช่วยสรุปให้หน่อย:`);
    lines.push(`1. ภาพรวมการดำเนินธุรกิจในช่วงนี้เป็นอย่างไร (รายได้ / ผู้ใช้งาน / การเรียน)`);
    lines.push(`2. 3 เรื่องเด่นที่ดีที่สุด (Top wins)`);
    lines.push(`3. 3 เรื่องที่น่ากังวลและควรแก้ไขด่วน (Top concerns)`);
    lines.push(`4. KPI สำคัญที่ควรจับตามองในช่วงถัดไป`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 2. วิเคราะห์ Traffic & Marketing`);
    lines.push("```");
    lines.push(`จากข้อมูล Traffic (ยอดเข้าชม, แหล่งที่มา, อุปกรณ์, top pages) ช่วยวิเคราะห์:`);
    lines.push(`1. แนวโน้มยอดเข้าชมเป็นอย่างไร — มีรูปแบบ (pattern) ไหนน่าสังเกต เช่น day of week, ช่วงเวลา`);
    lines.push(`2. แหล่งที่มา (source) ใดทำงานได้ดีที่สุด ควรลงทุนเพิ่ม / ลด`);
    lines.push(`3. หน้าเว็บไหนเป็นจุดดึงดูดหลัก หน้าไหน underperform`);
    lines.push(`4. อุปกรณ์ที่ใช้บอกอะไรเกี่ยวกับ user persona`);
    lines.push(`5. แนะนำกลยุทธ์ marketing 3 ข้อที่ทำได้ทันที`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 3. วิเคราะห์รายได้ (Revenue Deep-dive)`);
    lines.push("```");
    lines.push(`จากข้อมูลรายได้ (totalRevenue, AOV, LTV, retention, รายได้รายวัน, top courses):`);
    lines.push(`1. แนวโน้มรายได้เทียบกับช่วงก่อนหน้าเป็นอย่างไร`);
    lines.push(`2. คอร์สใดเป็น cash cow / star / underperformer`);
    lines.push(`3. AOV และ LTV บอกอะไรเกี่ยวกับพฤติกรรมการซื้อของลูกค้า`);
    lines.push(`4. retention rate อยู่ในระดับใด ควรปรับปรุงอย่างไร`);
    lines.push(`5. แนะนำกลยุทธ์เพิ่มรายได้ 3 ข้อ (เช่น upsell, bundle, pricing)`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 4. วิเคราะห์ Learning Health & พฤติกรรมนักเรียน`);
    lines.push("```");
    lines.push(`จากข้อมูล Learning Health (completion rate, engaging lessons, drop-off, active students):`);
    lines.push(`1. คอร์สใดมี completion rate ต่ำผิดปกติ — สาเหตุน่าจะเกิดจากอะไร`);
    lines.push(`2. จุด drop-off สำคัญอยู่ตรงไหน ควรแก้ไขเนื้อหาตรงไหนก่อน`);
    lines.push(`3. บทเรียนที่ engaging สูงมีลักษณะร่วมอะไร นำไปประยุกต์กับบทเรียนอื่นได้อย่างไร`);
    lines.push(`4. Active students trend บอกอะไรเกี่ยวกับ engagement`);
    lines.push(`5. แนะนำ 3 กลยุทธ์เพิ่ม completion rate และลด drop-off`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 5. คาดการณ์อนาคต (Forecasting)`);
    lines.push("```");
    lines.push(`จากแนวโน้มในข้อมูลข้างบน ช่วยคาดการณ์:`);
    lines.push(`1. รายได้ในช่วงถัดไป (next ${input.range === "day" ? "7 วัน" : input.range === "week" ? "เดือน" : input.range === "month" ? "ไตรมาส" : "ปี"}) น่าจะเป็นเท่าไร พร้อมเหตุผล`);
    lines.push(`2. จำนวนนักเรียนที่คาดว่าจะเพิ่มขึ้น`);
    lines.push(`3. ความเสี่ยงสำคัญที่อาจกระทบเป้าหมาย`);
    lines.push(`4. โอกาส (opportunity) ที่ควรคว้าให้ทัน`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 6. หา Anomaly / Outlier`);
    lines.push("```");
    lines.push(`สแกนข้อมูลทั้งหมดแล้วชี้:`);
    lines.push(`1. วันที่มีตัวเลขผิดปกติ (สูง/ต่ำกว่าค่าเฉลี่ยมาก) พร้อมสาเหตุที่เป็นไปได้`);
    lines.push(`2. คอร์สที่มีพฤติกรรมแตกต่างจากกลุ่ม (เช่น traffic สูงแต่ revenue ต่ำ)`);
    lines.push(`3. รูปแบบที่อาจบ่งบอกปัญหาทางเทคนิค (เช่น traffic ลดทันที = อาจมีปัญหา SEO/server)`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 7. ทำ Action Plan`);
    lines.push("```");
    lines.push(`สร้าง action plan 30 วัน จากข้อมูลข้างบน:`);
    lines.push(`- สัปดาห์ที่ 1: งานเร่งด่วน (quick wins)`);
    lines.push(`- สัปดาห์ที่ 2-3: การปรับปรุงเชิงโครงสร้าง`);
    lines.push(`- สัปดาห์ที่ 4: ประเมินผลและวางแผนต่อ`);
    lines.push(`แต่ละข้อระบุ: ทำอะไร / ผู้รับผิดชอบ / KPI วัดผล / งบประมาณคร่าว ๆ`);
    lines.push("```");
    lines.push(``);

    lines.push(`### 8. เปรียบเทียบกับเกณฑ์อุตสาหกรรม (Benchmarking)`);
    lines.push("```");
    lines.push(`เปรียบเทียบตัวเลขในรายงานนี้กับเกณฑ์มาตรฐานของธุรกิจ EdTech / online course ในประเทศไทย:`);
    lines.push(`- Completion rate, retention, AOV, LTV, conversion rate`);
    lines.push(`- ตัวไหนสูง/ต่ำกว่าตลาด เพราะอะไร`);
    lines.push(`- ควรตั้งเป้าใหม่อย่างไรให้ realistic`);
    lines.push("```");
    lines.push(``);

    return lines.join("\n");
}

function formatFooter(input: ReportInput): string {
    return [
        `---`,
        ``,
        `_Generated by KruHeem Math Admin Dashboard · ${fmtThaiDateTime(input.generatedAt)}_`,
        ``,
    ].join("\n");
}

// ===================== Master =====================

export function buildReportMarkdown(input: ReportInput): string {
    return [
        formatHeader(input),
        formatTrafficSection(input),
        formatRevenueSection(input),
        formatLearningSection(input),
        formatPendingSection(input),
        formatAIPromptsSection(input),
        formatFooter(input),
    ].join("\n");
}

export function getReportFilename(range: ReportRange, generatedAt: Date): string {
    const ts = `${generatedAt.getFullYear()}${pad(generatedAt.getMonth() + 1)}${pad(generatedAt.getDate())}-${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}`;
    return `kruheem-report-${range}-${ts}.md`;
}
