import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, formatDate, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Search, Trash2, Download, Upload, Paperclip, Receipt, File } from 'lucide-react';

const typeIcons = {
  contract: FileText,
  receipt: Receipt,
  invoice: FileText,
  report: FileText,
  other: File,
};

export default function Documents() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', document_type: 'other', file_url: '', attached_to_type: '', attached_to_id: '', tags: [] });
  const [tagInput, setTagInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, projs, custs] = await Promise.all([
        base44.entities.Document.list('-created_date', 200),
        base44.entities.Project.list('-created_date', 100),
        base44.entities.Customer.list('-created_date', 100),
      ]);
      setDocuments(docs);
      setProjects(projs);
      setCustomers(custs);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = documents.filter(d => {
    const matchesSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      (d.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || d.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, file_url }));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] });
    setTagInput('');
  };

  const removeTag = (idx) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.title) return;
    try {
      await base44.entities.Document.create(form);
      setShowForm(false);
      setForm({ title: '', description: '', document_type: 'other', file_url: '', attached_to_type: '', attached_to_id: '', tags: [] });
      loadData();
    } catch (err) { console.error('Save error:', err); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirm') + '?')) return;
    try { await base44.entities.Document.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const getAttachedName = (doc) => {
    if (!doc.attached_to_type || !doc.attached_to_id) return null;
    if (doc.attached_to_type === 'project') return projects.find(p => p.id === doc.attached_to_id)?.title || doc.attached_to_id;
    if (doc.attached_to_type === 'customer') return customers.find(c => c.id === doc.attached_to_id)?.name || doc.attached_to_id;
    return doc.attached_to_id;
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
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        action={<Button onClick={() => { setForm({ title: '', description: '', document_type: 'other', file_url: '', attached_to_type: '', attached_to_id: '', tags: [] }); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('documents.upload')}</Button>}
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('documents.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="contract">{t('documents.type.contract')}</SelectItem>
            <SelectItem value="receipt">{t('documents.type.receipt')}</SelectItem>
            <SelectItem value="invoice">{t('documents.type.invoice')}</SelectItem>
            <SelectItem value="report">{t('documents.type.report')}</SelectItem>
            <SelectItem value="other">{t('documents.type.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const Icon = typeIcons[doc.document_type] || File;
            const attachedName = getAttachedName(doc);
            return (
              <Card key={doc.id} className="p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <StatusBadge status={doc.document_type} label={t(`documents.type.${doc.document_type}`)} />
                  </div>
                </div>
                {doc.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>}
                {attachedName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Paperclip className="w-3 h-3" /> {attachedName}
                  </p>
                )}
                {doc.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>
                  <div className="flex gap-1">
                    {doc.file_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} title={t('documents.noDocuments')} />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('documents.upload')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.title')} *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>{t('common.description')}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>{t('documents.documentType')}</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">{t('documents.type.contract')}</SelectItem>
                  <SelectItem value="receipt">{t('documents.type.receipt')}</SelectItem>
                  <SelectItem value="invoice">{t('documents.type.invoice')}</SelectItem>
                  <SelectItem value="report">{t('documents.type.report')}</SelectItem>
                  <SelectItem value="other">{t('documents.type.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('documents.file')}</Label>
              {form.file_url ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <File className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{form.file_url.split('/').pop()}</span>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, file_url: '' })}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex flex-col items-center gap-2">
                      {uploading ? (
                        <><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /><span className="text-xs text-muted-foreground">{t('documents.uploading')}</span></>
                      ) : (
                        <><Upload className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground">{t('documents.uploadFile')}</span></>
                      )}
                    </div>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0])} disabled={uploading} />
                  </label>
                </div>
              )}
            </div>
            <div>
              <Label>{t('documents.attachedToType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.attached_to_type} onValueChange={(v) => setForm({ ...form, attached_to_type: v, attached_to_id: '' })}>
                  <SelectTrigger><SelectValue placeholder={t('common.none')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">{t('documents.attachToProject')}</SelectItem>
                    <SelectItem value="customer">{t('documents.attachToCustomer')}</SelectItem>
                  </SelectContent>
                </Select>
                {form.attached_to_type && (
                  <Select value={form.attached_to_id} onValueChange={(v) => setForm({ ...form, attached_to_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {form.attached_to_type === 'project'
                        ? projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)
                        : customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <Label>{t('documents.tags')}</Label>
              <div className="flex gap-2">
                <Input placeholder={t('documents.tagsPlaceholder')} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                <Button onClick={addTag} size="icon"><Plus className="w-4 h-4" /></Button>
              </div>
              {form.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(i)} className="text-muted-foreground hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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