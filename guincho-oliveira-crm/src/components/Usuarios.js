import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Usuarios.css';
import { useAuth } from '../hooks/useAuth';
import { FaEllipsisV } from 'react-icons/fa';

// --- SUB-COMPONENTE: Modal de Edição Simples para Admin ---
function SimpleEditModal({ usuario, onClose, onUpdate }) {
    // (O código deste sub-componente continua o mesmo)
    const [editData, setEditData] = useState(usuario);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = { 
                nome: editData.nome, 
                email: editData.email, 
                perfil: editData.perfil 
            };
            await api.put(`/usuarios/${editData.id}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Usuário atualizado com sucesso!');
            onUpdate();
            onClose();
        } catch (error) {
            alert(`Erro ao atualizar usuário: ${error.response?.data?.error || 'Tente novamente.'}`);
        }
    };

    const perfisDisponiveis = {
        'operacional': 'Operacional',
        'financeiro': 'Financeiro',
        'admin': 'Administrador'
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-button">&times;</button>
                <h3>Editar Usuário</h3>
                <form onSubmit={handleUpdate}>
                    <div className="form-group"><label>Nome:</label><input type="text" name="nome" value={editData.nome} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Email:</label><input type="email" name="email" value={editData.email} onChange={handleChange} required /></div>
                    <div className="form-group">
                        <label>Perfil:</label>
                        <select name="perfil" value={editData.perfil} onChange={handleChange}>
                             {Object.entries(perfisDisponiveis).map(([valor, texto]) => (
                                 <option key={valor} value={valor}>{texto}</option>
                            ))}
                        </select>
                    </div>
                    <p className="modal-note">A senha e outros dados cadastrais não podem ser alterados aqui.</p>
                    <button type="submit" className="submit-button">Salvar Alterações</button>
                </form>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTE: Modal de Edição Avançada para Admin Geral ---
function EditModalAdminGeral({ usuarioId, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('dados');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const response = await api.get(`/usuarios/${usuarioId}`, config);
                setUserData({
                    ...response.data,
                    regras_acesso: response.data.regras_acesso || { dias: [], inicio: '08:00', fim: '18:00' }
                });
            } catch (error) {
                console.error("Erro ao buscar dados completos do usuário", error);
                alert('Falha ao carregar dados do usuário.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [usuarioId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setUserData(prev => ({ ...prev, foto_perfil: reader.result }));
            };
        }
    };

    const handleRegrasChange = (e) => {
        const { name, value } = e.target;
        // CORREÇÃO AQUI:
        setUserData(prev => ({ ...prev, regras_acesso: { ...prev.regras_acesso, [name]: value } }));
    };

    const handleDiaChange = (diaIndex) => {
        const dias = userData.regras_acesso.dias || [];
        const newDias = dias.includes(diaIndex)
            ? dias.filter(d => d !== diaIndex)
            : [...dias, diaIndex].sort();
        setUserData(prev => ({ ...prev, regras_acesso: { ...prev.regras_acesso, dias: newDias } }));
    };

    const saveDados = async () => {
        try {
            const token = localStorage.getItem('token');
            const { regras_acesso, ...dadosParaSalvar } = userData;
            await api.put(`/usuarios/${userData.id}`, dadosParaSalvar, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Dados cadastrais atualizados com sucesso!');
            onUpdate();
            onClose();
        } catch (error) {
            alert('Erro ao salvar dados cadastrais.');
            console.error(error);
        }
    };

    const saveRegras = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.put(`/usuarios/${userData.id}/regras-acesso`, { regras: userData.regras_acesso }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Regras de acesso atualizadas com sucesso!');
            onUpdate();
            onClose();
        } catch (error) {
            alert('Erro ao salvar regras de acesso.');
            console.error(error);
        }
    };
    
    const savePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }
        if (newPassword.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await api.put(`/usuarios/${userData.id}/password`, { newPassword }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Senha alterada com sucesso!');
            setNewPassword('');
            setConfirmPassword('');
            onUpdate();
            onClose();
        } catch (error) {
            alert('Erro ao alterar senha.');
            console.error(error);
        }
    };


    if (loading || !userData) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-lg">
                <button onClick={onClose} className="modal-close-button">&times;</button>
                <h3>Editando: {userData.nome}</h3>
                <div className="modal-tabs">
                    <button onClick={() => setActiveTab('dados')} className={activeTab === 'dados' ? 'active' : ''}>Dados Cadastrais</button>
                    <button onClick={() => setActiveTab('regras')} className={activeTab === 'regras' ? 'active' : ''}>Regras de Acesso</button>
                    <button onClick={() => setActiveTab('senha')} className={activeTab === 'senha' ? 'active' : ''}>Alterar Senha</button>
                </div>

                {activeTab === 'dados' && (
                    <div className="tab-content">
                        <div className="form-grid">
                            <div className="form-group"><label>Nome:</label><input type="text" name="nome" value={userData.nome} onChange={handleChange} /></div>
                            <div className="form-group"><label>Email:</label><input type="email" name="email" value={userData.email} onChange={handleChange} /></div>
                            <div className="form-group"><label>Perfil:</label><select name="perfil" value={userData.perfil} onChange={handleChange}><option value="operacional">Operacional</option><option value="financeiro">Financeiro</option><option value="admin">Administrador</option></select></div>
                            <div className="form-group"><label>Matrícula:</label><input type="text" name="matricula" value={userData.matricula || ''} onChange={handleChange} /></div>
                            <div className="form-group"><label>CPF:</label><input type="text" name="cpf" value={userData.cpf || ''} onChange={handleChange} /></div>
                            <div className="form-group"><label>Filial:</label><input type="text" name="filial" value={userData.filial || ''} onChange={handleChange} /></div>
                            <div className="form-group"><label>Cargo:</label><input type="text" name="cargo" value={userData.cargo || ''} onChange={handleChange} /></div>
                            <div className="form-group"><label>Centro de Custo:</label><input type="text" name="centroDeCusto" value={userData.centroDeCusto || ''} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Foto de Perfil:</label><input type="file" accept="image/*" onChange={handlePhotoChange} ref={fileInputRef} /></div>
                        </div>
                        <button onClick={saveDados} className="submit-button">Salvar Dados Cadastrais</button>
                    </div>
                )}

                {activeTab === 'regras' && (
                    <div className="tab-content">
                        <h4>Definir Dias e Horários de Acesso</h4>
                        <div className="dias-semana">
                            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dia, index) => (
                                <div key={dia} className="dia-checkbox">
                                    <input type="checkbox" id={`dia-${index}`} checked={userData.regras_acesso.dias.includes(index)} onChange={() => handleDiaChange(index)} />
                                    <label htmlFor={`dia-${index}`}>{dia}</label>
                                </div>
                            ))}
                        </div>
                        <div className="horarios">
                            <div className="form-group">
                                <label>Horário de Início:</label>
                                <input type="time" name="inicio" value={userData.regras_acesso.inicio} onChange={handleRegrasChange} />
                            </div>
                            <div className="form-group">
                                <label>Horário de Fim:</label>
                                <input type="time" name="fim" value={userData.regras_acesso.fim} onChange={handleRegrasChange} />
                            </div>
                        </div>
                        <button onClick={saveRegras} className="submit-button">Salvar Regras de Acesso</button>
                    </div>
                )}
                
                {activeTab === 'senha' && (
                    <div className="tab-content">
                        <h4>Alterar Senha</h4>
                        <form onSubmit={savePassword}>
                            <div className="form-group">
                                <label>Nova Senha:</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    required 
                                    minLength="6"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirme a Senha:</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required 
                                    minLength="6"
                                />
                            </div>
                            <button type="submit" className="submit-button">Salvar Nova Senha</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}


// --- COMPONENTE PRINCIPAL ---
export default function Usuarios() {
    const navigate = useNavigate();
    const { perfil: perfilLogado, id: userIdLogado } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [formData, setFormData] = useState({
        nome: '', email: '', senha: '', perfil: 'operacional',
        matricula: '', cpf: '', filial: '', cargo: '', centroDeCusto: ''
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

    const canWrite = perfilLogado === 'admin_geral' || perfilLogado === 'admin';

    async function fetchUsuarios(query = '') {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { query }
            });
            setUsuarios(response.data);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        }
    }

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchUsuarios(searchQuery);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    function handleInputChange(e) {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/register', formData, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Usuário adicionado com sucesso!');
            setFormData({ nome: '', email: '', senha: '', perfil: 'operacional', matricula: '', cpf: '', filial: '', cargo: '', centroDeCusto: '' });
            fetchUsuarios();
        } catch (error) {
            alert(`Erro ao adicionar usuário: ${error.response?.data?.error || 'Tente novamente.'}`);
        }
    }

    function handleOpenEditModal(usuario) {
        setEditingUser(usuario);
        setIsEditModalOpen(true);
    }

    function handleCloseEditModal() {
        setIsEditModalOpen(false);
        setEditingUser(null);
    }

    async function handleDelete(usuarioId) {
        if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            try {
                const token = localStorage.getItem('token');
                await api.delete(`/usuarios/${usuarioId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                alert('Usuário excluído com sucesso!');
                fetchUsuarios(searchQuery);
            } catch (error) {
                alert(`Erro ao excluir usuário: ${error.response?.data?.error || 'Tente novamente.'}`);
            }
        }
    }

    async function handleToggleBlock(usuario) {
        const novoStatus = usuario.status === 'ativo' ? 'bloqueado' : 'ativo';
        const acao = novoStatus === 'ativo' ? 'desbloquear' : 'bloquear';
        if (window.confirm(`Tem certeza que deseja ${acao} o usuário ${usuario.nome}?`)) {
            try {
                const token = localStorage.getItem('token');
                await api.put(`/usuarios/${usuario.id}/status`, { status: novoStatus }, { headers: { 'Authorization': `Bearer ${token}` } });
                alert(`Usuário ${acao} com sucesso!`);
                fetchUsuarios(searchQuery);
            } catch (error) {
                alert(`Erro ao ${acao} usuário: ${error.response?.data?.error || 'Tente novamente.'}`);
            }
        }
    }
    
    async function handleForceLogoff(usuarioId) {
        if (window.confirm('Tem certeza que deseja forçar o logoff deste usuário?')) {
            try {
                const token = localStorage.getItem('token');
                await api.post(`/usuarios/logout-force/${usuarioId}`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
                alert('Logoff forçado com sucesso!');
            } catch (error) {
                alert(`Erro ao forçar logoff: ${error.response?.data?.error || 'Tente novamente.'}`);
            }
        }
    }

    const canTakeAction = (targetUser) => {
        if (!targetUser) return false;
        if (targetUser.email === 'admin@guinchooliveira.com' || targetUser.id === userIdLogado) return false;
        if (perfilLogado === 'admin_geral') return true;
        if (perfilLogado === 'admin') {
            return targetUser.perfil === 'operacional' || targetUser.perfil === 'financeiro';
        }
        return false;
    };

    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };
    
    const handleBulkAction = async (action) => {
        if (selectedUsers.length === 0) {
            alert('Selecione pelo menos um usuário.');
            return;
        }

        const confirmMessage = action === 'block' 
            ? 'Tem certeza que deseja bloquear os usuários selecionados?' 
            : 'Tem certeza que deseja forçar o logoff dos usuários selecionados?';

        if (window.confirm(confirmMessage)) {
            try {
                const token = localStorage.getItem('token');
                await api.put('/usuarios/bulk-actions', { userIds: selectedUsers, action }, { headers: { 'Authorization': `Bearer ${token}` } });
                alert('Ação realizada com sucesso!');
                setSelectedUsers([]);
                fetchUsuarios(searchQuery);
            } catch (error) {
                alert(`Erro ao realizar a ação: ${error.response?.data?.error || 'Tente novamente.'}`);
            }
        }
    };
    
    const handleSelectAll = () => {
        const filteredUsers = usuarios.filter(u => canTakeAction(u));
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            const allUserIds = filteredUsers.map(u => u.id);
            setSelectedUsers(allUserIds);
        }
    };
    

    return (
        <div className="usuarios-container">
            <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
            <h1 className="usuarios-header">Gerenciamento de Usuários</h1>
            <div className="usuarios-main-content">
                {canWrite && (
                    <div className="coluna-form">
                        <div className="usuario-form-card">
                            <h3>Adicionar Novo Usuário</h3>
                            <form onSubmit={handleSubmit} className="form-grid">
                                <div className="form-group"><label htmlFor="nome">Nome:</label><input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required /></div>
                                <div className="form-group"><label htmlFor="email">Email:</label><input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                                <div className="form-group"><label htmlFor="senha">Senha:</label><input type="password" id="senha" name="senha" value={formData.senha} onChange={handleInputChange} required /></div>
                                <div className="form-group"><label htmlFor="perfil">Nível de Acesso:</label><select id="perfil" name="perfil" value={formData.perfil} onChange={handleInputChange}><option value="operacional">Operacional</option><option value="financeiro">Financeiro</option><option value="admin">Administrador</option></select></div>
                                <div className="form-group"><label htmlFor="matricula">Matrícula:</label><input type="text" id="matricula" name="matricula" value={formData.matricula} onChange={handleInputChange} /></div>
                                <div className="form-group"><label htmlFor="cpf">CPF:</label><input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleInputChange} /></div>
                                <div className="form-group"><label htmlFor="filial">Filial:</label><input type="text" id="filial" name="filial" value={formData.filial} onChange={handleInputChange} /></div>
                                <div className="form-group"><label htmlFor="cargo">Cargo:</label><input type="text" id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} /></div>
                                <div className="form-group full-width"><label htmlFor="centroDeCusto">Centro de Custo:</label><input type="text" id="centroDeCusto" name="centroDeCusto" value={formData.centroDeCusto} onChange={handleInputChange} /></div>
                                <div className="form-group full-width"><button type="submit" className="submit-button">Cadastrar Usuário</button></div>
                            </form>
                        </div>
                    </div>
                )}
                <div className={canWrite ? "coluna-lista" : "coluna-lista-full"}>
                    <div className="usuario-list-card">
                        <div className="list-header-controls">
                            <h3>Usuários Cadastrados ({usuarios.length})</h3>
                            <div className="search-container">
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou CPF..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            {perfilLogado === 'admin_geral' && selectedUsers.length > 0 && (
                                <div className="bulk-actions-container">
                                    <button onClick={() => setBulkActionsOpen(!bulkActionsOpen)} className="bulk-actions-button">
                                        Ações ({selectedUsers.length}) <FaEllipsisV />
                                    </button>
                                    {bulkActionsOpen && (
                                        <div className="bulk-actions-dropdown">
                                            <button onClick={() => handleBulkAction('block')}>Bloquear</button>
                                            <button onClick={() => handleBulkAction('force_logout')}>Forçar Logoff</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <ul className="usuario-list">
                            <li className="list-header">
                                <div className="header-checkbox">
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedUsers.length > 0 && selectedUsers.length === usuarios.filter(u => canTakeAction(u)).length} />
                                </div>
                                <div className="header-info">Informações do Usuário</div>
                                <div className="header-actions">Ações</div>
                            </li>
                            {usuarios.map(usuario => (
                                <li key={usuario.id} className={usuario.status === 'bloqueado' ? 'bloqueado' : ''}>
                                    <div className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(usuario.id)}
                                            onChange={() => handleSelectUser(usuario.id)}
                                            disabled={!canTakeAction(usuario)}
                                        />
                                    </div>
                                    <div className="usuario-info">
                                        <img src={usuario.foto_perfil || `https://ui-avatars.com/api/?name=${usuario.nome.replace(/\s/g, '+')}&background=101C5D&color=fff`} alt="Foto" className="user-avatar" />
                                        <div>
                                            <span><strong>Nome:</strong> {usuario.nome}</span>
                                            <span><strong>Email:</strong> {usuario.email}</span>
                                            <span><strong>Perfil:</strong> {usuario.perfil}</span>
                                            {usuario.status === 'bloqueado' && <span className="status-bloqueado">BLOQUEADO</span>}
                                        </div>
                                    </div>
                                    {canTakeAction(usuario) && (
                                        <div className="usuario-actions">
                                            <button onClick={() => handleOpenEditModal(usuario)} className="edit-button">Editar</button>
                                            {perfilLogado === 'admin_geral' && (
                                                <>
                                                    <button onClick={() => handleForceLogoff(usuario.id)} className="logout-force-button">Logoff</button>
                                                    <button onClick={() => handleToggleBlock(usuario)} className={usuario.status === 'ativo' ? 'block-button' : 'unblock-button'}>
                                                        {usuario.status === 'ativo' ? 'Bloquear' : 'Desbloquear'}
                                                    </button>
                                                    <button onClick={() => handleDelete(usuario.id)} className="delete-button">Excluir</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            {isEditModalOpen && (
                perfilLogado === 'admin_geral' ? 
                    <EditModalAdminGeral usuarioId={editingUser.id} onClose={handleCloseEditModal} onUpdate={() => fetchUsuarios(searchQuery)} /> :
                    <SimpleEditModal usuario={editingUser} onClose={handleCloseEditModal} onUpdate={() => fetchUsuarios(searchQuery)} />
            )}
        </div>
    );
}