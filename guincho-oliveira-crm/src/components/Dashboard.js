import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import './Dashboard.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useOutletContext } from 'react-router-dom';

// Importe as suas imagens de guinchos aqui
import guinchoImg1 from '../guinchos1.jpg';
import guinchoImg2 from '../guinchos2.jpg';
import guinchoImg3 from '../guinchos3.jpg';

const images = [guinchoImg1, guinchoImg2, guinchoImg3];

export default function Dashboard() {
    // Note: onLogout não é mais necessário aqui, mas manteremos o user
    const { user } = useOutletContext(); 

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [ordens, setOrdens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [motoristas, setMotoristas] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [isOSModalOpen, setIsOSModalOpen] = useState(false);
    const [selectedOS, setSelectedOS] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 5000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        async function fetchAllData() {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const [ordensRes, clientesRes, motoristasRes, veiculosRes] = await Promise.all([
                    api.get('/ordens', config),
                    api.get('/clientes', config),
                    api.get('/motoristas', config),
                    api.get('/veiculos', config)
                ]);
                setOrdens(ordensRes.data);
                setClientes(clientesRes.data);
                setMotoristas(motoristasRes.data);
                setVeiculos(veiculosRes.data);
            } catch (error) {
                // AQUI, A LÓGICA FOI REMOVIDA.
                // O App.js agora lida com o logoff globalmente via polling.
                console.error('Erro ao buscar dados do dashboard:', error);
            }
        }
        fetchAllData();
    }, []); // O array de dependências agora está vazio ou sem onLogout.

    const ordensDoDia = useMemo(() => {
        if (!selectedDate || ordens.length === 0) return [];
        const selectedDayString = selectedDate.toDateString();
        return ordens.filter(ordem => new Date(ordem.data_hora).toDateString() === selectedDayString);
    }, [selectedDate, ordens]);

    function handleOpenOSModal(os) {
        setSelectedOS(os);
        setIsOSModalOpen(true);
    }
    
    function handleCloseOSModal() {
        setIsOSModalOpen(false);
        setSelectedOS(null);
    }

    const tileClassName = ({ date, view }) => {
        if (view === 'month' && ordens.some(ordem => new Date(ordem.data_hora).toDateString() === date.toDateString())) {
            return 'highlight-day';
        }
        return null;
    };
    
    return (
        <div className="dashboard-content">
            <div className="dashboard-columns">
                <div className="dashboard-agenda-column">
                    <div className="agenda-card">
                        <h2>Agenda ({ordensDoDia.length} compromisso{ordensDoDia.length !== 1 ? 's' : ''})</h2>
                        <Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} />
                        <ul className="agenda-list">
                            {ordensDoDia.length > 0 ? (
                                ordensDoDia.map(ordem => (
                                    <li key={ordem.id} onClick={() => handleOpenOSModal(ordem)}>
                                        <strong>OS #{ordem.id}</strong> - {new Date(ordem.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </li>
                                ))
                            ) : (
                                <li>Nenhum compromisso para o dia.</li>
                            )}
                        </ul>
                    </div>
                </div>
                <div className="dashboard-content-column">
                    <div className="welcome-section">
                        <h1 className="welcome-section-header">Bem-vindo ao CRM Guincho Oliveira!</h1>
                        <p className="welcome-section-text">Este é o dashboard inicial. Use o menu lateral para navegar.</p>
                    </div>
                    <div className="slideshow-container">
                        <img src={images[currentImageIndex]} alt="Guincho" className="slideshow-image" />
                    </div>
                    <div className="about-section">
                        <h2>Sobre a Guincho Oliveira</h2>
                        <p>A Guincho Oliveira é uma empresa dedicada a oferecer serviços de guincho e assistência rodoviária 24 horas. Com uma frota moderna e profissionais experientes, garantimos um atendimento rápido, seguro e eficiente para veículos de todos os portes. Nossa missão é proporcionar tranquilidade e segurança aos nossos clientes em qualquer situação de emergência na estrada.</p>
                    </div>
                </div>
            </div>

            {isOSModalOpen && selectedOS && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseOSModal} className="modal-close-button">&times;</button>
                        <h3>Detalhes da Ordem de Serviço #{selectedOS.id}</h3>
                        <div className="os-details">
                            <strong>Cliente:</strong><span>{clientes.find(c => c.id === selectedOS.cliente_id)?.nome || 'N/A'}</span>
                            <strong>Motorista:</strong><span>{motoristas.find(m => m.id === selectedOS.motorista_id)?.nome || 'N/A'}</span>
                            <strong>Veículo:</strong><span>{veiculos.find(v => v.id === selectedOS.veiculo_id)?.placa || 'N/A'}</span>
                            <strong>Local:</strong><span>{selectedOS.local_atendimento}</span>
                            <strong>Data/Hora:</strong><span>{new Date(selectedOS.data_hora).toLocaleString('pt-BR')}</span>
                            <strong>Status:</strong><span>{selectedOS.status}</span>
                            <strong>Descrição:</strong><span>{selectedOS.descricao}</span>
                            <strong>Valor:</strong><span>R$ {selectedOS.valor ? selectedOS.valor.toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}