import axios from 'axios';

// Este ficheiro centraliza a configuração da sua API.
// Ele diz a todas as chamadas para onde devem apontar (o seu backend).

const api = axios.create({
  baseURL: 'http://localhost:3001' // O endereço do seu servidor backend
});

export default api;
