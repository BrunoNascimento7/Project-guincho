import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './RelatoriosFinanceiros.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// Importado do utilitário para formatar moeda de forma consistente
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Ícones
const ReceitaIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const DespesaIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const SaldoIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const DownloadIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;

export default function RelatoriosFinanceiros() {
    const navigate = useNavigate();
    const [transacoes, setTransacoes] = useState([]);
    const [motoristas, setMotoristas] = useState([]);
    const [resumo, setResumo] = useState({ receita: 0, despesa: 0, saldo: 0 });
    const [editFormData, setEditFormData] = useState({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [filterData, setFilterData] = useState({
        dataInicio: '',
        dataFim: '',
        tipo: 'Todos',
        motorista_id: ''
    });

    async function fetchAllData(filterParams = filterData) {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            
            const [transacoesRes, motoristasRes] = await Promise.all([
                api.get('/financeiro', { ...config, params: filterParams }),
                api.get('/motoristas', config)
            ]);
            
            setTransacoes(transacoesRes.data);
            setMotoristas(motoristasRes.data);
            
            let receita = 0, despesa = 0;
            transacoesRes.data.forEach(t => { t.tipo === 'Receita' ? receita += t.valor : despesa += t.valor; });
            setResumo({ receita, despesa, saldo: receita - despesa });
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        }
    }

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleFilterChange = (e) => setFilterData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleFiltrar = (e) => {
        e.preventDefault();
        fetchAllData(filterData);
    };
    const handleEditInputChange = (e) => setEditFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleOpenEditModal = (transacao) => {
        setEditFormData(transacao);
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = () => setIsEditModalOpen(false);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Relatório Financeiro", 14, 15);
        const tableColumn = ["Data", "Tipo", "Descrição", "Motorista", "Valor"];
        const tableRows = [];

        transacoes.forEach(t => {
            const transacaoData = [
                new Date(t.data).toLocaleDateString('pt-BR'),
                t.tipo,
                t.descricao,
                motoristas.find(m => m.id === t.motorista_id)?.nome || 'N/A',
                formatCurrency(t.valor)
            ];
            tableRows.push(transacaoData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20
        });
        
        const finalY = doc.lastAutoTable.finalY || 20;
        doc.text("Resumo do Período", 14, finalY + 15);
        doc.text(`Receita: ${formatCurrency(resumo.receita)}`, 14, finalY + 22);
        doc.text(`Despesa: ${formatCurrency(resumo.despesa)}`, 14, finalY + 29);
        doc.text(`Saldo: ${formatCurrency(resumo.saldo)}`, 14, finalY + 36);
        
        doc.save(`relatorio_financeiro_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    };

    const handleExportCSV = () => {
        const csvData = transacoes.map(t => ({
            Data: new Date(t.data).toLocaleDateString('pt-BR'),
            Tipo: t.tipo,
            Descrição: t.descricao,
            Motorista: motoristas.find(m => m.id === t.motorista_id)?.nome || 'N/A',
            Valor: t.valor.toFixed(2).replace('.', ',')
        }));

        const csv = Papa.unparse(csvData, { delimiter: ';' });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_financeiro_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    async function handleUpdate(e) {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/financeiro/${editFormData.id}`, editFormData, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Transação atualizada com sucesso!');
            fetchAllData(filterData);
            handleCloseEditModal();
        } catch (error) {
            console.error('Erro ao atualizar transação:', error);
        }
    }

    // LÓGICA DE EXCLUSÃO ATUALIZADA
    async function handleExcluir(transacao) {
        let confirmMessage = 'Tem certeza que deseja excluir esta transação?';
        if (transacao.os_id) {
            confirmMessage += '\n\nATENÇÃO: Esta transação está vinculada a uma Ordem de Serviço. A exclusão irá remover este lançamento e atualizar o status da OS correspondente para "Lançamento Excluído".';
        }

        if (window.confirm(confirmMessage)) {
            try {
                const token = localStorage.getItem('token');
                await api.delete(`/financeiro/${transacao.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                fetchAllData(filterData);
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
            }
        }
    }

    return (
        <div className="relatorios-page-layout">
            <div className="relatorios-sidebar">
                <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
                <h1 className="relatorios-header">Relatórios Financeiros</h1>
                
                <div className="filtro-card card-section">
                    <h3>Filtrar Transações</h3>
                    <form onSubmit={handleFiltrar}>
                        <div className="form-group"><label>Data de Início:</label><input type="date" name="dataInicio" value={filterData.dataInicio} onChange={handleFilterChange} /></div>
                        <div className="form-group"><label>Data de Fim:</label><input type="date" name="dataFim" value={filterData.dataFim} onChange={handleFilterChange} /></div>
                        <div className="form-group"><label>Tipo:</label><select name="tipo" value={filterData.tipo} onChange={handleFilterChange}><option value="Todos">Todos</option><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></div>
                        <div className="form-group"><label>Motorista:</label><select name="motorista_id" value={filterData.motorista_id} onChange={handleFilterChange}><option value="">Todos</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
                        <button type="submit" className="submit-button">Aplicar Filtros</button>
                    </form>
                </div>
            </div>
            <div className="relatorios-main-content">
                <div className="resumo-dashboard">
                    <div className="resumo-card receita"><div className="resumo-icon"><ReceitaIcon /></div><div className="resumo-content"><h4>Receita do Período</h4><span>{formatCurrency(resumo.receita)}</span></div></div>
                    <div className="resumo-card despesa"><div className="resumo-icon"><DespesaIcon /></div><div className="resumo-content"><h4>Despesa do Período</h4><span>{formatCurrency(resumo.despesa)}</span></div></div>
                    <div className="resumo-card saldo"><div className="resumo-icon"><SaldoIcon /></div><div className="resumo-content"><h4>Saldo do Período</h4><span>{formatCurrency(resumo.saldo)}</span></div></div>
                </div>
                <div className="resultados-card">
                    <div className="resultados-header">
                        <h3>Resultados ({transacoes.length})</h3>
                    </div>
                    <div className="transacao-list-wrapper">
                        <ul className="transacao-list">
                            {transacoes.length > 0 ? transacoes.map(t => (
                                <li key={t.id} className={t.tipo === 'Despesa' ? 'despesa-item' : 'receita-item'}>
                                    <div className="list-item-info">
                                        <span className="transacao-tipo">{t.tipo}</span>
                                        <span className="transacao-valor">{formatCurrency(t.valor)}</span>
                                        <span className="transacao-descricao">{t.descricao}</span>
                                        <span className="transacao-meta">{new Date(t.data).toLocaleDateString('pt-BR')} | {motoristas.find(m => m.id === t.motorista_id)?.nome || 'N/A'}</span>
                                    </div>
                                    <div className="list-item-actions">
                                        <button onClick={() => handleOpenEditModal(t)} className="edit-button">Editar</button>
                                        <button onClick={() => handleExcluir(t)} className="delete-button">Excluir</button>
                                    </div>
                                </li>
                            )) : <p className="no-results">Nenhuma transação encontrada.</p>}
                        </ul>
                    </div>
                </div>
            </div>

            <button type="button" className="floating-export-button" onClick={() => setIsExportModalOpen(true)}>
                <DownloadIcon />
                Extrair Relatório
            </button>


            {isExportModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content preview-modal">
                        <button onClick={() => setIsExportModalOpen(false)} className="modal-close-button">&times;</button>
                        <h3>Pré-visualização do Relatório</h3>
                        <div className="preview-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Tipo</th>
                                        <th>Descrição</th>
                                        <th>Motorista</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transacoes.map(t => (
                                        <tr key={t.id}>
                                            <td>{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                                            <td><span className={`tipo-badge ${t.tipo.toLowerCase()}`}>{t.tipo}</span></td>
                                            <td>{t.descricao}</td>
                                            <td>{motoristas.find(m => m.id === t.motorista_id)?.nome || 'N/A'}</td>
                                            <td className={t.tipo.toLowerCase()}>{formatCurrency(t.valor)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="preview-summary">
                            <span><strong>Receita:</strong> {formatCurrency(resumo.receita)}</span>
                            <span><strong>Despesa:</strong> {formatCurrency(resumo.despesa)}</span>
                            <span><strong>Saldo:</strong> {formatCurrency(resumo.saldo)}</span>
                        </div>
                        <div className="download-actions">
                            <button onClick={handleExportPDF} className="download-button pdf">Baixar PDF</button>
                            <button onClick={handleExportCSV} className="download-button csv">Baixar Planilha (CSV)</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseEditModal} className="modal-close-button">&times;</button>
                        <h3>Editar Transação</h3>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group"><label>Tipo:</label><select name="tipo" value={editFormData.tipo} onChange={handleEditInputChange}><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></div>
                            <div className="form-group"><label>Valor (R$):</label><input type="number" name="valor" value={editFormData.valor} onChange={handleEditInputChange} required /></div>
                            <div className="form-group"><label>Motorista (opcional):</label><select name="motorista_id" value={editFormData.motorista_id} onChange={handleEditInputChange}><option value="">Nenhum</option>{motoristas.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}</select></div>
                            <div className="form-group"><label>Data:</label><input type="date" name="data" value={editFormData.data} onChange={handleEditInputChange} required /></div>
                            <div className="form-group"><label>Descrição:</label><textarea name="descricao" value={editFormData.descricao} onChange={handleEditInputChange} required></textarea></div>
                            <button type="submit" className="submit-button">Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}