
import React, { useState } from 'react';
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
.
const AppContent: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const { currentUser, currentRole, loading: rbacLoading } = useRBAC();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const loading = authLoading || rbacLoading;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0e14]">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Guard module="dashboard">
            <Dashboard onNavigate={setCurrentView} />
          </Guard>
        );
      case 'lancamentos':
        return (
          <Guard module="lancamentos">
            <Lancamentos />
          </Guard>
        );
      case 'colaboradores':
        return (
          <Guard module="colaboradores">
            <Colaboradores />
          </Guard>
        );
      case 'unidades':
        return (
          <Guard module="unidades">
            <Lojas />
          </Guard>
        );
      case 'viagens':
        return (
          <Guard module="viagens">
            <Viagens />
          </Guard>
        );
      case 'configuracoes':
        return (
          <Guard module="configuracoes">
            <Configuracoes />
          </Guard>
        );
      case 'tarefas':
        return (
          <Guard module="tarefas">
            <Tarefas />
          </Guard>
        );
      default:
        return (
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
        );
    }
  };

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
      {renderContent()}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RBACProvider>
        <AppContent />
      </RBACProvider>
    </AuthProvider>
  );
};

export default App;
