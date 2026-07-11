import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import BusinessLayout from '@/components/BusinessLayout';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Sales from '@/pages/Sales';
import Projects from '@/pages/Projects';
import Employees from '@/pages/Employees';
import Customers from '@/pages/Customers';
import Suppliers from '@/pages/Suppliers';
import FinancialReports from '@/pages/FinancialReports';
import Documents from '@/pages/Documents';
import Schedule from '@/pages/Schedule';
import Payroll from '@/pages/Payroll';
import Attendance from '@/pages/Attendance';
import Expenses from '@/pages/Expenses';
import Branches from '@/pages/Branches';
// Add page imports here

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route element={<BusinessLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/financial-reports" element={<FinancialReports />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/branches" element={<Branches />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App