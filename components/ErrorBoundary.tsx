"use client";

import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[300px] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-6xl mb-4">😵</div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        เกิดข้อผิดพลาดบางอย่าง
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center mb-6 max-w-md">
                        ขออภัยครับ ระบบเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หรือติดต่อแอดมินหากปัญหายังคงอยู่
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleRetry}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                        >
                            🔄 ลองใหม่อีกครั้ง
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
                        >
                            รีเฟรชหน้า
                        </button>
                    </div>
                    {process.env.NODE_ENV === "development" && this.state.error && (
                        <details className="mt-6 w-full max-w-lg">
                            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-600">
                                รายละเอียดข้อผิดพลาด (Dev Only)
                            </summary>
                            <pre className="mt-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-red-600 dark:text-red-400 overflow-auto">
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
