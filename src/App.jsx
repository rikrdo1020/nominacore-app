import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Employees from './pages/Employees';
import RateRules from './pages/RateRules';
import WorkRecords from './pages/WorkRecords';
import Deductions from './pages/Deductions';
import PayrollReport from './pages/PayrollReport';
import './App.css';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header">
          <h2>Valentini</h2>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <ul className="nav-list">
          <li><NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>Empleados</NavLink></li>
          <li><NavLink to="/rates" className={({ isActive }) => isActive ? 'active' : ''}>Tarifas</NavLink></li>
          <li><NavLink to="/records" className={({ isActive }) => isActive ? 'active' : ''}>Registro de Horas</NavLink></li>
          <li><NavLink to="/deductions" className={({ isActive }) => isActive ? 'active' : ''}>Descuentos</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Reporte de Pago</NavLink></li>
        </ul>
        <div className="sidebar-footer">
          <span className="mode-badge">Servidor Local</span>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/rates" element={<RateRules />} />
          <Route path="/records" element={<WorkRecords />} />
          <Route path="/deductions" element={<Deductions />} />
          <Route path="/reports" element={<PayrollReport />} />
        </Routes>
      </main>
    </div>
  );
}
