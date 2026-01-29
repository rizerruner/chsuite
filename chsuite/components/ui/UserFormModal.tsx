import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input, Select } from './Input';
import { Badge } from './Badge';
import { useRBAC } from '../../context/RBACContext';
import { User, Role } from '../../types';
import { BLANK_AVATAR } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../utils/imageUtils';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingUser?: User | null;
    onSuccess: (data: { user: User; password?: string }) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
    isOpen,
    onClose,
    editingUser,
    onSuccess
}) => {
    const {
        roles,
        createUser,
        updateUser,
        hasPermission,
        currentRole,
        departments,
        refreshDepartments
    } = useRBAC();
    const { showToast } = useToast();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState('');
    const [dept, setDept] = useState('');
    const [position, setPosition] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Department management state
    const [isManagingDepartments, setIsManagingDepartments] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [editingDeptOldName, setEditingDeptOldName] = useState<string | null>(null);
    const [editingDeptNewName, setEditingDeptNewName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingUser) {
            setName(editingUser.name);
            setEmail(editingUser.email);
            setRoleId(editingUser.roleId);
            setDept(editingUser.department);
            setPosition(editingUser.position);
            setAvatar(editingUser.avatar || '');
            setIsActive(editingUser.isActive);
        } else {
            resetFields();
        }
    }, [editingUser, isOpen]);

    const resetFields = () => {
        setName('');
        setEmail('');
        setRoleId(roles.length > 0 ? roles[0].id : '');
        setDept('Geral');
        setPosition('');
        setAvatar('');
        setIsActive(true);
        setIsManagingDepartments(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file, 200, 0.7);
                setAvatar(compressed);
            } catch (err) {
                console.error("Error compressing avatar:", err);
                showToast("Erro ao processar imagem", "error");
            }
        }
    };

    const handleAddDepartment = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;
        try {
            const { error } = await supabase.from('user_departments').insert([{ name: newDeptName.trim() }]);
            if (error) throw error;
            setNewDeptName('');
            await refreshDepartments();
            showToast("Departamento adicionado!");
        } catch (error) {
            console.error("Error adding department:", error);
            showToast("Erro ao adicionar departamento.", "error");
        }
    };

    const handleUpdateDepartment = async (oldName: string, e: any) => {
        if (!editingDeptNewName.trim() || editingDeptNewName === oldName) {
            setEditingDeptOldName(null);
            return;
        }
        try {
            const { error } = await supabase.from('user_departments').update({ name: editingDeptNewName }).eq('name', oldName);
            if (error) throw error;
            await refreshDepartments();
            setEditingDeptOldName(null);
            setEditingDeptNewName('');
            showToast("Departamento atualizado!");
        } catch (error) {
            console.error("Error updating department:", error);
            showToast("Erro ao atualizar departamento.", "error");
        }
    };

    const handleRemoveDepartment = async (deptToRemove: string) => {
        try {
            const { error } = await supabase.from('user_departments').delete().eq('name', deptToRemove);
            if (error) throw error;
            await refreshDepartments();
            showToast("Departamento removido.");
        } catch (error) {
            console.error("Error removing department:", error);
            showToast("Erro ao remover departamento.", "error");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (editingUser) {
                const updated = await updateUser(editingUser.id, {
                    name,
                    roleId,
                    department: dept,
                    position,
                    avatar,
                    isActive
                });
                onSuccess({ user: updated });
                showToast("Usuário atualizado com sucesso!");
            } else {
                const result = await createUser({
                    name,
                    email,
                    avatar,
                    roleId,
                    department: dept || 'Geral',
                    position,
                    darkMode: false
                });
                onSuccess(result);
            }
            onClose();
        } catch (error: any) {
            showToast(error.message || "Erro ao salvar usuário.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            icon={editingUser ? 'edit_note' : 'person_add'}
        >
            <div className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="size-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-2 relative group cursor-pointer hover:border-primary transition-all"
                    >
                        <img
                            src={avatar || BLANK_AVATAR}
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
                        {avatar ? 'Clique para trocar' : 'Clique para subir foto'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#111318] dark:text-white">Nome Completo</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João Silva"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#111318] dark:text-white">E-mail Corporativo</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="joao.silva@empresa.com"
                            required
                            disabled={!!editingUser}
                        />
                        {editingUser && <p className="text-[10px] text-slate-400 italic">O e-mail não pode ser editado.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#111318] dark:text-white">Perfil</label>
                            <Select
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {roles
                                    .filter(role => !role.isSystemAdmin || currentRole?.isSystemAdmin)
                                    .map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#111318] dark:text-white">Status</label>
                            <Select
                                value={isActive ? 'true' : 'false'}
                                onChange={(e) => setIsActive(e.target.value === 'true')}
                            >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#111318] dark:text-white">Cargo</label>
                            <Input
                                placeholder="Ex: Analista"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#111318] dark:text-white">Departamento</label>
                            <Select
                                value={dept}
                                onChange={(e) => setDept(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Select>
                        </div>
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
                                        <Input
                                            value={newDeptName}
                                            onChange={(e) => setNewDeptName(e.target.value)}
                                            placeholder="Ex: Comercial..."
                                            className="h-10"
                                        />
                                        <Button type="button" onClick={handleAddDepartment} className="px-3 h-10">
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 no-scrollbar">
                                        {departments.map(d => (
                                            <Badge key={d} variant="neutral" className="pl-3 pr-1 py-1 normal-case font-bold flex items-center gap-2">
                                                {editingDeptOldName === d ? (
                                                    <Input
                                                        autoFocus
                                                        value={editingDeptNewName}
                                                        onChange={(e) => setEditingDeptNewName(e.target.value)}
                                                        onBlur={(e) => handleUpdateDepartment(d, e)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateDepartment(d, e)}
                                                        className="h-6 w-32 px-1 text-xs"
                                                    />
                                                ) : (
                                                    <>
                                                        {d}
                                                        <div className="flex items-center gap-0.5 ml-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingDeptOldName(d);
                                                                    setEditingDeptNewName(d);
                                                                }}
                                                                className="text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveDepartment(d)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                                                            >
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

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            fullWidth
                            loading={isSaving}
                        >
                            {editingUser ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
