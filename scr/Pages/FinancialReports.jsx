import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, formatCurrency, EmptyState } from '@/lib/ui';
import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3, FileBarChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';

export default function FinancialReports() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [projects, setProjects] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, si, p] = await Promise.all([
        base44.entities.Sale.list('-created_date', 200),
        base44.entities.SupplierInvoice.list('-created_date', 200),
        base44.entities.Project.list('-created_date', 100),
      ]);
      setSales(s);
      setSupplierInvoices(si);
      setProjects(p);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalExpenses = supplierInvoices.reduce((sum, si) => sum + (si.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const inflow = sales.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const outflow = supplierInvoices.reduce((sum, si) => sum + (si.amount_paid || 0), 0);
  const netCashFlow = inflow - outflow;

  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const monthSales = sales.filter(s => s.sale_date?.startsWith(monthStr));
    const monthExpenses = supplierInvoices.filter(si => si.invoice_date?.startsWith(monthStr));
    monthlyData.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      revenue: monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      expenses: monthExpenses.reduce((sum, si) => sum + (si.amount || 0), 0),
    });
  }

  const budgetData = projects.filter(p => p.budget > 0).map(p => ({
    title: p.title,
    budget: p.budget,
    spent: Math.round((p.budget || 0) * (p.progress || 0) / 100),
    remaining: Math.round((p.budget || 0) * (1 - (p.progress || 0) / 100)),
    progress: p.progress || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('financial.title')} subtitle={t('financial.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="p-4 sm:p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
          <p className="text-xs text-muted-foreground mb-1">{t('financial.totalRevenue')}</p>
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3"><TrendingDown className="w-5 h-5 text-red-600" /></div>
          <p className="text-xs text-muted-foreground mb-1">{t('financial.totalExpenses')}</p>
          <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalExpenses)}</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-blue-600" /></div>
          <p className="text-xs text-muted-foreground mb-1">{t('financial.netProfit')}</p>
          <p className={`text-lg sm:text-xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
          <p className="text-xs text-muted-foreground mb-1">{t('financial.profitMargin')}</p>
          <p className="text-lg sm:text-xl font-bold">{profitMargin.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><h3 className="font-semibold text-sm">{t('financial.inflow')}</h3></div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(inflow)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-600" /><h3 className="font-semibold text-sm">{t('financial.outflow')}</h3></div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(outflow)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-blue-600" /><h3 className="font-semibold text-sm">{t('financial.netCashFlow')}</h3></div>
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netCashFlow)}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-heading font-semibold mb-4">{t('financial.monthlyBreakdown')}</h3>
        {monthlyData.some(d => d.revenue > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="revenue" name={t('financial.totalRevenue')} fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name={t('financial.totalExpenses')} fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={FileBarChart} title={t('financial.noData')} />
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">{t('financial.projectBudgets')}</h3>
        {budgetData.length > 0 ? (
          <div className="space-y-4">
            {budgetData.map((b, i) => {
              const pct = b.budget > 0 ? Math.min((b.spent / b.budget) * 100, 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{b.title}</span>
                    <span className="text-muted-foreground">{formatCurrency(b.spent)} / {formatCurrency(b.budget)}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{pct.toFixed(0)}% {t('financial.spent').toLowerCase()}</span>
                    <span>{t('financial.remaining')}: {formatCurrency(b.remaining)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Wallet} title={t('financial.noData')} />
        )}
      </Card>
    </div>
  );
}