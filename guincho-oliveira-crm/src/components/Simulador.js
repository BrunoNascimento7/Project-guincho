import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Simulador.css';

import logo from '../logo_guincho.png';

export default function Simulador() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tipoCarro: '',
    localPartida: '',
    localChegada: '',
    distancia: '',
    tipoServico: '',
    desconto: ''
  });
  const [cotacao, setCotacao] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [empresaInfo, setEmpresaInfo] = useState({});
  const [precosTable, setPrecosTable] = useState({
    'Dentro da Cidade': { fixo: 150.00, porKm: 3.50 },
    'Dentro do Estado': { fixo: 250.00, porKm: 2.80 },
    'Interestadual': { fixo: 400.00, porKm: 2.00 }
  });

  useEffect(() => {
    const storedInfo = localStorage.getItem('empresaInfo');
    if (storedInfo) {
      setEmpresaInfo(JSON.parse(storedInfo));
    }
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }

  function handleTableChange(e) {
    const { name, value, dataset } = e.target;
    const { categoria } = dataset;
    setPrecosTable(prevState => ({
      ...prevState,
      [categoria]: {
        ...prevState[categoria],
        [name]: parseFloat(value)
      }
    }));
  }

  function handleCalcular(e) {
    e.preventDefault();
    const { tipoServico, distancia, desconto } = formData;
    if (!tipoServico || !distancia) {
      alert('Por favor, preencha o tipo de serviço e a distância.');
      return;
    }
    const valorServico = precosTable[tipoServico].fixo + (precosTable[tipoServico].porKm * parseFloat(distancia));
    const valorDesconto = parseFloat(desconto) || 0;
    const totalFinal = valorServico - valorDesconto;

    setCotacao({
      ...formData,
      valor: valorServico,
      desconto: valorDesconto,
      totalFinal: totalFinal,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      orcamentoNumero: Math.floor(Math.random() * 100000),
      empresaInfo: empresaInfo
    });
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
  }

  function handleImprimir() {
    window.print();
  }

  return (
    <div className="simulador-container">
      <button onClick={() => navigate(-1)} className="back-button no-print">Voltar</button>

      <h1 className="simulador-header">Simulador de Orçamento</h1>

      <div className="simulador-content">
        <div className="simulador-card no-print">
          <h3>Calcular Cotação</h3>
          <form onSubmit={handleCalcular}>
            <div className="form-group">
              <label>Tipo do Carro:</label>
              <select name="tipoCarro" value={formData.tipoCarro} onChange={handleInputChange}>
                <option value="">Selecione...</option>
                <option value="Passeio">Carro de Passeio</option>
                <option value="SUV">SUV</option>
                <option value="Caminhonete">Caminhonete</option>
                <option value="Utilitario">Utilitário</option>
                <option value="Moto">Moto</option>
              </select>
            </div>
            <div className="form-group">
              <label>Local de Partida:</label>
              <input type="text" name="localPartida" value={formData.localPartida} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Local de Chegada:</label>
              <input type="text" name="localChegada" value={formData.localChegada} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Tipo de Serviço:</label>
              <select name="tipoServico" value={formData.tipoServico} onChange={handleInputChange} required>
                <option value="">Selecione...</option>
                <option value="Dentro da Cidade">Dentro da Cidade</option>
                <option value="Dentro do Estado">Dentro do Estado</option>
                <option value="Interestadual">Interestadual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Distância (Km):</label>
              <input type="number" name="distancia" value={formData.distancia} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Desconto (R$):</label>
              <input type="number" name="desconto" value={formData.desconto} onChange={handleInputChange} />
            </div>
            <button type="submit" className="submit-button">Calcular</button>
          </form>
        </div>
        
        <div className="tabela-precos-card no-print">
          <h3>Tabela de Preços (Edite os valores)</h3>
          <table className="precos-table">
            <thead>
              <tr>
                <th>Tipo de Serviço</th>
                <th>Valor Fixo (R$)</th>
                <th>Valor por Km (R$)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(precosTable).map(categoria => (
                <tr key={categoria}>
                  <td>{categoria}</td>
                  <td>
                    <input
                      type="number"
                      name="fixo"
                      data-categoria={categoria}
                      value={precosTable[categoria].fixo}
                      onChange={handleTableChange}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      name="porKm"
                      data-categoria={categoria}
                      value={precosTable[categoria].porKm}
                      onChange={handleTableChange}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {modalOpen && cotacao && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={handleCloseModal} className="modal-close-button no-print">&times;</button>
            <div className="cotacao-document-area">
              <div className="document-header">
                <div className="logo-info">
                  <img src={logo} alt="Guincho Oliveira" className="doc-logo" />
                </div>
                <div className="header-details">
                  <div className="company-info">
                    <p><strong>Tel.:</strong> {cotacao.empresaInfo?.telefone}</p>
                    <p><strong>Whatsapp:</strong> {cotacao.empresaInfo?.whatsapp}</p>
                    <p><strong>Email:</strong> {cotacao.empresaInfo?.email}</p>
                    <p><strong>Endereço:</strong> {cotacao.empresaInfo?.endereco}</p>
                    <p><strong>CNPJ:</strong> {cotacao.empresaInfo?.cnpj}</p>
                  </div>
                  <div className="quote-meta">
                    <p><strong>Criado em:</strong> {cotacao?.data}</p>
                    <p><strong>Hora:</strong> {cotacao?.hora}</p>
                    <p><strong>Orçamento nº:</strong> {cotacao?.orcamentoNumero}</p>
                  </div>
                </div>
              </div>
              <hr className="separator" />
              <h2 className="quote-title">Orçamento</h2>
              <table className="quote-table">
                <thead>
                  <tr>
                    <th>DESCRIÇÃO</th>
                    <th>QTD</th>
                    <th>PREÇO UNIT.</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{cotacao.tipoServico} - {cotacao.distancia} Km</td>
                    <td>1</td>
                    <td>R$ {cotacao.valor.toFixed(2)}</td>
                    <td>R$ {cotacao.valor.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="quote-summary">
                <div className="summary-item">
                  <span>Subtotal</span>
                  <span>R$ {cotacao.valor.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>Desconto</span>
                  <span>R$ {cotacao.desconto.toFixed(2)}</span>
                </div>
                <div className="summary-item total-final">
                  <span>Total Final</span>
                  <span>R$ {cotacao.totalFinal.toFixed(2)}</span>
                </div>
              </div>
              <hr className="separator" />
              <div className="quote-footer">
                <p><strong>Observações:</strong></p>
                <p>Retirada do veículo em {cotacao.localPartida}, entrega em {cotacao.localChegada}</p>
              </div>
            </div>
            <div className="no-print">
              <button onClick={handleImprimir} className="print-button submit-button">Imprimir Cotação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}