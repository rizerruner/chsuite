
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto
                            flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border
                            animate-in slide-in-from-right-10 duration-300
                            ${toast.type === 'success' ? 'bg-white dark:bg-[#111621] border-green-100 dark:border-green-900/30 text-green-600' : ''}
                            ${toast.type === 'error' ? 'bg-white dark:bg-[#111621] border-red-100 dark:border-red-900/30 text-red-600' : ''}
                            ${toast.type === 'warning' ? 'bg-white dark:bg-[#111621] border-amber-100 dark:border-amber-900/30 text-amber-600' : ''}
                            ${toast.type === 'info' ? 'bg-white dark:bg-[#111621] border-blue-100 dark:border-blue-900/30 text-blue-600' : ''}
                        `}
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {toast.type === 'success' && 'check_circle'}
                            {toast.type === 'error' && 'error'}
                            {toast.type === 'warning' && 'warning'}
                            {toast.type === 'info' && 'info'}
                        </span>
                        <p className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">
                            {toast.message}
                        </p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
