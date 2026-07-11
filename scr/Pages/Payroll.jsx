import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatCurrency, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Plus, Search, Pencil, Trash2, CheckCircle2, Banknote } from 'lucide-react';

export default function Payroll() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employee_id: '', employee_name: '', month: filterMonth, base_salary: 0, bonus: 0, deductions: 0, status: 'draft', payment_date: '', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        base44.entities.Payroll.list('-created_date', 200),
        base44.entities.Employee.list('-created_date', 200),
      ]);
      setPayrolls(p);
      setEmployees(e.filter(emp => emp.status === 'approved'));
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = payrolls.filter(p => {
    const matchesSearch = !search || p.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = !filterMonth || p.month === filterMonth;
    return matchesSearch && matchesMonth;
  });

  const totalNet = filtered.reduce((s, p) => s + (p.net_pay || 0), 0);
  const totalBonus = filtered.reduce((s, p) => s + (p.bonus || 0), 0);
  const totalDeductions = filtered.reduce((s, p) => s + (p.deductions || 0), 0);

  const openForm = (p = null) => {
    setEditing(p);
    setForm(p ? { ...p } : { employee_id: '', employee_name: '', month: filterMonth, base_salary: 0, bonus: 0, deductions: 0, status: 'draft', payment_date: '', notes: '' });
    setShowForm(true);
  };

  const onEmployeeChange = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(prev => ({ ...prev, employee_id: id, employee_name: emp?.full_name || '', base_salary: emp?.salary || 0 }));
  };

  const computeNet = () => (form.base_salary || 0) + (form.bonus || 0) - (form.deductions || 0);

  const handleSave = async () => {
    if (!form.employee_name || !form.month) return;
    try {
      const data = { ...form, net_pay: computeNet(), currency: 'RWF' };
      if (editing) await base44.entities.Payroll.update(editing.id, data);
      else await base44.entities.Payroll.create(data);
      setShowForm(false);
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('payroll.confirmDelete'))) return;
    try { await base44.entities.Payroll.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, status) => {
    try { await base44.entities.Payroll.update(id, { status }); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('payroll.title')} subtitle={t('payroll.subtitle')}
        action={<Button onClick={() => openForm()}><Plus className="w-4 h-4" /> {t('payroll.add')}</Button>} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('payroll.totalNetPay')}</p><p className="text-lg sm:text-xl font-bold">{formatCurrency(totalNet)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('payroll.totalBonus')}</p><p className="text-lg sm:text-xl font-bold text-emerald-600">{formatCurrency(totalBonus)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('payroll.totalDeductions')}</p><p className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p></Card>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('payroll.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-44" />
      </div>

      {filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">{t('employees.fullName')}</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">{t('payroll.baseSalary')}</th>
                  <th className="text-right p-3 font-medium">{t('payroll.bonus')}</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">{t('payroll.deductions')}</th>
                  <th className="text-right p-3 font-medium">{t('payroll.netPay')}</th>
                  <th className="text-left p-3 font-medium">{t('common.status')}</th>
                  <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3"><p className="font-medium">{p.employee_name}</p><p className="text-xs text-muted-foreground">{p.month}</p></td>
                    <td className="p-3 text-right hidden sm:table-cell">{formatCurrency(p.base_salary, p.currency)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatCurrency(p.bonus, p.currency)}</td>
                    <td className="p-3 text-right text-red-600 hidden md:table-cell">{formatCurrency(p.deductions, p.currency)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(p.net_pay, p.currency)}</td>
                    <td className="p-3"><StatusBadge status={p.status} label={t(`payroll.status.${p.status}`)} /></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === 'draft' && <Button variant="ghost" size="icon" title={t('common.approve')} onClick={() => updateStatus(p.id, 'approved')}><CheckCircle2 className="w-4 h-4" /></Button>}
                        {p.status === 'approved' && <Button variant="ghost" size="icon" title={t('payroll.markPaid')} onClick={() => updateStatus(p.id, 'paid')}><Banknote className="w-4 h-4" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => openForm(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Wallet} title={t('payroll.noPayrolls')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('common.edit') : t('payroll.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('employees.fullName')} *</Label>
              <Select value={form.employee_id} onValueChange={onEmployeeChange}>
                <SelectTrigger><SelectValue placeholder={t('payroll.selectEmployee')} /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('payroll.month')} *</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('payroll.status.draft')}</SelectItem>
                    <SelectItem value="approved">{t('payroll.status.approved')}</SelectItem>
                    <SelectItem value="paid">{t('payroll.status.paid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('payroll.baseSalary')}</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} /></div>
              <div><Label>{t('payroll.bonus')}</Label><Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} /></div>
              <div><Label>{t('payroll.deductions')}</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/50 font-semibold">
              <span>{t('payroll.netPay')}</span><span>{formatCurrency(computeNet())}</span>
            </div>
            <div><Label>{t('payroll.paymentDate')}</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
            <div><Label>{t('common.description')}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}