
import React from 'react';
import { View } from '../types';
import { MENU_ITEMS } from '../constants';
import { useRBAC } from '../context/RBACContext';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageUtils';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, hasPermission, companySettings, loading } = useRBAC();
  const { signOut } = useAuth();


  const filteredMenuItems = MENU_ITEMS.filter(item => hasPermission(item.id, 'view'));

  return (
    <aside className="flex flex-col h-full">
      <div className="p-6 flex flex-col h-full justify-between">
        <div className="flex flex-col gap-8">
          <div className={`flex gap-3 items-center transition-all duration-500 ${loading ? 'opacity-0 translate-x-[-10px] scale-95' : 'opacity-100 translate-x-0 scale-100'}`}>
            {companySettings.logo ? (
              <img
                src={companySettings.logo}
                alt="Logo"
                className="rounded-[14px] size-10 object-cover shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="bg-[#ffbd8a] rounded-[14px] size-10 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-[#6b3e15] text-[22px] font-black">
                  donut_large
                </span>
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-[#111318] dark:text-white text-base font-black leading-tight tracking-tight truncate">
                {companySettings.companyName ? companySettings.companyName.split(' ')[0] : '...'}
              </h1>
              <p className="text-[#636f88] dark:text-slate-400 text-[10px] font-black uppercase tracking-widest truncate">
                {companySettings.companyName ? (companySettings.companyName.split(' ').slice(1).join(' ') || 'Portal Business') : 'Carregando...'}
              </p>
            </div>
          </div>


          <nav className="flex flex-col gap-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentView === item.id
                  ? 'bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[#636f88] dark:text-slate-400 font-medium'
                  }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <p className="text-sm">{item.label}</p>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div
            onClick={() => onNavigate('configuracoes')}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
          >
            {getAvatarUrl(currentUser.avatar) ? (
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 flex-shrink-0" style={{ backgroundImage: `url('${getAvatarUrl(currentUser.avatar)}')` }}></div>
            ) : (
              <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{currentUser.name?.charAt(0) || 'U'}</span>
              </div>
            )}
            <div className="flex flex-col overflow-hidden flex-1">
              <p className="text-[13px] font-bold truncate dark:text-white group-hover:text-primary transition-colors">{currentUser.name}</p>
              <p className="text-[11px] text-[#636f88] truncate border-none">{currentUser.email}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                signOut();
              }}
              className="ml-auto p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 hover:text-red-500 transition-colors text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
