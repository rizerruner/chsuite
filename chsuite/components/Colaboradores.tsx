import React, { useState } from 'react';
import { User } from '../types';
import { useRBAC } from '../context/RBACContext';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

import { BLANK_AVATAR } from '../constants';
import { useToast } from '../context/ToastContext';
import { EmptyState } from './ui/EmptyState';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { UserFormModal } from './ui/UserFormModal';
import { UserCredentialsModal } from './ui/UserCredentialsModal';

import { getAvatarUrl } from '../utils/imageUtils';

const Colaboradores: React.FC = () => {
  const { users, roles, hasPermission, currentRole, deleteUser } = useRBAC();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ user: User, password?: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);





  const handleEditColaborador = (colab: User) => {
    setEditingUser(colab);
    setIsFormModalOpen(true);
  };

  const handleDelete = () => {
    if (!editingUser) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      await deleteUser(editingUser.id);
      setIsDeleteModalOpen(false);
      setIsFormModalOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      showToast(error.message || 'Erro ao excluir', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUserFormSuccess = (data: { user: User; password?: string }) => {
    if (data.password) {
      setCreatedUserInfo({ user: data.user, password: data.password });
      setShowSuccessModal(true);
    }
    setEditingUser(null);
  };

  const filteredColaboradores = users.filter(c => {
    // Check if the user's role is a system admin role
    const userRole = roles.find(r => r.id === c.roleId);

    // Hide system admins from non-system admin users
    if (userRole?.isSystemAdmin && !currentRole?.isSystemAdmin) {
      return false;
    }

    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getRoleBadge = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return null;

    let bgColor = 'bg-amber-100';
    let textColor = 'text-amber-700';

    if (role.isSystemAdmin) {
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-700';
    } else if (role.id === 'r2' || role.name.toLowerCase().includes('gerente')) {
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-700';
    }

    return (
      <span className={`${bgColor} ${textColor} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide`}>
        {role.name}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">Gestão de Colaboradores</h1>
          <p className="text-[#636f88] dark:text-gray-400 text-base font-normal">Cadastre e gerencie os acessos e cargos da sua equipe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => { setEditingUser(null); setIsFormModalOpen(true); }}
            icon="person_add"
            size="md"
            className="shadow-primary/20"
          >
            NOVO COLABORADOR
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-[#1c222d] rounded-xl border border-[#dcdfe5] dark:border-[#2d333d] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#dcdfe5] dark:border-[#2d333d] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-[#111318] dark:text-white text-lg font-bold">Equipe Ativa</h2>
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] text-xs dark:text-white focus:ring-primary"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#161b25] text-[#636f88] dark:text-gray-400 text-xs uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdfe5] dark:divide-[#2d333d]">
                {filteredColaboradores.map((colab) => (
                  <tr
                    key={colab.id}
                    onClick={() => {
                      if (hasPermission('colaboradores', 'edit')) {
                        handleEditColaborador(colab);
                      }
                    }}
                    className={`transition-colors group ${hasPermission('colaboradores', 'edit') ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#161b25]' : 'cursor-default'} ${editingUser?.id === colab.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={getAvatarUrl(colab.avatar) || BLANK_AVATAR} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700" alt="" />
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111318] dark:text-white">
                            {colab.name}
                            {editingUser?.id === colab.id && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded uppercase font-black">Editando</span>}
                          </span>
                          <span className="text-xs text-[#636f88] dark:text-gray-400">{colab.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#111318] dark:text-gray-300">
                      {colab.department}
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(colab.roleId)}
                    </td>
                  </tr>
                ))}
                {filteredColaboradores.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon="person_off"
                        title="Nenhum colaborador"
                        description="Não encontramos colaboradores com esses critérios. Adicione novos membros ou limpe sua busca."
                        actionLabel="NOVO COLABORADOR"
                        onAction={() => { setEditingUser(null); setIsFormModalOpen(true); }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasPermission('colaboradores', 'edit') && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
              Clique em uma linha para gerenciar as informações do perfil
            </div>
          )}
        </div>
      </div>

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingUser(null); }}
        editingUser={editingUser}
        onSuccess={handleUserFormSuccess}
      />

      <UserCredentialsModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        email={createdUserInfo?.user.email}
        password={createdUserInfo?.password}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Excluir Colaborador?"
        message="Tem certeza que deseja excluir este colaborador? Esta ação revogará todos os acessos imediatamente."
        confirmLabel="Sim, Excluir"
        loading={isSaving}
      />
    </div>
  );
};

export default Colaboradores;
