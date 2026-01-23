"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import "katex/dist/katex.min.css";

// 🎨 Custom Components for Markdown (Notion Style)
const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    return (
        <div className="prose prose-slate max-w-none text-[#37352F] dark:text-slate-300 leading-[1.8]">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-[#37352F] dark:text-white mt-8 mb-4 flex items-center gap-2" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-[#37352F] dark:text-white bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded" {...props} />,
                    hr: ({ node, ...props }) => <hr className="my-8 border-gray-200 dark:border-slate-700" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-6 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-2 mb-6" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-2 mb-6" {...props} />,
                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 italic text-gray-600 dark:text-gray-400 my-6" {...props} />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

interface LessonSummaryProps {
    data: {
        documentMetadata?: {
            title: string;
            subtitle: string;
            instructor: string;
            date?: string;
        };
        sections: Array<{
            type: string;
            id?: string;
            title?: string;
            prerequisites?: string[];
            content?: string;
            examples?: Array<{ problem: string; solution: string }>;
            practiceProblems?: Array<{ problem: string; hint?: string; solution: string }>;
            keyTakeaways?: string[];
        }>;
    };
}

export default function LessonSummaryRenderer({ data }: LessonSummaryProps) {
    if (!data || !data.sections) return <div className="text-center p-10 text-gray-400 font-mono text-sm">Waiting for content...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0 font-sans text-[#37352F]">
            {/* 🏷️ Header Metadata (Simple & Clean) */}
            {data.documentMetadata && (
                <div className="mb-12 pb-8 border-b border-[#E9E9E7] dark:border-slate-800">
                    <div className="flex items-center gap-3 text-slate-500 mb-4 text-sm font-medium uppercase tracking-wider">
                        <span>🗓️ {data.documentMetadata.date || 'Lesson Summary'}</span>
                        <span>•</span>
                        <span>👨‍🏫 {data.documentMetadata.instructor}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#37352F] dark:text-white mb-4 tracking-tight leading-tight">
                        {data.documentMetadata.title}
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-slate-400 font-normal leading-relaxed">
                        {data.documentMetadata.subtitle}
                    </p>
                </div>
            )}

            {/* 📚 Sections */}
            <div className="space-y-16">
                {data.sections.map((section, idx) => (
                    <div key={idx} className="group">

                        {/* Section Title */}
                        {section.title && (
                            <h2 className="text-2xl md:text-3xl font-bold text-[#37352F] dark:text-white mb-8 flex items-center gap-4 pb-2 border-b border-transparent group-hover:border-[#E9E9E7] transition-colors">
                                <span className="flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-lg">
                                    {getSectionIcon(section.type || 'default')}
                                </span>
                                {section.title}
                            </h2>
                        )}

                        {/* 🧠 Prerequisites (Callout Style) */}
                        {section.prerequisites && section.prerequisites.length > 0 && (
                            <div className="mb-10 bg-[#F7F7F5] dark:bg-slate-800/50 p-6 rounded-md border border-[#E9E9E7] dark:border-slate-700">
                                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    🔑 Prerequisites
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {section.prerequisites.map((req, i) => (
                                        <span key={i} className="inline-flex items-center px-3 py-1 rounded bg-white dark:bg-slate-700 border border-[#E9E9E7] dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 shadow-sm">
                                            {req}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 📝 Main Content */}
                        {section.content && (
                            <div className="mb-10">
                                <MarkdownRenderer content={section.content} />
                            </div>
                        )}

                        {/* 💡 Examples (Clean Cards) */}
                        {section.examples && section.examples.length > 0 && (
                            <div className="mb-12 space-y-8">
                                <h3 className="text-lg font-bold text-[#37352F] dark:text-white border-l-4 border-yellow-400 pl-4 py-1">
                                    ตัวอย่างโจทย์
                                </h3>
                                {section.examples.map((ex, i) => (
                                    <div key={i} className="rounded-lg border border-[#E9E9E7] dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                                        <div className="bg-[#F7F7F5] dark:bg-slate-700/50 px-6 py-3 border-b border-[#E9E9E7] dark:border-slate-700 flex justify-between items-center">
                                            <span className="font-mono text-xs font-bold text-gray-500 uppercase">Example {i + 1}</span>
                                        </div>
                                        <div className="p-6 grid md:grid-cols-2 gap-8">
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Problem</div>
                                                <div className="text-lg">
                                                    <MarkdownRenderer content={ex.problem} />
                                                </div>
                                            </div>
                                            <div className="relative pl-8 border-l border-gray-100 dark:border-slate-700">
                                                <div className="absolute top-0 left-0 w-1 h-8 bg-emerald-400 -ml-[2.5px] rounded-full"></div>
                                                <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Solution</div>
                                                <div className="text-gray-600 dark:text-gray-300">
                                                    <MarkdownRenderer content={ex.solution} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ✍️ Practice Problems */}
                        {section.practiceProblems && section.practiceProblems.length > 0 && (
                            <div className="mb-12">
                                <h3 className="text-lg font-bold text-[#37352F] dark:text-white border-l-4 border-indigo-400 pl-4 py-1 mb-6">
                                    แบบฝึกหัด (Practice)
                                </h3>
                                <div className="space-y-4">
                                    {section.practiceProblems.map((prob, i) => (
                                        <PracticeCard key={i} index={i} problem={prob} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 📌 Key Takeaways (Notion Callout) */}
                        {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                            <div className="p-6 bg-[#F1F7FF] dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <div className="flex items-start gap-4">
                                    <div className="text-2xl mt-1">🎓</div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 text-lg">สรุปประเด็นสำคัญ</h3>
                                        <ul className="space-y-3">
                                            {section.keyTakeaways.map((point, i) => (
                                                <li key={i} className="flex items-start gap-3 text-blue-800 dark:text-blue-200">
                                                    <span className="mt-2 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></span>
                                                    <div className="flex-1 leading-relaxed">
                                                        <MarkdownRenderer content={point} />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
}

// Sub-component for interactive practice problems
function PracticeCard({ problem, index }: { problem: any, index: number }) {
    const [showHint, setShowHint] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);

    return (
        <div className="border border-[#E9E9E7] dark:border-slate-700 rounded-md overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
            <div className="p-5 flex items-start gap-4">
                <span className="bg-[#F7F7F5] dark:bg-slate-700 text-gray-500 w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 border border-[#E9E9E7] dark:border-slate-600">
                    {index + 1}
                </span>
                <div className="flex-1 pt-1">
                    <div className="text-lg text-[#37352F] dark:text-slate-200 font-medium mb-4">
                        <MarkdownRenderer content={problem.problem} />
                    </div>

                    <div className="flex gap-3">
                        {problem.hint && (
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded border border-gray-200 transition"
                            >
                                {showHint ? 'Hide Hint' : 'Show Hint 💡'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowAnswer(!showAnswer)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded border border-indigo-100 transition"
                        >
                            {showAnswer ? 'Hide Answer' : 'Show Answer 👁️'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hint & Answer Section */}
            {(showHint || showAnswer) && (
                <div className="bg-[#FAFAFA] dark:bg-slate-900/50 border-t border-[#E9E9E7] dark:border-slate-800 p-5 pl-16 space-y-4">
                    {showHint && problem.hint && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-100 dark:border-yellow-800/30">
                            <strong>Hint:</strong> {problem.hint}
                        </div>
                    )}
                    {showAnswer && (
                        <div className="text-base text-[#37352F] dark:text-slate-300">
                            <strong className="text-emerald-600 block mb-1">Answer:</strong>
                            <MarkdownRenderer content={problem.solution} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper to pick icons
function getSectionIcon(type: string) {
    switch (type.toLowerCase()) {
        case 'definition': return '📖';
        case 'theorem': return '📐';
        case 'example': return '💡';
        case 'practice': return '✍️';
        case 'summary': return '📌';
        default: return '📝';
    }
}
