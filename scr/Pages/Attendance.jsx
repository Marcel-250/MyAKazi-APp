import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, Plus, Search, Trash2, LogIn, LogOut, CalendarCheck, Clock3 } from 'lucide-react';

export default function Attendance() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: '', employee_name: '', date: filterDate, clock_in: '', clock_out: '', status: 'present', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e] = await Promise.all([
        base44.entities.Attendance.list('-created_date', 200),
        base44.entities.Employee.list('-created_date', 200),
      ]);
      setRecords(r);
      setEmployees(e.filter(emp => emp.status === 'approved'));
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = records.filter(r => {
    const matchesSearch = !search || r.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !filterDate || r.date === filterDate;
    return matchesSearch && matchesDate;
  });

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today);
  const presentCount = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const totalHoursToday = todayRecords.reduce((s, r) => s + (r.hours_worked || 0), 0);

  const onEmployeeChange = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(prev => ({ ...prev, employee_id: id, employee_name: emp?.full_name || '' }));
  };

  const computeHours = (cin, cout) => {
    if (!cin || !cout) return 0;
    const diff = (new Date(cout) - new Date(cin)) / 3600000;
    return Math.max(0, Math.round(diff * 100) / 100);
  };

  const openForm = () => {
    setForm({ employee_id: '', employee_name: '', date: today, clock_in: '', clock_out: '', status: 'present', notes: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.employee_name || !form.date) return;
    try {
      const hours = computeHours(form.clock_in, form.clock_out);
      await base44.entities.Attendance.create({ ...form, hours_worked: hours });
      setShowForm(false);
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('attendance.confirmDelete'))) return;
    try { await base44.entities.Attendance.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('attendance.title')} subtitle={t('attendance.subtitle')}
        action={<Button onClick={openForm}><Plus className="w-4 h-4" /> {t('attendance.add')}</Button>} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><CalendarCheck className="w-4 h-4 text-emerald-600" /><p className="text-xs text-muted-foreground">{t('attendance.presentToday')}</p></div><p className="text-lg sm:text-xl font-bold">{presentCount}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><Clock3 className="w-4 h-4 text-blue-600" /><p className="text-xs text-muted-foreground">{t('attendance.totalHoursToday')}</p></div><p className="text-lg sm:text-xl font-bold">{totalHoursToday.toFixed(1)}h</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-purple-600" /><p className="text-xs text-muted-foreground">{t('attendance.recordsToday')}</p></div><p className="text-lg sm:text-xl font-bold">{todayRecords.length}</p></Card>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('attendance.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
      </div>

      {filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">{t('employees.fullName')}</th>
                  <th className="text-left p-3 font-medium">{t('common.date')}</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">{t('attendance.clockIn')}</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">{t('attendance.clockOut')}</th>
                  <th className="text-right p-3 font-medium">{t('attendance.hoursWorked')}</th>
                  <th className="text-left p-3 font-medium">{t('common.status')}</th>
                  <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.employee_name}</td>
                    <td className="p-3">{formatDate(r.date)}</td>
                    <td className="p-3 hidden sm:table-cell">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="p-3 hidden sm:table-cell">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="p-3 text-right font-semibold">{r.hours_worked ? `${r.hours_worked}h` : '—'}</td>
                    <td className="p-3"><StatusBadge status={r.status} label={t(`attendance.status.${r.status}`)} /></td>
                    <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Clock} title={t('attendance.noRecords')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('attendance.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('employees.fullName')} *</Label>
              <Select value={form.employee_id} onValueChange={onEmployeeChange}>
                <SelectTrigger><SelectValue placeholder={t('payroll.selectEmployee')} /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('common.date')} *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('attendance.clockIn')}</Label>
                <Input type="datetime-local" value={form.clock_in} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} />
              </div>
              <div>
                <Label>{t('attendance.clockOut')}</Label>
                <Input type="datetime-local" value={form.clock_out} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t('attendance.status.present')}</SelectItem>
                  <SelectItem value="late">{t('attendance.status.late')}</SelectItem>
                  <SelectItem value="half_day">{t('attendance.status.half_day')}</SelectItem>
                  <SelectItem value="absent">{t('attendance.status.absent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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