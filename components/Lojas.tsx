
import React, { useState, useEffect } from 'react';
import { Loja } from '../types';
import { supabase } from '../lib/supabase';
import { useRBAC, Guard } from '../context/RBACContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

const Lojas: React.FC = () => {
  const { hasPermission, logAction, units: globalUnits, refreshUnits } = useRBAC();
  const { showToast } = useToast();

  const lojas = React.useMemo(() => {
    return globalUnits.map((unit: any) => ({
      id: unit.id,
      name: unit.name,
      city: unit.city,
      manager: unit.manager,
      distanceFromMatrix: Number(unit.distance_from_matrix),
      status: unit.status as 'Ativa' | 'Inativa'
    }));
  }, [globalUnits]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [lojaToDelete, setLojaToDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [manager, setManager] = useState('');
  const [distance, setDistance] = useState('');


  const resetForm = () => {
    setName('');
    setCity('');
    setManager('');
    setDistance('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEditLoja = (loja: Loja) => {
    // Check permission for editing
    if (!hasPermission('unidades', 'edit')) return;

    setEditingId(loja.id);
    setName(loja.name);
    setCity(loja.city);
    setManager(loja.manager);
    setDistance(loja.distanceFromMatrix.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || !manager) {
      showToast("Por favor, preencha os campos obrigatórios.", "warning");
      return;
    }

    // Check permissions
    if (editingId && !hasPermission('unidades', 'edit')) {
      showToast("Você não tem permissão para editar unidades.", "error");
      return;
    }
    if (!editingId && !hasPermission('unidades', 'create')) {
      showToast("Você não tem permissão para criar unidades.", "error");
      return;
    }

    // Check for duplicates
    const normalizedName = name.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!editingId) {
      const isDuplicate = lojas.some(l => l.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedName);
      if (isDuplicate) {
        showToast(`A unidade "${name}" já está cadastrada.`, "warning");
        return;
      }
    } else {
      const isDuplicate = lojas.some(l => l.id !== editingId && l.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedName);
      if (isDuplicate) {
        showToast(`Já existe outra unidade com o nome "${name}".`, "warning");
        return;
      }
    }

    try {
      const payload = {
        name,
        city,
        manager,
        distance_from_matrix: Number(distance) || 0,
        status: 'Ativa'
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('units')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        logAction('unidades', 'edit', `Updated unit ${name}`);
        showToast("Unidade atualizada com sucesso!");
      } else {
        // Insert
        const { error } = await supabase
          .from('units')
          .insert(payload);

        if (error) throw error;
        logAction('unidades', 'create', `Created unit ${name}`);
        showToast("Unidade cadastrada com sucesso!");
      }

      // Refresh list
      await refreshUnits();
      resetForm();

    } catch (error: any) {
      console.error("Error saving store:", error);
      if (error.code === '23505') {
        showToast(`A unidade "${name}" já está cadastrada.`, "error");
      } else {
        showToast("Erro ao salvar loja. Tente novamente.", "error");
      }
    }
  };

  const handleDeleteLoja = (id: string) => {
    setLojaToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteLoja = async () => {
    if (!lojaToDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', lojaToDelete);

      if (error) throw error;

      logAction('unidades', 'delete', `Deleted unit #${lojaToDelete}`);
      showToast("Unidade excluída com sucesso!");

      await refreshUnits();

      if (expandedId === lojaToDelete) setExpandedId(null);
      setIsDeleteModalOpen(false);
      setLojaToDelete(null);

    } catch (error) {
      console.error("Error deleting store:", error);
      showToast("Erro ao excluir unidade.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredLojas = lojas.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canCreate = hasPermission('unidades', 'create');
  const canEdit = hasPermission('unidades', 'edit');

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">Gestão de Lojas</h1>
        <p className="text-[#636f88] dark:text-gray-400 text-base font-normal">Cadastre filiais e controle as informações logísticas das unidades.</p>
      </div>

      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold">Lojas Cadastradas</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Guard module="unidades" action="create">
                  <Button variant="primary" size="md" onClick={() => { resetForm(); setIsModalOpen(true); }} icon="add">
                    CADASTRAR LOJA
                  </Button>
                </Guard>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
              <div className="flex flex-col lg:flex-row items-end gap-4">
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Busca Rápida</span>
                  <Input
                    placeholder="Nome da loja, cidade ou gerente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon="search"
                    className="h-11 shadow-sm border-white dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#161b25] text-[#636f88] dark:text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-[#e5e7eb] dark:border-[#2d333d]">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Filial</th>
                  <th className="px-6 py-4">Cidade</th>
                  <th className="px-6 py-4">Gerente</th>
                  <th className="px-6 py-4 text-center">Distância</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2d333d]">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando lojas...</td></tr>
                ) : filteredLojas.map((loja) => (
                  <React.Fragment key={loja.id}>
                    <tr
                      onClick={() => toggleExpand(loja.id)}
                      className={`group cursor-pointer hover:bg-gray-50/50 dark:hover:bg-[#161b25] transition-colors ${editingId === loja.id ? 'bg-primary/5' : ''} ${expandedId === loja.id ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}
                    >
                      <td className="px-6 py-5 text-center">
                        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${expandedId === loja.id ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111318] dark:text-white text-[14px]">
                            {loja.name}
                            {editingId === loja.id && (
                              <span className="ml-2 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Editando</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] text-[#636f88] dark:text-gray-400 font-medium">
                        {loja.city}
                      </td>
                      <td className="px-6 py-5 text-[13px] font-medium text-[#111318] dark:text-gray-300">
                        {loja.manager}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-bold bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-full dark:text-white">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">directions_car</span>
                          {loja.distanceFromMatrix} km
                        </div>
                      </td>
                    </tr>
                    {expandedId === loja.id && (
                      <tr className="bg-slate-50/30 dark:bg-slate-800/10 animate-in fade-in slide-in-from-top-1 duration-300">
                        <td colSpan={5} className="px-8 py-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex gap-12">
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID da Unidade</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">#{loja.id}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                              <Guard module="unidades" action="edit">
                                <Button variant="primary" size="sm" onClick={() => handleEditLoja(loja)} icon="edit" className="flex-1 sm:flex-none">
                                  EDITAR
                                </Button>
                              </Guard>
                              <Guard module="unidades" action="delete">
                                <Button variant="secondary" size="sm" onClick={() => handleDeleteLoja(loja.id)} icon="delete" className="flex-1 sm:flex-none !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20">
                                  EXCLUIR
                                </Button>
                              </Guard>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredLojas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon="storefront"
                        title="Nenhuma loja encontrada"
                        description="Você ainda não cadastrou nenhuma filial. Comece adicionando sua primeira unidade."
                        actionLabel={canCreate ? "CADASTRAR LOJA" : undefined}
                        onAction={() => { resetForm(); setIsModalOpen(true); }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/30 dark:bg-slate-800/10 text-[10px] text-slate-400 text-center uppercase font-black tracking-widest border-t border-[#e5e7eb] dark:border-[#2d333d]">
            {canEdit ? 'Clique em uma linha para editar as informações da unidade' : 'Você não tem permissão para editar'}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Filial' : 'Nova Filial'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nome da Filial"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Filial Sul Curitiba"
            icon="storefront"
            required
          />
          <Input
            label="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Porto Alegre, RS"
            icon="location_on"
            required
          />
          <Input
            label="Gerente Responsável"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            placeholder="Nome do gerente"
            icon="person"
            required
          />
          <Input
            label="Distância KM da Matriz"
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            icon="directions_car"
            suffix="KM"
          />

          <div className="pt-4 flex flex-col gap-3">
            <Button
              type="submit"
              fullWidth
              icon={editingId ? 'save' : 'add'}
              size="lg"
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar Loja'}
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              fullWidth
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setLojaToDelete(null); }}
        onConfirm={confirmDeleteLoja}
        title="Excluir Unidade?"
        message="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita e pode afetar lançamentos vinculados."
        confirmLabel="Sim, Excluir"
        loading={loading}
      />
    </div>
  );
};

export default Lojas;
