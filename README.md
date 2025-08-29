# Project-guincho

🚗 Project CRM UNIVESP – Sistema CRM para Empresa de Guincho
Este projeto é um CRM completo para uma empresa de guincho, desenvolvido como parte do projeto UNIVESP.
O sistema permite:
✅ Gerenciar Ordens de Serviço (OS)
✅ Controle Financeiro
✅ Relatórios e Dashboards

📂 Estrutura do Projeto
Project-CRM-UNIVESP/
├── backend/                # API em Node.js (Express, banco de dados)
├── frontend/               # Interface em React (painel CRM)
└── .gitignore
✅ Pré-requisitos
Antes de rodar o projeto, você precisa ter instalado:

Node.js (versão LTS recomendada)
npm (vem com Node)
PM2 (para rodar em produção)
Instalar Node.js e npm no Linux:
sudo apt-get update
sudo apt-get install -y nodejs npm
Instalar PM2 globalmente:
sudo npm install -g pm2
🚀 Como Rodar o Projeto (Desenvolvimento)
Clone o repositório:

git clone https://github.com/BrunoNascimento7/Project-CRM-UNIVESP.git
cd Project-CRM-UNIVESP
1. Backend
cd backend
npm install
npm start
2. Frontend
Abra outro terminal:

cd frontend
npm install
npm start
O frontend rodará normalmente na porta 3000 e o backend na porta configurada no .env (ex.: 5000).

🔥 Rodar em Produção com PM2
1. Backend
cd backend
pm2 start server.js --name crm-backend
2. Frontend (build e servir)
cd frontend
npm run build
pm2 serve build 3000 --name crm-frontend --spa
Verifique os serviços:

pm2 list
Salvar configuração para reiniciar automaticamente:

pm2 save
pm2 startup
📊 Tecnologias Utilizadas
Backend: Node.js, Express, SQLite (ou outro DB usado)
Frontend: React.js
Gerenciamento de Processos: PM2
📜 Licença
Projeto acadêmico – UNIVESP.