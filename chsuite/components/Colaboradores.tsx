
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { useRBAC } from '../context/RBACContext';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { supabase } from '../lib/supabase';

import { BLANK_AVATAR } from '../constants';

const Colaboradores: React.FC = () => {
  const { users, roles, createUser, updateUser, deleteUser, hasPermission, currentRole } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ user: User, password: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('r3');
  const [newDept, setNewDept] = useState('Geral');
  const [newAvatar, setNewAvatar] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);


  // Department Management State
  const [departments, setDepartments] = useState<string[]>([]);
  const [isManagingDepartments, setIsManagingDepartments] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptOldName, setEditingDeptOldName] = useState<string | null>(null);
  const [editingDeptNewName, setEditingDeptNewName] = useState('');


  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_departments')
        .select('name')
        .order('name');
      if (error) throw error;
      if (data) setDepartments(data.map(d => d.name));
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);


  const handleAddDepartment = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newDeptName.trim()) return;
    const dName = newDeptName.trim();
    if (departments.includes(dName)) return;

    try {
      const { error } = await supabase.from('user_departments').insert({ name: dName });
      if (error) throw error;
      setDepartments(prev => [...prev, dName].sort());
      setNewDeptName('');
    } catch (error) {
      console.error("Error adding department:", error);
      alert("Erro ao adicionar departamento.");
    }
  };

  const handleUpdateDepartment = async (oldName: string, e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingDeptNewName.trim() || editingDeptNewName === oldName) {
      setEditingDeptOldName(null);
      return;
    }
    const newName = editingDeptNewName.trim();

    try {
      const { error } = await supabase
        .from('user_departments')
        .update({ name: newName })
        .eq('name', oldName);
      if (error) throw error;

      setDepartments(prev => prev.map(d => d === oldName ? newName : d).sort());
      setEditingDeptOldName(null);
      setEditingDeptNewName('');
    } catch (error) {
      console.error("Error updating department:", error);
      alert("Erro ao atualizar departamento.");
    }
  };

  const handleRemoveDepartment = async (deptToRemove: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Deseja remover o departamento "${deptToRemove}"?`)) return;
    try {
      const { error } = await supabase.from('user_departments').delete().eq('name', deptToRemove);
      if (error) throw error;
      setDepartments(prev => prev.filter(d => d !== deptToRemove));
    } catch (error) {
      console.error("Error removing department:", error);
      alert("Erro ao remover departamento.");
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRoleId('r3');
    setNewDept('Geral');
    setNewAvatar('');
    setEditingId(null);
    setIsFormModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditColaborador = (colab: User) => {
    setEditingId(colab.id);
    setNewName(colab.name);
    setNewEmail(colab.email);
    setNewRoleId(colab.roleId);
    setNewDept(colab.department);
    setNewAvatar(colab.avatar === BLANK_AVATAR ? '' : colab.avatar);
    setIsFormModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newRoleId) return;

    setIsSaving(true);
    const avatarToSave = newAvatar || BLANK_AVATAR;

    // Use current role name as position for compatibility
    const currentRole = roles.find(r => r.id === newRoleId);
    const posToSave = currentRole?.name || 'Colaborador';

    try {
      if (editingId) {
        await updateUser(editingId, {
          name: newName,
          email: newEmail,
          roleId: newRoleId,
          department: newDept,
          position: posToSave,
          avatar: avatarToSave
        });
        resetForm();
      } else {
        const result = await createUser({
          name: newName,
          email: newEmail,
          avatar: avatarToSave,
          roleId: newRoleId,
          department: newDept || 'Geral',
          position: posToSave,
          darkMode: false
        });

        setCreatedUserInfo({ user: result.user, password: result.tempPassword });
        setShowSuccessModal(true);
        resetForm();
      }
    } catch (error: any) {
      alert(`Erro: ${error.message || 'Falha na operação'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm('Deseja realmente remover este colaborador?')) {
      try {
        setIsSaving(true);
        await deleteUser(editingId);
        resetForm();
      } catch (error: any) {
        alert(`Erro ao excluir: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    }
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
            onClick={() => { resetForm(); setIsFormModalOpen(true); }}
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
                    className={`transition-colors group ${hasPermission('colaboradores', 'edit') ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#161b25]' : 'cursor-default'} ${editingId === colab.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={colab.avatar || BLANK_AVATAR} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700" alt="" />
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111318] dark:text-white">
                            {colab.name}
                            {editingId === colab.id && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded uppercase font-black">Editando</span>}
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
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                      Nenhum colaborador encontrado.
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

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => { resetForm(); setIsFormModalOpen(false); }}
        title={editingId ? 'Editar Colaborador' : 'Novo Cadastro'}
        icon={editingId ? 'edit_note' : 'person_add'}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500">
              {editingId ? 'Altere as informações do colaborador selecionado.' : 'Preencha os dados abaixo para criar um novo usuário.'}
            </p>
            {editingId && hasPermission('colaboradores', 'delete') && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="text-[10px] font-black uppercase text-red-500 hover:underline disabled:opacity-50"
              >
                Excluir Perfil
              </button>
            )}
          </div>

          <div className="flex flex-col items-center mb-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="size-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-2 relative group cursor-pointer hover:border-primary transition-all"
            >
              <img
                src={newAvatar || BLANK_AVATAR}
                className="w-full h-full object-cover transition-opacity group-hover:opacity-50"
                alt="Preview"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-primary text-3xl">add_a_photo</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {newAvatar ? 'Clique para trocar' : 'Clique para subir foto'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#111318] dark:text-white">Nome Completo</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-sm dark:text-white transition-all"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#111318] dark:text-white">E-mail Corporativo</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-sm dark:text-white transition-all"
                placeholder="joao.silva@empresa.com"
                required
                disabled={!!editingId}
              />
              {editingId && <p className="text-[10px] text-slate-400 italic">O e-mail não pode ser editado por segurança.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#111318] dark:text-white">Perfil</label>
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-sm dark:text-white transition-all"
                required
              >
                {roles
                  .filter(role => !role.isSystemAdmin || currentRole?.isSystemAdmin)
                  .map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#111318] dark:text-white">Departamento</label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="rounded-lg border-[#dcdfe5] dark:border-[#2d333d] dark:bg-[#111621] focus:ring-primary focus:border-primary text-sm dark:text-white transition-all"
              >
                <option value="">Selecione um departamento</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsManagingDepartments(!isManagingDepartments)}
                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isManagingDepartments ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
              >
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                Gerenciar Departamentos
              </button>

              {isManagingDepartments && (
                <div className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Novo Departamento</p>
                    <div className="flex gap-2">
                      <input
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDepartment(e);
                          }
                        }}
                        className="flex-1 h-10 px-3 rounded-xl border-[#e5e7eb] dark:border-[#2d333d] dark:bg-slate-900 text-xs dark:text-white"
                        placeholder="Ex: Comercial..."
                      />
                      <Button type="button" variant="primary" onClick={(e) => handleAddDepartment(e)} className="px-3 py-2 rounded-xl h-10">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 no-scrollbar">
                      {departments.map(dept => (
                        <Badge key={dept} variant="neutral" className="pl-3 pr-1 py-1 normal-case font-bold flex items-center gap-2">
                          {editingDeptOldName === dept ? (
                            <input
                              autoFocus
                              value={editingDeptNewName}
                              onChange={(e) => setEditingDeptNewName(e.target.value)}
                              onBlur={(e) => handleUpdateDepartment(dept, e)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateDepartment(dept, e)}
                              className="h-6 w-32 px-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          ) : (
                            <>
                              {dept}
                              <div className="flex items-center gap-0.5 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingDeptOldName(dept);
                                    setEditingDeptNewName(dept);
                                  }}
                                  className="text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                                <button type="button" onClick={(e) => handleRemoveDepartment(dept, e)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            </>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { resetForm(); setIsFormModalOpen(false); }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                fullWidth
                icon={editingId ? 'save' : 'add'}
              >
                {editingId ? (isSaving ? 'Salvando...' : 'Salvar Alterações') : (isSaving ? 'Cadastrando...' : 'Confirmar Cadastro')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Success Modal for Credentials */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Colaborador Cadastrado!"
        icon="check_circle"
      >
        <div className="flex flex-col gap-6 p-2">
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-800/40 p-4 rounded-2xl flex items-center gap-4">
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <div className="flex flex-col">
              <p className="text-green-800 dark:text-green-200 font-bold">Acesso criado com sucesso</p>
              <p className="text-green-700/70 dark:text-green-400/70 text-xs">O colaborador já pode acessar o portal e definir sua própria senha.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">E-mail de Acesso</label>
              <p className="text-sm font-bold dark:text-white">{createdUserInfo?.user.email}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdUserInfo?.user.email || '');
                  alert('E-mail copiado!');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-slate-400 text-sm">content_copy</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha Temporária</label>
              <p className="text-sm font-black text-primary tracking-widest">{createdUserInfo?.password}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdUserInfo?.password || '');
                  alert('Senha copiada!');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-slate-400 text-sm">content_copy</span>
              </button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
              <p className="text-[11px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest">Atenção</p>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Copie a senha agora. Por segurança, ela não será exibida novamente. Recomende que o colaborador altere a senha no primeiro acesso.
            </p>
          </div>

          <Button variant="primary" onClick={() => setShowSuccessModal(false)} className="w-full py-4 text-sm font-black tracking-widest uppercase">
            CONCLUÍDO
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Colaboradores;
