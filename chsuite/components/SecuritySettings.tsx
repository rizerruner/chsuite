
import React, { useState } from 'react';
import { useRBAC } from '../context/RBACContext';
import { PermissionModule, PermissionAction, Role, User } from '../types';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { MENU_ITEMS, MOCK_COLABORADORES } from '../constants';

const MODULES: PermissionModule[] = ['dashboard', 'lancamentos', 'viagens', 'colaboradores', 'unidades', 'configuracoes', 'tarefas', 'seguranca'];
const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve'];

const SecuritySettings: React.FC = () => {
    const { roles, users, auditLogs, hasPermission, updateRole, createRole, deleteRole, setUserStatus, updateUserRole, createUser, deleteUser, updateUser, adminResetPassword, currentUser: globalCurrentUser } = useRBAC();
    const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'audit'>('roles');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    // Password Reset State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // Role Form State
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');

    // User Form State
    const [newUser, setNewUser] = useState({
        email: '',
        roleId: '',
        position: '',
        department: ''
    });

    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [successInfo, setSuccessInfo] = useState<{ email: string, password: string } | null>(null);

    const handleTogglePermission = (role: Role, module: PermissionModule, action: PermissionAction) => {
        if (role.isSystemAdmin) return;

        const newPermissions = { ...role.permissions };
        const modulePerms = newPermissions[module] || [];

        if (modulePerms.includes(action)) {
            newPermissions[module] = modulePerms.filter(a => a !== action);
        } else {
            newPermissions[module] = [...modulePerms, action];
        }

        updateRole({ ...role, permissions: newPermissions });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        const newRole: Role = {
            id: `r-${Math.random().toString(36).substr(2, 9)}`,
            name: newRoleName,
            description: newRoleDesc,
            permissions: {}
        };

        createRole(newRole);
        setNewRoleName('');
        setNewRoleDesc('');
        setIsModalOpen(false);
    };

    const handleCreateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name.trim() || !newUser.email.trim() || !newUser.roleId) return;

        try {
            if (editingUserId) {
                await updateUser(editingUserId, {
                    name: newUser.name,
                    roleId: newUser.roleId,
                    position: newUser.position,
                    department: newUser.department
                });
                alert("Usuário atualizado com sucesso!");
                setEditingUserId(null);
                setIsUserModalOpen(false);
                setNewUser({ name: '', email: '', roleId: '', position: '', department: '' });
            } else {
                const result = await createUser({
                    name: newUser.name,
                    email: newUser.email,
                    avatar: '',
                    roleId: newUser.roleId,
                    department: newUser.department || 'Geral',
                    position: newUser.position || 'Colaborador'
                });

                if (result) {
                    setSuccessInfo({
                        email: result.user.email,
                        password: result.tempPassword
                    });
                    setNewUser({ name: '', email: '', roleId: '', position: '', department: '' });
                    setIsUserModalOpen(false);
                }
            }
        } catch (error: any) {
            console.error("Erro ao processar usuário:", error);
            alert(`Erro: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleEditUserClick = (user: User) => {
        setNewUser({
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            position: user.position || '',
            department: user.department || 'Geral'
        });
        setEditingUserId(user.id);
        setIsUserModalOpen(true);
    };

    const handleDeleteUserClick = (user: User) => {
        if (user.id === globalCurrentUser.id) {
            alert("Você não pode excluir sua própria conta.");
            return;
        }
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete.id);
            alert("Usuário excluído com sucesso!");
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (error) {
            // Error managed in context
        }
    };

    const handleSelectAll = (e: React.MouseEvent, role: Role) => {
        e.preventDefault();
        e.stopPropagation();
        if (role.isSystemAdmin) return;

        const allPermissions: any = {};
        MODULES.forEach(module => {
            allPermissions[module] = [...ACTIONS];
        });

        updateRole({ ...role, permissions: allPermissions });
    };

    const handleDeselectAll = (e: React.MouseEvent, role: Role) => {
        e.preventDefault();
        e.stopPropagation();
        if (role.isSystemAdmin) return;
        updateRole({ ...role, permissions: {} });
    };

    const openResetModal = (user: User) => {
        setUserToReset(user);
        setNewPassword('');
        setIsResetModalOpen(true);
    };

    const handleManualResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToReset || !newPassword) return;

        try {
            await adminResetPassword(userToReset.id, newPassword);
            alert(`Senha de ${userToReset.name} alterada com sucesso!`);
            setIsResetModalOpen(false);
        } catch (error) {
            console.error("Erro ao alterar senha:", error);
            alert("Erro ao alterar senha. Verifique se você tem permissão de administrador.");
        }
    };

    const renderRolesTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold dark:text-white">Gerenciar Perfis de Acesso</h3>
                <Button size="sm" icon="add" onClick={() => setIsModalOpen(true)}>Novo Perfil</Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {roles
                    .filter(role => !role.isSystemAdmin || globalCurrentUser.roleId === 'r_admin_pro' || (globalCurrentUser.roleId && roles.find(r => r.id === globalCurrentUser.roleId)?.isSystemAdmin))
                    .map(role => (
                        <Card key={role.id} className={role.isSystemAdmin ? 'border-primary/30 bg-primary/5' : ''}>
                            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-base dark:text-white">{role.name}</span>
                                        {role.isSystemAdmin && <Badge variant="primary" size="sm">System Admin</Badge>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                                </div>
                                {!role.isSystemAdmin && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex mr-4 gap-1">
                                            <button
                                                onClick={(e) => handleSelectAll(e, role)}
                                                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                                            >
                                                Marcar Tudo
                                            </button>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center mx-1"></div>
                                            <button
                                                onClick={(e) => handleDeselectAll(e, role)}
                                                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                                            >
                                                Remover Tudo
                                            </button>
                                        </div>
                                        <Button variant="ghost" size="sm" icon="delete" className="text-red-400" onClick={() => deleteRole(role.id)} />
                                    </div>
                                )}
                                {role.isSystemAdmin && (
                                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        Permissões fixas de sistema
                                    </span>
                                )}
                            </CardHeader>
                            <CardContent className="pt-4 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 dark:border-slate-800">
                                            <th className="py-2 px-2">Módulo</th>
                                            {ACTIONS.map(action => (
                                                <th key={action} className="py-2 px-2 text-center">{action}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {MODULES.map(module => (
                                            <tr key={module} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                <td className="py-3 px-2">
                                                    <span className="text-xs font-bold capitalize dark:text-slate-300">{module}</span>
                                                </td>
                                                {ACTIONS.map(action => {
                                                    const isChecked = role.isSystemAdmin || !!(role.permissions[module]?.includes(action));
                                                    return (
                                                        <td key={action} className="py-3 px-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={role.isSystemAdmin}
                                                                onChange={() => handleTogglePermission(role, module, action)}
                                                                className="rounded border-slate-200 text-primary focus:ring-primary dark:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-primary/10 text-primary size-12 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl font-bold">add_moderator</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white tracking-tight">Criar Novo Perfil</h3>
                                    <p className="text-xs text-slate-500">Defina um nome e descrição para o novo cargo.</p>
                                </div>
                            </div>
                            <form onSubmit={handleCreateSubmit} className="space-y-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nome do Perfil</label>
                                    <Input
                                        placeholder="Ex: Supervisor de Loja"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Descrição</label>
                                    <Input
                                        placeholder="Descreva as responsabilidades..."
                                        value={newRoleDesc}
                                        onChange={e => setNewRoleDesc(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                    <Button variant="primary" fullWidth type="submit">Criar Perfil</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )
            }
        </div >
    );

    const renderUsersTab = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <h3 className="text-lg font-bold dark:text-white">Usuários e Vinculação de Perfis</h3>
                    <Button size="sm" icon="person_add" onClick={() => setIsUserModalOpen(true)}>Novo Usuário</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Cargo</th>
                                    <th className="px-6 py-4">Perfil</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {users
                                    .filter(user => {
                                        const userRole = roles.find(r => r.id === user.roleId);
                                        const isCurrentUserAdmin = globalCurrentUser.roleId === 'r_admin_pro' || (globalCurrentUser.roleId && roles.find(r => r.id === globalCurrentUser.roleId)?.isSystemAdmin);
                                        return !userRole?.isSystemAdmin || isCurrentUserAdmin;
                                    })
                                    .map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={user.avatar} className="size-8 rounded-full" alt="" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold dark:text-white">{user.name}</span>
                                                        <span className="text-[10px] text-slate-500">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium dark:text-slate-400 capitalize">{user.position}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="neutral" className="font-bold border-primary/20 text-primary bg-primary/5">
                                                    {roles.find(r => r.id === user.roleId)?.name || 'Nenhum'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={user.isActive ? 'success' : 'neutral'}>
                                                    {user.isActive ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon={user.isActive ? 'person_off' : 'person_check'}
                                                        onClick={() => setUserStatus(user.id, !user.isActive)}
                                                        className={user.isActive ? 'text-amber-500' : 'text-green-500'}
                                                        title={user.isActive ? 'Desativar' : 'Ativar'}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon="edit"
                                                        onClick={() => handleEditUserClick(user)}
                                                        className="text-primary hover:text-primary/70"
                                                        title="Editar Usuário"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon="delete"
                                                        onClick={() => handleDeleteUserClick(user)}
                                                        className="text-red-400 hover:text-red-600"
                                                        title="Excluir Usuário"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon="lock_reset"
                                                        onClick={() => openResetModal(user)}
                                                        className="text-slate-400 hover:text-primary"
                                                        title="Alterar senha manualmente"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );

    const renderAuditTab = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-bold dark:text-white">Logs de Auditoria</h3>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-widest z-10">
                                <tr>
                                    <th className="px-6 py-4">Horário</th>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Ação</th>
                                    <th className="px-6 py-4">Módulo</th>
                                    <th className="px-6 py-4">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-400 italic">Nenhum evento registrado ainda.</td>
                                    </tr>
                                ) : auditLogs.map(log => (
                                    <tr key={log.id} className="text-xs hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 font-bold dark:text-slate-300">
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                log.action === 'create' ? 'success' :
                                                    log.action === 'delete' ? 'danger' :
                                                        log.action === 'approve' ? 'info' : 'warning'
                                            } size="sm">
                                                {log.action.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 capitalize font-medium">{log.module}</td>
                                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Perfis (Roles)
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Usuários
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Auditoria
                </button>
            </div>

            <div className="min-h-[500px]">
                {activeTab === 'roles' && renderRolesTab()}
                {activeTab === 'users' && renderUsersTab()}
                {activeTab === 'audit' && renderAuditTab()}
            </div>

            {/* User Creation Modal */}
            {
                isUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-primary/10 text-primary size-12 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl font-bold">{editingUserId ? 'edit' : 'person_add'}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white tracking-tight">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                                    <p className="text-xs text-slate-500">{editingUserId ? 'Altere as informações do usuário selecionado.' : 'Cadastre um novo usuário para acesso ao sistema.'}</p>
                                </div>
                            </div>
                            <form onSubmit={handleCreateUserSubmit} className="space-y-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nome Completo</label>
                                    <Input
                                        placeholder="Ex: João Silva"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">E-mail Corporativo</label>
                                    <Input
                                        type="email"
                                        placeholder="joao@empresa.com"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        required
                                        disabled={!!editingUserId}
                                    />
                                    {editingUserId && <p className="text-[10px] text-slate-400 italic">E-mail não pode ser alterado.</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Cargo</label>
                                        <Input
                                            placeholder="Ex: Analista"
                                            value={newUser.position}
                                            onChange={e => setNewUser({ ...newUser, position: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Departamento</label>
                                        <Input
                                            placeholder="Ex: Geral"
                                            value={newUser.department}
                                            onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Perfil de Acesso</label>
                                        <select
                                            className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm p-2"
                                            value={newUser.roleId}
                                            onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}
                                            required
                                        >
                                            <option value="">Selecione...</option>
                                            {roles
                                                .filter(r => !r.isSystemAdmin || (globalCurrentUser.roleId && roles.find(role => role.id === globalCurrentUser.roleId)?.isSystemAdmin))
                                                .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="secondary" fullWidth onClick={() => { setIsUserModalOpen(false); setEditingUserId(null); setNewUser({ name: '', email: '', roleId: '', position: '', department: '' }); }}>Cancelar</Button>
                                    <Button variant="primary" fullWidth type="submit">{editingUserId ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )
            }

            {/* Password Reset Modal */}
            {
                isResetModalOpen && userToReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-amber-500/10 text-amber-600 size-12 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl font-bold">lock_reset</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white tracking-tight">Alterar Senha</h3>
                                    <p className="text-xs text-slate-500">Defina uma nova senha para <b>{userToReset.name}</b></p>
                                </div>
                            </div>
                            <form onSubmit={handleManualResetSubmit} className="space-y-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nova Senha</label>
                                    <Input
                                        type="text"
                                        placeholder="Digite a nova senha..."
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoFocus
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Mínimo de 6 caracteres.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="secondary" fullWidth onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
                                    <Button variant="primary" fullWidth type="submit">Salvar Senha</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )
            }
            {/* User Success Modal */}
            {
                successInfo && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl border-green-100 dark:border-green-900/30">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-green-500/10 text-green-600 size-12 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white tracking-tight">Usuário Criado!</h3>
                                    <p className="text-xs text-slate-500">Credenciais geradas com sucesso.</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col gap-1 mb-3">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail</span>
                                        <span className="text-sm font-bold dark:text-white select-all">{successInfo.email}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senha Temporária</span>
                                        <span className="text-sm font-mono font-bold text-primary select-all">{successInfo.password}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic text-center">Clique duas vezes sobre os dados para selecionar e copiar.</p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => {
                                        const text = `Acesso ChSuite\nEmail: ${successInfo.email}\nSenha: ${successInfo.password}`;
                                        navigator.clipboard.writeText(text);
                                        alert("Dados copiados para a área de transferência!");
                                    }}
                                    icon="content_copy"
                                >
                                    Copiar Tudo
                                </Button>
                                <Button variant="primary" fullWidth onClick={() => setSuccessInfo(null)}>Fechar</Button>
                            </div>
                        </Card>
                    </div>
                )
            }
            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && userToDelete && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <Card className="max-w-sm w-full p-8 text-center animate-in zoom-in duration-300 shadow-2xl">
                            <div className="size-20 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl">warning</span>
                            </div>
                            <h3 className="text-xl font-black dark:text-white tracking-tight">Excluir Usuário?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 mb-8 leading-relaxed">
                                Você está prestes a excluir <b>{userToDelete.name}</b>.
                                Esta ação removerá permanentemente o acesso e o perfil do usuário.
                            </p>
                            <div className="flex gap-3">
                                <Button variant="secondary" fullWidth onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}>Cancelar</Button>
                                <Button variant="danger" fullWidth onClick={confirmDeleteUser} className="shadow-red-500/20">Sim, Excluir</Button>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div>
    );
};

export default SecuritySettings;
