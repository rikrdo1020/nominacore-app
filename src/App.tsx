import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Employees from './pages/Employees';
import RateRules from './pages/RateRules';
import EmployeeRates from './pages/EmployeeRates';
import WorkRecords from './pages/WorkRecords';
import WorkRecordsBulkUpload from './pages/WorkRecordsBulkUpload';
import Deductions from './pages/Deductions';
import DeductionsBulkUpload from './pages/DeductionsBulkUpload';
import PayrollReport from './pages/PayrollReport';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Users from './pages/Users';
import UpdateNotification from './components/UpdateNotification';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { version } from '../package.json';
import './App.css';

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/employees" replace />;
  return <Login />;
}

function ChangePasswordRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <ChangePassword />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

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
            <li><NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>Empleados</NavLink></li>
            <li><NavLink to="/rates" className={({ isActive }) => isActive ? 'active' : ''}>Tarifas Generales</NavLink></li>
            <li><NavLink to="/employee-rates" className={({ isActive }) => isActive ? 'active' : ''}>Tarifas por Empleado</NavLink></li>
            <li><NavLink to="/records" className={({ isActive }) => isActive ? 'active' : ''}>Registro de Horas</NavLink></li>
            <li><NavLink to="/deductions" className={({ isActive }) => isActive ? 'active' : ''}>Descuentos</NavLink></li>
            <li><NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Reporte de Pago</NavLink></li>
            {user?.role === 'SUPER_ADMIN' && (
              <li><NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>Usuarios</NavLink></li>
            )}
          </ul>

          <div className="sidebar-footer">
            {sidebarOpen ? (
              <div className="sidebar-user">
                <span className="sidebar-user-name" title={user?.username}>{user?.username}</span>
                <button className="btn btn-secondary btn-sm" onClick={logout}>Salir</button>
              </div>
            ) : (
              <button className="toggle-btn" onClick={logout} title="Cerrar sesión">⎋</button>
            )}
          </div>

          <div style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10, color: '#2e3252', userSelect: 'none' }}>
            {sidebarOpen ? `v${version}` : ''}
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/employees" replace />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/rates" element={<RateRules />} />
            <Route path="/employee-rates" element={<EmployeeRates />} />
            <Route path="/records" element={<WorkRecords />} />
            <Route path="/records/bulk-upload" element={<WorkRecordsBulkUpload />} />
            <Route path="/deductions" element={<Deductions />} />
            <Route path="/deductions/bulk-upload" element={<DeductionsBulkUpload />} />
            <Route path="/reports" element={<PayrollReport />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute superAdminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/change-password" element={<ChangePasswordRoute />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
