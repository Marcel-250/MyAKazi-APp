import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, EmptyState, formatCurrency } from '@/lib/ui';
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
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

export default function Inventory() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'RWF',
    category: '',
    stock_quantity: '',
    low_stock_threshold: '5',
    sku: '',
    barcode: '',
    image_url: '',
    status: 'active',
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Product.list('-created_date', 200);
      setProducts(data);
    } catch (err) {
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    stockValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_quantity || 0)), 0),
    lowStock: products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0 && p.status === 'active').length,
    outOfStock: products.filter(p => p.stock_quantity === 0 && p.status === 'active').length,
  };

  const openAdd = () => {
    setEditingProduct(null);
    setForm({
      name: '', description: '', price: '', currency: 'RWF', category: '',
      stock_quantity: '', low_stock_threshold: '5', sku: '', barcode: '', image_url: '', status: 'active',
    });
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      currency: product.currency || 'RWF',
      category: product.category || '',
      stock_quantity: product.stock_quantity?.toString() || '',
      low_stock_threshold: product.low_stock_threshold?.toString() || '5',
      sku: product.sku || '',
      barcode: product.barcode || '',
      image_url: product.image_url || '',
      status: product.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      };
      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, payload);
      } else {
        await base44.entities.Product.create(payload);
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      console.error('Save product error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('inventory.confirmDelete'))) return;
    try {
      await base44.entities.Product.delete(id);
      loadProducts();
    } catch (err) {
      console.error('Delete product error:', err);
    }
  };

  const getStockStatus = (p) => {
    if (p.stock_quantity === 0) return 'outOfStock';
    if (p.stock_quantity <= (p.low_stock_threshold || 5)) return 'lowStock';
    return 'inStock';
  };

  const statCards = [
    { label: t('inventory.totalProducts'), value: stats.total, icon: Boxes, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: t('inventory.totalStockValue'), value: formatCurrency(stats.stockValue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t('inventory.lowStockItems'), value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: t('inventory.outOfStockItems'), value: stats.outOfStock, icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        action={
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('inventory.add')}
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

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inventory.searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('inventory.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('customer.allCategories')}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title={t('inventory.noProducts')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('inventory.productName')}</th>
                  <th className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">{t('inventory.sku')}</th>
                  <th className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">{t('inventory.category')}</th>
                  <th className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('inventory.price')}</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('inventory.stockLevel')}</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('common.status')}</th>
                  <th className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            {product.barcode && <p className="text-xs text-muted-foreground">{product.barcode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground font-mono">{product.sku || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{product.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(product.price, product.currency)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${
                          stockStatus === 'outOfStock' ? 'text-red-600' :
                          stockStatus === 'lowStock' ? 'text-amber-600' : 'text-foreground'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge
                          status={stockStatus === 'outOfStock' ? 'overdue' : stockStatus === 'lowStock' ? 'partial' : 'paid'}
                          label={t(`inventory.${stockStatus}`)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t('inventory.edit') : t('inventory.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('inventory.productName')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <Label>{t('common.description')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('inventory.price')} *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
              </div>
              <div>
                <Label>{t('inventory.category')}</Label>
                <Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('inventory.stockLevel')}</Label>
                <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({...form, stock_quantity: e.target.value})} />
              </div>
              <div>
                <Label>{t('inventory.lowStockThreshold')}</Label>
                <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({...form, low_stock_threshold: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('inventory.sku')}</Label>
                <Input value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} />
              </div>
              <div>
                <Label>{t('inventory.barcode')}</Label>
                <Input value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.price}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}