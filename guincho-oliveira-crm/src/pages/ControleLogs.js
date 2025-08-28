import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ControleLogs.css';

export default function ControleLogs({ user, onLogout }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const { data } = await api.get('/logs', config);
                setLogs(data);
                setError('');
            } catch (err) {
                console.error("Erro ao buscar logs:", err);
                setError('Falha ao carregar os logs. Você pode não ter permissão para ver esta página.');
                if (err.response && err.response.status === 401) {
                    onLogout(); 
                }
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [onLogout]);

    const formatarData = (timestamp) => {
        return new Date(timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="logs-container">
            {/* O NOVO HEADER QUE ENVOLVE O TITULO E O BOTAO */}
            <div className="logs-header">
                <h1 className="logs-title">Controle de Logs do Sistema</h1>
                <button onClick={onLogout} className="logout-button-logs">Sair</button>
            </div>
            
            {loading && <p>Carregando logs...</p>}
            {error && <p className="logs-error">{error}</p>}
            
            {!loading && !error && (
                <div className="logs-table-wrapper">
                    <table className="logs-table">
                        <thead>
                            <tr>
                                <th>Data e Hora</th>
                                <th>Usuário</th>
                                <th>Ação</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{formatarData(log.timestamp)}</td>
                                    <td>{log.usuario_nome || 'Sistema'}</td>
                                    <td>
                                        <span className={`log-acao-badge log-acao-${log.acao.toLowerCase().replace(/ /g, '_')}`}>
                                            {log.acao}
                                        </span>
                                    </td>
                                    <td>{log.detalhes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}