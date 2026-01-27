
import { Expense, Loja, Trip, User, View } from './types';

export const BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'%3E%3C/path%3E%3C/svg%3E";

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Admin User',
  email: 'admin@empresa.com',
  avatar: '',
  roleId: 'r1',
  department: 'Administrativo',
  position: 'Administrador de Sistemas',
  isActive: true,
  darkMode: false
};

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Combustível',
  'Hospedagem',
  'Transporte (App)',
  'Outros'
];

export const PAYMENT_METHODS = ['Dinheiro', 'Cartão'];

// Função auxiliar para criar uma data próxima
const getUpcomingDate = (hoursAhead: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return d.toISOString().split('T')[0];
};

export const MOCK_EXPENSES: Expense[] = [
  { id: '1', collaborator: 'Ricardo Silveira', unit: 'Loja São Paulo', category: 'Alimentação', date: '2024-05-12', value: 84.50, paymentMethod: 'Dinheiro', status: 'Aprovado' },
  { id: '2', collaborator: 'Amanda Costa', unit: 'Matriz', category: 'Combustível', date: '2024-05-11', value: 250.00, paymentMethod: 'Cartão', status: 'Pendente' },
  { id: '3', collaborator: 'Carlos Oliveira', unit: 'Loja Rio de Janeiro', category: 'Hospedagem', date: '2024-05-10', value: 420.00, paymentMethod: 'Cartão', status: 'Aprovado' },
  { id: '4', collaborator: 'Beatriz Santos', unit: 'Loja Curitiba', category: 'Transporte (App)', date: '2024-05-09', value: 55.00, paymentMethod: 'Dinheiro', status: 'Paga' },
  { id: '5', collaborator: 'Ricardo Silveira', unit: 'Loja São Paulo', category: 'Combustível', date: '2024-05-13', value: 180.00, paymentMethod: 'Cartão', status: 'Aprovado' },
  { id: '6', collaborator: 'João Silva', unit: 'Matriz', category: 'Alimentação', date: '2024-05-14', value: 45.90, paymentMethod: 'Dinheiro', status: 'Pendente' },
  { id: '7', collaborator: 'Amanda Costa', unit: 'Matriz', category: 'Hospedagem', date: '2024-05-15', value: 310.00, paymentMethod: 'Cartão', status: 'Aprovado' },
];

export const MOCK_LOJAS: Loja[] = [
  { id: '1', name: 'Filial Centro SP', city: 'São Paulo', manager: 'Marcos Souza', distanceFromMatrix: 15, status: 'Ativa' },
  { id: '2', name: 'Filial Curitiba Norte', city: 'Curitiba', manager: 'Elena Riff', distanceFromMatrix: 410, status: 'Ativa' },
  { id: '3', name: 'Polo Logístico Rio', city: 'Rio de Janeiro', manager: 'Julio Castro', distanceFromMatrix: 435, status: 'Inativa' },
];

export const MOCK_TRIPS: Trip[] = [
  { id: 't1', collaborator: 'João Silva', avatar: 'https://i.pravatar.cc/150?u=joao', role: 'Supervisor Comercial', units: ['Matriz', 'Filial Norte'], startDate: getUpcomingDate(12), endDate: '2024-10-20', estimatedCost: 1250.00, status: 'Em curso', actionPlan: ['Verificar estoque', 'Reunião com gerente local'] },
  { id: 't2', collaborator: 'Maria Oliveira', avatar: 'https://i.pravatar.cc/150?u=maria', role: 'Gerente Regional', units: ['Shopping Center', 'Centro'], startDate: '2024-12-18', endDate: '2024-12-22', estimatedCost: 980.00, status: 'Agendada', actionPlan: ['Auditoria financeira', 'Treinamento de equipe'] },
];

export const MOCK_COLABORADORES: User[] = [
  { id: 'c1', name: 'Ricardo Silveira', email: 'ricardo.s@empresa.com', avatar: '', roleId: 'r2', department: 'Vendas', position: 'Gerente Comercial', isActive: true, darkMode: false },
  { id: 'c2', name: 'Amanda Costa', email: 'amanda.c@empresa.com', avatar: '', roleId: 'r3', department: 'Controladoria', position: 'Auditor Pleno', isActive: true, darkMode: false },
  { id: 'c3', name: 'Carlos Oliveira', email: 'carlos.o@empresa.com', avatar: '', roleId: 'r2', department: 'Logística', position: 'Coordenador Regional', isActive: true, darkMode: false },
  { id: 'c4', name: 'Beatriz Santos', email: 'beatriz.s@empresa.com', avatar: '', roleId: 'r1', department: 'TI', position: 'Analista de Infraestrutura', isActive: true, darkMode: false },
  { id: 'c5', name: 'João Silva', email: 'joao.s@empresa.com', avatar: '', roleId: 'r2', department: 'Vendas', position: 'Supervisor Comercial', isActive: true, darkMode: false },
];

export const MENU_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'lancamentos', label: 'Lançamentos', icon: 'description' },
  { id: 'viagens', label: 'Viagens', icon: 'map' },
  { id: 'tarefas', label: 'Tarefas', icon: 'checklist' },
  { id: 'colaboradores', label: 'Colaboradores', icon: 'group' },
  { id: 'unidades', label: 'Lojas', icon: 'store' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
];
