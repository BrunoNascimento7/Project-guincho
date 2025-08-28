import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';

// Importação dos seus componentes
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Motoristas from './components/Motoristas';
import Veiculos from './components/Veiculos';
import Financeiro from './components/Financeiro';
import Simulador from './components/Simulador';
import EmpresaConfig from './components/EmpresaConfig';
import Pagamentos from './components/Pagamentos';
import RelatoriosFinanceiros from './components/RelatoriosFinanceiros';
import Usuarios from './components/Usuarios';
import Relatorios from './components/Relatorios';
import MinhasOrdens from './components/MinhasOrdens';
import Chamado from './components/Chamado';
import FilaOrdens from './components/FilaOrdens';
import CadastroOrdens from './components/CadastroOrdens';
import ControleLogs from './components/ControleLogs';
import './DarkMode.css';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // useEffect para a validação inicial do token
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const config = { headers: { 'Authorization': `Bearer ${token}` } };
          const { data } = await api.get('/usuarios/me', config);
          setUser(data);
        } catch (error) {
          console.error("Token inválido ou expirado. A limpar sessão.");
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    validateToken();
  }, []);

  // NOVO: useEffect para a verificação periódica do token
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const config = { headers: { 'Authorization': `Bearer ${token}` } };
          // Faz uma requisição leve para verificar a validade do token
          await api.get('/usuarios/me', config);
        } catch (error) {
          // Se a requisição falhar (por um 401), desloga o usuário
          if (error.response?.status === 401) {
            console.log("Sessão invalidada por logoff forçado. Deslogando...");
            handleLogout();
          }
        }
      }
    }, 30000); // Verifica a cada 30 segundos
    return () => clearInterval(interval); // Limpa o intervalo quando o componente for desmontado
  }, [user]); // Adicionado `user` como dependência para que o useEffect seja reiniciado se o usuário mudar.

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('token', userData.token);
    setUser(userData);
  };
  
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/logout', {}, { headers: { 'Authorization': `Bearer ${token}` } });
      }
    } catch (error) {
      console.error("Erro ao registrar logout, mas deslogando localmente:", error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      document.body.classList.remove('dark-mode');
    }
  };

  const handleThemeUpdate = (newTheme) => {
    setUser(currentUser => ({ ...currentUser, tema: newTheme }));
  };

  const PERFIS = {
    GERAL: 'admin_geral',
    ADMIN: 'admin',
    FINANCEIRO: 'financeiro',
    OPERACIONAL: 'operacional'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>A carregar sistema...</h2>
      </div>
    );
  }
  
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.perfil)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  return (
    <Router>
      {isConfigModalOpen && <EmpresaConfig onClose={() => setIsConfigModalOpen(false)} />}
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/*"
          element={user ? <Layout user={user} onLogout={handleLogout} onOpenConfig={() => setIsConfigModalOpen(true)} onThemeUpdate={handleThemeUpdate} /> : <Navigate to="/login" />}
        >
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="clientes" element={<Clientes user={user} />} />
          <Route path="motoristas" element={<Motoristas user={user} />} />
          <Route path="veiculos" element={<Veiculos user={user} />} />
          <Route path="ordens/cadastro" element={<CadastroOrdens user={user} />} />
          <Route path="ordens/fila" element={<FilaOrdens user={user} />} />
          <Route path="simulador" element={<Simulador user={user} />} />
          <Route path="minhas-ordens" element={<MinhasOrdens user={user} />} />
          <Route path="chamado/:id" element={<Chamado user={user} />} />

          <Route 
            path="financeiro/transacoes" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN, PERFIS.FINANCEIRO]}>
                <Financeiro user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="financeiro/pagamentos" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN, PERFIS.FINANCEIRO]}>
                <Pagamentos user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="financeiro/relatorios" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN, PERFIS.FINANCEIRO]}>
                <RelatoriosFinanceiros user={user} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="relatorios" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN, PERFIS.OPERACIONAL]}>
                <Relatorios user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="usuarios" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN]}>
                <Usuarios user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="logs" 
            element={
              <ProtectedRoute allowedRoles={[PERFIS.GERAL, PERFIS.ADMIN]}>
                <ControleLogs onLogout={handleLogout} user={user} />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;