import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, formatCurrency, StatusBadge } from '@/lib/ui';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Users,
  FolderKanban,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    monthRevenue: 0,
    outstandingInvoices: 0,
    lowStockCount: 0,
    pendingTasks: 0,
    totalEmployees: 0,
    activeProjects: 0,
    totalProducts: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, products, tasks, employees, projects] = await Promise.all([
        base44.entities.Sale.list('-created_date', 50),
        base44.entities.Product.list('-created_date', 100),
        base44.entities.Task.list('-created_date', 50),
        base44.entities.Employee.list('-created_date', 50),
        base44.entities.Project.list('-created_date', 50),
      ]);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todaySalesList = sales.filter(s => s.sale_date === todayStr);
      const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + (s.total_amount || 0), 0);

      const monthSales = sales.filter(s => {
        if (!s.sale_date) return false;
        return new Date(s.sale_date) >= monthStart;
      });
      const monthRevenue = monthSales.reduce((sum, s) => sum + (s.amount_paid || s.total_amount || 0), 0);

      const outstanding = sales
        .filter(s => s.type === 'invoice' && (s.payment_status === 'unpaid' || s.payment_status === 'partial' || s.payment_status === 'overdue'))
        .reduce((sum, s) => sum + (s.balance_due || 0), 0);

      const lowStock = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5) && p.status === 'active');
      const pendingTasksCount = tasks.filter(t => t.status !== 'done').length;
      const activeProjectsCount = projects.filter(p => p.status === 'in_progress').length;

      setStats({
        todaySales: todaySalesTotal,
        monthRevenue: monthRevenue,
        outstandingInvoices: outstanding,
        lowStockCount: lowStock.length,
        pendingTasks: pendingTasksCount,
        totalEmployees: employees.filter(e => e.status === 'approved').length,
        activeProjects: activeProjectsCount,
        totalProducts: products.length,
      });

      setRecentSales(sales.slice(0, 5));
      setLowStockProducts(lowStock.slice(0, 5));

      // Build 7-day sales chart
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySales = sales.filter(s => s.sale_date === dateStr);
        const total = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        last7Days.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          sales: total,
        });
      }
      setSalesChart(last7Days);

      // Top products by frequency in sales items
      const productCount = {};
      sales.forEach(s => {
        (s.items || []).forEach(item => {
          if (item.name) {
            productCount[item.name] = (productCount[item.name] || 0) + (item.quantity || 1);
          }
        });
      });
      const top = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }));
      setTopProducts(top);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    { label: t('dashboard.todaysSales'), value: formatCurrency(stats.todaySales), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', trend: '+12.5%', trendUp: true, onClick: () => navigate('/sales') },
    { label: t('dashboard.monthRevenue'), value: formatCurrency(stats.monthRevenue), icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', trend: '+8.2%', trendUp: true },
    { label: t('dashboard.outstandingInvoices'), value: formatCurrency(stats.outstandingInvoices), icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', trend: '-3.1%', trendUp: false, onClick: () => navigate('/sales') },
    { label: t('dashboard.lowStockAlerts'), value: stats.lowStockCount, icon: Package, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', onClick: () => navigate('/inventory') },
    { label: t('dashboard.pendingTasksShort'), value: stats.pendingTasks, icon: CheckCircle2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', onClick: () => navigate('/projects') },
    { label: t('dashboard.totalEmployees'), value: stats.totalEmployees, icon: Users, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20', onClick: () => navigate('/employees') },
    { label: t('dashboard.activeProjects'), value: stats.activeProjects, icon: FolderKanban, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', onClick: () => navigate('/projects') },
    { label: t('dashboard.totalProducts'), value: stats.totalProducts, icon: ShoppingCart, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20', onClick: () => navigate('/inventory') },
  ];

  const pieColors = ['#hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <PageHeader title={`${t('dashboard.welcome')}`} subtitle={t('dashboard.overview')} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statCards.map((card, idx) => (
          <Card
            key={idx}
            className={`p-4 sm:p-5 ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            <div onClick={card.onClick}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                {card.trend && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${card.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                    {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className="text-lg sm:text-xl font-bold font-heading text-foreground truncate">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales chart */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{t('dashboard.salesPerformance')} (7 {t('projects.daysLeft')})</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="sales" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top products pie */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{t('dashboard.topProducts')}</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topProducts} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
              {t('common.noData')}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent sales */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{t('dashboard.recentSales')}</h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sale.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{sale.invoice_number || sale.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(sale.total_amount, sale.currency)}</p>
                    <StatusBadge status={sale.payment_status} label={t(`sales.${sale.payment_status}`)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">{t('common.noData')}</div>
          )}
        </Card>

        {/* Low stock alerts */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{t('dashboard.lowStockAlerts')}</h3>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku || '—'}</p>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-sm font-semibold text-red-600">{product.stock_quantity} {t('common.all')}</p>
                    <p className="text-xs text-muted-foreground">{t('inventory.lowStock')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              {t('common.noData')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}