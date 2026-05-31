import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Employees from './pages/Employees';
import RateRules from './pages/RateRules';
import EmployeeRates from './pages/EmployeeRates';
import WorkRecords from './pages/WorkRecords';
import Deductions from './pages/Deductions';
import PayrollReport from './pages/PayrollReport';
import Login from './pages/Login';
import Users from './pages/Users';
import UpdateNotification from './components/UpdateNotification';
import './App.css';

const employeeRoutes = ['/employees', '/employee-rates', '/records', '/deductions', '/reports'];

function SidebarItem({
  to,
  children,
  end,
}: {
  to: string;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <li>
      <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
        {children}
      </NavLink>
    </li>
  );
}

function SidebarGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isActiveGroup = employeeRoutes.some((r) => location.pathname.startsWith(r));
  const [open, setOpen] = useState(defaultOpen || isActiveGroup);

  // Keep open if navigating inside group
  useEffect(() => {
    if (isActiveGroup && !open) setOpen(true);
  }, [isActiveGroup, open]);

  return (
    <li className="nav-group">
      <button
        type="button"
        className={`nav-group-toggle ${isActiveGroup ? 'active-group' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span className={`nav-chevron ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && <ul className="nav-sublist">{children}</ul>}
    </li>
  );
}

export default function App() {
  const { user, isLoading, isAuthenticated, restoreSession, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-spinner-wrap">
          <span
            className="spinner"
            style={{
              width: 32,
              height: 32,
              borderWidth: 3,
              borderTopColor: '#0f3460',
              borderColor: 'rgba(15,52,96,0.2)',
            }}
          />
          <p style={{ marginTop: 12, color: '#666' }}>Iniciando…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <UpdateNotification />
        <Login />
      </>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <UpdateNotification />
      <div className="app-layout">
        <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-header">
            <h2>NominaCore</h2>
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          <ul className="nav-list">
            <SidebarGroup title="Empleados" defaultOpen>
              <SidebarItem to="/employees">Lista de Empleados</SidebarItem>
              <SidebarItem to="/employee-rates">Tarifas por Empleado</SidebarItem>
              <SidebarItem to="/records">Registro de Horas</SidebarItem>
              <SidebarItem to="/deductions">Descuentos</SidebarItem>
              <SidebarItem to="/reports">Reporte de Pago</SidebarItem>
            </SidebarGroup>

            <SidebarItem to="/rates">Tarifas Generales</SidebarItem>

            {isAdmin && <SidebarItem to="/users">Usuarios</SidebarItem>}
          </ul>
          <div className="sidebar-footer">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span style={{ color: '#888', fontSize: 12 }}>v{window.api.appVersion}</span>
              <button className="btn btn-sm btn-secondary" onClick={logout} title="Cerrar sesión">
                Salir
              </button>
            </div>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/employees" replace />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/rates" element={<RateRules />} />
            <Route path="/employee-rates" element={<EmployeeRates />} />
            <Route path="/records" element={<WorkRecords />} />
            <Route path="/deductions" element={<Deductions />} />
            <Route path="/reports" element={<PayrollReport />} />
            {isAdmin ? (
              <Route path="/users" element={<Users />} />
            ) : (
              <Route path="/users" element={<Navigate to="/employees" replace />} />
            )}
          </Routes>
        </main>
      </div>
    </>
  );
}
