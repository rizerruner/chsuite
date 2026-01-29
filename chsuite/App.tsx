
import React, { useState, useEffect } from 'react';
import { View } from './types';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import Lancamentos from './components/Lancamentos';
import Colaboradores from './components/Colaboradores';
import Lojas from './components/Lojas';
import Viagens from './components/Viagens';
import Configuracoes from './components/Configuracoes';
import Tarefas from './components/Tarefas';
import Login from './components/Login';
import { Button } from './components/ui/Button';
import { RBACProvider, Guard, useRBAC } from './context/RBACContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const AppContent: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { currentUser, currentRole, loading: rbacLoading } = useRBAC();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [backgroundModulesLoaded, setBackgroundModulesLoaded] = useState(false);

  // Consolidated load: all essential data arrived in RPC, no need for staggered delay
  useEffect(() => {
    if (session && !backgroundModulesLoaded) {
      setBackgroundModulesLoaded(true);
    }
  }, [session, backgroundModulesLoaded]);

  // PERFORMANCE TRACKING
  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      const time = performance.now();
      console.log(`%c [PERF] App fully ready in ${time.toFixed(0)}ms`, 'background: #222; color: #bada55; font-weight: bold;');
    }
  }, [authLoading, rbacLoading]);

  // Decouple Loading: Main layout appears as soon as Auth is ready.
  // Individual modules (Dashboard, etc.) will show their own skeletons via Guard/RBAC state.
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0e14]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Iniciando ChSuite...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const getTitle = () => {
    const isAdmin = currentUser.roleId === 'r_admin_pro' || (currentRole && currentRole.isSystemAdmin) || currentRole?.name.toLowerCase() === 'administrador';

    switch (currentView) {
      case 'dashboard': return 'Dashboard Principal';
      case 'lancamentos': return isAdmin ? 'Gestão de Despesas' : 'Meus Lançamentos';
      case 'viagens': return isAdmin ? 'Controle de Viagens' : 'Plano de Viagens';
      case 'colaboradores': return 'Gestão de Colaboradores';
      case 'unidades': return 'Gestão de Lojas';
      case 'configuracoes': return 'Configurações do Sistema';
      case 'tarefas': return isAdmin ? 'Gestão de Tarefas' : 'Minhas Tarefas';
      default: return 'ChSuite';
    }
  };

  return (
    <MainLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      title={getTitle()}
    >
      {/* Persistently Mounted Core Views (for instant switching & state preservation) */}
      <div className={currentView === 'dashboard' ? 'contents' : 'hidden'}>
        <Guard module="dashboard">
          <Dashboard onNavigate={setCurrentView} />
        </Guard>
      </div>

      <div className={currentView === 'lancamentos' ? 'contents' : 'hidden'}>
        {(currentView === 'lancamentos' || backgroundModulesLoaded) && (
          <Guard module="lancamentos">
            <Lancamentos />
          </Guard>
        )}
      </div>

      <div className={currentView === 'viagens' ? 'contents' : 'hidden'}>
        {(currentView === 'viagens' || backgroundModulesLoaded) && (
          <Guard module="viagens">
            <Viagens />
          </Guard>
        )}
      </div>

      <div className={currentView === 'tarefas' ? 'contents' : 'hidden'}>
        {(currentView === 'tarefas' || backgroundModulesLoaded) && (
          <Guard module="tarefas">
            <Tarefas />
          </Guard>
        )}
      </div>

      {/* Conditionally Mounted Administrative/Settings Views (rarely toggled, saves initial memory) */}
      {currentView === 'colaboradores' && (
        <Guard module="colaboradores">
          <Colaboradores />
        </Guard>
      )}

      {currentView === 'unidades' && (
        <Guard module="unidades">
          <Lojas />
        </Guard>
      )}

      {currentView === 'configuracoes' && (
        <Guard module="configuracoes">
          <Configuracoes />
        </Guard>
      )}

      {/* Fallback for unknown views */}
      {!['dashboard', 'lancamentos', 'viagens', 'tarefas', 'colaboradores', 'unidades', 'configuracoes'].includes(currentView) && (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center p-8">
          <span className="material-symbols-outlined text-6xl text-slate-300">construction</span>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Módulo em Desenvolvimento</h2>
          <p className="text-slate-500">Estamos trabalhando para trazer a funcionalidade de <b>{currentView}</b> o mais rápido possível.</p>
          <Button
            onClick={() => setCurrentView('dashboard')}
            icon="arrow_back"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <RBACProvider>
          <AppContent />
        </RBACProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
