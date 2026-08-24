"use client";

import React, { useEffect, useRef } from 'react';

/**
 * พื้นหลังลายจุดของหน้าเริ่มทำข้อสอบ (สเปกข้อ 8)
 *
 * กริดจุดเว้นระยะเท่ากันทั้งจอ แล้วให้คลื่นสองชุดวิ่งซ้อนกันคอยดันขนาด/ความทึบ/
 * สี/ตำแหน่งของแต่ละจุด — ได้ความรู้สึกเรืองไหวเบาๆ โดยไม่ต้องมีรูปพื้นหลัง
 * การ์ดด้านบนโปร่งแสง (.exs-card) ลายจุดจึงเรืองผ่านช่องไฟระหว่างการ์ด
 *
 * วาดบน canvas ตัวเดียว: ถูกกว่า DOM หลายพันจุด และไม่กระทบ layout
 */
export type ExamBgMode = 'waveColor' | 'wave' | 'calm';

interface Props {
    /** โหมดลาย — โปรดักชันล็อกไว้ที่ waveColor */
    bgMode?: ExamBgMode;
    /** ระยะห่างจุด (px) — สเปก 26, ปรับได้ 16–48 */
    dotSpacing?: number;
    /** ตัวคูณความเข้ม — สเปก 1, ปรับได้ 0.3–1.8 */
    dotIntensity?: number;
    isDark?: boolean;
}

const BASE_RADIUS = 1.9;
const MAX_DPR = 2;

/**
 * ค่าคลื่นของโหมด waveColor / wave
 *
 * ครูฮีมขอ "ให้พลิ้วไหวเหมือนคลื่นช้าๆ" — ของเดิม (ตามสเปกตั้งต้น) คลื่นสั้นและ
 * วิ่งเร็ว ตาจึงอ่านเป็นจุดกะพริบยิบๆ ไม่เป็นระลอก จูนใหม่สามอย่าง:
 *   1. WAVELENGTH ยาวขึ้นเกือบเท่าตัว → ระลอกกว้างพาดทั้งจอ มองเห็นเป็นคลื่น
 *   2. SPEED ช้าลงราวหนึ่งในสาม → ระลอกค่อยๆ ไหลผ่าน (รอบละ ~20 วินาที)
 *   3. SWAY ให้จุดขยับตามคลื่นมากขึ้น โดยเน้นแนวตั้ง → เห็นแถวจุดยกตัวเป็นลอน
 * ตัวเลขทั้งชุดปรับจากการเรนเดอร์เทียบเฟรมจริงบนหน้าเว็บ
 */
const WAVE = {
    len1: 340,      // ความยาวคลื่นชุดที่ 1 (เดิม 190)
    speed1: 0.30,   // ความเร็วชุดที่ 1 (เดิม 0.85)
    len2: 430,      // ความยาวคลื่นชุดที่ 2 (เดิม 250)
    speed2: 0.18,   // ความเร็วชุดที่ 2 (เดิม 0.50)
    mix: 0.62,      // น้ำหนักคลื่นชุดแรก ทำให้ลายไม่ซ้ำรอบเป๊ะ
    hueDrift: 0.12, // สีค่อยๆ เปลี่ยน (เดิม 0.3 — ไวจนเห็นเป็นวูบ)
};

// คลื่นช้าไม่ต้องการ 60fps — จำกัดราว 30fps ประหยัดแบตมือถือครึ่งหนึ่ง
const FRAME_MS = 1000 / 30;

export default function ExamStartBackdrop({
    bgMode = 'waveColor',
    dotSpacing = 26,
    dotIntensity = 1,
    isDark = false,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // เก็บพร็อพไว้ใน ref เพื่อให้ลูปวาดอ่านค่าล่าสุดได้โดยไม่ต้องรีสตาร์ท rAF
    const cfg = useRef({ bgMode, dotSpacing, dotIntensity, isDark });
    cfg.current = { bgMode, dotSpacing, dotIntensity, isDark };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ผู้ใช้ที่ตั้งค่า "ลดการเคลื่อนไหว" ได้ภาพนิ่งเฟรมเดียว (ลายเดิม ไม่ไหว)
        const reduceMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let width = 0;
        let height = 0;
        let raf = 0;
        let startedAt = performance.now();

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = (t: number) => {
            const { bgMode: mode, dotSpacing: gap, dotIntensity: intensity, isDark: dark } = cfg.current;
            ctx.clearRect(0, 0, width, height);
            // โหมดมืดพื้นเข้ม จุดต้องสว่างและเข้มขึ้นเล็กน้อยถึงจะอ่านออก
            const light = dark ? 68 : 63;
            const alphaMul = intensity * (dark ? 1.15 : 1);

            for (let y = 0; y <= height + gap; y += gap) {
                for (let x = 0; x <= width + gap; x += gap) {
                    let r: number;
                    let a: number;
                    let color: string;
                    let ox = 0;
                    let oy = 0;

                    if (mode === 'calm') {
                        const b = Math.sin(0.45 * t + (x + y) / 420) * 0.5 + 0.5;
                        r = BASE_RADIUS * (0.75 + 0.3 * b);
                        a = 0.16 + 0.16 * b;
                        const hue = 248 + 42 * Math.sin(0.16 * t + (0.6 * x + y) / 720);
                        color = `hsl(${hue}, 72%, ${dark ? light : 62}%)`;
                    } else {
                        const w1 = Math.sin((x * 0.9 + y * 1.6) / WAVE.len1 - t * WAVE.speed1);
                        const w2 = Math.sin((y * 0.7 - x * 1.3) / WAVE.len2 + t * WAVE.speed2);
                        const w = w1 * WAVE.mix + w2 * (1 - WAVE.mix);
                        const u = w * 0.5 + 0.5;

                        if (mode === 'wave') {
                            r = BASE_RADIUS * (0.45 + 0.95 * u);
                            a = 0.12 + 0.40 * u;
                            color = dark ? '#818cf8' : '#6366f1';
                            ox = w1 * 3.6;
                            oy = w * 9;
                        } else {
                            r = BASE_RADIUS * (0.5 + 0.85 * u);
                            a = 0.14 + 0.40 * u;
                            const hue = 252 + 68 * w + 18 * Math.sin(WAVE.hueDrift * t + y / 500);
                            color = `hsl(${hue}, 78%, ${light}%)`;
                            // เอียงน้อยในแนวนอน ยกตัวมากในแนวตั้ง = อ่านเป็นผืนคลื่น
                            ox = w1 * 3;
                            oy = w * 7.5;
                        }
                    }

                    ctx.globalAlpha = Math.min(1, a * alphaMul);
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        };

        let lastT = 0;
        let lastPaint = 0;
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            if (now - lastPaint < FRAME_MS) return;   // จำกัดเฟรมเรต
            lastPaint = now;
            lastT = (now - startedAt) / 1000;
            draw(lastT);
        };

        const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
        const start = () => {
            if (raf || reduceMotion) return;
            // ต่อเวลาให้ลายวิ่งต่อจากจุดเดิม ไม่กระโดดตอนกลับมาที่แท็บ
            startedAt = performance.now() - lastT * 1000;
            raf = requestAnimationFrame(frame);
        };

        const onVisibility = () => {
            // แท็บถูกซ่อน = หยุดวาด (rAF มักถูกหยุดเองอยู่แล้ว แต่กันไว้ให้ชัด)
            if (document.hidden) stop(); else start();
        };
        const onResize = () => { resize(); draw(lastT); };

        resize();
        if (reduceMotion) draw(0);
        else raf = requestAnimationFrame(frame);
        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stop();
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />
    );
}
