import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2, MapPin, Phone, Mail, User, Star } from 'lucide-react';

export default function Branches() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', manager: '', is_headquarters: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Branch.list('-created_date', 100);
      setBranches(data);
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openForm = (b = null) => {
    setEditing(b);
    setForm(b ? { ...b } : { name: '', address: '', phone: '', email: '', manager: '', is_headquarters: false });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) return;
    try {
      if (editing) await base44.entities.Branch.update(editing.id, form);
      else await base44.entities.Branch.create(form);
      setShowForm(false);
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('branches.confirmDelete'))) return;
    try { await base44.entities.Branch.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('branches.title')} subtitle={t('branches.subtitle')}
        action={<Button onClick={() => openForm()}><Plus className="w-4 h-4" /> {t('branches.add')}</Button>} />

      <div className="mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('branches.totalBranches')}</p>
          <p className="text-2xl font-bold">{branches.length}</p>
        </Card>
      </div>

      {branches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    {b.is_headquarters && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Star className="w-3 h-3 fill-amber-500" /> {t('branch.headquarters')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openForm(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2"><MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /> {b.address}</p>
                {b.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" /> {b.phone}</p>}
                {b.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /> {b.email}</p>}
                {b.manager && <p className="flex items-center gap-2"><User className="w-4 h-4 flex-shrink-0" /> {b.manager}</p>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Building2} title={t('branches.noBranches')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('branches.edit') : t('branches.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('branches.name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t('branches.address')} *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>{t('common.email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>{t('branches.manager')}</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_headquarters} onChange={(e) => setForm({ ...form, is_headquarters: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm">{t('branches.markAsHQ')}</span>
            </label>
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