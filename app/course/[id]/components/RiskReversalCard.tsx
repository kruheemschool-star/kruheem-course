'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface RiskReversalCardProps {
    title: string;
    subtitle: string;
    items: string[];
    imageSrc?: string;
}

export default function RiskReversalCard({ title, subtitle, items, imageSrc = "/images/avatar-boy-worried.jpg" }: RiskReversalCardProps) {
    return (
        <div className="relative w-full max-w-md mx-auto perspective-1000">
            {/* Main Card Container */}
            <motion.div
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, type: "spring" }}
                className="relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden text-center h-full flex flex-col"
            >
                {/* Image Section - Top Half (Red Gradient Header) */}
                <div style={{ flex: 4 }} className="relative z-20 flex justify-center items-end w-full bg-gradient-to-br from-red-500 via-rose-500 to-rose-600 rounded-t-[2.5rem] pt-6 overflow-hidden">

                    {/* Background Noise/Texture for Header */}
                    <div className="absolute inset-0 opacity-10 bg-[url('/images/noise.png')] mix-blend-overlay pointer-events-none"></div>

                    {/* Floating Elements - Blobs in Header */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                    <div className="absolute top-20 -left-10 w-24 h-24 bg-white rounded-full blur-2xl opacity-20"></div>

                    <motion.div
                        className="w-56 md:w-64 relative z-10"
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageSrc}
                            alt="Worried Student"
                            className="w-full h-auto drop-shadow-2xl filter contrast-125 hover:scale-105 transition-transform duration-500"
                        />
                    </motion.div>
                </div>

                {/* Content Section - Bottom Half (White Body) */}
                <div style={{ flex: 3 }} className="relative z-10 flex flex-col items-center pt-8 pb-10 px-4 bg-white">

                    {/* Main Title */}
                    <motion.h2
                        className="text-2xl md:text-3xl font-black text-slate-800 drop-shadow-sm mb-2 leading-tight"
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {title}
                    </motion.h2>

                    {/* Subtitle - The Hook */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-lg -rotate-1 shadow-sm mb-6 mt-2 transform hover:rotate-0 transition-transform duration-300"
                    >
                        <h3 className="text-lg md:text-xl font-bold tracking-tight">
                            {subtitle}
                        </h3>
                    </motion.div>

                    {/* Risk Items - Staggered List */}
                    <div className="flex flex-col gap-3 w-full items-center">
                        {items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + (index * 0.1), type: "spring", stiffness: 100 }}
                                className={`
                                    bg-slate-50 text-slate-700 px-5 py-3 rounded-xl shadow-sm
                                    ${index % 2 === 0 ? '-rotate-1' : 'rotate-1'}
                                    hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default
                                    border border-slate-200 w-full max-w-[95%]
                                `}
                            >
                                <p className="text-base md:text-lg font-bold leading-relaxed">
                                    {item}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
