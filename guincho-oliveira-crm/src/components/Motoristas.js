import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Motoristas.css';
import SuccessModal from './SuccessModal';

export default function Motoristas() {
  const navigate = useNavigate();
  const [motoristas, setMotoristas] = useState([]);
  const [formData, setFormData] = useState({ nome: '', cnh_numero: '', categoria_cnh: '', telefone: '' });
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function fetchMotoristas(query = {}) {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/motoristas', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: query
      });
      setMotoristas(response.data);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
    }
  }

  useEffect(() => {
    fetchMotoristas();
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
      await api.post('/motoristas', formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Motorista adicionado com sucesso!');
      setIsSuccessModalVisible(true);
      setFormData({ nome: '', cnh_numero: '', categoria_cnh: '', telefone: '' });
      fetchMotoristas();
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.put(`/motoristas/${editFormData.id}`, editFormData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Motorista atualizado com sucesso!');
      setIsSuccessModalVisible(true);
      fetchMotoristas();
      handleCloseEditModal();
    } catch (error) {
      console.error('Erro ao atualizar motorista:', error);
    }
  }

  function handleOpenEditModal(motorista) {
    setEditFormData(motorista);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
  }

  async function handleExcluir(id) {
    if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/motoristas/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchMotoristas();
      } catch (error) {
        console.error('Erro ao excluir motorista:', error);
      }
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery) {
      fetchMotoristas({ query: searchQuery });
    } else {
      fetchMotoristas();
    }
  }

  return (
    <div className="motoristas-container">
      <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
      
      <h1 className="motoristas-header">Cadastro de Motoristas</h1>

      <div className="motorista-main-content">
        <div className="motorista-forms-container">
          <div className="motorista-form-card">
            <h3>Adicionar Novo Motorista</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nome">Nome:</label>
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="cnh_numero">CNH:</label>
                <input type="text" id="cnh_numero" name="cnh_numero" value={formData.cnh_numero} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="categoria_cnh">Categoria CNH:</label>
                <select id="categoria_cnh" name="categoria_cnh" value={formData.categoria_cnh} onChange={handleInputChange}>
                  <option value="">Selecione a Categoria</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="A/B">A/B</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="telefone">Telefone:</label>
                <input type="text" id="telefone" name="telefone" value={formData.telefone} onChange={handleInputChange} />
              </div>
              <button type="submit" className="submit-button">Cadastrar Motorista</button>
            </form>
          </div>

          <div className="motorista-list-card">
            <h3>Motoristas Cadastrados</h3>
            <ul className="motorista-list">
              {motoristas.length > 0 ? (
                motoristas.map(motorista => (
                  <li key={motorista.id}>
                    <div className="list-item-content">
                      <p><strong>ID:</strong> {motorista.id} | <strong>Nome:</strong> {motorista.nome}</p>
                      <p><strong>CNH:</strong> {motorista.cnh_numero}</p>
                    </div>
                    <div className="list-item-actions">
                      <button onClick={() => handleOpenEditModal(motorista)} className="edit-button">Editar</button>
                      <button onClick={() => handleExcluir(motorista.id)} className="delete-button">Excluir</button>
                    </div>
                  </li>
                ))
              ) : (
                <li>Nenhum motorista encontrado.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="motorista-sidebar-search">
          <div className="search-card">
            <h3>Buscar Motorista</h3>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label htmlFor="search">CNH ou Telefone:</label>
                <input 
                  type="text" 
                  id="search" 
                  name="search" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <button type="submit" className="submit-button">Buscar</button>
              <button type="button" className="submit-button reset-button" onClick={() => { setSearchQuery(''); fetchMotoristas(); }}>Limpar Busca</button>
            </form>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={handleCloseEditModal} className="modal-close-button">&times;</button>
            <h3>Editar Motorista</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" name="nome" value={editFormData.nome} onChange={handleEditInputChange} required />
              </div>
              <div className="form-group">
                <label>CNH:</label>
                <input type="text" name="cnh_numero" value={editFormData.cnh_numero} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Categoria CNH:</label>
                <select name="categoria_cnh" value={editFormData.categoria_cnh} onChange={handleEditInputChange}>
                  <option value="">Selecione a Categoria</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="A/B">A/B</option>
                </select>
              </div>
              <div className="form-group">
                <label>Telefone:</label>
                <input type="text" name="telefone" value={editFormData.telefone} onChange={handleEditInputChange} />
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