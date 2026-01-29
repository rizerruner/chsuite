
import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="size-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700 shadow-inner">
                <span className="material-symbols-outlined text-[40px]">{icon}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight uppercase">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 max-w-xs mb-8 leading-relaxed font-medium">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button variant="primary" size="md" onClick={onAction} icon="add">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
