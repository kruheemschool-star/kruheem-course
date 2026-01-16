'use client';

import { useEffect, useState, useCallback } from 'react';
import { BadgeInfo } from '@/types/gamification';
import { X } from 'lucide-react';

interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'course_complete' | 'rank_up';
    badge?: BadgeInfo;
    courseName?: string;
}

// Confetti particle component
const Confetti = ({ delay }: { delay: number }) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#FF8B94', '#A29BFE', '#FD79A8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const animationDuration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 8;

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                left: `${left}%`,
                top: '-20px',
                width: size,
                height: size,
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `confetti-fall ${animationDuration}s ease-out ${delay}s forwards`,
            }}
        />
    );
};

export default function CelebrationModal({
    isOpen,
    onClose,
    type,
    badge,
    courseName
}: CelebrationModalProps) {
    const [confetti, setConfetti] = useState<number[]>([]);
    const [showContent, setShowContent] = useState(false);

    // Play celebration sound
    const playSound = useCallback(() => {
        try {
            const audio = new Audio('/sounds/celebration.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Fallback: try alternative sound or create simple beep
                const beep = new AudioContext();
                const oscillator = beep.createOscillator();
                const gainNode = beep.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(beep.destination);
                oscillator.frequency.value = 880;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, beep.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, beep.currentTime + 0.5);
                oscillator.start(beep.currentTime);
                oscillator.stop(beep.currentTime + 0.5);
            });
        } catch (e) {
            console.log('Audio not supported');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Generate confetti
            setConfetti(Array.from({ length: 50 }, (_, i) => i));

            // Play sound
            setTimeout(playSound, 300);

            // Show content with delay for dramatic effect
            setTimeout(() => setShowContent(true), 200);

            // Auto-close after 5 seconds
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        } else {
            setConfetti([]);
            setShowContent(false);
        }
    }, [isOpen, onClose, playSound]);

    if (!isOpen) return null;

    return (
        <>
            {/* CSS Keyframes */}
            <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(5deg);
          }
          70% {
            transform: scale(0.9) rotate(-2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.5);
          }
        }
      `}</style>

            {/* Overlay */}
            <div
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Confetti */}
                {confetti.map((i) => (
                    <Confetti key={i} delay={Math.random() * 0.5} />
                ))}

                {/* Modal Content */}
                <div
                    className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: showContent ? 'bounce-in 0.6s ease-out forwards' : 'none',
                        opacity: showContent ? 1 : 0,
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>

                    {/* Badge Icon */}
                    <div
                        className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center"
                        style={{ animation: 'glow-pulse 2s ease-in-out infinite' }}
                    >
                        <span className="text-6xl drop-shadow-lg">
                            {type === 'rank_up' && badge ? badge.icon : '🎉'}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                        {type === 'rank_up' ? (
                            <>ยินดีด้วย! เลื่อนยศแล้ว! 🎊</>
                        ) : (
                            <>เยี่ยมมาก! เรียนจบแล้ว! 🌟</>
                        )}
                    </h2>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {type === 'rank_up' && badge ? (
                            <>
                                คุณได้รับตราสัญลักษณ์{' '}
                                <span className="font-bold" style={{ color: badge.color }}>
                                    {badge.thaiLabel}
                                </span>{' '}
                                แล้ว!
                            </>
                        ) : (
                            <>
                                คุณเรียนจบคอร์ส{' '}
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {courseName || 'นี้'}
                                </span>{' '}
                                เรียบร้อยแล้ว!
                            </>
                        )}
                    </p>

                    {/* Motivational message */}
                    <p className="text-sm text-slate-500 dark:text-slate-500 italic mb-6">
                        {type === 'rank_up'
                            ? '"ความพยายามของคุณสร้างความแตกต่าง!"'
                            : '"ทำต่อไปนะ คุณทำได้!"'
                        }
                    </p>

                    {/* Continue button */}
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        ไปต่อเลย! 🚀
                    </button>
                </div>
            </div>
        </>
    );
}
