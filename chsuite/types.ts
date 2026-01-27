
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type PermissionModule = 'dashboard' | 'lancamentos' | 'colaboradores' | 'unidades' | 'viagens' | 'configuracoes' | 'tarefas' | 'seguranca';

export interface PermissionMap {
  [module: string]: PermissionAction[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionMap;
  isSystemAdmin?: boolean; // Access to everything bypassing checks
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleId: string;
  department: string;
  position: string;
  isActive: boolean;
  darkMode: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleId: string;
  isActive: boolean;
  position: string;
  department: string;
  darkMode: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: PermissionModule;
  action: PermissionAction;
  details: string;
}

export type PaymentMethod = string;

export interface Expense {
  id: string;
  collaborator: string;
  unit: string;
  category: string;
  date: string;
  value: number;
  paymentMethod: PaymentMethod;
  status: 'Aprovado' | 'Pendente' | 'Paga' | 'Reprovado';
  receiptUrl?: string;
}

export interface Loja {
  id: string;
  name: string;
  city: string;
  manager: string;
  distanceFromMatrix: number;
  status: 'Ativa' | 'Inativa';
}

export interface Trip {
  id: string;
  collaborator: string;
  avatar: string;
  role: string;
  units: string[];
  startDate: string;
  endDate: string;
  estimatedCost: number;
  // Added 'Agendada' to the allowed status values to match mock data and application logic
  status: 'Pendente' | 'Aprovada' | 'Reprovada' | 'Em curso' | 'Concluída' | 'Agendada';
  actionPlan?: string[];
  rejectionReason?: string;
  completionNotes?: string;
}

export type View = 'dashboard' | 'lancamentos' | 'colaboradores' | 'unidades' | 'viagens' | 'configuracoes' | 'tarefas';

export interface CompanySettings {
  companyName: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
}