'use client';

import { useEffect, useState } from 'react';

/**
 * One-shot confetti burst — drop it onto a success screen and it rains a single
 * wave of brand-coloured confetti, then disappears (~4s). No modal, no card, no
 * sound. Skips entirely when the user prefers reduced motion. Reuses the same
 * particle technique as <CelebrationModal>, but standalone so it can layer over
 * an existing success layout (e.g. the /payment confirmation).
 */
const COLORS = ['#2F6DB5', '#1F4E88', '#4ECDC4', '#FFE66D', '#FF8B94', '#A29BFE', '#2E7D5B'];

interface Particle { color: string; left: number; size: number; duration: number; delay: number; radius: string }

export default function ConfettiBurst({ count = 60 }: { count?: number }) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        // Respect "reduce motion" — no confetti at all.
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        // Defer the randomised generation out of render (keeps render pure / SSR-safe).
        const t = setTimeout(() => setParticles(Array.from({ length: count }, () => ({
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            left: Math.random() * 100,
            size: 7 + Math.random() * 9,
            duration: 2.2 + Math.random() * 1.8,
            delay: Math.random() * 0.4,
            radius: Math.random() > 0.5 ? '50%' : '2px',
        }))), 0);
        return () => clearTimeout(t);
    }, [count]);

    if (particles.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
            <style jsx global>{`
                @keyframes gp-confetti-fall {
                    0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
            {particles.map((p, i) => (
                <span
                    key={i}
                    className="absolute top-0"
                    style={{
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: p.radius,
                        animation: `gp-confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
}
