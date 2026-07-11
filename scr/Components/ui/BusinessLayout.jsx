import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderKanban,
  Users,
  LogOut,
  Menu,
  X,
  Building2,
  Contact,
  Truck,
  Wallet,
  FileText,
  CalendarDays,
  Banknote,
  Clock,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { path: '/inventory', icon: Package, key: 'nav.inventory' },
  { path: '/sales', icon: ShoppingCart, key: 'nav.sales' },
  { path: '/projects', icon: FolderKanban, key: 'nav.projects' },
  { path: '/employees', icon: Users, key: 'nav.employees' },
  { path: '/customers', icon: Contact, key: 'nav.customers' },
  { path: '/suppliers', icon: Truck, key: 'nav.suppliers' },
  { path: '/financial-reports', icon: Wallet, key: 'nav.financialReports' },
  { path: '/documents', icon: FileText, key: 'nav.documents' },
  { path: '/schedule', icon: CalendarDays, key: 'nav.schedule' },
  { path: '/payroll', icon: Banknote, key: 'nav.payroll' },
  { path: '/attendance', icon: Clock, key: 'nav.attendance' },
  { path: '/expenses', icon: Receipt, key: 'nav.expenses' },
  { path: '/branches', icon: Building2, key: 'nav.branches' },
];

function SidebarContent({ onNavigate }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-white leading-none">MBUmurimo</h1>
            <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">{t('nav.businessPortal')}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <LanguageSwitcher variant="sidebar" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive hover:text-white transition-all w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}

export default function BusinessLayout() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 bg-sidebar flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-sidebar" >
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-heading font-bold text-primary">MBUmurimo</span>
            <div className="w-9" />
          </header>

          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <Outlet />
          </main>
        </div>
    </div>
  );
}