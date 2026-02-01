import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { User, Role, PermissionModule, PermissionAction, AuditLog, CompanySettings, Expense, Trip } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';

// Helper for initial state to avoid "Admin User" confusion
const GUEST_USER: User = {
    id: 'loading',
    name: 'Carregando...',
    email: '---',
    avatar: '',
    roleId: 'r3',
    isActive: true,
    department: 'Geral',
    position: '...',
    darkMode: false
};

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
    units: any[];
    departments: string[];
    refreshUnits: () => Promise<void>;
    refreshDepartments: () => Promise<void>;
    loading: boolean;
    initialDashboardData: { expenses: Expense[], trips: Trip[] } | null;
    upcomingTrips: Trip[];
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user: authUser, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings>({
        companyName: 'ChSuite Corporate', cnpj: '', address: '', phone: '', email: '', website: '', logo: ''
    });
    const [units, setUnits] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialDashboardData, setInitialDashboardData] = useState<{ expenses: Expense[], trips: Trip[] } | null>(null);

    const fetchGlobalData = useCallback(async (userId: string) => {
        setLoading(true); // Explicitly enter loading state when starting fresh fetch
        try {
            console.time('RBAC_ConsolidatedFetch');
            const { data, error } = await supabase.rpc('get_app_initial_data');

            if (error) {
                console.error("RPC Failed, falling back to individual fetches...", error);
                // RPC failed? Fallback to standard fetches to ensure app works
                const [rRoles, rUsers, rSettings, rUnits, rDepts, rLogs] = await Promise.all([
                    supabase.from('roles').select('*'),
                    supabase.from('user_profiles').select('*'),
                    supabase.from('company_settings').select('*').eq('id', 'global').maybeSingle(),
                    supabase.from('units').select('*'),
                    supabase.from('user_departments').select('name'),
                    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
                ]);

                // Construct a minimal data object from results
                const fallbackData = {
                    roles: rRoles.data,
                    users: rUsers.data,
                    company_settings: rSettings.data,
                    units: rUnits.data,
                    departments: rDepts.data,
                    audit_logs: rLogs.data || [],
                    dashboard: null
                };
                processData(fallbackData, userId);
            } else {
                processData(data, userId);
            }
            console.timeEnd('RBAC_ConsolidatedFetch');
        } catch (err) {
            console.error("Critical error in RBAC initialization:", err);
            setLoading(false);
        }
    }, [authUser]);

    const processData = (data: any, userId: string) => {
        if (!data) {
            console.warn("RBAC processData received null data");
            setLoading(false);
            return;
        }

        // 1. Roles
        const mappedRoles = (data.roles || []).map((r: any) => ({
            ...r,
            isSystemAdmin: r.is_system_admin,
            permissions: r.permissions || {}
        }));
        setRoles(mappedRoles);

        // 2. Users
        const mappedUsers = (data.users || []).map((u: any) => ({
            id: u.id, name: u.name || u.email, email: u.email, avatar: u.avatar,
            roleId: u.role_id, isActive: u.is_active, department: u.department || 'Geral',
            position: u.position || 'Colaborador', darkMode: u.dark_mode || false
        }));
        setUsers(mappedUsers);

        // 3. Identification
        let activeProfile = mappedUsers.find((u: any) => u.id === userId);
        if (!activeProfile) {
            // Very critical fallback: If user logged in but has NO profile, create one
            activeProfile = {
                id: userId, name: authUser?.email?.split('@')[0] || 'Novo Usuário',
                email: authUser?.email || '', avatar: '', roleId: 'r1', // Default to Admin to avoid blank screen if first user
                isActive: true, department: 'Geral', position: 'Administrador', darkMode: false
            };
            // Try to persistent it
            supabase.from('user_profiles').upsert({
                id: activeProfile.id, name: activeProfile.name, email: activeProfile.email,
                role_id: activeProfile.roleId, is_active: true
            }).then();
        }
        setCurrentUser(activeProfile);

        // 4. Everything else
        if (data.company_settings) {
            setCompanySettings({
                companyName: data.company_settings.company_name || 'ChSuite Corporate',
                cnpj: data.company_settings.cnpj || '',
                address: data.company_settings.address || '',
                phone: data.company_settings.phone || '',
                email: data.company_settings.email || '',
                website: data.company_settings.website || '',
                logo: data.company_settings.logo || ''
            });
        }
        if (data.units) {
            const sortedUnits = data.units.sort((a: any, b: any) =>
                (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
            );
            setUnits(sortedUnits);
        }
        if (data.departments) setDepartments(data.departments.map((d: any) => d.name).sort());
        if (data.dashboard) {
            setInitialDashboardData({
                expenses: data.dashboard.expenses.map((e: any) => ({
                    unit: e.unit, category: e.category, paymentMethod: e.payment_method,
                    value: Number(e.value), date: e.date, collaborator: e.collaborator
                })),
                trips: data.dashboard.trips.map((t: any) => ({
                    id: t.id, collaborator: t.collaborator, avatar: t.avatar, role: t.role,
                    units: t.units || [], startDate: t.start_date, endDate: t.end_date,
                    estimatedCost: Number(t.estimated_cost), status: t.status
                }))
            });
        }

        // 5. Audit Logs
        const mappedLogs = (data.audit_logs || []).map((l: any) => ({
            id: l.id,
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
            userId: l.user_id,
            userName: l.user_name || 'Desconhecido',
            module: l.module,
            action: l.action,
            details: l.details
        }));
        setAuditLogs(mappedLogs);

        setLoading(false);
    };

    useEffect(() => {
        if (authLoading) return; // Wait for Auth context to resolve initial state

        if (authUser) {
            fetchGlobalData(authUser.id);
        } else {
            setLoading(false);
            setCurrentUser(GUEST_USER);
        }
    }, [authUser, authLoading, fetchGlobalData]);

    useEffect(() => {
        if (currentUser.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [currentUser.darkMode]);

    const upcomingTrips = useMemo(() => {
        if (!initialDashboardData) return [];
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);

        return initialDashboardData.trips.filter(trip => {
            if (!trip.startDate || trip.status !== 'Agendada') return false;
            const tripStart = new Date(trip.startDate);
            // Trips starting between now and tomorrow
            return tripStart >= now && tripStart <= tomorrow;
        });
    }, [initialDashboardData]);

    const currentRole = roles.find(r => r.id === currentUser.roleId) || null;

    const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
        // SAFETY: If we are a known admin role or system admin, always allow
        if (currentUser.roleId === 'r1' || currentUser.roleId === 'r_admin_pro') return true;
        if (currentRole?.isSystemAdmin) return true;

        const modulePermissions = currentRole?.permissions[module] || [];
        return modulePermissions.includes(action);
    };

    const logAction = async (module: PermissionModule, action: PermissionAction, details: string) => {
        const newLog: AuditLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            userId: currentUser.id, userName: currentUser.name,
            module, action, details
        };
        setAuditLogs(prev => [newLog, ...prev]);
        supabase.from('audit_logs').insert({
            id: newLog.id, user_id: newLog.userId, user_name: newLog.userName,
            module: newLog.module, action: newLog.action, details: newLog.details
        }).then();
    };

    const updateUserRole = async (userId: string, roleId: string) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleId } : u));
        await supabase.from('user_profiles').update({ role_id: roleId }).eq('id', userId);
        logAction('seguranca', 'edit', `Updated user ${userId} role to ${roleId}`);
    };

    const setUserStatus = async (userId: string, active: boolean) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: active } : u));
        await supabase.from('user_profiles').update({ is_active: active }).eq('id', userId);
    };

    const updateUserProfile = async (data: Partial<User>) => {
        const updated = { ...currentUser, ...data };
        setCurrentUser(updated);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.avatar !== undefined) updateData.avatar = data.avatar;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.darkMode !== undefined) updateData.dark_mode = data.darkMode;

        await supabase.from('user_profiles').update(updateData).eq('id', currentUser.id);
    };

    const createUser = async (userData: Omit<User, 'id' | 'isActive'>) => {
        const defaultPassword = 'ChSuite@' + Math.random().toString(36).slice(-4);
        const { data: newUserId, error } = await supabase.rpc('admin_create_user', {
            user_email: userData.email, user_password: defaultPassword, user_full_name: userData.name,
            user_role_id: userData.roleId, user_position: userData.position, user_department: userData.department,
            user_avatar: userData.avatar
        });
        if (error) throw error;
        const newUser: User = { id: newUserId, isActive: true, ...userData };
        setUsers(prev => [...prev, newUser]);
        return { user: newUser, tempPassword: defaultPassword };
    };

    const deleteUser = async (userId: string) => {
        await supabase.rpc('admin_delete_user', { target_user_id: userId });
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    const updateUser = async (userId: string, data: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
        if (userId === currentUser.id) setCurrentUser(prev => ({ ...prev, ...data }));
        // Map camelCase to snake_case for database
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.avatar !== undefined) updateData.avatar = data.avatar;
        if (data.roleId !== undefined) updateData.role_id = data.roleId;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        if (data.darkMode !== undefined) updateData.dark_mode = data.darkMode;

        await supabase.from('user_profiles').update(updateData).eq('id', userId);
    };

    const adminResetPassword = async (userId: string, newPassword: string) => {
        await supabase.rpc('admin_reset_password', { target_user_id: userId, new_password: newPassword });
    };

    const createRole = async (role: Role) => {
        setRoles(prev => [...prev, role]);
        await supabase.from('roles').insert({ id: role.id, name: role.name, description: role.description, permissions: role.permissions, is_system_admin: role.isSystemAdmin });
    };

    const updateRole = async (role: Role) => {
        setRoles(prev => prev.map(r => r.id === role.id ? role : r));
        await supabase.from('roles').update({ name: role.name, description: role.description, permissions: role.permissions, is_system_admin: role.isSystemAdmin }).eq('id', role.id);
    };

    const deleteRole = async (roleId: string) => {
        setRoles(prev => prev.filter(r => r.id !== roleId));
        await supabase.from('roles').delete().eq('id', roleId);
    };

    const updateCompanySettings = async (data: Partial<CompanySettings>) => {
        const updated = { ...companySettings, ...data };
        setCompanySettings(updated);

        const updateData: any = {};
        if (data.companyName !== undefined) updateData.company_name = data.companyName;
        if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.website !== undefined) updateData.website = data.website;
        if (data.logo !== undefined) updateData.logo = data.logo;

        await supabase.from('company_settings').update(updateData).eq('id', 'global');
    };

    const refreshUnits = async () => {
        const { data } = await supabase.from('units').select('*');
        if (data) setUnits(data);
    };

    const refreshDepartments = async () => {
        const { data } = await supabase.from('user_departments').select('name').order('name');
        if (data) setDepartments(data.map((d: any) => d.name));
    };

    return (
        <RBACContext.Provider value={{
            currentUser, currentRole, roles, users, auditLogs, hasPermission, logAction,
            updateUserRole, setUserStatus, updateUserProfile, createUser, deleteUser,
            updateUser, adminResetPassword, createRole, updateRole, deleteRole,
            companySettings, updateCompanySettings, units, departments, refreshUnits,
            refreshDepartments, loading, initialDashboardData, upcomingTrips
        }}>
            {children}
        </RBACContext.Provider>
    );
};

export const useRBAC = () => {
    const context = useContext(RBACContext);
    if (context === undefined) throw new Error('useRBAC must be used within an RBACProvider');
    return context;
};

interface GuardProps {
    module: PermissionModule; action?: PermissionAction; children: ReactNode; fallback?: ReactNode;
}

export const Guard: React.FC<GuardProps> = ({ module, action = 'view', children, fallback = null }) => {
    const { hasPermission, loading } = useRBAC();
    // During app boot loading, we don't return null if it's the dashboard module
    // to allow the skeleton to show if the component is mounted
    if (loading && module === 'dashboard') return <>{children}</>;
    if (hasPermission(module, action)) return <>{children}</>;
    return <>{fallback}</>;
};
