import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatCurrency, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, ShoppingBag, MessageSquare, Contact } from 'lucide-react';

export default function Customers() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', address: '', type: 'customer', status: 'active', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Customer.list('-created_date', 200);
      setCustomers(data);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = customers.filter(c => {
    const matchesSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    leads: customers.filter(c => c.type === 'lead').length,
  };

  const openForm = (customer = null) => {
    setEditing(customer);
    setForm(customer ? { ...customer } : { name: '', company: '', email: '', phone: '', address: '', type: 'customer', status: 'active', notes: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editing) {
        await base44.entities.Customer.update(editing.id, form);
      } else {
        await base44.entities.Customer.create(form);
      }
      setShowForm(false);
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('customers.confirmDelete'))) return;
    try { await base44.entities.Customer.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const openDetail = async (customer) => {
    setDetailCustomer(customer);
    setNoteText('');
    try {
      const sales = await base44.entities.Sale.list('-created_date', 200);
      setCustomerSales(sales.filter(s =>
        s.customer_name?.toLowerCase() === customer.name?.toLowerCase() ||
        s.customer_email?.toLowerCase() === customer.email?.toLowerCase()
      ));
    } catch (err) { setCustomerSales([]); }
  };

  const addNote = async () => {
    if (!noteText || !detailCustomer) return;
    const timestamp = new Date().toLocaleString();
    const newNotes = detailCustomer.notes
      ? `${detailCustomer.notes}\n[${timestamp}] ${noteText}`
      : `[${timestamp}] ${noteText}`;
    try {
      await base44.entities.Customer.update(detailCustomer.id, { notes: newNotes });
      setDetailCustomer({ ...detailCustomer, notes: newNotes });
      setNoteText('');
      loadData();
    } catch (err) { console.error(err); }
  };

  const interactions = detailCustomer?.notes?.split('\n').filter(n => n.trim()) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        action={<Button onClick={() => openForm()}><Plus className="w-4 h-4" /> {t('customers.add')}</Button>}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('customers.totalCustomers')}</p><p className="text-xl font-bold">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('customers.activeCustomers')}</p><p className="text-xl font-bold">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">{t('customers.leads')}</p><p className="text-xl font-bold">{stats.leads}</p></Card>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('customers.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="lead">{t('customers.type.lead')}</SelectItem>
            <SelectItem value="prospect">{t('customers.type.prospect')}</SelectItem>
            <SelectItem value="customer">{t('customers.type.customer')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">{t('customers.customerName')}</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">{t('customers.company')}</th>
                  <th className="text-left p-3 font-medium">{t('customers.type')}</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">{t('common.phone')}</th>
                  <th className="text-left p-3 font-medium">{t('common.status')}</th>
                  <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(c)}>
                    <td className="p-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground sm:hidden">{c.company || '—'}</p></td>
                    <td className="p-3 hidden sm:table-cell">{c.company || '—'}</td>
                    <td className="p-3"><StatusBadge status={c.type} label={t(`customers.type.${c.type}`)} /></td>
                    <td className="p-3 hidden md:table-cell">{c.phone || '—'}</td>
                    <td className="p-3"><StatusBadge status={c.status} label={t(`common.${c.status}`)} /></td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openForm(c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Contact} title={t('customers.noCustomers')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('customers.edit') : t('customers.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('customers.customerName')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t('customers.company')}</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('customers.type')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">{t('customers.type.lead')}</SelectItem>
                    <SelectItem value="prospect">{t('customers.type.prospect')}</SelectItem>
                    <SelectItem value="customer">{t('customers.type.customer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailCustomer} onOpenChange={(v) => !v && setDetailCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailCustomer && (
            <>
              <DialogHeader><DialogTitle className="text-xl">{detailCustomer.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailCustomer.company && <div><span className="text-muted-foreground">{t('customers.company')}:</span> {detailCustomer.company}</div>}
                  {detailCustomer.email && <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {detailCustomer.email}</div>}
                  {detailCustomer.phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {detailCustomer.phone}</div>}
                  {detailCustomer.address && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {detailCustomer.address}</div>}
                  <div><StatusBadge status={detailCustomer.type} label={t(`customers.type.${detailCustomer.type}`)} /></div>
                  <div><StatusBadge status={detailCustomer.status} label={t(`common.${detailCustomer.status}`)} /></div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> {t('customers.purchaseHistory')}</h4>
                  {customerSales.length > 0 ? (
                    <div className="space-y-2">
                      {customerSales.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <div><p className="font-medium">{s.invoice_number || s.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{formatDate(s.sale_date)}</p></div>
                          <div className="text-right"><p className="font-medium">{formatCurrency(s.total_amount, s.currency)}</p><StatusBadge status={s.payment_status} label={t(`sales.${s.payment_status}`)} /></div>
                        </div>
                      ))}
                      <div className="flex justify-between p-2 rounded-lg bg-primary/5 text-sm font-semibold">
                        <span>{t('customers.totalSpent')}</span>
                        <span>{formatCurrency(customerSales.reduce((sum, s) => sum + (s.total_amount || 0), 0))}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('customers.noPurchases')}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> {t('customers.interactions')}</h4>
                  {interactions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {interactions.map((note, i) => (
                        <p key={i} className="text-sm p-2 rounded-lg bg-muted/50">{note}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input placeholder={t('customers.addNote')} value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
                    <Button onClick={addNote} size="icon"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}