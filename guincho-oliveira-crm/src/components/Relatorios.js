import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Relatorios.css';
import { useAuth } from '../hooks/useAuth';

import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
} from 'chart.js';

import * as XLSX from 'xlsx';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement
);

// Ícones para os KPIs
const FaturamentoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const DespesasIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const LucroIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ServicosIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const RunningManIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9"></path><path d="M13 2v7h7"></path><path d="M18 13.5V17a2 2 0 0 1-2 2v0"></path><path d="M14 18v1a2 2 0 0 1-2 2H6"></path><path d="M14 13.5a2 2 0 0 1-2 2h-2"></path></svg>;

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function Relatorios() {
    const navigate = useNavigate();
    const { perfil } = useAuth();
    
    const [resumo, setResumo] = useState({ faturamento: 0, despesas: 0, lucro: 0, servicosConcluidos: 0, metaLucro: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [periodo, setPeriodo] = useState('mensal');
    
    const [lineChartData, setLineChartData] = useState(null);
    const [doughnutChartData, setDoughnutChartData] = useState(null);
    const [barChartData, setBarChartData] = useState(null);
    const [barChartAgruparPor, setBarChartAgruparPor] = useState('dia');

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const canWrite = perfil === 'admin' || perfil === 'admin_geral';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                const [resumoRes, lineChartRes, doughnutChartRes, barChartRes] = await Promise.all([
                    api.get(`/dashboard/resumo?periodo=${periodo}`, config),
                    api.get('/dashboard/faturamento-anual', config),
                    api.get('/dashboard/lucro-por-motorista', config),
                    api.get(`/dashboard/picos-faturamento?agruparPor=${barChartAgruparPor}`, config)
                ]);
                
                setResumo(resumoRes.data);
                setLineChartData(lineChartRes.data);
                setDoughnutChartData(doughnutChartRes.data);
                setBarChartData(barChartRes.data);
                console.log('Dados do resumo:', resumoRes.data);

            } catch (err) {
                setError('Falha ao carregar os dados do dashboard.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [periodo, barChartAgruparPor]);

    const progressoMeta = resumo.metaLucro > 0 ? (resumo.lucro / resumo.metaLucro) * 100 : 0;
    
    const lineChartOptions = { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } } };
    const doughnutChartOptions = { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } } };
    const barChartOptions = { responsive: true, plugins: { legend: { display: false }, title: { display: false } }, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } } };

    const handleExportXLS = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { 
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            };
            const response = await api.get('/dashboard/export/xls', config);
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_dashboard.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            setIsExportModalOpen(false);
            alert("Planilha (.xls) baixada com sucesso!");
        } catch (err) {
            console.error("Erro ao baixar planilha:", err);
            alert("Erro ao baixar a planilha. Por favor, tente novamente.");
        }
    };

    const handleExportPPT = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { 
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob'
            };
            const response = await api.get('/dashboard/export/ppt', config);
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_dashboard.pptx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            setIsExportModalOpen(false);
            alert("Apresentação (.ppt) baixada com sucesso!");
        } catch (err) {
            console.error("Erro ao baixar apresentação:", err);
            alert("Erro ao baixar a apresentação. Por favor, tente novamente.");
        }
    };

    const handleExportPBIX = () => {
        alert("A exportação para o formato .pbix exige uma integração complexa com a API do Power BI, por isso, esta funcionalidade não está disponível no momento.");
        setIsExportModalOpen(false);
    };

    return (
        <div className="dashboard-page">
            <button onClick={() => navigate(-1)} className="back-button">Voltar</button>

            <header className="dashboard-header">
                <h1>Dashboard Gerencial</h1>
                <div className="dashboard-controls">
                    <div className="dashboard-filter">
                        <label htmlFor="periodo-select">Visualizar KPIs:</label>
                        <select id="periodo-select" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                            <option value="hoje">Hoje</option>
                            <option value="semanal">Esta Semana</option>
                            <option value="mensal">Este Mês</option>
                            <option value="anual">Este Ano</option>
                        </select>
                    </div>
                    {canWrite && <button className="export-button" onClick={() => setIsExportModalOpen(true)}>Exportar</button>}
                </div>
            </header>

            {loading && <div className="loading-spinner"></div>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && (
                <>
                    <div className="kpi-meta-container">
                        <h4>Progresso da Meta de Lucro ({periodo.charAt(0).toUpperCase() + periodo.slice(1)})</h4>
                        <div className="progress-bar">
                            <div className={`progress-bar-fill ${progressoMeta >= 100 ? 'meta-atingida' : 'em-andamento'}`} style={{ width: `${Math.min(progressoMeta, 100)}%` }}>
                                <div className="running-man-icon" style={{ left: `${Math.min(progressoMeta, 100)}%` }}>
                                    <RunningManIcon />
                                </div>
                                {progressoMeta.toFixed(0)}%
                            </div>
                        </div>
                        <div className="progress-bar-labels">
                            <span>{formatCurrency(resumo.lucro)}</span>
                            <span>Meta: {formatCurrency(resumo.metaLucro)}</span>
                        </div>
                    </div>

                    <div className="kpi-grid">
                        <div className="kpi-card faturamento">
                            <div className="kpi-icon"><FaturamentoIcon/></div>
                            <div className="kpi-content"><h3>Faturamento</h3><span>{formatCurrency(resumo.faturamento)}</span></div>
                        </div>
                        <div className="kpi-card despesas">
                            <div className="kpi-icon"><DespesasIcon/></div>
                            <div className="kpi-content"><h3>Despesas</h3><span>{formatCurrency(resumo.despesas)}</span></div>
                        </div>
                        <div className="kpi-card lucro">
                            <div className="kpi-icon"><LucroIcon/></div>
                            <div className="kpi-content"><h3>Lucro Líquido</h3><span>{formatCurrency(resumo.lucro)}</span></div>
                        </div>
                        <div className="kpi-card servicos">
                            <div className="kpi-icon"><ServicosIcon/></div>
                            <div className="kpi-content"><h3>Serviços Concluídos</h3><span>{resumo.servicosConcluidos}</span></div>
                        </div>
                    </div>
                    
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h4>Evolução Financeira - {new Date().getFullYear()}</h4>
                            {lineChartData && lineChartData.labels && lineChartData.labels.length > 0 ? (
                                <Line options={lineChartOptions} data={{
                                    labels: lineChartData.labels,
                                    datasets: [
                                        { label: 'Faturamento', data: lineChartData.faturamentoData, borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.2)', fill: true, tension: 0.3 },
                                        { label: 'Despesas', data: lineChartData.despesasData, borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.2)', fill: true, tension: 0.3 },
                                    ],
                                }} />
                            ) : <p className="no-data-message">Nenhum dado disponível para este gráfico.</p>}
                        </div>

                        {(perfil === 'admin' || perfil === 'admin_geral') && (
                            <div className="chart-card">
                                <h4>Lucro por Motorista (OS Concluídas)</h4>
                                {doughnutChartData && doughnutChartData.data && doughnutChartData.data.length > 0 ? (
                                    <Doughnut options={doughnutChartOptions} data={{
                                        labels: doughnutChartData.labels,
                                        datasets: [{
                                            label: 'Lucro Total (R$)',
                                            data: doughnutChartData.data,
                                            backgroundColor: ['#007bff','#28a745','#ffc107','#dc3545','#17a2b8','#6c757d','#fd7e14','#6610f2'],
                                            borderColor: '#fff',
                                            borderWidth: 2,
                                        }]
                                    }} />
                                ) : <p className="no-data-message">Nenhum dado disponível para este gráfico.</p>}
                            </div>
                        )}
                        
                        {(perfil === 'admin' || perfil === 'admin_geral') && (
                            <div className="chart-card full-width">
                                <div className="chart-header">
                                    <h4>Picos de Faturamento</h4>
                                    <div className="chart-filter">
                                        <button onClick={() => setBarChartAgruparPor('dia')} className={barChartAgruparPor === 'dia' ? 'active' : ''}>Por Dia</button>
                                        <button onClick={() => setBarChartAgruparPor('hora')} className={barChartAgruparPor === 'hora' ? 'active' : ''}>Por Hora</button>
                                    </div>
                                </div>
                                {barChartData && barChartData.data && barChartData.data.length > 0 ? (
                                    <Bar options={barChartOptions} data={{
                                        labels: barChartData.labels,
                                        datasets: [{
                                            label: 'Faturamento Total (R$)',
                                            data: barChartData.data,
                                            backgroundColor: 'rgba(16, 28, 93, 0.7)',
                                            borderColor: '#101C5D',
                                            borderWidth: 1,
                                            borderRadius: 5,
                                        }]
                                    }} />
                                ) : <p className="no-data-message">Nenhum dado disponível para este gráfico.</p>}
                            </div>
                        )}
                    </div>
                </>
            )}

            {isExportModalOpen && (
                <div className="modal-overlay export-modal-overlay">
                    <div className="modal-content export-modal-content">
                        <button onClick={() => setIsExportModalOpen(false)} className="modal-close-button">&times;</button>
                        <h3>Escolha o formato de exportação</h3>
                        <div className="export-options">
                            <button onClick={handleExportXLS} className="export-option-btn xls-btn">Baixar Planilha (.xls)</button>
                            <button onClick={handleExportPPT} className="export-option-btn ppt-btn">Baixar Apresentação (.ppt)</button>
                            <button onClick={handleExportPBIX} className="export-option-btn pbix-btn">Baixar Relatório (.pbix)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}