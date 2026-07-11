import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatCurrency, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Receipt, Plus, Search, Trash2, Upload, Download, File } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORY_COLORS = {
  rent: '#3b82f6',
  utilities: '#8b5cf6',
  supplies: '#10b981',
  travel: '#f59e0b',
  salaries: '#ec4899',
  marketing: '#06b6d4',
  maintenance: '#ef4444',
  other: '#64748b',
};

export default function Expenses() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', amount: 0, category: 'other', expense_date: new Date().toISOString().split('T')[0], receipt_url: '', paid_by: '', payment_method: 'cash', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Expense.list('-created_date', 200);
      setExpenses(data);
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = expenses.filter(e => {
    const matchesSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const categoryData = [];
  const catTotals = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0);
  });
  Object.entries(catTotals).forEach(([cat, amt]) => {
    categoryData.push({ name: t(`expenses.category.${cat}`), value: amt, color: CATEGORY_COLORS[cat] });
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, receipt_url: file_url }));
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.amount) return;
    try {
      await base44.entities.Expense.create({ ...form, currency: 'RWF' });
      setShowForm(false);
      setForm({ title: '', amount: 0, category: 'other', expense_date: new Date().toISOString().split('T')[0], receipt_url: '', paid_by: '', payment_method: 'cash', notes: '' });
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('expenses.confirmDelete'))) return;
    try { await base44.entities.Expense.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('expenses.title')} subtitle={t('expenses.subtitle')}
        action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('expenses.add')}</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">{t('expenses.totalAmount')}</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} {t('expenses.entries')}</p>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-sm mb-3">{t('expenses.byCategory')}</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value">
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Receipt} title={t('expenses.noData')} />
          )}
        </Card>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('expenses.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="rent">{t('expenses.category.rent')}</SelectItem>
            <SelectItem value="utilities">{t('expenses.category.utilities')}</SelectItem>
            <SelectItem value="supplies">{t('expenses.category.supplies')}</SelectItem>
            <SelectItem value="travel">{t('expenses.category.travel')}</SelectItem>
            <SelectItem value="salaries">{t('expenses.category.salaries')}</SelectItem>
            <SelectItem value="marketing">{t('expenses.category.marketing')}</SelectItem>
            <SelectItem value="maintenance">{t('expenses.category.maintenance')}</SelectItem>
            <SelectItem value="other">{t('expenses.category.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">{t('common.title')}</th>
                  <th className="text-left p-3 font-medium">{t('expenses.category')}</th>
                  <th className="text-right p-3 font-medium">{t('expenses.amount')}</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">{t('common.date')}</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">{t('expenses.paidBy')}</th>
                  <th className="text-center p-3 font-medium">{t('expenses.receipt')}</th>
                  <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3"><p className="font-medium">{e.title}</p>{e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}</td>
                    <td className="p-3"><StatusBadge status={e.category} label={t(`expenses.category.${e.category}`)} /></td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(e.amount, e.currency)}</td>
                    <td className="p-3 hidden sm:table-cell">{formatDate(e.expense_date)}</td>
                    <td className="p-3 hidden md:table-cell">{e.paid_by || '—'}</td>
                    <td className="p-3 text-center">
                      {e.receipt_url ? (
                        <Button variant="ghost" size="icon" asChild><a href={e.receipt_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a></Button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Receipt} title={t('expenses.noExpenses')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('expenses.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.title')} *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('expenses.amount')} *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div>
                <Label>{t('expenses.category')}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">{t('expenses.category.rent')}</SelectItem>
                    <SelectItem value="utilities">{t('expenses.category.utilities')}</SelectItem>
                    <SelectItem value="supplies">{t('expenses.category.supplies')}</SelectItem>
                    <SelectItem value="travel">{t('expenses.category.travel')}</SelectItem>
                    <SelectItem value="salaries">{t('expenses.category.salaries')}</SelectItem>
                    <SelectItem value="marketing">{t('expenses.category.marketing')}</SelectItem>
                    <SelectItem value="maintenance">{t('expenses.category.maintenance')}</SelectItem>
                    <SelectItem value="other">{t('expenses.category.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.date')}</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>{t('expenses.paidBy')}</Label><Input value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} /></div>
            </div>
            <div>
              <Label>{t('expenses.paymentMethod')}</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('sales.cash')}</SelectItem>
                  <SelectItem value="card">{t('sales.card')}</SelectItem>
                  <SelectItem value="transfer">{t('sales.transfer')}</SelectItem>
                  <SelectItem value="mobile">{t('sales.mobile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('expenses.receipt')}</Label>
              {form.receipt_url ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <File className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{form.receipt_url.split('/').pop()}</span>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, receipt_url: '' })}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="flex flex-col items-center gap-1">
                    {uploading ? <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{uploading ? t('documents.uploading') : t('expenses.uploadReceipt')}</span>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} disabled={uploading} />
                </label>
              )}
            </div>
            <div><Label>{t('common.description')}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={uploading}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}