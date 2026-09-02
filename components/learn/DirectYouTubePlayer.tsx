"use client";
/**
 * ตัวเล่น YouTube แบบฝัง iframe ตรง — ระดับ 2 ของงานแก้ "วิดีโอจอดำ"
 *
 * ตัวเล่นเดิม (react-youtube/youtube-player) ต้องโหลดสคริปต์ iframe_api จาก
 * www.youtube.com ให้สำเร็จก่อน ถึงจะ "สร้าง" iframe วิดีโอได้ — สคริปต์นั้น
 * โหลดล้มเมื่อไหร่ (เน็ตสะดุด/ตัวบล็อกโฆษณา/เบราว์เซอร์ในแอป) จอจะดำค้าง
 * ตลอดไปเพราะ promise ภายในถูก memoize แบบไม่มี retry
 *
 * ตัวนี้กลับหัวสถาปัตยกรรม: iframe คือ HTML ตรงๆ ที่ render ทันที ไม่รอใคร
 * — แค่เข้าถึง youtube.com ได้ วิดีโอก็ดูได้เสมอ ส่วนระบบเสริม (จำตำแหน่ง
 * ที่ดูค้าง / heartbeat / unmute) คุยผ่าน postMessage กับ iframe โดยตรง
 * (โปรโตคอล channel:"widget" — อันเดียวกับที่ iframe_api ใช้ข้างใต้)
 * ถ้าสะพาน postMessage เงียบ สิ่งที่เสียคือ "จำตำแหน่ง" เท่านั้น วิดีโอยังดูได้
 *
 * Interface เลียนแบบ react-youtube เท่าที่หน้า learn ใช้จริง เพื่อให้
 * LessonContent แก้น้อยที่สุด: onReady / onError / onStateChange(data:
 * เลขสถานะเดียวกับ YT API, target.getCurrentTime())
 */
import React, { useEffect, useRef, useState } from 'react';

/** ส่วนของ YT.Player ที่หน้า learn ใช้จริง */
export interface DirectPlayerHandle {
    getCurrentTime: () => number;
    unMute: () => void;
    setVolume: (v: number) => void;
    setPlaybackQuality: (q: string) => void;
}

interface DirectYouTubePlayerProps {
    videoId: string;
    startTime?: number;
    className?: string;
    /** iframe โหลดสำเร็จ = เครื่องผู้ชมเข้าถึง youtube.com ได้ (ใช้แยก "ดำสนิท" กับ "แค่สะพานเงียบ") */
    onIframeLoad?: () => void;
    onReady?: (e: { target: DirectPlayerHandle }) => void;
    onError?: (e: { data: unknown }) => void;
    onStateChange?: (e: { data: number; target: DirectPlayerHandle }) => void;
}

const YT_ORIGIN = 'https://www.youtube.com';

export const DirectYouTubePlayer: React.FC<DirectYouTubePlayerProps> = ({
    videoId,
    startTime = 0,
    className = '',
    onIframeLoad,
    onReady,
    onError,
    onStateChange,
}) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const lastTimeRef = useRef(0);
    const lastStateRef = useRef<number | null>(null);
    // callbacks ล่าสุดเสมอ (props เป็น inline arrow ที่เกิดใหม่ทุก render)
    const cbRef = useRef({ onIframeLoad, onReady, onError, onStateChange });
    cbRef.current = { onIframeLoad, onReady, onError, onStateChange };

    // ต้องรู้ origin ของเราตอนประกอบ src (ให้ YouTube ยอมรับ postMessage สองทาง)
    // เลย render iframe ฝั่ง client เท่านั้น — เนื้อหาบทเรียนโหลด client-side อยู่แล้ว
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted || !videoId) return;
        lastTimeRef.current = startTime > 0 ? startTime : 0;
        lastStateRef.current = null;

        const post = (payload: Record<string, unknown>) => {
            try {
                iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ ...payload, id: 'kh-player', channel: 'widget' }),
                    YT_ORIGIN,
                );
            } catch (_) { /* iframe ยังไม่พร้อม — รอบ retry ถัดไปจัดการ */ }
        };
        const sendCommand = (func: string, args: unknown[] = []) => post({ event: 'command', func, args });

        const handle: DirectPlayerHandle = {
            getCurrentTime: () => lastTimeRef.current,
            unMute: () => sendCommand('unMute'),
            setVolume: (v: number) => sendCommand('setVolume', [v]),
            setPlaybackQuality: (q: string) => sendCommand('setPlaybackQuality', [q]),
        };

        // ประกาศตัวกับ widget ซ้ำๆ จนกว่ามันจะเริ่มคุยกลับ — จังหวะ onload ของ
        // iframe กับตอน widget พร้อมฟังไม่ตรงกันในบาง WebView ยิงครั้งเดียวมีสิทธิ์หลุด
        let gotAnyMessage = false;
        let tries = 0;
        const hello = setInterval(() => {
            if (gotAnyMessage || tries++ > 40 || !iframeRef.current) {
                clearInterval(hello);
                return;
            }
            post({ event: 'listening' });
        }, 300);

        const fireStateChange = (state: number) => {
            if (lastStateRef.current === state) return;
            lastStateRef.current = state;
            cbRef.current.onStateChange?.({ data: state, target: handle });
        };

        const onMessage = (e: MessageEvent) => {
            if (e.origin !== YT_ORIGIN) return;
            if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
            let data: any;
            try { data = JSON.parse(e.data); } catch { return; }
            if (!data || typeof data !== 'object') return;
            gotAnyMessage = true;

            switch (data.event) {
                case 'onReady':
                    cbRef.current.onReady?.({ target: handle });
                    break;
                case 'onError':
                    cbRef.current.onError?.({ data: data.info });
                    break;
                case 'onStateChange':
                    if (typeof data.info === 'number') fireStateChange(data.info);
                    break;
                case 'initialDelivery':
                case 'infoDelivery': {
                    const info = data.info;
                    if (info && typeof info.currentTime === 'number') lastTimeRef.current = info.currentTime;
                    // playerState ใน infoDelivery คือตัวสำรองของ event onStateChange
                    // (บาง WebView ส่ง event หลักหลุด) — dedupe ใน fireStateChange แล้ว
                    if (info && typeof info.playerState === 'number') fireStateChange(info.playerState);
                    break;
                }
            }
        };

        window.addEventListener('message', onMessage);
        return () => {
            clearInterval(hello);
            window.removeEventListener('message', onMessage);
        };
        // startTime จงใจไม่อยู่ใน deps — ใช้เฉพาะค่าแรกของวิดีโอนั้น (เปลี่ยนบท = videoId เปลี่ยน)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, videoId]);

    if (!mounted || !videoId) return null;

    const params = new URLSearchParams({
        enablejsapi: '1',
        playsinline: '1',
        rel: '0',
        controls: '1',
        autoplay: '0',
        modestbranding: '1',
        origin: window.location.origin,
    });
    if (startTime > 0) params.set('start', String(Math.floor(startTime)));

    return (
        <iframe
            ref={iframeRef}
            key={videoId}
            src={`${YT_ORIGIN}/embed/${videoId}?${params.toString()}`}
            className={`border-0 ${className}`}
            title="บทเรียนวิดีโอ"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
                cbRef.current.onIframeLoad?.();
                // เผื่อ interval แรกยิงไปก่อน iframe พร้อม — ทักอีกทีตอน load แน่ๆ
                try {
                    iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: 'listening', id: 'kh-player', channel: 'widget' }),
                        YT_ORIGIN,
                    );
                } catch (_) { /* ignore */ }
            }}
        />
    );
};
