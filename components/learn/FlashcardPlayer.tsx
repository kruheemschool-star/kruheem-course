import React, { useState } from 'react';
import { renderWithLatex } from "@/components/ContentRenderer";

interface FlashcardPlayerProps {
    cards: any[];
}

export const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({ cards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const currentCard = cards[currentIndex] || {};
    // ✅ Support multiple field names for robustness
    const frontContent = currentCard.front || currentCard.question || currentCard.term || "No Content";
    const backContent = currentCard.back || currentCard.answer || currentCard.definition || "No Content";

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="w-full flex justify-between text-slate-500 font-bold mb-4 px-2">
                <span>Card {currentIndex + 1} / {cards.length}</span>
                <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                ></div>
            </div>

            {/* Card Container */}
            <div
                className="perspective-1000 w-full aspect-[3/2] cursor-pointer group"
                onClick={handleFlip}
            >
                <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>

                    {/* Front Side */}
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col p-6 hover:shadow-2xl hover:border-yellow-200 transition-all overflow-hidden">
                        <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 uppercase tracking-widest z-10">Question</span>
                        {currentCard.topic && (
                            <span className="absolute top-6 right-6 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full z-10 max-w-[50%] truncate">{currentCard.topic}</span>
                        )}
                        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto scrollbar-hide w-full h-full pt-6 pb-8 flashcard-content">
                            <h3 className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed select-none w-full text-center">
                                {renderWithLatex(String(frontContent))}
                            </h3>
                        </div>
                        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 text-slate-300 animate-pulse z-10 opacity-70">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Click or Tap to Flip</span>
                        </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[2rem] shadow-xl border-2 border-yellow-200 flex flex-col p-6 text-center overflow-hidden">
                        <span className="absolute top-6 left-6 text-xs font-bold text-yellow-600 uppercase tracking-widest z-10">Answer</span>
                        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto scrollbar-hide w-full h-full pt-6 pb-4 flashcard-content">
                            <h3 className="text-2xl md:text-3xl font-medium text-yellow-800 leading-relaxed select-none w-full text-center">
                                {renderWithLatex(String(backContent))}
                            </h3>
                        </div>
                        {currentCard.topic && (
                            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-yellow-100/50 text-yellow-800 text-[10px] font-bold px-3 py-1 rounded-full">{currentCard.topic}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-10">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>

                <div className="text-slate-400 font-medium text-sm">
                    Use arrows to navigate
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentIndex === cards.length - 1}
                    className="p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                /* Balance Math Size */
                .flashcard-content .katex { font-size: 1.2em !important; }
            `}</style>
        </div>
    );
};
