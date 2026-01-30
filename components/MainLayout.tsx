
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { View } from '../types';
import { MENU_ITEMS } from '../constants';
import { useRBAC } from '../context/RBACContext';


interface MainLayoutProps {
    children: React.ReactNode;
    currentView: View;
    onNavigate: (view: View) => void;
    title: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentView, onNavigate, title }) => {
    const { companySettings, loading } = useRBAC();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile */}
            <div className={`
        fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-white dark:bg-background-dark border-r border-[#dcdfe5] dark:border-slate-700
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <Sidebar currentView={currentView} onNavigate={handleNavigate} />
            </div>

            <main className="flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0">
                <header className="sticky top-0 z-40 border-b border-[#f0f2f4] dark:border-slate-800 bg-white dark:bg-background-dark">
                    <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                            <h2 className="text-lg font-bold leading-tight tracking-tight text-[#111318] dark:text-white truncate">
                                {title}
                            </h2>
                        </div>
                        <TopBar onNavigate={onNavigate} />
                    </div>
                </header>

                <div className="flex-1 pb-12 w-full max-w-[1600px] mx-auto">
                    {children}
                </div>

                <footer className="mt-auto py-8 text-center border-t border-[#dcdfe5] dark:border-slate-800">
                    <p className={`text-xs text-[#636f88] dark:text-gray-500 font-medium uppercase tracking-widest transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                        © {new Date().getFullYear()} {companySettings.companyName || 'ChSuite Corporate'}. Todos os direitos reservados.
                    </p>
                </footer>

            </main>
        </div>
    );
};

export default MainLayout;
