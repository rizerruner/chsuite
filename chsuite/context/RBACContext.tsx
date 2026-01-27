import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, PermissionModule, PermissionAction, AuditLog, CompanySettings } from '../types';
import { CURRENT_USER } from '../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface RBACContextType {
    currentUser: User;
    currentRole: Role | null;
    roles: Role[];
    auditLogs: AuditLog[];
    hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
    logAction: (module: PermissionModule, action: PermissionAction, details: string) => void;
    users: User[];
    updateUserRole: (userId: string, roleId: string) => Promise<void>;
    setUserStatus: (userId: string, active: boolean) => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    createUser: (user: Omit<User, 'id' | 'isActive'>) => Promise<{ user: User, tempPassword: string }>;
    deleteUser: (userId: string) => Promise<void>;
    updateUser: (userId: string, data: Partial<User>) => Promise<void>;
    adminResetPassword: (userId: string, newPassword: string) => Promise<void>;
    createRole: (role: Role) => void;
    updateRole: (role: Role) => void;
    deleteRole: (roleId: string) => void;
    companySettings: CompanySettings;
    updateCompanySettings: (data: Partial<CompanySettings>) => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();

    const [currentUser, setCurrentUser] = useState<User>({
        ...CURRENT_USER,
        isActive: true,
        roleId: 'r3', // Start as Auditor (read-only) for safety during load
        darkMode: false
    });

    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings>({
        companyName: 'ChSuite Corporate Solutions',
        cnpj: '12.345.678/0001-90',
        address: '',
        phone: '',
        email: '',
        website: '',
        logo: ''
    });

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch roles
            const { data: rolesData } = await supabase.from('roles').select('*');
            if (rolesData) {
                const formattedRoles = rolesData.map((r: any) => ({
                    ...r,
                    isSystemAdmin: r.is_system_admin,
                    permissions: r.permissions || {}
                }));
                setRoles(formattedRoles);
            }

            // 2. Fetch users (profiles)
            const { data: usersData } = await supabase.from('user_profiles').select('*');
            let allUsers: User[] = [];

            if (usersData) {
                allUsers = usersData.map((u: any) => ({
                    id: u.id,
                    name: u.name || u.email,
                    email: u.email,
                    avatar: u.avatar,
                    roleId: u.role_id,
                    isActive: u.is_active,
                    department: u.department || 'Geral',
                    position: u.position || 'Colaborador',
                    darkMode: u.dark_mode || false
                }));
            }

            // 3. Ensure current authenticated user has a profile
            if (authUser) {
                const profileExists = allUsers.find(u => u.id === authUser.id);
                if (!profileExists) {
                    // Create basic profile in local state immediately
                    const newUser: User = {
                        id: authUser.id,
                        name: authUser.user_metadata?.full_name || 'Usuário',
                        email: authUser.email || '',
                        avatar: '',
                        roleId: 'r3', // Default to Auditor
                        isActive: true, // Default active
                        department: 'Geral',
                        position: 'Novo Usuário',
                        darkMode: false
                    };

                    allUsers = [...allUsers, newUser];

                    // Persist to Supabase in background
                    await supabase.from('user_profiles').upsert({
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        avatar: newUser.avatar,
                        role_id: newUser.roleId,
                        is_active: newUser.isActive,
                        department: newUser.department,
                        dark_mode: newUser.darkMode
                    });
                }
            }

            setUsers(allUsers);

            // 3. Fetch audit logs
            const { data: auditLogsData } = await supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (auditLogsData) {
                setAuditLogs(auditLogsData.map((l: any) => ({
                    id: l.id,
                    timestamp: l.timestamp,
                    userId: l.user_id,
                    userName: l.user_name,
                    module: l.module,
                    action: l.action,
                    details: l.details
                })));
            }

            // 4. Fetch company settings
            const { data: companyData } = await supabase.from('company_settings').select('*').eq('id', 'global').maybeSingle();
            if (companyData) {
                setCompanySettings({
                    companyName: companyData.company_name || '',
                    cnpj: companyData.cnpj || '',
                    address: companyData.address || '',
                    phone: companyData.phone || '',
                    email: companyData.email || '',
                    website: companyData.website || '',
                    logo: companyData.logo || ''
                });
            }
        };

        fetchData();
    }, [authUser]);

    // Logged in user sync
    useEffect(() => {
        if (authUser) {
            // Check if we have the profile loaded
            const userProfile = users.find(u => u.id === authUser.id);
            if (userProfile) {
                setCurrentUser(userProfile);
            } else {
                // Fallback while loading or if triggers haven't fired yet
                setCurrentUser(prev => ({
                    ...prev,
                    id: authUser.id,
                    email: authUser.email || '',
                    avatar: authUser.user_metadata?.avatar_url || ''
                }));
            }
        }
    }, [authUser, users]);

    // Theme Sync Side Effect
    useEffect(() => {
        if (currentUser.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [currentUser.darkMode]);

    const currentRole = roles.find(r => r.id === currentUser.roleId) || null;

    const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
        if (!currentUser.isActive) return false;

        // System Admins always have all permissions
        if (currentRole?.isSystemAdmin) return true;

        // "Administrador" role name also gets full access to all modules for business operations
        if (currentRole?.name.toLowerCase() === 'administrador') return true;

        const modulePermissions = currentRole?.permissions[module] || [];
        return modulePermissions.includes(action);
    };

    const logAction = async (module: PermissionModule, action: PermissionAction, details: string) => {
        const newLog: AuditLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            module,
            action,
            details
        };

        // Optimistic update
        setAuditLogs(prev => [newLog, ...prev]);

        // Persist to Supabase
        await supabase.from('audit_logs').insert({
            id: newLog.id,
            user_id: newLog.userId,
            user_name: newLog.userName,
            module: newLog.module,
            action: newLog.action,
            details: newLog.details
        });

        console.log(`[AUDIT] ${newLog.userName} performed ${action} on ${module}: ${details}`);
    };

    const updateUserRole = async (userId: string, roleId: string) => {
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleId } : u));

        // Supabase update
        await supabase.from('user_profiles').update({ role_id: roleId }).eq('id', userId);

        logAction('configuracoes', 'edit', `Updated user ${userId} role to ${roleId}`);
    };

    const setUserStatus = async (userId: string, isActive: boolean) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive } : u));
        await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', userId);
        logAction('configuracoes', 'edit', `${isActive ? 'Activated' : 'Deactivated'} user ${userId}`);
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!currentUser) return;

        console.log("Updating profile with data:", data);

        const updatedUser = { ...currentUser, ...data };
        setCurrentUser(updatedUser);

        // Update in full list as well
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

        const { data: updatedRows, error } = await supabase.from('user_profiles').update({
            name: data.name,
            email: data.email, // Note: Changing email in auth requires different flow usually, but we update profile here
            avatar: data.avatar,
            position: data.position,
            department: data.department,
            dark_mode: data.darkMode
        }).eq('id', currentUser.id).select();

        if (error) {
            console.error("Error updating profile in Supabase:", error);
            throw error;
        } else {
            const count = updatedRows ? updatedRows.length : 0;
            console.log(`Profile updated successfully. Rows affected: ${count}`);
            if (count === 0) {
                const msg = `WARNING: No rows updated! Check if user ID ${currentUser.id} exists in user_profiles table.`;
                console.warn(msg);
                throw new Error("User record not found in database. Cannot update.");
            }
        }

        logAction('configuracoes', 'edit', `User updated own profile`);
    };

    const createUser = async (userData: Omit<User, 'id' | 'isActive'>) => {
        try {
            // We use the RPC to create both auth user and profile
            // Use a default password for new users created by admin
            const defaultPassword = 'ChSuite@' + Math.random().toString(36).slice(-4);

            const { data: newUserId, error } = await supabase.rpc('admin_create_user', {
                user_email: userData.email,
                user_password: defaultPassword,
                user_full_name: userData.name,
                user_role_id: userData.roleId,
                user_position: userData.position || 'Colaborador',
                user_department: userData.department || 'Geral'
            });

            if (error) throw error;

            if (newUserId) {
                const newUser: User = {
                    id: newUserId,
                    isActive: true,
                    ...userData
                };
                setUsers(prev => [...prev, newUser]);
                logAction('seguranca', 'create', `Created new user: ${newUser.name} with ID ${newUserId}. Temp password: ${defaultPassword}`);
                return { user: newUser, tempPassword: defaultPassword };
            }
            throw new Error('Falha ao obter ID do novo usuário');
        } catch (error: any) {
            console.error("Error creating user:", error);
            throw error;
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            const { error } = await supabase.rpc('admin_delete_user', {
                target_user_id: userId
            });

            if (error) throw error;

            setUsers(prev => prev.filter(u => u.id !== userId));
            logAction('configuracoes', 'delete', `Deleted user account: ${userId}`);
        } catch (error: any) {
            console.error("Error deleting user:", error);
            alert(`Erro ao excluir usuário: ${error.message || 'Erro desconhecido'}`);
            throw error;
        }
    };

    const updateUser = async (userId: string, data: Partial<User>) => {
        try {
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));

            // If we are updating the current user, update their profile too
            if (userId === currentUser.id) {
                setCurrentUser(prev => ({ ...prev, ...data }));
            }

            // Sync with Supabase (user_profiles table only, auth changes require custom flow)
            const payload: any = {};
            if (data.name !== undefined) payload.name = data.name;
            if (data.roleId !== undefined) payload.role_id = data.roleId;
            if (data.position !== undefined) payload.position = data.position;
            if (data.department !== undefined) payload.department = data.department;
            if (data.isActive !== undefined) payload.is_active = data.isActive;
            if (data.avatar !== undefined) payload.avatar = data.avatar;
            if (data.darkMode !== undefined) payload.dark_mode = data.darkMode;

            const { error } = await supabase
                .from('user_profiles')
                .update(payload)
                .eq('id', userId);

            if (error) throw error;

            logAction('configuracoes', 'edit', `Updated user ${userId}`);
        } catch (error: any) {
            console.error("Error updating user:", error);
            alert(`Erro ao atualizar usuário: ${error.message || 'Erro desconhecido'}`);
            throw error;
        }
    };

    const adminResetPassword = async (userId: string, newPassword: string) => {
        const { error } = await supabase.rpc('admin_reset_password', {
            target_user_id: userId,
            new_password: newPassword
        });

        if (error) {
            console.error("Error resetting password:", error);
            throw error;
        }

        logAction('configuracoes', 'edit', `Admin reset password for user ${userId}`);
    };

    const createRole = async (role: Role) => {
        setRoles(prev => [...prev, role]);
        await supabase.from('roles').insert({
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            is_system_admin: role.isSystemAdmin
        });
        logAction('configuracoes', 'create', `Created new role: ${role.name}`);
    };

    const updateRole = async (role: Role) => {
        setRoles(prev => prev.map(r => r.id === role.id ? role : r));
        await supabase.from('roles').update({
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            is_system_admin: role.isSystemAdmin
        }).eq('id', role.id);
        logAction('configuracoes', 'edit', `Updated role: ${role.name}`);
    };

    const deleteRole = async (roleId: string) => {
        setRoles(prev => prev.filter(r => r.id !== roleId));
        await supabase.from('roles').delete().eq('id', roleId);
        logAction('configuracoes', 'delete', `Deleted role: ${roleId}`);
    };

    const updateCompanySettings = async (data: Partial<CompanySettings>) => {
        const updated = { ...companySettings, ...data };
        setCompanySettings(updated);

        const payload: any = {};
        if (data.companyName !== undefined) payload.company_name = data.companyName;
        if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
        if (data.address !== undefined) payload.address = data.address;
        if (data.phone !== undefined) payload.phone = data.phone;
        if (data.email !== undefined) payload.email = data.email;
        if (data.website !== undefined) payload.website = data.website;
        if (data.logo !== undefined) payload.logo = data.logo;

        await supabase.from('company_settings').update(payload).eq('id', 'global');
        logAction('configuracoes', 'edit', `Updated company settings`);
    };

    return (
        <RBACContext.Provider value={{
            currentUser,
            currentRole,
            roles,
            users,
            auditLogs,
            hasPermission,
            logAction,
            updateUserRole,
            setUserStatus,
            updateUserProfile,
            createUser,
            deleteUser,
            updateUser,
            adminResetPassword,
            createRole,
            updateRole,
            deleteRole,
            companySettings,
            updateCompanySettings
        }}>
            {children}
        </RBACContext.Provider>
    );
};

export const useRBAC = () => {
    const context = useContext(RBACContext);
    if (context === undefined) {
        throw new Error('useRBAC must be used within an RBACProvider');
    }
    return context;
};

interface GuardProps {
    module: PermissionModule;
    action?: PermissionAction;
    children: ReactNode;
    fallback?: ReactNode;
}

export const Guard: React.FC<GuardProps> = ({
    module,
    action = 'view',
    children,
    fallback = null
}) => {
    const { hasPermission } = useRBAC();

    if (hasPermission(module, action)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
