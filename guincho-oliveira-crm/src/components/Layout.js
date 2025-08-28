import React from 'react';
import Sidebar from './Sidebar';
import { Outlet, useOutletContext } from 'react-router-dom';
import './Layout.css';
import UserProfileHeader from './UserProfileHeader'; // 1. Importe o UserProfileHeader

export default function Layout({ user, onLogout, onOpenConfig, onThemeUpdate }) {
  return (
    <div className="layout-container">
      {/* A Sidebar continua aqui */}
      <Sidebar onLogout={onLogout} onOpenConfig={onOpenConfig} user={user} onThemeUpdate={onThemeUpdate} />
      
      <main className="main-content">
        {/* 2. O UserProfileHeader agora vive aqui, no topo de todas as páginas */}
        <UserProfileHeader user={user} onLogout={onLogout} onThemeUpdate={onThemeUpdate} />
        
        {/* 3. O Outlet vai renderizar o conteúdo da página (Dashboard, Clientes, etc.) e passar os dados do usuário para eles */}
        <Outlet context={{ user, onLogout, onThemeUpdate }} /> 
      </main>
    </div>
  );
}