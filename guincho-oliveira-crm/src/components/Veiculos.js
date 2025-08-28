import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Veiculos.css';
import SuccessModal from './SuccessModal';

import detranIcon from '../detran.png'; 

export default function Veiculos() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [formData, setFormData] = useState({ placa: '', modelo: '', marca: '', ano: '', status: '', motorista_id: '' });
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function fetchVeiculosData(query = {}) {
    try {
      const token = localStorage.getItem('token');
      const veiculosResponse = await api.get('/veiculos', { 
        headers: { 'Authorization': `Bearer ${token}` },
        params: query
      });
      const motoristasResponse = await api.get('/motoristas', { headers: { 'Authorization': `Bearer ${token}` } });
      
      setVeiculos(veiculosResponse.data);
      setMotoristas(motoristasResponse.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }

  useEffect(() => {
    fetchVeiculosData();
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }

  function handleEditInputChange(e) {
    const { name, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/veiculos', formData, { headers: { 'Authorization': `Bearer ${token}` } });
      setSuccessMessage('Veículo adicionado com sucesso!');
      setIsSuccessModalVisible(true);
      setFormData({ placa: '', modelo: '', marca: '', ano: '', status: '', motorista_id: '' });
      fetchVeiculosData();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.put(`/veiculos/${editFormData.id}`, editFormData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Veículo atualizado com sucesso!');
      setIsSuccessModalVisible(true);
      fetchVeiculosData();
      handleCloseEditModal();
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
    }
  }

  function handleOpenEditModal(veiculo) {
    setEditFormData(veiculo);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
  }

  async function handleExcluir(id) {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/veiculos/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchVeiculosData();
      } catch (error) {
        console.error('Erro ao excluir veículo:', error);
      }
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery) {
      fetchVeiculosData({ query: searchQuery });
    } else {
      fetchVeiculosData();
    }
  }

  return (
    <div className="veiculos-container">
      <button onClick={() => navigate(-1)} className="back-button">Voltar</button>

      <a href="https://www.detran.sp.gov.br/detransp" target="_blank" rel="noopener noreferrer" className="detran-button">
        <img src={detranIcon} alt="Ícone do Detran" className="detran-icon" />
        Consultar Detran
      </a>

      <h1 className="veiculos-header">Cadastro de Veículos</h1>
      
      <div className="veiculo-main-content">
        <div className="veiculo-forms-container">
          <div className="veiculo-form-card">
            <h3>Adicionar Novo Veículo</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="placa">Placa:</label>
                <input type="text" id="placa" name="placa" value={formData.placa} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="modelo">Modelo:</label>
                <input type="text" id="modelo" name="modelo" value={formData.modelo} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="marca">Marca:</label>
                <input type="text" id="marca" name="marca" value={formData.marca} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="ano">Ano:</label>
                <input type="number" id="ano" name="ano" value={formData.ano} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="status">Status:</label>
                <select id="status" name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="">Selecione o Status</option>
                  <option value="Disponível">Disponível</option>
                  <option value="Em Serviço">Em Serviço</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="motorista_id">Motorista Responsável:</label>
                <select id="motorista_id" name="motorista_id" value={formData.motorista_id} onChange={handleInputChange}>
                  <option value="">Selecione um Motorista</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="submit-button">Cadastrar Veículo</button>
            </form>
          </div>

          <div className="veiculo-list-card">
            <h3>Veículos Cadastrados</h3>
            <ul className="veiculo-list">
              {veiculos.length > 0 ? (
                veiculos.map(veiculo => (
                  <li key={veiculo.id}>
                    <div className="list-item-content">
                      <p><strong>Placa:</strong> {veiculo.placa} | <strong>Modelo:</strong> {veiculo.modelo}</p>
                      <p><strong>Motorista:</strong> {motoristas.find(m => m.id === veiculo.motorista_id)?.nome || 'N/A'}</p>
                    </div>
                    <div className="list-item-actions">
                      <button onClick={() => handleOpenEditModal(veiculo)} className="edit-button">Editar</button>
                      <button onClick={() => handleExcluir(veiculo.id)} className="delete-button">Excluir</button>
                    </div>
                  </li>
                ))
              ) : (
                <li>Nenhum veículo encontrado.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="veiculo-sidebar-search">
          <div className="search-card">
            <h3>Buscar Veículo</h3>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label htmlFor="search">Placa:</label>
                <input 
                  type="text" 
                  id="search" 
                  name="search" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <button type="submit" className="submit-button">Buscar</button>
              <button type="button" className="submit-button reset-button" onClick={() => { setSearchQuery(''); fetchVeiculosData(); }}>Limpar Busca</button>
            </form>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={handleCloseEditModal} className="modal-close-button">&times;</button>
            <h3>Editar Veículo</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Placa:</label>
                <input type="text" name="placa" value={editFormData.placa} onChange={handleEditInputChange} required />
              </div>
              <div className="form-group">
                <label>Modelo:</label>
                <input type="text" name="modelo" value={editFormData.modelo} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Marca:</label>
                <input type="text" name="marca" value={editFormData.marca} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Ano:</label>
                <input type="number" name="ano" value={editFormData.ano} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Status:</label>
                <select name="status" value={editFormData.status} onChange={handleEditInputChange}>
                  <option value="">Selecione o Status</option>
                  <option value="Disponível">Disponível</option>
                  <option value="Em Serviço">Em Serviço</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
              <div className="form-group">
                <label>Motorista Responsável:</label>
                <select name="motorista_id" value={editFormData.motorista_id} onChange={handleEditInputChange}>
                  <option value="">Selecione um Motorista</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="submit-button">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {isSuccessModalVisible && (
        <SuccessModal message={successMessage} onClose={() => setIsSuccessModalVisible(false)} />
      )}
    </div>
  );
}