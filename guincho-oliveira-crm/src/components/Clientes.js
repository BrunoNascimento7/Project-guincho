import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Clientes.css';
import SuccessModal from './SuccessModal';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({ nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '' });
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function fetchClientes(query = {}) {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/clientes', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: query
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  }

  useEffect(() => {
    fetchClientes();
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
      await api.post('/clientes', formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Cliente adicionado com sucesso!');
      setIsSuccessModalVisible(true);
      setFormData({ nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '' });
      fetchClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.put(`/clientes/${editFormData.id}`, editFormData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Cliente atualizado com sucesso!');
      setIsSuccessModalVisible(true);
      fetchClientes();
      handleCloseEditModal();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
    }
  }

  function handleOpenEditModal(cliente) {
    setEditFormData(cliente);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
  }

  async function handleExcluir(id) {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/clientes/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchClientes();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
      }
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery) {
      fetchClientes({ query: searchQuery });
    } else {
      fetchClientes();
    }
  }

  return (
    <div className="clientes-container">
      <button onClick={() => navigate(-1)} className="back-button">Voltar</button>
      
      <h1 className="clientes-header">Cadastro de Clientes</h1>

      <div className="client-main-content">
        <div className="client-forms-container">
          <div className="client-form-card">
            <h3>Adicionar Novo Cliente</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nome">Nome:</label>
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="telefone">Telefone:</label>
                <input type="text" id="telefone" name="telefone" value={formData.telefone} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="endereco">Endereço:</label>
                <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="cpf_cnpj">CPF/CNPJ:</label>
                <input type="text" id="cpf_cnpj" name="cpf_cnpj" value={formData.cpf_cnpj} onChange={handleInputChange} />
              </div>
              <button type="submit" className="submit-button">Cadastrar Cliente</button>
            </form>
          </div>
          
          <div className="client-list-card">
            <h3>Clientes Cadastrados</h3>
            <ul className="client-list">
              {clientes.length > 0 ? (
                clientes.map(cliente => (
                  <li key={cliente.id}>
                    <div className="list-item-content">
                      <p><strong>ID:</strong> {cliente.id} | <strong>Nome:</strong> {cliente.nome}</p>
                      <p><strong>Telefone:</strong> {cliente.telefone}</p>
                    </div>
                    <div className="list-item-actions">
                      <button onClick={() => handleOpenEditModal(cliente)} className="edit-button">Editar</button>
                      <button onClick={() => handleExcluir(cliente.id)} className="delete-button">Excluir</button>
                    </div>
                  </li>
                ))
              ) : (
                <li>Nenhum cliente encontrado.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="client-sidebar-search">
          <div className="search-card">
            <h3>Buscar Cliente</h3>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label htmlFor="search">CPF/CNPJ ou Telefone:</label>
                <input 
                  type="text" 
                  id="search" 
                  name="search" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <button type="submit" className="submit-button">Buscar</button>
              <button type="button" className="submit-button reset-button" onClick={() => { setSearchQuery(''); fetchClientes(); }}>Limpar Busca</button>
            </form>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={handleCloseEditModal} className="modal-close-button">&times;</button>
            <h3>Editar Cliente</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" name="nome" value={editFormData.nome} onChange={handleEditInputChange} required />
              </div>
              <div className="form-group">
                <label>Telefone:</label>
                <input type="text" name="telefone" value={editFormData.telefone} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input type="email" name="email" value={editFormData.email} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>Endereço:</label>
                <input type="text" name="endereco" value={editFormData.endereco} onChange={handleEditInputChange} />
              </div>
              <div className="form-group">
                <label>CPF/CNPJ:</label>
                <input type="text" name="cpf_cnpj" value={editFormData.cpf_cnpj} onChange={handleEditInputChange} />
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