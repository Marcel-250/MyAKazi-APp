import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Card, PageHeader, formatDateTime, EmptyState } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';

const eventTypeColors = {
  meeting: 'bg-blue-500',
  appointment: 'bg-purple-500',
  reminder: 'bg-amber-500',
  task: 'bg-emerald-500',
  payment_due: 'bg-red-500',
  deadline: 'bg-red-600',
  milestone: 'bg-indigo-500',
};

export default function Schedule() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', event_type: 'meeting', start_time: '', end_time: '', location: '', attendees: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [evts, tks, projs] = await Promise.all([
        base44.entities.ScheduleEvent.list('-created_date', 200),
        base44.entities.Task.list('-created_date', 200),
        base44.entities.Project.list('-created_date', 100),
      ]);
      setEvents(evts);
      setTasks(tks);
      setProjects(projs);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allEvents = [
    ...events.map(e => ({
      ...e,
      date: e.start_time ? new Date(e.start_time) : null,
      kind: 'event',
      color: eventTypeColors[e.event_type] || 'bg-slate-500',
    })),
    ...tasks.filter(t => t.due_date).map(t => ({
      ...t,
      date: new Date(t.due_date),
      kind: 'task',
      title: t.title,
      event_type: 'task',
      color: eventTypeColors.task,
    })),
    ...projects.filter(p => p.end_date).map(p => ({
      ...p,
      date: new Date(p.end_date),
      kind: p.status === 'completed' ? 'milestone' : 'deadline',
      title: `${p.title} - ${p.status === 'completed' ? t('schedule.milestones') : t('schedule.deadlines')}`,
      event_type: p.status === 'completed' ? 'milestone' : 'deadline',
      color: p.status === 'completed' ? eventTypeColors.milestone : eventTypeColors.deadline,
    })),
  ];

  const eventsByDay = {};
  allEvents.forEach(e => {
    if (!e.date) return;
    const key = format(e.date, 'yyyy-MM-dd');
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcoming = allEvents
    .filter(e => e.date && e.date >= today && e.date <= nextWeek)
    .sort((a, b) => a.date - b.date)
    .slice(0, 10);

  const openForm = (date) => {
    const dateStr = format(date, "yyyy-MM-dd'T'HH:mm");
    setSelectedDate(date);
    setForm({ title: '', description: '', event_type: 'meeting', start_time: dateStr, end_time: '', location: '', attendees: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_time) return;
    try {
      const attendees = form.attendees ? form.attendees.split(',').map(a => a.trim()).filter(Boolean) : [];
      await base44.entities.ScheduleEvent.create({
        title: form.title,
        description: form.description,
        event_type: form.event_type,
        start_time: form.start_time,
        end_time: form.end_time || undefined,
        location: form.location,
        attendees,
        status: 'scheduled',
      });
      setShowForm(false);
      loadData();
    } catch (err) { console.error('Save error:', err); }
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
      <PageHeader title={t('schedule.title')} subtitle={t('schedule.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>{t('schedule.today')}</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay[dayKey] || [];
                const inMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={idx}
                    onClick={() => openForm(day)}
                    className={`min-h-[60px] sm:min-h-[80px] p-1 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      inMonth ? 'border-border bg-card' : 'border-transparent bg-muted/20'
                    } ${isTodayDate ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-xs text-right mb-1 ${isTodayDate ? 'font-bold text-primary' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={`text-[10px] sm:text-xs truncate px-1 py-0.5 rounded text-white ${e.color}`} title={e.title}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {[
                { color: 'bg-blue-500', label: t('schedule.type.meeting') },
                { color: 'bg-purple-500', label: t('schedule.type.appointment') },
                { color: 'bg-emerald-500', label: t('schedule.type.task') },
                { color: 'bg-amber-500', label: t('schedule.type.reminder') },
                { color: 'bg-red-600', label: t('schedule.deadlines') },
                { color: 'bg-indigo-500', label: t('schedule.milestones') },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> {t('schedule.upcoming')}
            </h3>
            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${e.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {formatDateTime(e.date)}
                      </div>
                      {e.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {e.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarDays} title={t('schedule.noEventsThisMonth')} />
            )}
          </Card>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate ? format(selectedDate, 'MMM d, yyyy') : t('schedule.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.title')} *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>{t('schedule.eventType')}</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">{t('schedule.type.meeting')}</SelectItem>
                  <SelectItem value="appointment">{t('schedule.type.appointment')}</SelectItem>
                  <SelectItem value="reminder">{t('schedule.type.reminder')}</SelectItem>
                  <SelectItem value="task">{t('schedule.type.task')}</SelectItem>
                  <SelectItem value="payment_due">{t('schedule.type.paymentDue')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('schedule.startTime')} *</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>{t('schedule.endTime')}</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div><Label>{t('schedule.location')}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>{t('schedule.attendees')}</Label><Input placeholder="Comma separated" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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