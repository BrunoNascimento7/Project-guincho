import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Financeiro.css';

// Ícones
const ReceitaIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const DespesaIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const SaldoIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;

// Função para formatar moeda
const formatCurrency = (value) => {
    const numericValue = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
};

export default function Financeiro() {
    const navigate = useNavigate();
    const [transacoes, setTransacoes] = useState([]);
    const [motoristas, setMotoristas] = useState([]);
    const [resumo, setResumo] = useState({ receita: 0, despesa: 0, saldo: 0 });
    const [categorias, setCategorias] = useState([]);
    const [formData, setFormData] = useState({ tipo: 'Receita', categoria_id: '', descricao: '', valor: '', data: '', motorista_id: '' });
    const [editFormData, setEditFormData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [filtros, setFiltros] = useState({ dataInicio: '', dataFim: '' });

    async function fetchData(filtrosAtuais = filtros) {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const params = new URLSearchParams();
            if (filtrosAtuais.dataInicio) params.append('dataInicio', filtrosAtuais.dataInicio);
            if (filtrosAtuais.dataFim) params.append('dataFim', filtrosAtuais.dataFim);

            const [transacoesRes, motoristasRes, categoriasRes] = await Promise.all([
                api.get('/financeiro', { ...config, params }),
                api.get('/motoristas', config),
                api.get('/categorias-financeiras', config)
            ]);
            
            setTransacoes(transacoesRes.data);
            setMotoristas(motoristasRes.data);
            setCategorias(categoriasRes.data);

            let receita = 0, despesa = 0;
            transacoesRes.data.forEach(t => { t.tipo === 'Receita' ? receita += t.valor : despesa += t.valor; });
            setResumo({ receita, despesa, saldo: receita - despesa });

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const categoriasFiltradasForm = useMemo(() => categorias.filter(c => c.tipo === formData.tipo), [categorias, formData.tipo]);
    const categoriasFiltradasModal = useMemo(() => editFormData ? categorias.filter(c => c.tipo === editFormData.tipo) : [], [categorias, editFormData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value, ...(name === 'tipo' && { categoria_id: '' }) }));
    };
    
    const handleFilterChange = (e) => setFiltros(p => ({ ...p, [e.target.name]: e.target.value }));
    const applyDateFilter = () => fetchData(filtros);
    const clearDateFilter = () => {
        const filtrosLimpados = { dataInicio: '', dataFim: '' };
        setFiltros(filtrosLimpados);
        fetchData(filtrosLimpados);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData.categoria_id) {
            alert('Por favor, selecione uma categoria.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/financeiro', formData, { headers: { Authorization: `Bearer ${token}` } });
            alert('Transação registrada com sucesso!');
            setFormData({ tipo: 'Receita', categoria_id: '', descricao: '', valor: '', data: '', motorista_id: '' });
            fetchData(filtros);
        } catch (error) {
            console.error('Erro ao adicionar transação:', error);
        }
    }

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(p => ({ ...p, [name]: value, ...(name === 'tipo' && { categoria_id: '' }) }));
    };

    async function handleUpdate(e) {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/financeiro/${editFormData.id}`, editFormData, { headers: { 'Authorization': `Bearer ${token}` } });
            alert('Transação atualizada com sucesso!');
            fetchData(filtros);
            handleCloseEditModal();
        } catch (error) {
            console.error('Erro ao atualizar transação:', error);
        }
    }

    const handleOpenEditModal = (transacao) => {
        const dataFormatada = new Date(transacao.data).toISOString().split('T')[0];
        setEditFormData({ ...transacao, data: dataFormatada });
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditFormData(null);
    };

    async function handleExcluir(transacao) {
        let confirmMessage = 'Tem certeza que deseja excluir esta transação?';
        if (transacao.os_id) {
            confirmMessage += '\n\nATENÇÃO: Esta transação está vinculada a uma Ordem de Serviço. A exclusão irá remover este lançamento e atualizar o status da OS correspondente.';
        }

        if (window.confirm(confirmMessage)) {
            try {
                const token = localStorage.getItem('token');
                await api.delete(`/financeiro/${transacao.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                fetchData(filtros);
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
            }
        }
    }
    
    return (
        <div className="financeiro-page-layout">
            <div className="financeiro-sidebar-form">
                <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
                <h1 className="financeiro-header">Controle Financeiro</h1>
                <div className="transacao-form-card">
                    <h3>Registrar Nova Transação</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label>Tipo:</label><select name="tipo" value={formData.tipo} onChange={handleInputChange}><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></div>
                        <div className="form-group"><label>Categoria:</label><select name="categoria_id" value={formData.categoria_id} onChange={handleInputChange} required><option value="">Selecione...</option>{categoriasFiltradasForm.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                        <div className="form-group"><label>Valor (R$):</label><input type="number" step="0.01" name="valor" value={formData.valor} onChange={handleInputChange} required /></div>
                        <div className="form-group"><label>Motorista (opcional):</label><select name="motorista_id" value={formData.motorista_id} onChange={handleInputChange}><option value="">Nenhum</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
                        <div className="form-group"><label>Data:</label><input type="date" name="data" value={formData.data} onChange={handleInputChange} required /></div>
                        <div className="form-group"><label>Descrição:</label><textarea name="descricao" value={formData.descricao} onChange={handleInputChange}></textarea></div>
                        <button type="submit" className="submit-button">Registrar Transação</button>
                    </form>
                </div>
            </div>

            <div className="financeiro-main-content">
                <div className="resumo-dashboard">
                    <div className="resumo-card receita"><div className="resumo-icon"><ReceitaIcon /></div><div className="resumo-content"><h4>Receita Total</h4><span>{formatCurrency(resumo.receita)}</span></div></div>
                    <div className="resumo-card despesa"><div className="resumo-icon"><DespesaIcon /></div><div className="resumo-content"><h4>Despesa Total</h4><span>{formatCurrency(resumo.despesa)}</span></div></div>
                    <div className="resumo-card saldo"><div className="resumo-icon"><SaldoIcon /></div><div className="resumo-content"><h4>Saldo Líquido</h4><span>{formatCurrency(resumo.saldo)}</span></div></div>
                </div>
                
                <div className="transacao-list-card">
                    <div className="filtro-container">
                        <div className="form-group"><label>Data Início:</label><input type="date" name="dataInicio" value={filtros.dataInicio} onChange={handleFilterChange} /></div>
                        <div className="form-group"><label>Data Fim:</label><input type="date" name="dataFim" value={filtros.dataFim} onChange={handleFilterChange} /></div>
                        <div className="filtro-botoes"><button type="button" onClick={applyDateFilter} className="submit-button">Filtrar</button><button type="button" onClick={clearDateFilter} className="reset-button">Limpar</button></div>
                    </div>
                    <h3>Histórico de Transações ({transacoes.length})</h3>
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
                                    <div className="list-item-actions"><button onClick={() => handleOpenEditModal(t)} className="edit-button">Editar</button><button onClick={() => handleExcluir(t)} className="delete-button">Excluir</button></div>
                                </li>
                            )) : ( <p className="no-results">Nenhuma transação encontrada.</p> )}
                        </ul>
                    </div>
                </div>
            </div>

            {isEditModalOpen && editFormData && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseEditModal} className="modal-close-button">&times;</button>
                        <h3>Editar Transação</h3>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group"><label>Tipo:</label><select name="tipo" value={editFormData.tipo} onChange={handleEditInputChange}><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></div>
                            <div className="form-group"><label>Categoria:</label><select name="categoria_id" value={editFormData.categoria_id} onChange={handleEditInputChange} required><option value="">Selecione...</option>{categoriasFiltradasModal.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                            <div className="form-group"><label>Valor (R$):</label><input type="number" step="0.01" name="valor" value={editFormData.valor} onChange={handleEditInputChange} required /></div>
                            <div className="form-group"><label>Motorista (opcional):</label><select name="motorista_id" value={editFormData.motorista_id} onChange={handleEditInputChange}><option value="">Nenhum</option>{motoristas.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}</select></div>
                            <div className="form-group"><label>Data:</label><input type="date" name="data" value={editFormData.data} onChange={handleEditInputChange} required /></div>
                            <div className="form-group"><label>Descrição:</label><textarea name="descricao" value={editFormData.descricao} onChange={handleEditInputChange}></textarea></div>
                            <button type="submit" className="submit-button">Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}