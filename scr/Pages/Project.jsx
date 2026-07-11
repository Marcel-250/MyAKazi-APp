import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, StatusBadge, EmptyState, formatDate } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function Projects() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: '',
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    due_date: '',
    status: 'todo',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsData, tasksData] = await Promise.all([
        base44.entities.Project.list('-created_date', 100),
        base44.entities.Task.list('-created_date', 200),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Load projects error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setForm({
      title: '', description: '', status: 'planning', priority: 'medium',
      start_date: new Date().toISOString().split('T')[0], end_date: '', budget: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : 0,
        progress: 0,
      };
      await base44.entities.Project.create(payload);
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Save project error:', err);
    } finally {
      setSaving(false);
    }
  };

  const openAddTask = (projectId, projectTitle) => {
    setTaskForm({
      title: '', description: '', project_id: projectId, project_title: projectTitle,
      priority: 'medium', due_date: '', status: 'todo',
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title || !taskForm.project_id) return;
    setSaving(true);
    try {
      const project = projects.find(p => p.id === taskForm.project_id);
      await base44.entities.Task.create({
        ...taskForm,
        project_title: project?.title || '',
      });
      setTaskModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Save task error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    try {
      await base44.entities.Task.update(task.id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const updateProjectProgress = async (projectId) => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    if (projectTasks.length === 0) return;
    const doneCount = projectTasks.filter(t => t.status === 'done').length;
    const progress = Math.round((doneCount / projectTasks.length) * 100);
    try {
      await base44.entities.Project.update(projectId, {
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'planning',
      });
      loadData();
    } catch (err) {
      console.error('Update progress error:', err);
    }
  };

  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length,
  };

  const statCards = [
    { label: t('projects.title'), value: stats.total, icon: FolderKanban, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: t('projects.status.in_progress'), value: stats.inProgress, icon: Clock, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { label: t('projects.status.planning'), value: stats.planning, icon: AlertCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: t('projects.status.completed'), value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        action={
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('projects.add')}
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

      {/* Projects */}
      {loading ? (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          </div>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={FolderKanban} title={t('projects.noProjects')} />
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            const daysLeft = getDaysLeft(project.end_date);
            const isExpanded = expandedProject === project.id;
            return (
              <Card key={project.id} className="overflow-hidden">
                <div
                  className="p-4 sm:p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button className="mt-1 text-muted-foreground flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-semibold text-foreground">{project.title}</h3>
                          <StatusBadge status={project.status} label={t(`projects.status.${project.status}`)} />
                          <StatusBadge status={project.priority} label={t(`projects.priority.${project.priority}`)} />
                        </div>
                        {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(project.start_date)} → {formatDate(project.end_date)}
                          </span>
                          {daysLeft !== null && (
                            <span className={`font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : ''}`}>
                              {daysLeft < 0 ? t('projects.overdue') : `${daysLeft} ${t('projects.daysLeft')}`}
                            </span>
                          )}
                          <span>{projectTasks.length} {t('projects.tasks')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0 min-w-[100px]">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground">{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2 w-24" />
                    </div>
                  </div>
                </div>

                {/* Expanded: tasks */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground">{t('tasks.title')}</h4>
                      <div className="flex gap-2">
                        {projectTasks.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => updateProjectProgress(project.id)}>
                            {t('projects.progress')}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openAddTask(project.id, project.title)}>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          {t('tasks.add')}
                        </Button>
                      </div>
                    </div>
                    {projectTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">{t('tasks.noTasks')}</p>
                    ) : (
                      <div className="space-y-2">
                        {projectTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 p-2.5 bg-card rounded-lg border border-border">
                            <button onClick={() => toggleTaskStatus(task)} className="flex-shrink-0">
                              {task.status === 'done' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : task.status === 'in_progress' ? (
                                <Clock className="w-5 h-5 text-purple-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {task.title}
                              </p>
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground">{formatDate(task.due_date)}</p>
                              )}
                            </div>
                            <StatusBadge status={task.status} label={t(`tasks.status.${task.status}`)} />
                            <StatusBadge status={task.priority} label={t(`projects.priority.${task.priority}`)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Project modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('projects.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('projects.projectName')} *</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <Label>{t('common.description')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{t('projects.status.planning')}</SelectItem>
                    <SelectItem value="in_progress">{t('projects.status.in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('projects.status.completed')}</SelectItem>
                    <SelectItem value="on_hold">{t('projects.status.on_hold')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('projects.priority')}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('projects.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('projects.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('projects.priority.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('projects.startDate')}</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
              </div>
              <div>
                <Label>{t('projects.endDate')}</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>{t('projects.budget')}</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('tasks.taskTitle')} *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} />
            </div>
            <div>
              <Label>{t('common.description')}</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('projects.priority')}</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({...taskForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('projects.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('projects.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('projects.priority.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('tasks.dueDate')}</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveTask} disabled={saving || !taskForm.title}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}