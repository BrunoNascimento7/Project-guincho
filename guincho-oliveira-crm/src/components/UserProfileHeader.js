import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './UserProfileHeader.css';

function UserProfileHeader({ user, onLogout, onThemeUpdate }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    if (!user) {
        return <div className="user-profile-header-loading">A carregar...</div>;
    }

    const handleThemeToggle = async () => {
        const newTheme = user.tema === 'light' ? 'dark' : 'light';
        try {
            const token = localStorage.getItem('token');
            await api.put('/usuarios/me/tema', { tema: newTheme }, { headers: { 'Authorization': `Bearer ${token}` } });
            onThemeUpdate(newTheme);
        } catch (error) {
            console.error("Erro ao guardar o tema", error);
        }
    };

    const getInitials = (name) => {
        if (!name) return '';
        const names = name.split(' ');
        const initials = names.map(n => n[0]).join('');
        return initials.slice(0, 2).toUpperCase();
    }

    return (
        <div className="user-profile-header-container">
            <div className="user-profile-header" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <img
                    src={user.foto_perfil || `https://ui-avatars.com/api/?name=${getInitials(user.nome)}&background=101C5D&color=fff&bold=true`}
                    alt="Foto do Perfil"
                    className="profile-avatar"
                />
                <span className="profile-name">{user.nome}</span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </div>

            {isDropdownOpen && (
                <div className="profile-dropdown" ref={dropdownRef}>
                    <div className="dropdown-header">
                        <strong>{user.nome}</strong>
                        <span className="user-profile-role">{user.perfil}</span>
                    </div>
                    <hr className="dropdown-divider" />
                    <div className="dropdown-item theme-toggle">
                        <span>Modo Escuro</span>
                        <label className="theme-toggle-switch">
                            <input type="checkbox" checked={user.tema === 'dark'} onChange={handleThemeToggle} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <hr className="dropdown-divider" />
                    {/* CORREÇÃO: O botão Sair é um elemento separado, para evitar conflitos de estilo */}
                    <div className="logout-button-wrapper">
                        <div className="logout-button" onClick={onLogout}>
                            Sair
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserProfileHeader;