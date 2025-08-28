// src/components/CadastroOrdens.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CadastroOrdens.css';

export default function CadastroOrdens({ user }) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  
  // <-- NOVO: Estado separado apenas para os veículos disponíveis
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState([]);

  const [formData, setFormData] = useState({
    cliente_id: '',
    motorista_id: '',
    veiculo_id: '',
    local_atendimento: '',
    descricao: '',
    data_hora: '',
    status: 'Na Fila', // O status inicial padrão deve ser 'Na Fila'
    valor: '',
    forma_atendimento: ''
  });

  // <-- ALTERADO: A busca de dados foi dividida para mais clareza e eficiência
  useEffect(() => {
    async function fetchDadosGerais() {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        
        const [clientesRes, motoristasRes] = await Promise.all([
          api.get('/clientes', config),
          api.get('/motoristas', config)
        ]);
        
        setClientes(clientesRes.data);
        setMotoristas(motoristasRes.data);
      } catch (error) {
        console.error('Erro ao buscar clientes e motoristas:', error);
      }
    }

    async function fetchVeiculosDisponiveis() {
      try {
        const token = localStorage.getItem('token');
        const config = { 
          headers: { 'Authorization': `Bearer ${token}` },
          // Aqui está a mágica: pedimos apenas os veículos com status 'Disponível'
          params: { status: 'Disponível' }
        };
        const veiculosRes = await api.get('/veiculos', config);
        setVeiculosDisponiveis(veiculosRes.data);
      } catch (error) {
        console.error('Erro ao buscar veículos disponíveis:', error);
      }
    }

    fetchDadosGerais();
    fetchVeiculosDisponiveis();
  }, []); // Executa apenas uma vez ao carregar o componente

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/ordens', formData, { headers: { 'Authorization': `Bearer ${token}` } });
      alert('Ordem de serviço adicionada com sucesso!');
      // Redireciona para a fila de ordens após o sucesso
      navigate('/fila-ordens'); 
    } catch (error) {
      console.error('Erro ao adicionar ordem de serviço:', error.response?.data || error);
      alert(`Falha ao adicionar ordem de serviço: ${error.response?.data?.error || error.message}`);
    }
  }

  return (
    <div className="ordens-container">
      <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
      
      <h1 className="ordens-header">Cadastro de Ordens de Serviço</h1>
      
      <div className="ordens-main-content single-column">
        <div className="ordens-form-column">
          <div className="ordem-form-card">
            <h3>Adicionar Nova Ordem de Serviço</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="cliente_id">Cliente:</label>
                <select id="cliente_id" name="cliente_id" value={formData.cliente_id} onChange={handleInputChange} required>
                  <option value="">Selecione um Cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="motorista_id">Motorista:</label>
                <select id="motorista_id" name="motorista_id" value={formData.motorista_id} onChange={handleInputChange} required>
                  <option value="">Selecione um Motorista</option>
                  {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="veiculo_id">Veículo (Guincho):</label>
                {/* <-- ALTERADO: O dropdown agora mapeia os veículos disponíveis --> */}
                <select id="veiculo_id" name="veiculo_id" value={formData.veiculo_id} onChange={handleInputChange} required>
                  <option value="">Selecione um Veículo</option>
                  {veiculosDisponiveis.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="local_atendimento">Local de Atendimento:</label>
                <input type="text" id="local_atendimento" name="local_atendimento" value={formData.local_atendimento} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="descricao">Descrição (Detalhes, tamanho do carro):</label>
                <textarea id="descricao" name="descricao" value={formData.descricao} onChange={handleInputChange} required></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="data_hora">Data e Hora:</label>
                <input type="datetime-local" id="data_hora" name="data_hora" value={formData.data_hora} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="valor">Valor (R$):</label>
                <input type="number" id="valor" name="valor" value={formData.valor} onChange={handleInputChange} required />
              </div>
              <button type="submit" className="submit-button">Agendar Serviço</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}