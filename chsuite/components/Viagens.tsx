import React, { useState, useMemo } from 'react';
import { Trip, User, UserProfile, Loja, Expense } from '../types';
import { Modal } from './ui/Modal';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input, Select } from './ui/Input';
import { useRBAC, Guard } from '../context/RBACContext';
import { supabase } from '../lib/supabase';

const Viagens: React.FC = () => {
  const { logAction, currentUser, companySettings } = useRBAC();
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const [trips, setTrips] = useState<Trip[]>([]);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [units, setUnits] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedColabId, setSelectedColabId] = useState<string>('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [cost, setCost] = useState('');

  const [actionPlan, setActionPlan] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tripToDeleteId, setTripToDeleteId] = useState<string | null>(null);

  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [tripToRejectId, setTripToRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [tripToCompleteId, setTripToCompleteId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      if (expensesData) {
        setExpenses(expensesData.map((e: any) => ({
          id: e.id,
          unit: e.unit,
          category: e.category,
          paymentMethod: e.payment_method,
          value: Number(e.value),
          date: e.date,
          collaborator: e.collaborator,
          status: e.status
        })));
      }

      if (tripsData) {
        const formattedTrips: (Trip & { actualCost: number })[] = tripsData.map((t: any) => {
          const tripExpenses = (expensesData || []).filter((exp: any) => {
            const isSameColab = exp.collaborator === t.collaborator;
            const isSameUnit = t.units?.includes(exp.unit);
            const isWithinDates = exp.date >= t.start_date && exp.date <= t.end_date;
            return isSameColab && isSameUnit && isWithinDates;
          });

          const actualCost = tripExpenses.reduce((acc: number, curr: any) => acc + Number(curr.value), 0);

          return {
            id: t.id,
            collaborator: t.collaborator,
            avatar: t.avatar,
            role: t.role,
            units: t.units || [],
            startDate: t.start_date,
            endDate: t.end_date,
            estimatedCost: Number(t.estimated_cost),
            actualCost,
            status: t.status as any,
            actionPlan: t.action_plan || [],
            rejectionReason: t.rejection_reason,
            completionNotes: t.completion_notes
          };
        });
        setTrips(formattedTrips as any);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*');

      if (error) throw error;
      if (data) {
        setCollaborators(data.map((p: any) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          avatar: p.avatar,
          roleId: p.role_id,
          isActive: p.is_active,
          position: p.position
        })));
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('status', 'Ativa');

      if (error) throw error;
      if (data) {
        setUnits(data.map((u: any) => ({
          id: u.id,
          name: u.name,
          city: u.city,
          manager: u.manager,
          distanceFromMatrix: u.distance_from_matrix,
          status: u.status
        })));
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };
  // Period Info for Month Filtering
  const periodInfo = useMemo(() => {
    const month = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = selectedDate.getFullYear();

    const startCurrent = new Date(year, selectedDate.getMonth(), 1).toISOString().split('T')[0];
    const endCurrent = new Date(year, selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];

    return {
      monthLabel: `${capitalizedMonth} ${year}`,
      startCurrent,
      endCurrent
    };
  }, [selectedDate]);

  const goToPreviousMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToNextMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTrips(), fetchCollaborators(), fetchUnits()]);
      setLoading(false);
    };
    init();
  }, []);

  // Update selectedColabId when currentUser is available
  React.useEffect(() => {
    if (currentUser?.id && !editingTripId && !selectedColabId) {
      setSelectedColabId(currentUser.id);
    }
  }, [currentUser, editingTripId, selectedColabId]);

  const isFormValid = selectedUnits.length > 0 && !!startDate && !!endDate && !!selectedColabId;

  const resetForm = () => {
    setSelectedUnits([]);
    setStartDate(getTodayString());
    setEndDate(getTodayString());
    setCost('');
    setActionPlan([]);
    setNewActionItem('');
    setSelectedColabId(currentUser?.id || '');
    setEditingTripId(null);
    setIsModalOpen(false);
  };

  const handleToggleUnit = (unitName: string) => {
    setSelectedUnits(prev =>
      prev.includes(unitName)
        ? prev.filter(u => u !== unitName)
        : [...prev, unitName]
    );
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numberValue = Number(value) / 100;

    if (value === '') {
      setCost('');
      return;
    }

    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);

    setCost(formatted);
  };

  const getRawCost = (formattedCost: string) => {
    return Number(formattedCost.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionPlan([...actionPlan, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionPlan(actionPlan.filter((_, i) => i !== index));
  };

  const handleEditClick = (trip: Trip) => {
    setEditingTripId(trip.id);
    const colab = collaborators.find(c => c.name === trip.collaborator) || currentUser;
    setSelectedColabId(colab?.id || '');
    setSelectedUnits(trip.units);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setCost(trip.estimatedCost.toString());
    setActionPlan(trip.actionPlan || []);
    setIsModalOpen(true);
  };

  const handleApproval = async (id: string, newStatus: 'Aprovada' | 'Reprovada', reason?: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: newStatus,
          rejection_reason: newStatus === 'Reprovada' ? reason : null
        })
        .eq('id', id);

      if (error) throw error;

      setTrips(trips.map(t => t.id === id ? { ...t, status: newStatus, rejectionReason: reason } : t));
      logAction('viagens', 'approve', `${newStatus === 'Aprovada' ? 'Approved' : 'Rejected'} travel plan #${id}`);

      if (newStatus === 'Reprovada') {
        setShowRejectionModal(false);
        setTripToRejectId(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error("Error updating trip status:", error);
      alert("Erro ao atualizar status da viagem.");
    }
  };

  const handleCompletion = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'Concluída',
          completion_notes: notes
        })
        .eq('id', id);

      if (error) throw error;

      setTrips(trips.map(t => t.id === id ? { ...t, status: 'Concluída', completionNotes: notes } : t));
      logAction('viagens', 'edit', `Concluiu a viagem #${id}`);

      setShowCompletionModal(false);
      setTripToCompleteId(null);
      setCompletionNotes('');
    } catch (error) {
      console.error("Error completing trip:", error);
      alert("Erro ao concluir a viagem.");
    }
  };

  const handlePrint = (trip: Trip) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const actionPlanHtml = trip.actionPlan && trip.actionPlan.length > 0
      ? `<ul style="margin: 0; padding-left: 20px;">
          ${trip.actionPlan.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}
         </ul>`
      : 'Nenhum detalhe adicional informado.';

    const htmlContent = `
      <html>
        <head>
          <title>Plano de Viagem - ${trip.collaborator}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1f26; background: #fff; line-height: 1.5; }
            .header { 
              border-bottom: 2px solid #195de6; 
              padding-bottom: 25px; 
              margin-bottom: 40px; 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
            }
            .logo-placeholder {
              background: #195de6;
              color: white;
              width: 50px;
              height: 50px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 24px;
            }
            .section { margin-bottom: 35px; }
            .section-title { 
              font-weight: 800; 
              font-size: 10px; 
              color: #195de6; 
              text-transform: uppercase; 
              margin-bottom: 15px; 
              border-bottom: 1px solid #f1f5f9; 
              padding-bottom: 8px; 
              letter-spacing: 0.05em;
            }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px; }
            .value { font-size: 12px; font-weight: 600; color: #1e293b; }
            .unit-badge { 
              background: #f8fafc; 
              border: 1px solid #e2e8f0; 
              padding: 6px 12px; 
              border-radius: 8px; 
              font-size: 11px; 
              font-weight: 700; 
              color: #475569;
              margin-right: 8px; 
              margin-bottom: 8px; 
              display: inline-block; 
            }
            .action-plan {
              background: #f8fafc;
              padding: 24px;
              border-radius: 16px;
              border: 1px solid #f1f5f9;
              font-size: 12px;
              color: #334155;
            }
            .total-box { 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 16px; 
              text-align: right; 
              margin-top: 50px; 
              border: 1px solid #e2e8f0;
              border-left: 5px solid #195de6;
            }
            .total-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; display: block; }
            .total-val { font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.02em; }
            .footer {
              margin-top: 80px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 9px;
              color: #94a3b8;
            }
            .signature-box {
               display: flex;
               gap: 40px;
               margin-top: 60px;
            }
            .signature-line {
              width: 220px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              text-align: center;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 20px;">
              ${companySettings.logo ? `<img src="${companySettings.logo}" style="height: 60px; border-radius: 12px;">` : `<div class="logo-placeholder">${companySettings.companyName.charAt(0)}</div>`}
              <div>
                <div style="font-weight: 800; font-size: 16px; color: #1e293b; letter-spacing: -0.02em;">${companySettings.companyName}</div>
                <div style="font-size: 10px; color: #64748b; font-weight: 600;">CNPJ: ${companySettings.cnpj}</div>
                ${companySettings.address ? `<div style="font-size: 10px; color: #64748b;">${companySettings.address}</div>` : ''}
              </div>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 800; font-size: 13px; color: #195de6; letter-spacing: 0.02em; text-transform: uppercase;">Relatório de Planejamento</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados do Colaborador</div>
            <div class="info-grid">
              <div><span class="label">Colaborador</span><span class="value">${trip.collaborator}</span></div>
              <div><span class="label">Status do Plano</span><span class="value" style="color: ${trip.status === 'Aprovada' ? '#10b981' : trip.status === 'Reprovada' ? '#ef4444' : '#f59e0b'}">${trip.status}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Itinerário de Unidades</div>
            <div>
              ${trip.units.map(u => {
      const unitData = units.find(loja => loja.name === u);
      return `<div class="unit-badge">${u} ${unitData?.city ? `• ${unitData.city}` : ''}</div>`;
    }).join('')}
            </div>
          </div>

          <div class="section">
             <div class="section-title">Período e Orçamento</div>
             <div class="info-grid">
                <div><span class="label">Data de Início</span><span class="value">${formatDate(trip.startDate)}</span></div>
                <div><span class="label">Data de Término</span><span class="value">${formatDate(trip.endDate)}</span></div>
             </div>
          </div>

          <div class="section">
            <div class="section-title">Plano de Ação e Objetivos</div>
            <div class="action-plan">
              ${actionPlanHtml}
            </div>
          </div>

          ${trip.status === 'Reprovada' && trip.rejectionReason ? `
          <div class="section">
            <div class="section-title" style="color: #ef4444; border-bottom-color: #fee2e2;">Parecer do Gestor (Reprovação)</div>
            <div style="font-size: 13px; background: #fef2f2; padding: 20px; border-radius: 12px; color: #b91c1c; border: 1px solid #fee2e2; font-style: italic;">
              "${trip.rejectionReason}"
            </div>
          </div>` : ''}

          <div class="total-box">
            <span class="total-label">Investimento Estimado</span>
            <span class="total-val">R$ ${trip.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="signature-box">
             <div class="signature-line">Assinatura do Colaborador</div>
             <div class="signature-line">Aprovação da Gerência</div>
          </div>

          <div class="footer" style="margin-top: 60px;">
            <div>Sistema ChSuite • Gestão de Viagens Corporativas</div>
            <div>Página 1 de 1</div>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintFullHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredTrips.map(trip => `
      <tr>
        <td>${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</td>
        <td>${trip.collaborator}</td>
        <td>${trip.units.join(', ')}</td>
        <td>${trip.status}</td>
        <td style="text-align: right;">R$ ${trip.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const totalCost = filteredTrips.reduce((acc, curr) => acc + curr.estimatedCost, 0);

    const htmlContent = `
      <html>
        <head>
          <title>Cronograma de Viagens - ChSuite</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1a1f26; 
              line-height: 1.5;
              background: #fff;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              border-bottom: 2px solid #195de6; 
              padding-bottom: 25px; 
              margin-bottom: 30px; 
            }
            .company-info { 
              display: flex; 
              align-items: center; 
              gap: 20px; 
            }
            .logo-placeholder {
              background: #195de6;
              color: white;
              width: 50px;
              height: 50px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 24px;
            }
            .report-title-box {
              text-align: right;
            }
            .report-title { 
              font-weight: 800; 
              font-size: 14px; 
              color: #195de6; 
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            .report-date {
              font-size: 9px;
              color: #64748b;
              font-weight: 500;
              margin-top: 4px;
            }
            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0;
              margin-top: 20px; 
            }
            th { 
              text-align: left; 
              font-size: 10px; 
              font-weight: 800; 
              text-transform: uppercase; 
              color: #64748b; 
              background: #f8fafc;
              padding: 14px 12px; 
              border-bottom: 2px solid #e2e8f0;
              letter-spacing: 0.05em;
            }
            td { 
              padding: 12px; 
              border-bottom: 1px solid #f1f5f9; 
              font-size: 12px; 
              color: #334155;
            }
            tr:nth-child(even) td {
              background: #fcfdfe;
            }
            .total-section { 
              margin-top: 40px; 
              display: flex;
              justify-content: flex-end;
            }
            .total-box { 
              background: #f8fafc; 
              border-left: 4px solid #195de6;
              padding: 24px 40px; 
              border-radius: 0 12px 12px 0;
              text-align: right;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .total-label { 
              font-size: 11px; 
              font-weight: 800; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 8px;
            }
            .total-val { 
              font-size: 20px; 
              font-weight: 800; 
              color: #1e293b;
              letter-spacing: -0.02em;
            }
            .footer {
              margin-top: 80px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 9px;
              color: #94a3b8;
            }
            .signature-line {
              width: 250px;
              border-top: 1px solid #cbd5e1;
              padding-top: 8px;
              text-align: center;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
            }
            @media print {
              body { padding: 20px; }
              .total-box { box-shadow: none; border: 1px solid #e2e8f0; border-left: 4px solid #195de6; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${companySettings.logo ?
        `<img src="${companySettings.logo}" style="height: 60px; border-radius: 12px; object-contain: contain;">` :
        `<div class="logo-placeholder">${companySettings.companyName.charAt(0)}</div>`
      }
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-weight: 800; font-size: 18px; color: #1e293b; letter-spacing: -0.02em;">${companySettings.companyName}</div>
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">CNPJ: ${companySettings.cnpj}</div>
                ${companySettings.address ? `<div style="font-size: 11px; color: #64748b;">${companySettings.address}</div>` : ''}
              </div>
            </div>
            <div class="report-title-box">
               <div class="report-title">Cronograma de Viagens</div>
               <div class="report-date">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Colaborador</th>
                <th>Lojas</th>
                <th>Status</th>
                <th style="text-align: right;">Estimativa</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-label">Investimento Total Estimado</div>
              <div class="total-val">R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div class="footer">
            <div style="display: flex; flex-direction: column; gap: 40px;">
              <div class="signature-line">Assinatura do Gestor</div>
              <div>Documento gerado eletronicamente via ChSuite Corporate Solutions</div>
            </div>
            <div>Página 1 de 1</div>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const colab = collaborators.find(c => c.id === selectedColabId) || currentUser;

    try {
      const payload = {
        collaborator: colab.name,
        avatar: colab.avatar,
        role: colab.position,
        units: selectedUnits,
        start_date: startDate,
        end_date: endDate,
        estimated_cost: getRawCost(cost),
        action_plan: actionPlan,
        status: editingTripId ? undefined : 'Pendente' // Don't reset status on edit
      };

      if (editingTripId) {
        const { error } = await supabase
          .from('trips')
          .update(payload)
          .eq('id', editingTripId);

        if (error) throw error;
        logAction('viagens', 'edit', `Updated travel plan #${editingTripId}`);
      } else {
        const { error } = await supabase
          .from('trips')
          .insert({
            ...payload,
            user_id: currentUser?.id
          });

        if (error) throw error;
        logAction('viagens', 'create', `Created new travel plan for ${colab?.name}`);
      }

      await fetchTrips();
      resetForm();
    } catch (error) {
      console.error("Error saving trip:", error);
      alert("Erro ao salvar planejamento de viagem.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setTripToDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (tripToDeleteId) {
      try {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripToDeleteId);

        if (error) throw error;

        setTrips(trips.filter(t => t.id !== tripToDeleteId));
        if (editingTripId === tripToDeleteId) resetForm();
        logAction('viagens', 'delete', `Deleted travel plan #${tripToDeleteId}`);
      } catch (error) {
        console.error("Error deleting trip:", error);
        alert("Erro ao excluir planejamento.");
      }
    }
    setShowDeleteModal(false);
    setTripToDeleteId(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTripToDeleteId(null);
  };

  const getStatusVariant = (status: Trip['status']) => {
    switch (status) {
      case 'Pendente': return 'warning';
      case 'Aprovada': return 'success';
      case 'Reprovada': return 'danger';
      case 'Em curso': return 'info';
      case 'Concluída': return 'neutral';
      case 'Agendada': return 'info';
      default: return 'neutral';
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Month Filter
      const startOfTrip = trip.startDate;
      const endOfTrip = trip.endDate;
      const filterStart = periodInfo.startCurrent;
      const filterEnd = periodInfo.endCurrent;

      const overlapsMonth = (startOfTrip >= filterStart && startOfTrip <= filterEnd) ||
        (endOfTrip >= filterStart && endOfTrip <= filterEnd) ||
        (startOfTrip <= filterStart && endOfTrip >= filterEnd);

      if (!overlapsMonth) return false;

      const searchLower = filterSearch.toLowerCase();
      const matchesSearch = !filterSearch ||
        trip.collaborator.toLowerCase().includes(searchLower) ||
        trip.role.toLowerCase().includes(searchLower) ||
        trip.units.some(u => u.toLowerCase().includes(searchLower));

      const tripStart = new Date(trip.startDate).getTime();
      const tripEnd = new Date(trip.endDate).getTime();
      const startFilter = filterDateStart ? new Date(filterDateStart).getTime() : null;
      const endFilter = filterDateEnd ? new Date(filterDateEnd).getTime() : null;

      let matchesDate = true;
      if (startFilter && endFilter) {
        matchesDate = (tripStart >= startFilter && tripStart <= endFilter) || (tripEnd >= startFilter && tripEnd <= endFilter);
      } else if (startFilter) {
        matchesDate = tripStart >= startFilter || tripEnd >= startFilter;
      } else if (endFilter) {
        matchesDate = tripStart <= endFilter || tripEnd <= endFilter;
      }

      return matchesSearch && matchesDate;
    });
  }, [trips, filterSearch, filterDateStart, filterDateEnd, periodInfo]);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">Plano de Viagens</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[#636f88] dark:text-gray-400 text-sm font-normal">Mês Ativo: <span className="text-primary font-bold">{periodInfo.monthLabel}</span></p>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 ml-2">
              <button
                onClick={goToPreviousMonth}
                className="size-6 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                title="Mês Anterior"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button
                onClick={goToCurrentMonth}
                className="px-2 text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-tighter"
                title="Mês Atual"
              >
                Hoje
              </button>
              <button
                onClick={goToNextMonth}
                className="size-6 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                title="Próximo Mês"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" onClick={handlePrintFullHistory} icon="print">
            PDF COMPLETO
          </Button>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            icon="filter_list"
            className="px-3"
            title={showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          />
          <Guard module="viagens" action="create">
            <Button
              onClick={() => setIsModalOpen(true)}
              icon="add_circle"
              size="md"
              className="shadow-primary/20"
            >
              NOVO PLANEJAMENTO
            </Button>
          </Guard>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#111318] dark:text-white text-lg font-bold">Cronograma de Atividades</h2>
          </div>

          {showFilters && (
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col lg:flex-row items-end gap-4">
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Busca Geral</span>
                  <Input
                    placeholder="Colaborador, Loja, Perfil..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    icon="search"
                    className="h-11 shadow-sm border-white dark:border-slate-800"
                  />
                </div>
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Data Inicial</span>
                  <Input
                    type="date"
                    value={filterDateStart}
                    onChange={(e) => setFilterDateStart(e.target.value)}
                    icon="calendar_today"
                    className="h-11 shadow-sm border-white dark:border-slate-800"
                  />
                </div>
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Data Final</span>
                  <Input
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => setFilterDateEnd(e.target.value)}
                    icon="event"
                    className="h-11 shadow-sm border-white dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                Carregando cronograma...
              </div>
            ) : (
              <>
                {filteredTrips.map((trip) => {
                  const isExpanded = expandedTripId === trip.id;
                  return (
                    <Card
                      key={trip.id}
                      className={`group transition-all duration-300 border-l-4 ${trip.status === 'Aprovada' ? 'border-l-green-500' :
                        trip.status === 'Reprovada' ? 'border-l-red-500' :
                          'border-l-amber-500'
                        } ${isExpanded ? 'ring-2 ring-primary/20 shadow-xl' : 'hover:border-primary/30 cursor-pointer'}`}
                      onClick={() => !isExpanded && setExpandedTripId(trip.id)}
                    >
                      {/* Compact Header */}
                      <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            {(() => {
                              const colabInfo = collaborators.find(c => c.name === trip.collaborator);
                              const avatarUrl = trip.avatar || colabInfo?.avatar;

                              if (avatarUrl) {
                                return (
                                  <img
                                    src={avatarUrl}
                                    className="size-12 rounded-xl object-cover shadow-sm border border-slate-100 dark:border-slate-800"
                                    alt={trip.collaborator}
                                  />
                                );
                              }

                              return (
                                <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                  <span className="text-lg font-black text-slate-400 uppercase">
                                    {trip.collaborator.charAt(0)}
                                  </span>
                                </div>
                              );
                            })()}
                            {isExpanded && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedTripId(null); }}
                                className="absolute -top-2 -right-2 size-6 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-[#111318] dark:text-white text-base tracking-tight leading-tight">{trip.collaborator}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black text-primary uppercase tracking-wider px-1.5 py-0.5 bg-primary/5 rounded-md">{trip.role}</span>
                              <Badge variant={getStatusVariant(trip.status)} size="sm" dot className="text-[10px]">
                                {trip.status === 'Pendente' ? 'Aguardando Aprovação' : trip.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-wrap items-center justify-between gap-6">
                          {/* Período */}
                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">calendar_today</span>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Período</span>
                              <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                              </span>
                            </div>
                          </div>

                          {/* Custos como Cards de KPI */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Custo Planejado</span>
                                <span className="text-[13px] font-black text-slate-700 dark:text-white">
                                  R$ {trip.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${((trip as any).actualCost || 0) > trip.estimatedCost
                              ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                              : 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'}`}
                            >
                              <div className={`size-8 rounded-xl flex items-center justify-center ${((trip as any).actualCost || 0) > trip.estimatedCost
                                ? 'bg-red-100/50 text-red-600'
                                : 'bg-green-100/50 text-green-600'}`}
                              >
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Despesa Realizada</span>
                                <span className={`text-[13px] font-black ${((trip as any).actualCost || 0) > trip.estimatedCost ? 'text-red-600' : 'text-green-600'}`}>
                                  R$ {((trip as any).actualCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isExpanded && (
                          <div className="hidden md:flex size-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-sm border border-slate-100/50 dark:border-slate-700/50 pr-0">
                            <span className="material-symbols-outlined text-[24px]">expand_more</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-8 pb-8 pt-4 border-t border-slate-50 dark:border-slate-800/10 animate-in fade-in slide-in-from-top-3 duration-500">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Left Column: destinations */}
                            <div className="lg:col-span-4 flex flex-col gap-5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px] text-primary">distance</span>
                                  Roteiro de Visitas
                                </span>
                                <Badge variant="neutral" size="sm" className="font-black text-[9px]">{trip.units.length} Unidades</Badge>
                              </div>

                              <div className="flex flex-col gap-2.5">
                                {trip.units.map((u, i) => {
                                  const unitData = units.find(loja => loja.name === u);
                                  return (
                                    <div key={i} className="group/item bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 hover:border-primary/30 transition-all p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                          {i + 1}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-slate-700 dark:text-white leading-none mb-1">{u}</span>
                                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                                            {unitData?.city || 'Brasil'}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="material-symbols-outlined text-slate-200 group-hover/item:text-primary transition-colors text-[20px]">location_on</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {trip.status === 'Reprovada' && trip.rejectionReason && (
                                <div className="mt-4 p-5 bg-red-50/30 dark:bg-red-900/5 border border-red-100/50 dark:border-red-900/20 rounded-3xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-red-500 text-[18px]">report</span>
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Motivo da Rejeição</span>
                                  </div>
                                  <p className="text-sm font-medium text-red-700 dark:text-red-400/80 leading-relaxed italic">"{trip.rejectionReason}"</p>
                                </div>
                              )}

                              {trip.status === 'Concluída' && trip.completionNotes && (
                                <div className="mt-4 p-5 bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-900/20 rounded-3xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-indigo-500 text-[18px]">task_alt</span>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Observações de Conclusão</span>
                                  </div>
                                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400/80 leading-relaxed italic">"{trip.completionNotes}"</p>
                                </div>
                              )}
                            </div>

                            {/* Right Column: objectives */}
                            <div className="lg:col-span-8 flex flex-col gap-5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                                Objetivos do Plano de Ação
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
                                {trip.actionPlan && trip.actionPlan.length > 0 ? (
                                  trip.actionPlan.map((item, i) => (
                                    <div key={i} className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/20 px-5 py-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800/40 transition-colors shadow-sm">
                                      <div className="size-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-500/20">
                                        <span className="material-symbols-outlined text-[14px] text-green-600 font-black">check</span>
                                      </div>
                                      <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{item}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 bg-slate-50/30 dark:bg-slate-800/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-slate-200 text-[40px]">inventory_2</span>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum plano detalhado</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handlePrint(trip); }} icon="print" className="h-9 px-4 uppercase text-[10px] font-black tracking-widest rounded-xl">Relatório PDF</Button>
                              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />
                              <Guard module="viagens" action="edit">
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditClick(trip); }} icon="edit" className="h-9 px-4 uppercase text-[10px] font-black tracking-widest text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl">Editar</Button>
                              </Guard>
                              <Guard module="viagens" action="delete">
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteClick(trip.id); }} icon="delete" className="h-9 px-4 uppercase text-[10px] font-black tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-50 rounded-xl">Excluir</Button>
                              </Guard>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                              {trip.status === 'Pendente' && (
                                <Guard module="viagens" action="approve">
                                  <div className="flex gap-2 flex-1 sm:flex-none">
                                    <Button variant="secondary" size="md" onClick={(e) => { e.stopPropagation(); setTripToRejectId(trip.id); setShowRejectionModal(true); }} className="flex-1 sm:flex-none border-red-200 text-red-500 hover:bg-red-50 font-black text-[11px] uppercase rounded-xl">Reprovar</Button>
                                    <Button variant="primary" size="md" onClick={(e) => { e.stopPropagation(); handleApproval(trip.id, 'Aprovada'); }} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 shadow-green-600/20 font-black text-[11px] uppercase rounded-xl">Aprovar Roteiro</Button>
                                  </div>
                                </Guard>
                              )}

                              {trip.status === 'Aprovada' && (currentUser.name === trip.collaborator || currentUser.roleId === 'r_admin_pro') && (
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTripToCompleteId(trip.id);
                                    setShowCompletionModal(true);
                                  }}
                                  className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 font-black text-[11px] uppercase rounded-xl"
                                  icon="task_alt"
                                >
                                  Concluir Viagem
                                </Button>
                              )}

                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedTripId(null); }}
                                className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800"
                              >
                                Recolher Detalhes
                                <span className="material-symbols-outlined text-[18px]">expand_less</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
                {filteredTrips.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                    <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800">search_off</span>
                    <p className="text-slate-400 font-bold uppercase tracking-widest">Nenhum roteiro encontrado</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingTripId ? 'Editar Viagem' : 'Novo Planejamento'}
        icon={editingTripId ? 'edit_square' : 'add_circle'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Responsável"
            value={selectedColabId}
            onChange={(e) => setSelectedColabId(e.target.value)}
            options={collaborators.map(c => ({
              value: c.id,
              label: `${c.name} - ${c.position}`
            }))}
            required
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#111318] dark:text-white">Lojas para Visita</label>
              <Badge variant="primary" size="sm">{selectedUnits.length} selecionada(s)</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 max-h-[300px] overflow-y-auto no-scrollbar">
              {units.map(loja => {
                const isSelected = selectedUnits.includes(loja.name);
                return (
                  <button
                    key={loja.id}
                    type="button"
                    onClick={() => handleToggleUnit(loja.name)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group relative ${isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-primary/30'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-tight ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                        {loja.name}
                      </span>
                      {isSelected && (
                        <div className="size-4 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-200">
                          <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate w-full">
                      {loja.city}
                    </span>
                  </button>
                );
              })}
              {units.length === 0 && (
                <div className="col-span-full py-8 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Nenhuma unidade ativa encontrada</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Início"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              icon="calendar_today"
              required
            />
            <Input
              label="Fim"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              icon="event"
              required
            />
          </div>

          <Input
            label="Estimativa de Custo"
            type="text"
            value={cost}
            onChange={handleCostChange}
            placeholder="R$ 0,00"
            icon="payments"
          />

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#111318] dark:text-white">Objetivos (Plano de Ação)</label>
            <div className="flex gap-2">
              <Input
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                placeholder="Novo objetivo..."
                className="h-10 border-slate-100 dark:border-slate-800"
              />
              <Button type="button" onClick={handleAddActionItem} className="px-3 rounded-xl">
                <span className="material-symbols-outlined">add</span>
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {actionPlan.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-left-2 duration-200">
                  <span className="text-[13px] font-medium dark:text-white">{item}</span>
                  <button type="button" onClick={() => handleRemoveActionItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={resetForm}>Cancelar</Button>
            <Button
              type="submit"
              fullWidth
              disabled={!isFormValid}
              icon={editingTripId ? 'save' : 'task_alt'}
            >
              {editingTripId ? 'Salvar Alterações' : 'Confirmar Roteiro'}
            </Button>
          </div>
        </form>
      </Modal>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="max-w-sm w-full p-8 text-center animate-in zoom-in duration-300 shadow-2xl">
            <div className="size-20 bg-red-100/50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <h3 className="text-xl font-black dark:text-white tracking-tight">Excluir Roteiro?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 mb-8 leading-relaxed">Todos os planos e objetivos serão removidos permanentemente. Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={cancelDelete} className="py-3">Cancelar</Button>
              <Button variant="danger" fullWidth onClick={confirmDelete} className="py-3 shadow-red-500/20">Sim, Excluir</Button>
            </div>
          </Card>
        </div>
      )}

      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 bg-red-100/50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">cancel</span>
              </div>
              <h3 className="text-xl font-black dark:text-white tracking-tight leading-tight">Reprovar Viagem</h3>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#111318] dark:text-white">Observação / Motivo</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da negativa..."
                  className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => { setShowRejectionModal(false); setTripToRejectId(null); setRejectionReason(''); }}>Cancelar</Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => tripToRejectId && handleApproval(tripToRejectId, 'Reprovada', rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700 shadow-red-600/10"
                >
                  Confirmar Reprovação
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full p-8 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>
              <h3 className="text-xl font-black dark:text-white tracking-tight leading-tight">Concluir Viagem</h3>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#111318] dark:text-white">Observações Finais</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Adicione observações sobre a conclusão da viagem (opcional)..."
                  className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => { setShowCompletionModal(false); setTripToCompleteId(null); setCompletionNotes(''); }}>Cancelar</Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => tripToCompleteId && handleCompletion(tripToCompleteId, completionNotes)}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10"
                >
                  Finalizar Viagem
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Viagens;