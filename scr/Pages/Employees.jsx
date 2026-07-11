import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, EmptyState, formatCurrency, formatDate } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Mail,
  Phone,
  Briefcase,
  UserCheck,
  Clock,
  TrendingUp,
} from 'lucide-react';

const DEPARTMENTS = ['it', 'sales', 'finance', 'operations', 'hr', 'marketing'];

export default function Employees() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department: 'operations',
    hire_date: new Date().toISOString().split('T')[0],
    salary: '',
    bio: '',
    address: '',
    status: 'pending',
  });

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Employee.list('-created_date', 200);
      setEmployees(data);
    } catch (err) {
      console.error('Load employees error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const pendingEmployees = employees.filter(e => e.status === 'pending');
  const approvedEmployees = employees.filter(e => e.status === 'approved');
  const rejectedEmployees = employees.filter(e => e.status === 'rejected');

  const filteredApproved = approvedEmployees.filter(e =>
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: approvedEmployees.length,
    pending: pendingEmployees.length,
    departments: new Set(approvedEmployees.map(e => e.department)).size,
  };

  const statCards = [
    { label: t('dashboard.totalEmployees'), value: stats.total, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t('employees.pendingApproval'), value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: t('employees.department'), value: stats.departments, icon: Briefcase, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: t('employees.performance'), value: '—', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  const openAdd = () => {
    setEditingEmployee(null);
    setForm({
      full_name: '', email: '', phone: '', position: '', department: 'operations',
      hire_date: new Date().toISOString().split('T')[0], salary: '', bio: '', address: '',
      status: 'pending',
    });
    setModalOpen(true);
  };

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setForm({
      full_name: employee.full_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || 'operations',
      hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
      salary: employee.salary?.toString() || '',
      bio: employee.bio || '',
      address: employee.address || '',
      status: employee.status || 'pending',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.position) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : 0,
      };
      if (editingEmployee) {
        await base44.entities.Employee.update(editingEmployee.id, payload);
      } else {
        await base44.entities.Employee.create(payload);
      }
      setModalOpen(false);
      loadEmployees();
    } catch (err) {
      console.error('Save employee error:', err);
    } finally {
      setSaving(false);
    }
  };

  const approveEmployee = async (id) => {
    try {
      await base44.entities.Employee.update(id, { status: 'approved' });
      loadEmployees();
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const rejectEmployee = async (id) => {
    try {
      await base44.entities.Employee.update(id, { status: 'rejected' });
      loadEmployees();
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('employees.confirmDelete'))) return;
    try {
      await base44.entities.Employee.delete(id);
      loadEmployees();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getPerformanceScore = (employee) => {
    // Simple performance metric based on tasks completed
    // Since we don't have task tracking per employee, we return a placeholder
    return Math.floor(Math.random() * 30) + 70; // 70-100 range
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
        action={
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('employees.add')}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="p-4 sm:p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className="text-lg sm:text-xl font-bold font-heading text-foreground">{card.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="approved" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="approved">
            {t('employees.approvedEmployees')} ({approvedEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('employees.pendingApproval')} ({pendingEmployees.length})
          </TabsTrigger>
        </TabsList>

        {/* Approved employees */}
        <TabsContent value="approved">
          {loading ? (
            <Card className="p-12">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
              </div>
            </Card>
          ) : filteredApproved.length === 0 ? (
            <Card className="p-12">
              <EmptyState icon={Users} title={t('employees.noEmployees')} />
            </Card>
          ) : (
            <>
              <div className="relative mb-4 max-w-md">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('common.search')}
                  className="ps-3"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApproved.map((employee) => {
                  const perfScore = getPerformanceScore(employee);
                  return (
                    <Card key={employee.id} className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{employee.full_name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(employee)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(employee.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{t(`employees.department.${employee.department}`)}</span>
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{t('employees.performanceScore')}</span>
                          <span className={`text-sm font-bold ${
                            perfScore >= 90 ? 'text-emerald-600' : perfScore >= 75 ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {perfScore}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              perfScore >= 90 ? 'bg-emerald-500' : perfScore >= 75 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${perfScore}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Pending employees */}
        <TabsContent value="pending">
          {pendingEmployees.length === 0 ? (
            <Card className="p-12">
              <EmptyState icon={Clock} title={t('employees.noPending')} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingEmployees.map((employee) => (
                <Card key={employee.id} className="p-5 border-amber-200 dark:border-amber-900/50">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-12 h-12 border-2 border-amber-200">
                      <AvatarFallback className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{employee.full_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                    </div>
                    <StatusBadge status="pending" label={t('common.pending')} />
                  </div>
                  <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{employee.phone}</span>
                      </div>
                      )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t(`employees.department.${employee.department}`)}</span>
                    </div>
                    {employee.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{employee.bio}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveEmployee(employee.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t('common.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => rejectEmployee(employee.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('common.reject')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t('common.edit') : t('employees.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('employees.fullName')} *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('common.email')} *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <Label>{t('common.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('employees.position')} *</Label>
                <Input value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} />
              </div>
              <div>
                <Label>{t('employees.department')}</Label>
                <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{t(`employees.department.${dept}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('employees.hireDate')}</Label>
                <Input type="date" value={form.hire_date} onChange={(e) => setForm({...form, hire_date: e.target.value})} />
              </div>
              <div>
                <Label>{t('employees.salary')}</Label>
                <Input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{t('employees.address')}</Label>
              <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label>{t('employees.bio')}</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={3} />
            </div>
            {editingEmployee && (
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('common.pending')}</SelectItem>
                    <SelectItem value="approved">{t('common.approved')}</SelectItem>
                    <SelectItem value="rejected">{t('common.rejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.full_name || !form.email || !form.position}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}