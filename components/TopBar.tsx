import React, { useState } from 'react';
import { View } from '../types';
import { Badge } from './ui/Badge';
import { useRBAC } from '../context/RBACContext';

import { getAvatarUrl } from '../utils/imageUtils';

interface TopBarProps {
  onNavigate?: (view: View) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onNavigate }) => {
  const { upcomingTrips } = useRBAC();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1"></div>

      <div className="flex gap-2 relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative flex items-center justify-center rounded-xl h-10 w-10 transition-all ${showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#f0f2f4] dark:bg-slate-800 text-[#111318] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {upcomingTrips.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 text-[8px] font-bold text-white items-center justify-center animate-bounce">
              {upcomingTrips.length}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setShowNotifications(false)}
            ></div>
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-sm dark:text-white">Notificações</h3>
                <Badge variant="primary">{upcomingTrips.length} Alertas</Badge>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {upcomingTrips.length > 0 ? (
                  upcomingTrips.map(trip => (
                    <div key={trip.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer">
                      <div className="flex gap-3">
                        <img src={getAvatarUrl(trip.avatar) || ''} className="size-8 rounded-full shadow-sm" alt="" />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-bold dark:text-white">Viagem começando em breve!</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {trip.collaborator} inicia visita às unidades: {trip.units.join(', ')}
                          </p>
                          <span className="text-[10px] font-bold text-amber-500 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            Menos de 24 horas
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                    <p className="text-xs text-slate-500">Nenhuma notificação importante.</p>
                  </div>
                )}
              </div>
              {upcomingTrips.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      onNavigate?.('viagens');
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-black text-primary uppercase hover:underline tracking-widest"
                  >
                    Ver todos os planos
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => onNavigate?.('configuracoes')}
          className="flex items-center justify-center rounded-xl h-10 w-10 bg-[#f0f2f4] dark:bg-slate-800 text-[#111318] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
