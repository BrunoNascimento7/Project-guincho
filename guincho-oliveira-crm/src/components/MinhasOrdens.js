import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './MinhasOrdens.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente para ícones SVG para evitar dependências
const FilterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const ChartIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20V16"></path></svg>;

export default function MinhasOrdens({ user }) {
    const navigate = useNavigate();
    const [allOrdens, setAllOrdens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    
    // Estados da UI
    const [activeTab, setActiveTab] = useState('Em Andamento');
    const [filters, setFilters] = useState({ osId: '', data: '' });
    const [isOSModalOpen, setIsOSModalOpen] = useState(false);
    const [selectedOS, setSelectedOS] = useState(null);
    const [relato, setRelato] = useState('');
    const [chartData, setChartData] = useState([]);

    // Busca todos os dados necessários quando o componente é montado
    useEffect(() => {
        const motoristaId = user?.motoristaId;
        if (!motoristaId) return;

        const fetchAllData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                
                const [ordensRes, clientesRes, veiculosRes, chartRes] = await Promise.all([
                    api.get(`/ordens/motorista/${motoristaId}`, config),
                    api.get('/clientes', config),
                    api.get('/veiculos', config),
                    api.get(`/dashboard/motorista/${motoristaId}/produtividade`, config)
                ]);
                
                setAllOrdens(ordensRes.data);
                setClientes(clientesRes.data);
                setVeiculos(veiculosRes.data);
                setChartData(chartRes.data);

            } catch (error) {
                console.error('Erro ao buscar dados de "Minhas Ordens":', error);
            }
        };

        fetchAllData();
    }, [user]);

    // Lógica de filtragem usando useMemo para otimização
    const filteredOrdens = useMemo(() => {
        let ordensToShow = [];

        if (activeTab === 'Em Andamento') {
            ordensToShow = allOrdens.filter(os => os.status === 'Em Andamento');
        } else { // Histórico
            ordensToShow = allOrdens.filter(os => os.status === 'Concluído' || os.status === 'Cancelado');
        }

        if (filters.osId) {
            ordensToShow = ordensToShow.filter(os => os.id.toString().includes(filters.osId));
        }

        if (filters.data) {
            ordensToShow = ordensToShow.filter(os => os.data_hora.startsWith(filters.data));
        }

        return ordensToShow;
    }, [allOrdens, activeTab, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenOSModal = (os) => {
        setSelectedOS(os);
        setIsOSModalOpen(true);
    };
    
    const handleCloseOSModal = () => {
        setIsOSModalOpen(false);
        setSelectedOS(null);
        setRelato('');
    };

    const handleConcluirOS = async () => {
        if (!relato.trim()) {
            alert('Por favor, adicione o relato para concluir a Ordem de Serviço.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            await api.put(`/ordens/${selectedOS.id}/status`, { status: 'Concluído' }, config);
            await api.post(`/ordens/${selectedOS.id}/notas`, { autor: user.nome, nota: `Relato de Conclusão: ${relato}` }, config);
            
            alert('Ordem de Serviço concluída com sucesso!');
            handleCloseOSModal();
            // Refetch data
            const motoristaId = user?.motoristaId;
            const ordensRes = await api.get(`/ordens/motorista/${motoristaId}`, config);
            setAllOrdens(ordensRes.data);
        } catch (error) {
            console.error('Erro ao concluir a OS:', error);
            alert('Erro ao concluir a OS.');
        }
    };

    return (
        <div className="minhas-ordens-container">
            <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
            <h1 className="minhas-ordens-header">Minhas Ordens de Serviço</h1>

            {/* Card do Gráfico de Produtividade */}
            <div className="card">
                <h2 className="card-title"><ChartIcon /> Sua Produtividade (Últimos 7 Dias)</h2>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="dia" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="concluidas" fill="#FF8C00" name="OS Concluídas" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Card dos Filtros e Ordens */}
            <div className="card">
                <h2 className="card-title"><FilterIcon /> Ordens de Serviço</h2>
                
                {/* Filtros */}
                <div className="filters-container">
                    <input 
                        type="text" 
                        name="osId" 
                        placeholder="Filtrar por Cód. OS" 
                        className="filter-input"
                        value={filters.osId}
                        onChange={handleFilterChange}
                    />
                    <input 
                        type="date" 
                        name="data" 
                        className="filter-input"
                        value={filters.data}
                        onChange={handleFilterChange}
                    />
                </div>

                {/* Abas */}
                <div className="tabs-container">
                    <button className={`tab-button ${activeTab === 'Em Andamento' ? 'active' : ''}`} onClick={() => setActiveTab('Em Andamento')}>
                        Em Andamento
                    </button>
                    <button className={`tab-button ${activeTab === 'Histórico' ? 'active' : ''}`} onClick={() => setActiveTab('Histórico')}>
                        Histórico
                    </button>
                </div>

                {/* Lista de Ordens */}
                <ul className="os-list">
                    {filteredOrdens.length > 0 ? (
                        filteredOrdens.map(os => (
                            <li key={os.id} onClick={() => handleOpenOSModal(os)} className={`os-list-item status-${os.status.replace(/\s/g, '').toLowerCase()}`}>
                                <div className="os-item-info">
                                    <strong>OS #{os.id}</strong>
                                    <span>{clientes.find(c => c.id === os.cliente_id)?.nome || 'Cliente não encontrado'}</span>
                                </div>
                                <div className="os-item-details">
                                    <span>{new Date(os.data_hora).toLocaleDateString('pt-BR')}</span>
                                    <span className="os-status-badge">{os.status}</span>
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="os-list-empty">Nenhuma ordem de serviço encontrada.</li>
                    )}
                </ul>
            </div>

            {/* Modal de Detalhes da OS */}
            {isOSModalOpen && selectedOS && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseOSModal} className="modal-close-button">&times;</button>
                        <h3>Detalhes da OS #{selectedOS.id}</h3>
                        <div className="os-details">
                            <strong>Cliente:</strong><span>{clientes.find(c => c.id === selectedOS.cliente_id)?.nome || 'N/A'}</span>
                            <strong>Veículo:</strong><span>{veiculos.find(v => v.id === selectedOS.veiculo_id)?.placa || 'N/A'}</span>
                            <strong>Local:</strong><span>{selectedOS.local_atendimento}</span>
                            <strong>Data/Hora:</strong><span>{new Date(selectedOS.data_hora).toLocaleString('pt-BR')}</span>
                            <strong>Status:</strong><span>{selectedOS.status}</span>
                        </div>
                        
                        {selectedOS.status === 'Em Andamento' && (
                            <>
                                <hr className="divider" />
                                <h3>Relatar e Concluir</h3>
                                <div className="relato-form">
                                    <textarea
                                        value={relato}
                                        onChange={(e) => setRelato(e.target.value)}
                                        rows="5"
                                        placeholder="Descreva o que foi feito no atendimento..."
                                        required
                                    ></textarea>
                                    <button onClick={handleConcluirOS} className="submit-button">Concluir Ordem de Serviço</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
