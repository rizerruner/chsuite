
import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    className?: string;
    dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    className = '',
    dot = false
}) => {
    const variants = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };

    const dots = {
        primary: 'bg-primary',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
        neutral: 'bg-slate-400'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${variants[variant]} ${className}`}>
            {dot && <span className={`size-1.5 rounded-full ${dots[variant]}`}></span>}
            {children}
        </span>
    );
};
