
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { View, Expense, Trip, UserProfile, Loja } from '../types';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { useRBAC } from '../context/RBACContext';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onNavigate?: (view: View) => void;
}

import { getAvatarUrl } from '../utils/imageUtils';

const COLORS = ['#195de6', '#fbbf24', '#22c55e', '#ef4444', '#cbd5e1', '#8b5cf6'];

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse p-4 lg:p-8">
    <div className="flex justify-between items-center mb-6">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-[400px] bg-slate-100 dark:bg-slate-900 rounded-3xl"></div>
      <div className="h-[400px] bg-slate-100 dark:bg-slate-900 rounded-3xl"></div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, users, initialDashboardData } = useRBAC();

  // Instant Hydration: Initialize state from Context if available
  const [expenses, setExpenses] = useState<Expense[]>(() => initialDashboardData?.expenses || []);
  const [trips, setTrips] = useState<Trip[]>(() => initialDashboardData?.trips || []);

  const [loading, setLoading] = useState(!initialDashboardData);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchData = async () => {
    try {
      console.time('Dashboard_FetchData');
      setLoading(true);

      // 1. Calculate Period for Server-side Filtering
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const firstDayOfLastMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const lastDayOfCurrentMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // 2. Fetch DATA in PARALLEL with COLUMN LIMITING for performance
      const [
        { data: expensesData, error: expError },
        { data: tripsData, error: tripsError }
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('unit, category, payment_method, value, date, collaborator')
          .gte('date', firstDayOfLastMonth)
          .lte('date', lastDayOfCurrentMonth),
        supabase
          .from('trips')
          .select('id, collaborator, avatar, role, units, start_date, end_date, estimated_cost, status')
          .gte('start_date', firstDayOfLastMonth)
          .lte('start_date', lastDayOfCurrentMonth)
      ]);

      console.timeEnd('Dashboard_FetchData');
      console.time('Dashboard_Processing');

      if (expError) throw expError;
      if (tripsError) throw tripsError;

      if (expensesData) {
        setExpenses(expensesData.map((e: any) => ({
          unit: e.unit,
          category: e.category,
          paymentMethod: e.payment_method,
          value: Number(e.value),
          date: e.date,
          collaborator: e.collaborator
        })) as any);
      }

      if (tripsData) {
        setTrips(tripsData.map((t: any) => ({
          id: t.id,
          collaborator: t.collaborator,
          avatar: t.avatar,
          role: t.role,
          units: t.units || [],
          startDate: t.start_date,
          endDate: t.end_date,
          estimatedCost: Number(t.estimated_cost),
          status: t.status as any
        })) as any);
      }
      console.timeEnd('Dashboard_Processing');

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() &&
      selectedDate.getFullYear() === new Date().getFullYear();

    // Only fetch if NOT the current month OR if we don't have hydration yet
    if (!(isCurrentMonth && initialDashboardData && (expenses.length > 0 || trips.length > 0))) {
      fetchData();
    }
  }, [selectedDate, initialDashboardData]);

  // 1. Cálculos de Estatísticas (Stats)
  // 1. Definição do Período Atual
  const periodInfo = useMemo(() => {
    const month = selectedDate.toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = selectedDate.getFullYear();

    const startCurrent = new Date(year, selectedDate.getMonth(), 1).toISOString().split('T')[0];
    const endCurrent = new Date(year, selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const startLast = new Date(year, selectedDate.getMonth() - 1, 1).toISOString().split('T')[0];
    const endLast = new Date(year, selectedDate.getMonth(), 0).toISOString().split('T')[0];

    return {
      monthLabel: `${capitalizedMonth} ${year}`,
      startCurrent,
      endCurrent,
      startLast,
      endLast,
      month: capitalizedMonth
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

  // 1.1 Filtros de Dados para o Mês Atual
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= periodInfo.startCurrent && e.date <= periodInfo.endCurrent);
  }, [expenses, periodInfo]);

  const currentMonthTrips = useMemo(() => {
    // Para viagens, filtramos se a viagem ocorre totalmente ou parcialmente no mês
    // Mas para simplificação de dashboard, geralmente se usa a data de início no mês
    return trips.filter(t => t.startDate >= periodInfo.startCurrent && t.startDate <= periodInfo.endCurrent);
  }, [trips, periodInfo]);

  // 2. Cálculos de Estatísticas (Stats) baseados no Mês Atual
  const totalExpensesValue = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => acc + curr.value, 0);
  }, [currentMonthExpenses]);

  const activeTripsCount = useMemo(() => {
    // Viagens em curso no mês atual
    return currentMonthTrips.filter(t => t.status === 'Em curso' || t.status === 'Agendada' || t.status === 'Aprovada').length;
  }, [currentMonthTrips]);

  // 2.1 Cálculos de Tendências (Comparativo Mês Anterior)
  const statsWithTrends = useMemo(() => {
    // --- DESPESAS ---
    const expLast = expenses.filter(e => e.date >= periodInfo.startLast && e.date <= periodInfo.endLast);
    const totalLastVal = expLast.reduce((acc, curr) => acc + curr.value, 0);

    // --- MÉDIA POR COLABORADOR ---
    const uniqueColabsCurrent = new Set(currentMonthExpenses.map(e => e.collaborator)).size;
    const uniqueColabsLast = new Set(expLast.map(e => e.collaborator)).size;

    const avgCurrentVal = uniqueColabsCurrent > 0 ? totalExpensesValue / uniqueColabsCurrent : 0;
    const avgLastVal = uniqueColabsLast > 0 ? totalLastVal / uniqueColabsLast : 0;

    // --- VIAGENS ---
    const tripsLast = trips.filter(t => t.startDate >= periodInfo.startLast && t.startDate <= periodInfo.endLast).length;

    const calculateTrend = (curr: number, last: number) => {
      if (last === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - last) / last) * 100;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    return [
      {
        label: 'Total de Despesas',
        value: `R$ ${totalExpensesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        trend: calculateTrend(totalExpensesValue, totalLastVal),
        icon: 'account_balance_wallet',
        variant: 'primary' as const
      },
      {
        label: 'Média por Colaborador',
        value: `R$ ${avgCurrentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        trend: calculateTrend(avgCurrentVal, avgLastVal),
        icon: 'person',
        variant: 'primary' as const
      },
      {
        label: 'Viagens Ativas',
        value: activeTripsCount.toString(),
        trend: calculateTrend(currentMonthTrips.length, tripsLast),
        icon: 'flight_takeoff',
        variant: 'success' as const
      }
    ];
  }, [currentMonthExpenses, expenses, totalExpensesValue, currentMonthTrips, activeTripsCount, periodInfo, trips]);

  // 3. Cálculo para Gráfico de Pizza (Categorias) - Mês Atual
  const pieData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    currentMonthExpenses.forEach(exp => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.value;
    });

    return Object.entries(categoryMap).map(([name, value], index) => {
      const percentage = totalExpensesValue > 0 ? (value / totalExpensesValue) * 100 : 0;
      return {
        name,
        value: Number(percentage.toFixed(1)),
        raw: value,
        color: COLORS[index % COLORS.length]
      };
    }).sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, totalExpensesValue]);

  // 4. Cálculo para Gráfico de Barras (Despesas por Loja) - Mês Atual
  const expenseBarData = useMemo(() => {
    const unitMap: Record<string, number> = {};
    currentMonthExpenses.forEach(exp => {
      unitMap[exp.unit] = (unitMap[exp.unit] || 0) + exp.value;
    });
    return Object.entries(unitMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  // 3.1 Cálculo para Frequência de Visitas (Sidebar) - Optimized
  const visitData = useMemo(() => {
    const visitMap: Record<string, number> = {};

    // We don't bother pre-filling from units, just count what exists in trips
    trips.forEach(trip => {
      if (trip.units && Array.isArray(trip.units)) {
        trip.units.forEach(unitName => {
          visitMap[unitName] = (visitMap[unitName] || 0) + 1;
        });
      }
    });

    return Object.entries(visitMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trips]);

  // 5. Cálculo do Ranking de Colaboradores - Mês Atual
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (Array.isArray(users)) {
      users.forEach(u => map.set(u.name, u));
    }
    return map;
  }, [users]);

  const ranking = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};

    currentMonthExpenses.forEach(exp => {
      const colabName = exp.collaborator || 'Desconhecido';
      if (!stats[colabName]) {
        stats[colabName] = { total: 0, count: 0 };
      }
      stats[colabName].total += exp.value;
      stats[colabName].count += 1;
    });

    return Object.entries(stats)
      .map(([name, data]) => {
        const colabInfo = userMap.get(name);
        return {
          name,
          total: data.total,
          count: data.count,
          avatar: colabInfo?.avatar || ''
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [currentMonthExpenses, userMap]);

  const maxExpenseInRanking = ranking.length > 0 ? ranking[0].total : 0;

  const topColab = ranking[0];
  const topColabPercentage = totalExpensesValue > 0 ? ((topColab?.total || 0) / totalExpensesValue) * 100 : 0;

  const upcomingTrips = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    return trips.filter(trip => {
      if (!trip.startDate) return false;
      const tripStart = new Date(trip.startDate);
      return tripStart >= now && tripStart <= tomorrow;
    });
  }, [trips]);


  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Alerta de Viagem Próxima */}
      {upcomingTrips.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-xl text-amber-600">
                <span className="material-symbols-outlined text-3xl">notification_important</span>
              </div>
              <div className="flex flex-col">
                <h4 className="text-amber-900 dark:text-amber-200 font-black text-sm uppercase tracking-tight">Viagem Programada</h4>
                <p className="text-amber-800/80 dark:text-amber-400/80 text-xs font-medium">
                  {upcomingTrips.length} {upcomingTrips.length === 1 ? 'viagem' : 'viagens'} iniciando em menos de 24 horas.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate?.('viagens')}
              className="bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 w-full md:w-auto"
            >
              VER CRONOGRAMA
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[#111318] dark:text-white text-[22px] font-black leading-tight tracking-tight">Indicadores de Desempenho</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mês Ativo: <span className="text-primary">{periodInfo.monthLabel}</span></p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsWithTrends.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[#636f88] dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
              <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.variant === 'success' ? 'text-green-500' : 'text-primary'}`}>
                <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
              </div>
            </div>
            <p className="text-[#111318] dark:text-white tracking-tight text-3xl font-black mb-2">{stat.value}</p>
            <div className="flex items-center gap-2">
              <Badge variant={stat.trend.startsWith('+') ? 'success' : 'danger'} dot>
                {stat.trend}
              </Badge>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">vs mês anterior</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Despesas por Loja */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-none pb-0">
            <div className="flex flex-col">
              <h3 className="text-base font-bold dark:text-white">Despesas por Unidade</h3>
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">{periodInfo.month}</span>
            </div>
            <Badge variant="primary" size="sm">Valores do Mês</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 mt-4">
              {expenseBarData.length === 0 ? (
                <EmptyState
                  icon="bar_chart"
                  title="Sem dados"
                  description="Nenhuma despesa registrada para exibir."
                  compact
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {expenseBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza: Tipo de Despesa */}
        <Card>
          <CardHeader className="border-none pb-0">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold dark:text-white">Tipo de Despesa</h3>
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">{periodInfo.month}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 relative mt-2">
              {pieData.length === 0 ? (
                <EmptyState
                  icon="pie_chart"
                  title="Sem categorias"
                  compact
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-6 space-y-3">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600 dark:text-slate-400 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="dark:text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ranking Dinâmico de Colaboradores */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-base font-bold dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">leaderboard</span>
                Ranking de Despesas por Colaborador
              </h3>
              <span className="text-[10px] font-black text-primary uppercase tracking-wider mt-1">{periodInfo.month}</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mês Atual</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex flex-col gap-6">
                {ranking.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <EmptyState
                      icon="leaderboard"
                      title="Sem ranking"
                      description="Nenhum lançamento registrado para este período."
                    />
                  </div>
                ) : (
                  ranking.map((colab, index) => (
                    <div key={index} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getAvatarUrl(colab.avatar) ? (
                              <img src={getAvatarUrl(colab.avatar)!} alt={colab.name} className="size-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover" />
                            ) : (
                              <div className="size-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="text-xs font-black text-slate-400 uppercase">{colab.name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="absolute -top-1 -right-1 size-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#111318] dark:text-white leading-tight">{colab.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{colab.count} lançamentos</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col">
                          <span className="text-sm font-black text-primary">R$ {colab.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000 ease-out"
                          style={{ width: `${(colab.total / maxExpenseInRanking) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Card className="flex flex-col h-full bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <CardHeader className="border-none pb-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Frequência de Visitas</h4>
                    <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-48 mb-6">
                    {visitData.length === 0 ? (
                      <EmptyState
                        icon="explore"
                        title="Sem visitas"
                        description="Nenhum roteiro concluído este mês."
                        compact
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visitData.slice(0, 4)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontBold: 800, fill: '#64748b' }} width={60} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            formatter={(value: number) => [`${value} ${value === 1 ? 'visita' : 'visitas'}`, 'Total']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontSize: '10px' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={15}>
                            {visitData.slice(0, 4).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="space-y-3">
                    {visitData.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{item.name}</span>
                        </div>
                        <span className="font-black dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => onNavigate?.('viagens')}
                    className="mt-6 uppercase text-[9px] font-black tracking-[0.2em] py-4 text-primary bg-primary/5 hover:bg-primary/10 border-none rounded-2xl"
                  >
                    Gerenciar Roteiros
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
