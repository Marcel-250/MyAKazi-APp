import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, EmptyState, formatCurrency, formatDate } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  ShoppingCart,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  X,
  ArrowRight,
} from 'lucide-react';

export default function Sales() {
  const { t } = useLanguage();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    type: 'quote',
    sale_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    items: [],
  });
  const [newItem, setNewItem] = useState({ product_id: '', quantity: '1', unit_price: '', name: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesData, productsData] = await Promise.all([
        base44.entities.Sale.list('-created_date', 100),
        base44.entities.Product.list('-created_date', 200),
      ]);
      setSales(salesData);
      setProducts(productsData);
    } catch (err) {
      console.error('Load sales error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = {
    totalRevenue: sales.filter(s => s.type !== 'quote').reduce((sum, s) => sum + (s.total_amount || 0), 0),
    paidAmount: sales.reduce((sum, s) => sum + (s.amount_paid || 0), 0),
    outstanding: sales.reduce((sum, s) => sum + (s.balance_due || 0), 0),
    totalQuotes: sales.filter(s => s.type === 'quote').length,
  };

  const statCards = [
    { label: t('sales.totalRevenue'), value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t('sales.paidAmount'), value: formatCurrency(stats.paidAmount), icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: t('sales.outstanding'), value: formatCurrency(stats.outstanding), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: t('sales.totalQuotes'), value: stats.totalQuotes, icon: FileText, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  const openAdd = () => {
    setForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      type: 'quote',
      sale_date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
      items: [],
    });
    setNewItem({ product_id: '', quantity: '1', unit_price: '', name: '' });
    setModalOpen(true);
  };

  const addItem = () => {
    if (!newItem.name || !newItem.unit_price) return;
    setForm({
      ...form,
      items: [...form.items, {
        product_id: newItem.product_id,
        name: newItem.name,
        quantity: parseInt(newItem.quantity) || 1,
        unit_price: parseFloat(newItem.unit_price) || 0,
        discount: 0,
      }],
    });
    setNewItem({ product_id: '', quantity: '1', unit_price: '', name: '' });
  };

  const removeItem = (idx) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const selectProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewItem({
        product_id: product.id,
        name: product.name,
        quantity: '1',
        unit_price: product.price?.toString() || '',
      });
    }
  };

  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountTotal = form.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const taxAmount = (subtotal - discountTotal) * 0.18;
  const total = subtotal - discountTotal + taxAmount;

  const handleSave = async () => {
    if (!form.customer_name || form.items.length === 0) return;
    setSaving(true);
    try {
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      const payload = {
        ...form,
        invoice_number: invoiceNum,
        subtotal,
        discount_total: discountTotal,
        tax_amount: taxAmount,
        total_amount: total,
        amount_paid: 0,
        balance_due: total,
        payment_status: 'unpaid',
        currency: 'RWF',
      };
      await base44.entities.Sale.create(payload);
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Save sale error:', err);
    } finally {
      setSaving(false);
    }
  };

  const convertToInvoice = async (sale) => {
    try {
      await base44.entities.Sale.update(sale.id, { type: 'invoice', payment_status: 'unpaid' });
      loadData();
    } catch (err) {
      console.error('Convert error:', err);
    }
  };

  const generateReceipt = async (sale) => {
    try {
      await base44.entities.Sale.update(sale.id, {
        type: 'receipt',
        payment_status: 'paid',
        amount_paid: sale.total_amount,
        balance_due: 0,
      });
      loadData();
    } catch (err) {
      console.error('Receipt error:', err);
    }
  };

  const recordPayment = async () => {
    if (!paymentModal || !paymentAmount) return;
    setSaving(true);
    try {
      const amount = parseFloat(paymentAmount);
      const newPaid = (paymentModal.amount_paid || 0) + amount;
      const newBalance = paymentModal.total_amount - newPaid;
      const status = newBalance <= 0 ? 'paid' : 'partial';
      await base44.entities.Sale.update(paymentModal.id, {
        amount_paid: newPaid,
        balance_due: Math.max(0, newBalance),
        payment_status: status,
        payment_method: paymentMethod,
      });
      setPaymentModal(null);
      setPaymentAmount('');
      loadData();
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('sales.confirmDelete'))) return;
    try {
      await base44.entities.Sale.delete(id);
      loadData();
    } catch (err) {
      console.error('Delete sale error:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        action={
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('sales.newSale')}
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

      {/* Sales list */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : sales.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={t('sales.noSales')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('sales.invoiceNumber')}</th>
                  <th className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('sales.customerName')}</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">{t('common.status')}</th>
                  <th className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('sales.total')}</th>
                  <th className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">{t('sales.balanceDue')}</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('sales.paymentStatus')}</th>
                  <th className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-foreground">{sale.invoice_number || sale.id.slice(0, 8)}</span>
                        <StatusBadge status={sale.type} label={t(`sales.${sale.type}`)} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(sale.sale_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{sale.customer_name}</p>
                      {sale.customer_phone && <p className="text-xs text-muted-foreground">{sale.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <StatusBadge status={sale.type} label={t(`sales.${sale.type}`)} />
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(sale.total_amount, sale.currency)}</span>
                    </td>
                    <td className="px-4 py-3 text-end hidden lg:table-cell">
                      <span className={`text-sm font-semibold ${(sale.balance_due || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(sale.balance_due, sale.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sale.payment_status} label={t(`sales.${sale.payment_status}`)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {sale.type === 'quote' && (
                          <button
                            onClick={() => convertToInvoice(sale)}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span className="hidden xl:inline">{t('sales.convertToInvoice')}</span>
                          </button>
                        )}
                        {sale.type === 'invoice' && sale.balance_due > 0 && (
                          <button
                            onClick={() => {
                              setPaymentModal(sale);
                              setPaymentAmount(sale.balance_due?.toString() || '');
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          >
                            {t('sales.recordPayment')}
                          </button>
                        )}
                        {sale.type === 'invoice' && sale.balance_due <= 0 && (
                          <button
                            onClick={() => generateReceipt(sale)}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                          >
                            {t('sales.generateReceipt')}
                          </button>
                        )}
                        <button onClick={() => handleDelete(sale.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New sale modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('sales.newSale')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sales.customerName')} *</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} />
              </div>
              <div>
                <Label>{t('common.phone')}</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({...form, customer_phone: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t('common.email')}</Label>
                <Input value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} />
              </div>
              <div>
                <Label>{t('saleDate')}</Label>
                <Input type="date" value={form.sale_date} onChange={(e) => setForm({...form, sale_date: e.target.value})} />
              </div>
              <div>
                <Label>{t('sales.dueDate')}</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} />
              </div>
            </div>

            {/* Items */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <Label className="text-sm font-semibold">{t('sales.items')}</Label>
              {form.items.length > 0 && (
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">{item.quantity} ×</span>
                      <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                      <button onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">{t('sales.selectProduct')}</Label>
                  <Select value={newItem.product_id} onValueChange={selectProduct}>
                    <SelectTrigger><SelectValue placeholder={t('sales.selectProduct')} /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price, p.currency)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-16">
                  <Label className="text-xs">{t('sales.quantity')}</Label>
                  <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                </div>
                <div className="w-28">
                  <Label className="text-xs">{t('sales.unitPrice')}</Label>
                  <Input type="number" value={newItem.unit_price} onChange={(e) => setNewItem({...newItem, unit_price: e.target.value})} />
                </div>
                <Button type="button" size="sm" onClick={addItem} disabled={!newItem.name || !newItem.unit_price}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('sales.subtotal')}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('sales.discount')}</span>
                <span className="font-medium">{formatCurrency(discountTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('sales.tax')} (18%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-semibold">{t('sales.total')}</span>
                <span className="font-bold text-primary text-base">{formatCurrency(total)}</span>
              </div>
            </div>

            <div>
              <Label>{t('common.description')}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.customer_name || form.items.length === 0}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment modal */}
      <Dialog open={!!paymentModal} onOpenChange={(v) => !v && setPaymentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sales.recordPayment')}</DialogTitle>
          </DialogHeader>
          {paymentModal && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('sales.total')}</span>
                  <span className="font-medium">{formatCurrency(paymentModal.total_amount, paymentModal.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('sales.amountPaid')}</span>
                  <span className="font-medium">{formatCurrency(paymentModal.amount_paid, paymentModal.currency)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="font-semibold">{t('sales.balanceDue')}</span>
                  <span className="font-bold text-amber-600">{formatCurrency(paymentModal.balance_due, paymentModal.currency)}</span>
                </div>
              </div>
              <div>
                <Label>{t('sales.paymentAmount')}</Label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </div>
              <div>
                <Label>{t('sales.paymentMethod')}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('sales.cash')}</SelectItem>
                    <SelectItem value="card">{t('sales.card')}</SelectItem>
                    <SelectItem value="transfer">{t('sales.transfer')}</SelectItem>
                    <SelectItem value="mobile">{t('sales.mobile')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={recordPayment} disabled={saving || !paymentAmount}>
              {saving ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}