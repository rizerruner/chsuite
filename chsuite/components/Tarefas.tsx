
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Guard, useRBAC } from '../context/RBACContext';
import { supabase } from '../lib/supabase';

interface Task {
    id: string;
    title: string;
    status: 'Pendente' | 'Em Andamento' | 'Concluída';
    priority: 'Alta' | 'Média' | 'Baixa';
    dueDate: string;
    user_id?: string;
}

const Tarefas: React.FC = () => {
    const { logAction, currentUser } = useRBAC();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setTasks(data.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    dueDate: t.due_date,
                    user_id: t.user_id
                })));
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !currentUser?.id) return;

        try {
            const newTaskData = {
                title: newTaskTitle.trim(),
                status: 'Pendente',
                priority: 'Média',
                due_date: new Date().toISOString().split('T')[0],
                user_id: currentUser.id
            };

            const { data, error } = await supabase
                .from('tasks')
                .insert(newTaskData)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newTask: Task = {
                    id: data.id,
                    title: data.title,
                    status: data.status,
                    priority: data.priority,
                    dueDate: data.due_date,
                    user_id: data.user_id
                };
                setTasks([newTask, ...tasks]);
                setNewTaskTitle('');
                logAction('tarefas', 'create', `Created task: ${newTask.title}`);
            }
        } catch (error) {
            console.error("Error creating task:", error);
            alert("Erro ao criar tarefa.");
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: Task['status']) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
            logAction('tarefas', 'edit', `Updated task status to ${newStatus}`);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'Alta': return 'danger';
            case 'Média': return 'warning';
            case 'Baixa': return 'info';
            default: return 'neutral';
        }
    };

    const getStatusVariant = (status: Task['status']) => {
        switch (status) {
            case 'Pendente': return 'warning';
            case 'Em Andamento': return 'info';
            case 'Concluída': return 'success';
            default: return 'neutral';
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 lg:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">Gestão de Tarefas</h1>
                <p className="text-[#636f88] dark:text-gray-400 text-base font-normal">Organize suas atividades e acompanhe o progresso da equipe.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                    <Guard module="tarefas" action="create">
                        <Card className="sticky top-24">
                            <CardHeader className="flex flex-row items-center gap-2 border-none">
                                <span className="material-symbols-outlined text-primary text-[28px]">add_task</span>
                                <h3 className="text-lg font-bold dark:text-white">Nova Tarefa</h3>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Input
                                        label="Título da Tarefa"
                                        placeholder="O que precisa ser feito?"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
                                    />
                                    <Button fullWidth onClick={handleCreateTask} icon="add">Criar Tarefa</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </Guard>
                </div>

                <div className="lg:col-span-8">
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-bold dark:text-white">Minhas Tarefas</h3>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Tarefa</th>
                                            <th className="px-6 py-4">Prazo</th>
                                            <th className="px-6 py-4">Prioridade</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {loading ? (
                                            <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando tarefas...</td></tr>
                                        ) : tasks.map(task => (
                                            <tr key={task.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold dark:text-white">{task.title}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs dark:text-slate-400">
                                                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={getPriorityColor(task.priority)} size="sm">
                                                        {task.priority}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={getStatusVariant(task.status)} dot>
                                                            {task.status}
                                                        </Badge>
                                                        {task.status !== 'Concluída' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(task.id, task.status === 'Pendente' ? 'Em Andamento' : 'Concluída')}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-primary"
                                                                title="Avançar status"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">navigate_next</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {!loading && tasks.length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">Nenhuma tarefa encontrada.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Tarefas;
