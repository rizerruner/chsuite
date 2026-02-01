
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    icon,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && <label className="text-[14px] font-bold text-[#111318] dark:text-white">{label}</label>}
            <div className="relative">
                {icon && (
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
                        {icon}
                    </span>
                )}
                <input
                    className={`w-full h-11 px-4 rounded-xl border-[#e5e7eb] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-[14px] dark:text-white font-medium placeholder:text-slate-400 transition-all ${icon ? 'pl-11' : ''} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${props.type === 'date' ? 'cursor-pointer' : ''} ${className}`}
                    {...props}
                    onClick={(e) => {
                        if (props.type === 'date') e.currentTarget.showPicker?.();
                        props.onClick?.(e);
                    }}
                />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
    );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options?: { value: string; label: string }[];
    error?: string;
    children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    children,
    className = '',
    ...props
}) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && <label className="text-[14px] font-bold text-[#111318] dark:text-white">{label}</label>}
            <div className="relative">
                <select
                    className={`w-full h-11 px-4 pr-10 rounded-xl border-[#e5e7eb] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-[14px] dark:text-white appearance-none !bg-none cursor-pointer transition-all ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                    {...props}
                >
                    {children ? (
                        children
                    ) : (
                        options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))
                    )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </div>
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
    );
};
