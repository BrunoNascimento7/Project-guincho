import axios from 'axios';

// Este ficheiro centraliza a configuração da sua API.
// A baseURL agora aponta para /api, permitindo que o Nginx gerencie o redirecionamento.

const api = axios.create({
  baseURL: '/api' // O endereço relativo para a nossa API
});

// Adiciona um interceptador para incluir o token em todas as requisições
api.interceptors.request.use(async config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;