import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatCurrency, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Plus, Search, Pencil, Trash2, FileText, ShoppingCart, BarChart3 } from 'lucide-react';

export default function Suppliers() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', products: '', status: 'active', notes: '' });
  const [poForm, setPoForm] = useState({ po_number: '', supplier_id: '', order_date: new Date().toISOString().split('T')[0], status: 'draft', items: [] });
  const [poItem, setPoItem] = useState({ name: '', quantity: 1, unit_price: 0 });
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: '', supplier_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', amount: 0, payment_status: 'unpaid' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, po, si] = await Promise.all([
        base44.entities.Supplier.list('-created_date', 200),
        base44.entities.PurchaseOrder.list('-created_date', 200),
        base44.entities.SupplierInvoice.list('-created_date', 200),
      ]);
      setSuppliers(s);
      setPurchaseOrders(po);
      setSupplierInvoices(si);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSuppliers = suppliers.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const pricingData = {};
  purchaseOrders.forEach(po => {
    (po.items || []).forEach(item => {
      if (!item.name) return;
      if (!pricingData[item.name]) pricingData[item.name] = [];
      pricingData[item.name].push({ supplier: po.supplier_name || '—', price: item.unit_price || 0, po_number: po.po_number });
    });
  });

  const openSupplierForm = (s = null) => {
    setEditingSupplier(s);
    setSupplierForm(s ? { ...s } : { name: '', contact_person: '', email: '', phone: '', address: '', products: '', status: 'active', notes: '' });
    setShowSupplierForm(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name) return;
    try {
      if (editingSupplier) { await base44.entities.Supplier.update(editingSupplier.id, supplierForm); }
      else { await base44.entities.Supplier.create(supplierForm); }
      setShowSupplierForm(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const deleteSupplier = async (id) => {
    if (!confirm(t('suppliers.confirmDelete'))) return;
    try { await base44.entities.Supplier.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const addPOItem = () => {
    if (!poItem.name) return;
    setPoForm({ ...poForm, items: [...poForm.items, { ...poItem }] });
    setPoItem({ name: '', quantity: 1, unit_price: 0 });
  };

  const removePOItem = (idx) => {
    setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) });
  };

  const poTotal = poForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price || 0), 0);

  const savePO = async () => {
    if (!poForm.po_number || !poForm.supplier_id) return;
    const supplier = suppliers.find(s => s.id === poForm.supplier_id);
    try {
      await base44.entities.PurchaseOrder.create({
        ...poForm,
        supplier_name: supplier?.name || '',
        total_amount: poTotal,
        currency: 'RWF',
      });
      setShowPOForm(false);
      setPoForm({ po_number: '', supplier_id: '', order_date: new Date().toISOString().split('T')[0], status: 'draft', items: [] });
      loadData();
    } catch (err) { console.error(err); }
  };

  const deletePO = async (id) => {
    try { await base44.entities.PurchaseOrder.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const saveInvoice = async () => {
    if (!invoiceForm.invoice_number || !invoiceForm.supplier_id) return;
    const supplier = suppliers.find(s => s.id === invoiceForm.supplier_id);
    try {
      await base44.entities.SupplierInvoice.create({
        ...invoiceForm,
        supplier_name: supplier?.name || '',
        currency: 'RWF',
      });
      setShowInvoiceForm(false);
      setInvoiceForm({ invoice_number: '', supplier_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', amount: 0, payment_status: 'unpaid' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const deleteInvoice = async (id) => {
    try { await base44.entities.SupplierInvoice.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title={t('suppliers.title')} subtitle={t('suppliers.subtitle')} />

      <Tabs defaultValue="suppliers">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="suppliers">{t('suppliers.title')}</TabsTrigger>
          <TabsTrigger value="pos">{t('suppliers.purchaseOrders')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('suppliers.invoices')}</TabsTrigger>
          <TabsTrigger value="pricing">{t('suppliers.pricingComparison')}</TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t('suppliers.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => openSupplierForm()}><Plus className="w-4 h-4" /> {t('suppliers.add')}</Button>
          </div>
          {filteredSuppliers.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-medium">{t('suppliers.supplierName')}</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">{t('suppliers.contactPerson')}</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">{t('common.phone')}</th>
                      <th className="text-left p-3 font-medium">{t('common.status')}</th>
                      <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map(s => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3"><p className="font-medium">{s.name}</p>{s.products && <p className="text-xs text-muted-foreground">{s.products}</p>}</td>
                        <td className="p-3 hidden sm:table-cell">{s.contact_person || '—'}</td>
                        <td className="p-3 hidden md:table-cell">{s.phone || '—'}</td>
                        <td className="p-3"><StatusBadge status={s.status} label={t(`common.${s.status}`)} /></td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openSupplierForm(s)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState icon={Truck} title={t('suppliers.noSuppliers')} />
          )}
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="pos">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowPOForm(true)}><Plus className="w-4 h-4" /> {t('suppliers.addPO')}</Button>
          </div>
          {purchaseOrders.length > 0 ? (
            <div className="space-y-3">
              {purchaseOrders.map(po => (
                <Card key={po.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold">{po.po_number}</p>
                      <p className="text-sm text-muted-foreground">{po.supplier_name} • {formatDate(po.order_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={po.status} label={t(`suppliers.status.${po.status}`)} />
                      <span className="font-semibold">{formatCurrency(po.total_amount, po.currency)}</span>
                      <Button variant="ghost" size="icon" onClick={() => deletePO(po.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {po.items?.length > 0 && (
                    <div className="mt-2 text-sm">
                      <table className="w-full">
                        <thead className="text-xs text-muted-foreground">
                          <tr>
                            <th className="text-left py-1">{t('suppliers.productName')}</th>
                            <th className="text-right py-1">{t('sales.quantity')}</th>
                            <th className="text-right py-1">{t('suppliers.unitPrice')}</th>
                            <th className="text-right py-1">{t('sales.total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items.map((item, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="py-1">{item.name}</td>
                              <td className="text-right py-1">{item.quantity}</td>
                              <td className="text-right py-1">{formatCurrency(item.unit_price)}</td>
                              <td className="text-right py-1">{formatCurrency(item.quantity * item.unit_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingCart} title={t('suppliers.noPOs')} />
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowInvoiceForm(true)}><Plus className="w-4 h-4" /> {t('suppliers.addInvoice')}</Button>
          </div>
          {supplierInvoices.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-medium">{t('suppliers.invoiceNumber')}</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">{t('suppliers.supplierName')}</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">{t('suppliers.invoiceDate')}</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">{t('suppliers.dueDate')}</th>
                      <th className="text-right p-3 font-medium">{t('suppliers.amount')}</th>
                      <th className="text-left p-3 font-medium">{t('suppliers.paymentStatus')}</th>
                      <th className="text-right p-3 font-medium">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierInvoices.map(si => (
                      <tr key={si.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">{si.invoice_number}</td>
                        <td className="p-3 hidden sm:table-cell">{si.supplier_name || '—'}</td>
                        <td className="p-3 hidden md:table-cell">{formatDate(si.invoice_date)}</td>
                        <td className="p-3 hidden md:table-cell">{formatDate(si.due_date)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(si.amount, si.currency)}</td>
                        <td className="p-3"><StatusBadge status={si.payment_status} label={t(`sales.${si.payment_status}`)} /></td>
                        <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => deleteInvoice(si.id)}><Trash2 className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState icon={FileText} title={t('suppliers.noInvoices')} />
          )}
        </TabsContent>

        {/* Pricing Comparison Tab */}
        <TabsContent value="pricing">
          {Object.keys(pricingData).length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-medium">{t('suppliers.productName')}</th>
                      <th className="text-left p-3 font-medium">{t('suppliers.supplierName')}</th>
                      <th className="text-right p-3 font-medium">{t('suppliers.unitPrice')}</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">{t('suppliers.poNumber')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pricingData).map(([product, entries]) => {
                      const minPrice = Math.min(...entries.map(e => e.price));
                      return entries.map((entry, i) => (
                        <tr key={`${product}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                          {i === 0 && <td className="p-3 font-medium align-top" rowSpan={entries.length}>{product}</td>}
                          <td className="p-3">{entry.supplier}</td>
                          <td className={`p-3 text-right font-medium ${entry.price === minPrice ? 'text-emerald-600' : ''}`}>{formatCurrency(entry.price)}</td>
                          <td className="p-3 hidden sm:table-cell text-muted-foreground">{entry.po_number}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState icon={BarChart3} title={t('suppliers.noPricing')} />
          )}
        </TabsContent>
      </Tabs>

      {/* Supplier Form Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplier ? t('suppliers.edit') : t('suppliers.add')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('suppliers.supplierName')} *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div><Label>{t('suppliers.contactPerson')}</Label><Input value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.email')}</Label><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
              <div><Label>{t('common.phone')}</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} /></div>
            <div><Label>{t('suppliers.productName')}</Label><Input placeholder="e.g. Electronics, Furniture" value={supplierForm.products} onChange={(e) => setSupplierForm({ ...supplierForm, products: e.target.value })} /></div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={supplierForm.status} onValueChange={(v) => setSupplierForm({ ...supplierForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveSupplier}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Form Dialog */}
      <Dialog open={showPOForm} onOpenChange={setShowPOForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('suppliers.addPO')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('suppliers.poNumber')} *</Label><Input value={poForm.po_number} onChange={(e) => setPoForm({ ...poForm, po_number: e.target.value })} /></div>
              <div>
                <Label>{t('suppliers.supplierName')} *</Label>
                <Select value={poForm.supplier_id} onValueChange={(v) => setPoForm({ ...poForm, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('suppliers.supplierName')} /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('suppliers.orderDate')}</Label><Input type="date" value={poForm.order_date} onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })} /></div>
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={poForm.status} onValueChange={(v) => setPoForm({ ...poForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('suppliers.status.draft')}</SelectItem>
                    <SelectItem value="ordered">{t('suppliers.status.ordered')}</SelectItem>
                    <SelectItem value="received">{t('suppliers.status.received')}</SelectItem>
                    <SelectItem value="cancelled">{t('suppliers.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('sales.items')}</Label>
              {poForm.items.length > 0 && (
                <div className="space-y-1">
                  {poForm.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{item.name}</span>
                      <span className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</span>
                      <span className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePOItem(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder={t('suppliers.productName')} value={poItem.name} onChange={(e) => setPoItem({ ...poItem, name: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="Qty" value={poItem.quantity} onChange={(e) => setPoItem({ ...poItem, quantity: Number(e.target.value) })} className="w-20" />
                <Input type="number" placeholder={t('suppliers.unitPrice')} value={poItem.unit_price} onChange={(e) => setPoItem({ ...poItem, unit_price: Number(e.target.value) })} className="w-28" />
                <Button onClick={addPOItem} size="icon"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>{t('suppliers.totalAmount')}</span>
              <span>{formatCurrency(poTotal)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPOForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={savePO}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Form Dialog */}
      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('suppliers.addInvoice')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('suppliers.invoiceNumber')} *</Label><Input value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} /></div>
              <div>
                <Label>{t('suppliers.supplierName')} *</Label>
                <Select value={invoiceForm.supplier_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('suppliers.supplierName')} /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('suppliers.invoiceDate')}</Label><Input type="date" value={invoiceForm.invoice_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} /></div>
              <div><Label>{t('suppliers.dueDate')}</Label><Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('suppliers.amount')} *</Label><Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} /></div>
              <div>
                <Label>{t('suppliers.paymentStatus')}</Label>
                <Select value={invoiceForm.payment_status} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">{t('sales.unpaid')}</SelectItem>
                    <SelectItem value="partial">{t('sales.partial')}</SelectItem>
                    <SelectItem value="paid">{t('sales.paid')}</SelectItem>
                    <SelectItem value="overdue">{t('sales.overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveInvoice}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}