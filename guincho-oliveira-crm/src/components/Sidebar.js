import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { useAuth } from '../hooks/useAuth';
import logo from '../logo_guincho.png';

// Importe os ícones que você precisa
import { 
    FaTachometerAlt, FaList, FaCalendarAlt, FaDollarSign, 
    FaCalculator, FaFileAlt, FaUsers, FaTools 
} from 'react-icons/fa';

export default function Sidebar({ onLogout, onOpenConfig }) {
    const navigate = useNavigate();
    const { perfil } = useAuth();
    
    // NOVO: Estado para controlar se a sidebar está recolhida/expandida (efeito de hover)
    const [isCollapsed, setIsCollapsed] = useState(true);

    // NOVO: Estado para controlar qual dropdown está aberto (efeito de clique)
    const [dropdownOpen, setDropdownOpen] = useState(null);

    // NOVO: Função para alternar o dropdown aberto
    const toggleDropdown = (menuName) => {
        setDropdownOpen(dropdownOpen === menuName ? null : menuName);
    };

    const permissoes = {
        '/financeiro/transacoes': ['admin_geral', 'admin', 'financeiro'],
        '/relatorios': ['admin_geral', 'admin', 'operacional'],
        '/usuarios': ['admin_geral', 'admin'],
        '/logs': ['admin_geral', 'admin']
    };

    const temPermissao = (path) => {
        if (!perfil) return false;
        if (!permissoes[path]) return true;
        return permissoes[path].includes(perfil);
    };

    const menuItems = [
        { path: "/", label: "Dashboard", icon: <FaTachometerAlt />, name: 'dashboard' },
        { 
            label: "Cadastro", 
            icon: <FaList />,
            name: 'cadastro',
            isDropdown: true,
            dropdownItems: [
                { path: "/clientes", label: "Clientes" },
                { path: "/motoristas", label: "Motoristas" },
                { path: "/veiculos", label: "Veículos" }
            ]
        },
        { 
            label: "Agenda de Serviços", 
            icon: <FaCalendarAlt />,
            name: 'agenda',
            isDropdown: true,
            dropdownItems: [
                { path: "/ordens/cadastro", label: "Cadastro de Ordens" },
                { path: "/minhas-ordens", label: "Minhas Ordens" },
                { path: "/ordens/fila", label: "Fila de Ordens" }
            ]
        },
        { 
            label: "Controle Financeiro", 
            icon: <FaDollarSign />,
            name: 'financeiro',
            isDropdown: true,
            permissionPath: '/financeiro/transacoes',
            dropdownItems: [
                { path: "/financeiro/transacoes", label: "Transações" },
                { path: "/financeiro/pagamentos", label: "Pagamentos" },
                { path: "/financeiro/relatorios", label: "Relatórios Financeiros" }
            ]
        },
        { path: "/simulador", label: "Simulador", icon: <FaCalculator />, name: 'simulador' },
        { path: "/relatorios", label: "Relatórios", icon: <FaFileAlt />, permissionPath: '/relatorios', name: 'relatorios' },
        { path: "/usuarios", label: "Gerenciar Usuários", icon: <FaUsers />, permissionPath: '/usuarios', name: 'usuarios' },
        { path: "/logs", label: "Controle de Logs", icon: <FaTools />, permissionPath: '/logs', name: 'logs' }
    ];

    return (
        <div 
            className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}
            onMouseEnter={() => setIsCollapsed(false)}
            onMouseLeave={() => setIsCollapsed(true)}
        >
            <div className="sidebar-header" onClick={onOpenConfig}>
                <img src={logo} alt="Guincho Gilson Oliveira" className={`sidebar-logo ${isCollapsed ? 'collapsed' : 'expanded'}`} />
            </div>
            <ul className="sidebar-menu">
                {menuItems.map((item, index) => {
                    const hasPermission = !item.permissionPath || temPermissao(item.permissionPath);
                    if (!hasPermission) return null;

                    if (item.isDropdown) {
                        return (
                            <li key={index} className="dropdown-container">
                                {/* NOVO: Adiciona o onClick para alternar o dropdown */}
                                <span className="menu-item-with-icon" onClick={() => toggleDropdown(item.name)}>
                                    <span className="menu-icon">{item.icon}</span>
                                    {!isCollapsed && <span className="menu-label">{item.label}</span>}
                                </span>
                                {/* NOVO: Exibe o dropdown apenas se o nome do menu for o que está no estado */}
                                {dropdownOpen === item.name && (
                                    <ul className="dropdown-menu">
                                        {item.dropdownItems.map((subItem, subIndex) => (
                                            <li key={subIndex}>
                                                <Link to={subItem.path}>{subItem.label}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    } else {
                        return (
                            <li key={index}>
                                <Link to={item.path} className="menu-item-with-icon">
                                    <span className="menu-icon">{item.icon}</span>
                                    {!isCollapsed && <span className="menu-label">{item.label}</span>}
                                </Link>
                            </li>
                        );
                    }
                })}
            </ul>
        </div>
    );
}