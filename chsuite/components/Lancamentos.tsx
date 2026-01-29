import React, { useState, useMemo, useEffect } from 'react';
import { DEFAULT_CATEGORIES, PAYMENT_METHODS as INITIAL_PAYMENT_METHODS } from '../constants.tsx';
import { Expense, PaymentMethod, Loja } from '../types';
import { Card, CardContent, CardHeader } from './ui/Card.tsx';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';
import { Input, Select } from './ui/Input.tsx';
import { useRBAC, Guard } from '../context/RBACContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Modal } from './ui/Modal.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { ConfirmationModal } from './ui/ConfirmationModal.tsx';
import { useToast } from '../context/ToastContext';


const Lancamentos: React.FC = () => {
  const { logAction, currentUser, companySettings, units: globalUnits } = useRBAC();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };
  const [units, setUnits] = useState<Loja[]>([]); // Store local synced units
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(INITIAL_PAYMENT_METHODS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());


  // Specific Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form State
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');

  // Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPaymentName, setNewPaymentName] = useState('');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isManagingPayments, setIsManagingPayments] = useState(false);

  // Edit State
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState('');
  const [editingPaymentOldName, setEditingPaymentOldName] = useState<string | null>(null);
  const [editingPaymentNewName, setEditingPaymentNewName] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Calculate Period for Filtering
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // 2. Fetch DATA in PARALLEL
      const [
        { data: expensesData, error: expError },
        { data: catData, error: catError },
        { data: payData, error: payError }
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .gte('date', firstDay)
          .lte('date', lastDay)
          .order('date', { ascending: false }),
        supabase
          .from('expense_categories')
          .select('name')
          .order('name'),
        supabase
          .from('payment_methods')
          .select('name')
          .order('name')
      ]);

      if (expError) throw expError;
      if (catError) throw catError;
      if (payError) throw payError;

      // 3. Process and Update State
      if (expensesData) {
        setExpenses(expensesData.map((exp: any) => ({
          id: exp.id,
          unit: exp.unit,
          category: exp.category,
          paymentMethod: exp.payment_method,
          value: Number(exp.value),
          date: exp.date,
          status: exp.status,
          collaborator: exp.collaborator || 'Sistema'
        })));
      }



      if (catData && catData.length > 0) {
        setCategories(catData.map((c: any) => c.name));
      }

      if (payData && payData.length > 0) {
        setPaymentMethods(payData.map((p: any) => p.name));
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    setUnits(globalUnits.map((u: any) => ({
      id: u.id,
      name: u.name,
      city: u.city,
      manager: u.manager,
      distanceFromMatrix: u.distance_from_matrix,
      status: u.status
    })));
  }, [globalUnits]);

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
  }, [selectedDate, selectedDate.getMonth, selectedDate.getFullYear]);

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

  const resetForm = () => {
    setUnit('');
    setCategory('');
    setPaymentMethod('');
    setValue('');
    setDate('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const formatCurrency = (val: string) => {
    // Remove all non-digits
    let cleanVal = val.replace(/\D/g, '');

    // Convert to number and format
    const numberValue = Number(cleanVal) / 100;

    if (isNaN(numberValue)) return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCurrency(rawValue);
    setValue(formatted);
  };

  const parseCurrencyToNumber = (val: string) => {
    return Number(val.replace(/\D/g, '')) / 100;
  };


  const handleEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setUnit(exp.unit);
    setCategory(exp.category);
    setPaymentMethod(exp.paymentMethod);
    setValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.value));
    setDate(exp.date);
    setIsModalOpen(true);
  };


  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPaymentIcon = (method: string) => {
    const low = method.toLowerCase();
    if (low.includes('dinheiro')) return 'payments';
    if (low.includes('cartão')) return 'credit_card';
    if (low.includes('pix')) return 'account_balance';
    if (low.includes('transferência')) return 'sync_alt';
    return 'account_balance_wallet';
  };

  const getPaymentStyle = (method: string) => {
    const low = method.toLowerCase();
    if (low.includes('dinheiro')) return { color: '#f59e0b', bg: 'bg-amber-500/10' };
    if (low.includes('cartão')) return { color: '#3b82f6', bg: 'bg-blue-500/10' };
    if (low.includes('pix')) return { color: '#10b981', bg: 'bg-emerald-500/10' };
    if (low.includes('transferência')) return { color: '#8b5cf6', bg: 'bg-violet-500/10' };
    return { color: '#64748b', bg: 'bg-slate-500/10' };
  };

  const getCategoryColor = (cat: string) => {
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsla(${h}, 70%, 45%, 1)`;
  };

  const getCategoryBg = (cat: string) => {
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsla(${h}, 70%, 45%, 0.1)`;
  };

  const handlePrintFullHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredExpenses.map(exp => `
      <tr>
        <td>${formatDate(exp.date)}</td>
        <td>${exp.unit}</td>
        <td>${exp.collaborator}</td>
        <td>${exp.category}</td>
        <td>${exp.paymentMethod}</td>
        <td style="text-align: right;">R$ ${exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const totalValue = filteredExpenses.reduce((acc, curr) => acc + curr.value, 0);

    const htmlContent = `
      <html>
        <head>
          <title>Histórico de Despesas - ChSuite</title>
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
                <div style="font-weight: 800; font-size: 14px; color: #1e293b; letter-spacing: -0.02em;">${companySettings.companyName}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 600;">CNPJ: ${companySettings.cnpj}</div>
                ${companySettings.address ? `<div style="font-size: 9px; color: #64748b;">${companySettings.address}</div>` : ''}
              </div>
            </div>
            <div class="report-title-box">
               <div class="report-title">Relatório de Despesas</div>
               <div class="report-date">Emissão: ${formatDate(new Date().toISOString().split('T')[0])}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Loja</th>
                <th>Colaborador</th>
                <th>Categoria</th>
                <th>Pagamento</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-label">Investimento Total</div>
              <div class="total-val">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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

  const handlePrintExpense = (exp: Expense) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Comprovante - ${exp.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1f26; background: #fff; }
            .header { 
              border-bottom: 2px solid #195de6; 
              padding-bottom: 20px; 
              margin-bottom: 40px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
            }
            .logo-placeholder {
              background: #195de6;
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 20px;
            }
            .section { margin-bottom: 35px; }
            .section-title { 
              font-weight: 800; 
              font-size: 11px; 
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
            .total-box { 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 16px; 
              text-align: right; 
              margin-top: 50px; 
              border: 1px solid #e2e8f0;
            }
            .total-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; display: block; }
            .total-val { font-size: 22px; font-weight: 800; color: #195de6; letter-spacing: -0.02em; }
            .footer {
              margin-top: 100px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
            }
            .signature {
              margin-top: 60px;
              border-top: 1px solid #e2e8f0;
              width: 250px;
              margin-left: auto;
              padding-top: 10px;
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
            <div style="display: flex; align-items: center; gap: 15px;">
              ${companySettings.logo ? `<img src="${companySettings.logo}" style="height: 45px; border-radius: 10px;">` : `<div class="logo-placeholder">${companySettings.companyName.charAt(0)}</div>`}
              <div>
                <div style="font-weight: 800; font-size: 14px; color: #1e293b; letter-spacing: -0.02em;">${companySettings.companyName}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 600;">CNPJ: ${companySettings.cnpj}</div>
              </div>
            </div>
            <div style="text-transform: uppercase; font-size: 12px; font-weight: 800; color: #64748b; letter-spacing: 0.05em;">Comprovante de Reembolso</div>
          </div>
          <div class="section">
            <div class="section-title">Informações da Despesa</div>
            <div class="info-grid">
              <div><span class="label">Código do Gasto</span><span class="value">#${exp.id.toUpperCase()}</span></div>
              <div><span class="label">Data Competência</span><span class="value">${formatDate(exp.date)}</span></div>
              <div><span class="label">Unidade</span><span class="value">${exp.unit}</span></div>
              <div><span class="label">Categoria</span><span class="value">${exp.category}</span></div>
              <div style="grid-column: span 2;"><span class="label">Colaborador Responsável</span><span class="value">${exp.collaborator}</span></div>
              <div><span class="label">Forma de Pagamento</span><span class="value">${exp.paymentMethod}</span></div>
            </div>
          </div>
          
          <div class="total-box">
            <span class="total-label">Valor Total do Reembolso</span>
            <span class="total-val">R$ ${exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="footer">
            <div class="signature">Assinatura do Beneficiário</div>
            <p style="margin-top: 30px;">Este documento certifica a despesa realizada em ${formatDate(exp.date)} e processada via ChSuite em ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  const handleAddPaymentMethod = async () => {
    if (!newPaymentName.trim()) return;
    const methodName = newPaymentName.trim();
    if (paymentMethods.includes(methodName)) return;

    try {
      const { error } = await supabase.from('payment_methods').insert({ name: methodName });
      if (error) throw error;

      setPaymentMethods([...paymentMethods, methodName]);
      setNewPaymentName('');
    } catch (error) {
      console.error("Error adding payment method:", error);
      showToast("Erro ao adicionar meio de pagamento.", "error");
    }
  };

  const handleUpdatePaymentMethod = async (oldName: string) => {
    if (!editingPaymentNewName.trim() || editingPaymentNewName === oldName) {
      setEditingPaymentOldName(null);
      return;
    }
    const newName = editingPaymentNewName.trim();

    try {
      // 1. Update in payment_methods table
      const { error: pmError } = await supabase
        .from('payment_methods')
        .update({ name: newName })
        .eq('name', oldName);

      if (pmError) throw pmError;

      // 2. Update in expenses table (historical data)
      const { error: expError } = await supabase
        .from('expenses')
        .update({ payment_method: newName })
        .eq('payment_method', oldName);

      if (expError) console.error("Warning: Failed to update historical expenses", expError);

      // 3. Update local state
      setPaymentMethods(paymentMethods.map(m => m === oldName ? newName : m));
      setExpenses(expenses.map(e => e.paymentMethod === oldName ? { ...e, paymentMethod: newName } : e));
      if (paymentMethod === oldName) setPaymentMethod(newName);

      setEditingPaymentOldName(null);
      setEditingPaymentNewName('');

    } catch (error) {
      console.error("Error updating payment method:", error);
      showToast("Erro ao atualizar meio de pagamento.", "error");
    }
  };

  const handleRemovePaymentMethod = async (methodToRemove: string) => {
    if (paymentMethods.length <= 1) return;

    try {
      const { error } = await supabase.from('payment_methods').delete().eq('name', methodToRemove);
      if (error) throw error;

      setPaymentMethods(paymentMethods.filter(m => m !== methodToRemove));
      if (paymentMethod === methodToRemove) {
        setPaymentMethod(paymentMethods.find(m => m !== methodToRemove) || '');
      }
    } catch (error) {
      console.error("Error removing payment method:", error);
      showToast("Erro ao remover meio de pagamento.", "error");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const catName = newCategoryName.trim();
    if (categories.includes(catName)) return;

    try {
      const { error } = await supabase.from('expense_categories').insert({ name: catName });
      if (error) throw error;

      setCategories([...categories, catName]);
      setNewCategoryName('');
    } catch (error) {
      console.error("Error adding category:", error);
      showToast("Erro ao adicionar categoria.", "error");
    }
  };

  const handleUpdateCategory = async (oldName: string) => {
    if (!editingCategoryNewName.trim() || editingCategoryNewName === oldName) {
      setEditingCategoryOldName(null);
      return;
    }
    const newName = editingCategoryNewName.trim();

    try {
      // 1. Update in expense_categories table
      const { error: catError } = await supabase
        .from('expense_categories')
        .update({ name: newName })
        .eq('name', oldName);

      if (catError) throw catError;

      // 2. Update in expenses table (historical data)
      const { error: expError } = await supabase
        .from('expenses')
        .update({ category: newName })
        .eq('category', oldName);

      if (expError) console.error("Warning: Failed to update historical expenses", expError);

      // 3. Update local state
      setCategories(categories.map(c => c === oldName ? newName : c));
      setExpenses(expenses.map(e => e.category === oldName ? { ...e, category: newName } : e));
      if (category === oldName) setCategory(newName);

      setEditingCategoryOldName(null);
      setEditingCategoryNewName('');

    } catch (error) {
      console.error("Error updating category:", error);
      showToast("Erro ao atualizar categoria.", "error");
    }
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    if (categories.length <= 1) return;

    try {
      const { error } = await supabase.from('expense_categories').delete().eq('name', catToRemove);
      if (error) throw error;

      setCategories(categories.filter(cat => cat !== catToRemove));
      if (category === catToRemove) {
        setCategory(categories.find(c => c !== catToRemove) || '');
      }
    } catch (error) {
      console.error("Error removing category:", error);
      showToast("Erro ao remover categoria.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !category || !paymentMethod || !value || !date) {
      showToast("Por favor, preencha todos os campos.", "warning");
      return;
    }

    try {
      const payload = {
        unit,
        category,
        payment_method: paymentMethod,
        value: parseCurrencyToNumber(value),
        date,
        collaborator: currentUser?.name || 'Usuário',
        status: 'Pendente'
      };


      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) throw error;

        logAction('lancamentos', 'edit', `Updated expense #${editingId}`);
      } else {
        const { error } = await supabase.from('expenses').insert({
          ...payload,
          status: 'Pendente',
          user_id: currentUser?.id
        });
        if (error) throw error;

        logAction('lancamentos', 'create', `Created new expense for ${unit}`);
        showToast("Lançamento criado com sucesso!");
      }

      await fetchData(); // Refresh data using optimized fetch
      resetForm();

    } catch (error) {
      console.error("Error saving expense:", error);
      showToast("Erro ao salvar lançamento.", "error");
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenseToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete);

      if (error) throw error;

      setExpenses(expenses.filter(exp => exp.id !== expenseToDelete));
      logAction('lancamentos', 'delete', `Deleted expense #${expenseToDelete}`);
      showToast("Lançamento excluído com sucesso!");

      if (expandedId === expenseToDelete) setExpandedId(null);
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);

    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast("Erro ao excluir lançamento.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Month Filter logic removed as it's now handled server-side for initial load
      // But we keep search and local date range filters for active month data
      const isWithinMonth = exp.date >= periodInfo.startCurrent && exp.date <= periodInfo.endCurrent;
      if (!isWithinMonth) return false;

      // Global Search in multiple fields
      const searchLower = filterSearch.toLowerCase();
      const matchesSearch = !filterSearch ||
        exp.unit.toLowerCase().includes(searchLower) ||
        exp.collaborator.toLowerCase().includes(searchLower) ||
        exp.category.toLowerCase().includes(searchLower) ||
        exp.paymentMethod.toLowerCase().includes(searchLower);

      // Date Range logic
      const expDate = new Date(exp.date).getTime();
      const startDate = filterDateStart ? new Date(filterDateStart).getTime() : null;
      const endDate = filterDateEnd ? new Date(filterDateEnd).getTime() : null;

      let matchesDate = true;
      if (startDate && endDate) {
        matchesDate = expDate >= startDate && expDate <= endDate;
      } else if (startDate) {
        matchesDate = expDate >= startDate;
      } else if (endDate) {
        matchesDate = expDate <= endDate;
      }

      return matchesSearch && matchesDate;
    });
  }, [expenses, filterSearch, filterDateStart, filterDateEnd, periodInfo]);

  const clearFilters = () => {
    setFilterSearch('');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">Lançamentos</h1>
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
        <div className="flex items-center gap-2">
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold">Histórico de Lançamentos</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Guard module="lancamentos" action="create">
                  <Button variant="primary" size="md" onClick={() => { resetForm(); setIsModalOpen(true); }} icon="add">
                    NOVO LANÇAMENTO
                  </Button>
                </Guard>
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
              </div>
            </div>

            {showFilters && (
              <div className="mt-6 p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col lg:flex-row items-end gap-4">
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Busca Geral</span>
                    <Input
                      placeholder="Loja, Colab, Categoria..."
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
          </CardHeader>


          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-5 w-12 text-center border-b border-slate-100 dark:border-slate-800"></th>
                  <th className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">Data e Registro</th>
                  <th className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">Unidade / Loja</th>
                  <th className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">Responsável</th>
                  <th className="px-6 py-5 text-center border-b border-slate-100 dark:border-slate-800">Categoria</th>
                  <th className="px-6 py-5 text-center border-b border-slate-100 dark:border-slate-800">Pagamento</th>
                  <th className="px-6 py-5 text-left border-b border-slate-100 dark:border-slate-800">Investimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2d333d]">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Carregando lançamentos...</td></tr>
                ) : filteredExpenses.map((exp) => (
                  <React.Fragment key={exp.id}>
                    <tr
                      onClick={() => toggleExpand(exp.id)}
                      className={`group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 border-l-4 ${expandedId === exp.id ? 'bg-slate-50/50 dark:bg-slate-800/20 border-primary' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                      <td className="px-6 py-5 text-center align-middle">
                        <span className={`material-symbols-outlined text-slate-300 group-hover:text-primary transition-all duration-300 ${expandedId === exp.id ? 'rotate-180 text-primary' : ''}`}>
                          expand_more
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-bold text-slate-700 dark:text-gray-300">{formatDate(exp.date)}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Data do Gasto</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 group-hover:scale-110 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">store</span>
                          </div>
                          <span className="font-bold text-[#111318] dark:text-white text-[14px]">{exp.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-[#636f88] dark:text-gray-400 font-bold">{exp.collaborator}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Responsável</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center align-middle">
                        <Badge
                          className="lowercase font-bold tracking-normal px-4 py-1.5 text-[11px] border-none shadow-sm"
                          style={{
                            backgroundColor: getCategoryBg(exp.category),
                            color: getCategoryColor(exp.category)
                          }}
                        >
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 text-center align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`size-9 rounded-xl ${getPaymentStyle(exp.paymentMethod).bg} flex items-center justify-center group-hover:rotate-12 transition-transform duration-300`}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: getPaymentStyle(exp.paymentMethod).color }}>
                              {getPaymentIcon(exp.paymentMethod)}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {exp.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-left align-middle">
                        <span className="text-[16px] font-black dark:text-white tabular-nums">
                          R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                    {expandedId === exp.id && (
                      <tr className="bg-slate-50/30 dark:bg-slate-800/10 animate-in fade-in slide-in-from-top-1 duration-300">
                        <td colSpan={7} className="px-8 py-8">
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                            <div className="flex flex-wrap gap-12">
                              <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                                  ID Lançamento
                                </p>
                                <p className="text-sm font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">#{exp.id.slice(0, 8)}</p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">person</span>
                                  Criado por
                                </p>
                                <p className="text-sm font-bold text-slate-700 dark:text-gray-300">{exp.collaborator}</p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                  Data Lançamento
                                </p>
                                <p className="text-sm font-bold text-slate-700 dark:text-gray-300">{formatDate(exp.date)}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                              <Button variant="secondary" size="md" onClick={() => handlePrintExpense(exp)} icon="print" className="flex-1 lg:flex-none shadow-sm h-11">
                                IMPRIMIR
                              </Button>
                              <Guard module="lancamentos" action="edit">
                                <Button variant="primary" size="md" onClick={() => handleEdit(exp)} icon="edit" className="flex-1 lg:flex-none shadow-md h-11">
                                  EDITAR
                                </Button>
                              </Guard>
                              <Guard module="lancamentos" action="delete">
                                <Button variant="secondary" size="md" onClick={() => handleDeleteExpense(exp.id)} icon="delete" className="flex-1 lg:flex-none !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20 border-red-100 dark:border-red-900/10 h-11">
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
                {filteredExpenses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon="payments"
                        title="Nenhum lançamento"
                        description="Não encontramos gastos para este período. Comece adicionando uma nova despesa ou limpe os filtros."
                        actionLabel="NOVO LANÇAMENTO"
                        onAction={() => setIsModalOpen(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Loja"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={[
              { value: '', label: 'Selecione uma loja' },
              ...units.map(u => ({ value: u.name, label: u.name }))
            ]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: '', label: 'Selecione uma categoria' },
                ...categories.map(cat => ({ value: cat, label: cat }))
              ]}
              required
            />
            <Select
              label="Pagamento"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { value: '', label: 'Selecione o pagamento' },
                ...paymentMethods.map(method => ({ value: method, label: method }))
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor"
              value={value}
              onChange={handleValueChange}
              placeholder="R$ 0,00"
              icon="payments"
              required
            />
            <Input
              label="Data"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              type="date"
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                fullWidth
                icon={editingId ? 'save' : 'add'}
                size="lg"
              >
                {editingId ? 'Salvar Alterações' : 'Salvar Despesa'}
              </Button>
              <Button
                variant="secondary"
                onClick={resetForm}
                fullWidth
              >
                Cancelar
              </Button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsManagingCategories(!isManagingCategories); }}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isManagingCategories ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">category</span>
                  Categorias
                </button>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsManagingPayments(!isManagingPayments); }}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isManagingPayments ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Pagamentos
                </button>
              </div>

              {(isManagingCategories || isManagingPayments) && (
                <div className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {isManagingCategories && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gerenciar Categorias</p>
                      <div className="flex gap-2">
                        <input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-xl border-[#e5e7eb] dark:border-[#2d333d] dark:bg-slate-900 text-xs dark:text-white"
                          placeholder="Nova categoria..."
                        />
                        <Button type="button" variant="primary" onClick={handleAddCategory} className="px-3 py-2 rounded-xl">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 no-scrollbar">
                        {categories.map(cat => (
                          <Badge key={cat} variant="neutral" className="pl-3 pr-1 py-1 normal-case font-bold flex items-center gap-2">
                            {editingCategoryOldName === cat ? (
                              <input
                                autoFocus
                                value={editingCategoryNewName}
                                onChange={(e) => setEditingCategoryNewName(e.target.value)}
                                onBlur={() => handleUpdateCategory(cat)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat)}
                                className="h-6 w-32 px-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            ) : (
                              <>
                                {cat}
                                <div className="flex items-center gap-0.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCategoryOldName(cat);
                                      setEditingCategoryNewName(cat);
                                    }}
                                    className="text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => handleRemoveCategory(cat)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {isManagingPayments && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gerenciar Pagamentos</p>
                      <div className="flex gap-2">
                        <input
                          value={newPaymentName}
                          onChange={(e) => setNewPaymentName(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-xl border-[#e5e7eb] dark:border-[#2d333d] dark:bg-slate-900 text-xs dark:text-white"
                          placeholder="Ex: Pix..."
                        />
                        <Button type="button" variant="primary" onClick={handleAddPaymentMethod} className="px-3 py-2 rounded-xl">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 no-scrollbar">
                        {paymentMethods.map(method => (
                          <Badge key={method} variant="neutral" className="pl-3 pr-1 py-1 normal-case font-bold flex items-center gap-2">
                            {editingPaymentOldName === method ? (
                              <input
                                autoFocus
                                value={editingPaymentNewName}
                                onChange={(e) => setEditingPaymentNewName(e.target.value)}
                                onBlur={() => handleUpdatePaymentMethod(method)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdatePaymentMethod(method)}
                                className="h-6 w-32 px-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            ) : (
                              <>
                                {method}
                                <div className="flex items-center gap-0.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPaymentOldName(method);
                                      setEditingPaymentNewName(method);
                                    }}
                                    className="text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => handleRemovePaymentMethod(method)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setExpenseToDelete(null); }}
        onConfirm={confirmDeleteExpense}
        title="Excluir Lançamento?"
        message="Tem certeza que deseja excluir este lançamento? Esta ação removerá o registro permanentemente do sistema."
        confirmLabel="Sim, Excluir"
        loading={loading}
      />
    </div>
  );
};

export default Lancamentos;
