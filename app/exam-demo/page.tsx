"use client";

import React from 'react';
import { ExamSystem } from '@/components/exam/ExamSystem';
import { ExamQuestion } from '@/types/exam';

// ตัวอย่างข้อมูลข้อสอบ (Mock Data)
// ในการใช้งานจริง ข้อมูลนี้จะมาจากไฟล์ JSON หรือ API
const sampleExamData: ExamQuestion[] = [
    {
        id: 1,
        question: "จงหาค่าของ \\( x \\) จากสมการ \\( 2x + 5 = 15 \\)",
        options: [
            "\\( x = 5 \\)",
            "\\( x = 10 \\)",
            "\\( x = 2.5 \\)",
            "\\( x = 0 \\)"
        ],
        correctIndex: 0,
        explanation: "ย้ายข้างสมการ:\n$$ 2x = 15 - 5 $$\n$$ 2x = 10 $$\n$$ x = 5 $$\nดังนั้นคำตอบคือ ก. \\( x = 5 \\)"
    },
    {
        id: 2,
        question: "ผลลัพธ์ของ \\( \\frac{1}{2} + \\frac{1}{3} \\) มีค่าเท่ากับเท่าใด?",
        options: [
            "\\( \\frac{2}{5} \\)",
            "\\( \\frac{5}{6} \\)",
            "\\( \\frac{1}{6} \\)",
            "\\( \\frac{1}{5} \\)"
        ],
        correctIndex: 1,
        explanation: "ทำส่วนให้เท่ากัน (ค.ร.น. ของ 2 และ 3 คือ 6):\n$$ \\frac{1}{2} \\times \\frac{3}{3} = \\frac{3}{6} $$\n$$ \\frac{1}{3} \\times \\frac{2}{2} = \\frac{2}{6} $$\nนำมาบวกกัน:\n$$ \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6} $$"
    },
    {
        id: 3,
        question: "ถ้า \\( x = 4 \\) และ \\( y = 3 \\) จงหาค่าของ \\( \\sqrt{x^2 + y^2} \\)",
        options: [
            "5",
            "7",
            "25",
            "12"
        ],
        correctIndex: 0,
        explanation: "แทนค่า \\( x \\) และ \\( y \\) ลงในสมการ:\n$$ \\sqrt{4^2 + 3^2} = \\sqrt{16 + 9} $$\n$$ \\sqrt{25} = 5 $$"
    },
    {
        id: 4,
        question: "พื้นที่ของวงกลมที่มีรัศมี \\( r = 7 \\) หน่วย มีค่าเท่าใด (กำหนดให้ \\( \\pi \\approx \\frac{22}{7} \\))",
        options: [
            "44 ตารางหน่วย",
            "154 ตารางหน่วย",
            "22 ตารางหน่วย",
            "49 ตารางหน่วย"
        ],
        correctIndex: 1,
        explanation: "สูตรพื้นที่วงกลมคือ \\( A = \\pi r^2 \\)\nแทนค่า:\n$$ A \\approx \\frac{22}{7} \\times 7^2 $$\n$$ A \\approx \\frac{22}{7} \\times 49 $$\n$$ A \\approx 22 \\times 7 = 154 $$"
    }
];

export default function ExamDemoPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 py-12 transition-colors">
            <div className="container mx-auto">
                <ExamSystem
                    examData={sampleExamData}
                    examTitle="แบบทดสอบคณิตศาสตร์ (Demo)"
                />
            </div>
        </div>
    );
}
