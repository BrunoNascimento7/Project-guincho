const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3001;
const XLSX = require('xlsx');

require('dotenv').config();

app.use(express.json({ limit: '10mb' })); // Limite para upload de fotos

const SECRET_KEY = 'guincho_oliveira_secret';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Middlewares (Funções de apoio)
async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Formato de token inválido.' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const [userRows] = await pool.execute('SELECT nome, last_logout_at FROM usuarios WHERE id = ?', [decoded.id]);
        
        if (userRows.length === 0) {
            return res.status(401).json({ error: 'Usuário do token não encontrado.' });
        }
        
        const user = userRows[0];
        const tokenIssuedAt = new Date(decoded.iat * 1000); 
        const lastLogoutAt = user.last_logout_at ? new Date(user.last_logout_at) : null;
        
        // --- LOGS DE DEPURAÇÃO ---
        console.log('--- Verificação de Logoff Forçado ---');
        console.log('ID do Usuário:', decoded.id);
        console.log('Token emitido em (iat):', tokenIssuedAt);
        console.log('Último logoff forçado:', lastLogoutAt);
        console.log('Comparação (TokenEmitido < ÚltimoLogoff):', tokenIssuedAt < lastLogoutAt);
        console.log('-----------------------------------');
        // --- FIM DOS LOGS DE DEPURAÇÃO ---

        if (lastLogoutAt && tokenIssuedAt < lastLogoutAt) {
            return res.status(401).json({ error: 'Sessão encerrada remotamente. Por favor, faça login novamente.' });
        }

        decoded.nome = user.nome;
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

function permissionMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.perfil)) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
        }
        next();
    };
}

// --- FUNÇÃO AUXILIAR PARA NOTIFICAÇÕES (NOVO) ---
async function enviarNotificacaoSenhaAlterada(usuario_id, usuario_nome, email) {
    // Esta é a lógica pré-montada para o futuro serviço de notificação.
    // Por enquanto, faremos apenas um log.
    console.log(`[NOTIFICAÇÃO] Senha do usuário ${usuario_nome} (ID: ${usuario_id}, E-mail: ${email}) foi alterada. Disparar SMS/E-mail aqui.`);

    // Exemplo de como você adicionaria a lógica futuramente:
    // try {
    //    await smsService.enviar(usuario.telefone, 'Sua senha foi alterada. Se não foi você, contate o suporte.');
    //    await emailService.enviar(usuario.email, 'Senha Alterada', 'Sua senha foi alterada com sucesso.');
    // } catch (err) {
    //    console.error('Falha ao enviar notificação:', err);
    // }
}

// ROTA PARA FORÇAR LOGOFF DE UM ÚNICO USUÁRIO
app.post('/usuarios/logout-force/:id', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const { id: targetUserId } = req.params;
    try {
        // CORREÇÃO: Usando UTC_TIMESTAMP() em vez de NOW()
        await pool.execute('UPDATE usuarios SET last_logout_at = UTC_TIMESTAMP() WHERE id = ?', [targetUserId]);
        
        const detalhes = `Logoff forçado para o usuário ID ${targetUserId}.`;
        await registrarLog(req.user.id, req.user.nome, 'LOGOFF_FORCADO', detalhes);

        res.json({ message: 'Logoff forçado com sucesso.' });
    } catch (err) {
        console.error("Erro ao forçar logoff:", err.message);
        res.status(500).json({ error: 'Falha ao forçar logoff.' });
    }
});

// ROTA PARA AÇÕES EM MASSA (BLOQUEAR E FORÇAR LOGOFF)
app.put('/usuarios/bulk-actions', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const { userIds, action } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'IDs de usuários inválidos.' });
    }

    try {
        const userIdList = userIds.map(id => parseInt(id)); // Garante que são números
        
        if (action === 'block') {
            const sql = `UPDATE usuarios SET status = 'bloqueado' WHERE id IN (?)`;
            await pool.query(sql, [userIdList]); // .query é mais seguro para arrays
            
            const detalhes = `Bloqueio em massa dos usuários: ${userIdList.join(', ')}`;
            await registrarLog(req.user.id, req.user.nome, 'USUARIOS_BLOQUEIO_MASSA', detalhes);

            res.json({ message: 'Usuários bloqueados com sucesso.' });
        } else if (action === 'force_logout') {
            // CORREÇÃO: Usando UTC_TIMESTAMP() em vez de NOW()
            const sql = 'UPDATE usuarios SET last_logout_at = UTC_TIMESTAMP() WHERE id IN (?)';
            await pool.query(sql, [userIdList]);

            const detalhes = `Logoff em massa forçado dos usuários: ${userIdList.join(', ')}`;
            await registrarLog(req.user.id, req.user.nome, 'LOGOFF_MASSA_FORCADO', detalhes);

            res.json({ message: 'Logoff forçado com sucesso para os usuários selecionados.' });
        } else {
            return res.status(400).json({ error: 'Ação inválida.' });
        }
    } catch (err) {
        console.error("Erro em ações em massa:", err.message);
        res.status(500).json({ error: 'Falha ao executar a ação em massa.' });
    }
});

// --- FUNÇÃO AUXILIAR PARA REGISTRO DE LOGS ---
async function registrarLog(usuario_id, usuario_nome, acao, detalhes = '') {
    try {
        const sql = 'INSERT INTO logs_sistema (usuario_id, usuario_nome, acao, detalhes) VALUES (?, ?, ?, ?)';
        await pool.execute(sql, [usuario_id, usuario_nome, acao, detalhes]);
    } catch (err) {
        console.error('Falha ao registrar log:', err.message);
    }
}

// --- ROTA DE CONTROLE DE LOGS ---
app.get('/logs', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        const sql = 'SELECT id, timestamp, usuario_nome, acao, detalhes FROM logs_sistema ORDER BY timestamp DESC';
        const [rows] = await pool.execute(sql);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar logs:", err.message);
        res.status(500).json({ error: 'Falha ao buscar logs do sistema.' });
    }
});

// --- ROTAS DE AUTENTICAÇÃO E REGISTRO ---

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const [userRows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        const user = userRows[0];
        
        if (!user) {
            await registrarLog(null, `IP: ${req.ip}`, 'LOGIN_FALHA', `Tentativa com email inexistente: ${email}`);
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        if (user.status === 'bloqueado') {
            await registrarLog(user.id, user.nome, 'LOGIN_FALHA', 'Tentativa de login por usuário bloqueado.');
            return res.status(403).json({ error: 'Este usuário está bloqueado. Contate o administrador.' });
        }
        
        const valid = await bcrypt.compare(senha, user.senha);
        if (!valid) {
            await registrarLog(user.id, user.nome, 'LOGIN_FALHA', 'Tentativa de login com senha incorreta.');
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        
        // --- NOVO CÓDIGO AQUI ---
        // Se o login for bem-sucedido, limpa o registro de logoff forçado
        // Isso garante que o novo token será válido, pois não será mais comparado com um timestamp antigo
        await pool.execute('UPDATE usuarios SET last_logout_at = NULL WHERE id = ?', [user.id]);
        // --- FIM DO NOVO CÓDIGO ---

        await registrarLog(user.id, user.nome, 'LOGIN_SUCESSO');

        // Buscando o ID do motorista (se existir)
        const [motoristaRows] = await pool.execute('SELECT id FROM motoristas WHERE email = ?', [email]);
        const motoristaId = motoristaRows.length > 0 ? motoristaRows[0].id : null;

        // Criando o token JWT
        const token = jwt.sign({ id: user.id, perfil: user.perfil, motoristaId: motoristaId }, SECRET_KEY, { expiresIn: '8h' });

        res.json({ token, nome: user.nome, perfil: user.perfil, motoristaId: motoristaId });

    } catch (err) {
        console.error("Erro no login:", err.message);
        res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
});

// NOVA ROTA: Rota para registrar o logoff
app.post('/logout', authMiddleware, async (req, res) => {
    await registrarLog(req.user.id, req.user.nome, 'LOGOUT');
    res.status(200).json({ message: 'Logout registrado com sucesso.' });
});

// Substitua sua rota de registro por esta
app.post('/register', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const { nome, email, senha, perfil, matricula, cpf, filial, cargo, centroDeCusto } = req.body;
    if (perfil === 'admin_geral') {
        return res.status(403).json({ error: 'Não é permitido criar um novo usuário com perfil de Administrador Geral.' });
    }
    try {
        const hash = await bcrypt.hash(senha, 10);
        const sql = `INSERT INTO usuarios (nome, email, senha, perfil, matricula, cpf, filial, cargo, centroDeCusto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(sql, [nome, email, hash, perfil, matricula, cpf, filial, cargo, centroDeCusto]);
        
        // NOVO LOG: Criação de usuário
        const detalhes = `Novo usuário: ${nome} (Email: ${email}, Perfil: ${perfil})`;
        await registrarLog(req.user.id, req.user.nome, 'USUARIO_CRIADO', detalhes);

        res.status(201).json({ id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este email já está cadastrado.' });
        }
        console.error("Erro ao registrar usuário:", err.message);
        res.status(500).json({ error: 'Falha ao registrar novo usuário.' });
    }
});


// --- ROTAS DE USUÁRIOS ---

app.get('/usuarios', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const { query } = req.query;
    try {
      let sql = 'SELECT id, nome, email, perfil, status, cpf, foto_perfil FROM usuarios';
      const params = [];
      if (query) {
        sql += ' WHERE nome LIKE ? OR cpf LIKE ?';
        params.push(`%${query}%`, `%${query}%`);
      }
      const [rows] = await pool.execute(sql, params);
      res.json(rows);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err.message);
      res.status(500).json({ error: err.message });
    }
});

app.get('/usuarios/:id', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, nome, email, perfil, matricula, cpf, filial, cargo, centroDeCusto, foto_perfil, status, regras_acesso FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/usuarios/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { perfil: perfilLogado } = req.user;
    try {
        const [userRows] = await pool.execute('SELECT email FROM usuarios WHERE id = ?', [id]);
        if (userRows.length > 0 && userRows[0].email === 'admin@guinchooliveira.com') {
            return res.status(403).json({ error: 'O Administrador Geral não pode ser modificado.' });
        }
        if (perfilLogado === 'admin_geral') {
            const { nome, email, perfil, matricula, cpf, filial, cargo, centroDeCusto, foto_perfil } = req.body;
            if (perfil === 'admin_geral') return res.status(403).json({ error: 'Não é permitido promover um usuário a Administrador Geral.' });
            const sql = `UPDATE usuarios SET nome=?, email=?, perfil=?, matricula=?, cpf=?, filial=?, cargo=?, centroDeCusto=?, foto_perfil=? WHERE id=?`;
            await pool.execute(sql, [nome, email, perfil, matricula, cpf, filial, cargo, centroDeCusto, foto_perfil, id]);
        } else {
            const { nome, email, perfil } = req.body;
            if (perfil === 'admin_geral') return res.status(403).json({ error: 'Não é permitido promover um usuário a Administrador Geral.' });
            const sql = `UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?`;
            await pool.execute(sql, [nome, email, perfil, id]);
        }
        
        // NOVO LOG: Atualização de usuário
        const detalhes = `Usuário ID ${id} foi atualizado.`;
        await registrarLog(req.user.id, req.user.nome, 'USUARIO_ATUALIZADO', detalhes);

        res.json({ message: 'Usuário atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao atualizar usuário.' });
    }
});

// ROTA PARA ALTERAR A SENHA DE UM USUÁRIO (NOVO)
app.put('/usuarios/:id/password', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const sql = `UPDATE usuarios SET senha = ? WHERE id = ?`;
        await pool.execute(sql, [hash, id]);

        // Busca os dados do usuário para a notificação e o log
        const [userRows] = await pool.execute('SELECT id, nome, email FROM usuarios WHERE id = ?', [id]);
        const usuario = userRows[0];

        // Registra o log e dispara a notificação
        await registrarLog(req.user.id, req.user.nome, 'USUARIO_SENHA_ALTERADA', `Senha do usuário ${usuario.nome} (ID: ${id}) alterada.`);
        await enviarNotificacaoSenhaAlterada(usuario.id, usuario.nome, usuario.email);

        res.json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
        console.error("Erro ao alterar senha:", err.message);
        res.status(500).json({ error: 'Falha ao alterar senha.' });
    }
});

app.put('/usuarios/:id/regras-acesso', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const { id } = req.params;
    const { regras } = req.body;
    try {
        const [userRows] = await pool.execute('SELECT email FROM usuarios WHERE id = ?', [id]);
        if (userRows.length > 0 && userRows[0].email === 'admin@guinchooliveira.com') {
            return res.status(403).json({ error: 'Não é permitido definir regras de acesso para o Administrador Geral.' });
        }
        const sql = `UPDATE usuarios SET regras_acesso = ? WHERE id = ?`;
        await pool.execute(sql, [JSON.stringify(regras), id]);
        res.json({ message: 'Regras de acesso atualizadas com sucesso.' });
    } catch (err) {
        console.error("Erro ao salvar regras de acesso:", err.message);
        res.status(500).json({ error: 'Falha ao salvar regras de acesso.' });
    }
});

app.delete('/usuarios/:id', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const { id } = req.params;
    try {
        // Captura o nome do usuário ANTES de deletar para usar no log
        const [userRows] = await pool.execute('SELECT nome, email FROM usuarios WHERE id = ?', [id]);
        if (userRows.length > 0 && userRows[0].email === 'admin@guinchooliveira.com') {
            return res.status(403).json({ error: 'O Administrador Geral não pode ser excluído.' });
        }
        const nomeUsuarioExcluido = userRows[0].nome;

        await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        
        // NOVO LOG: Exclusão de usuário
        const detalhes = `Usuário ${nomeUsuarioExcluido} (ID: ${id}) foi excluído.`;
        await registrarLog(req.user.id, req.user.nome, 'USUARIO_EXCLUIDO', detalhes);

        res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao excluir usuário.' });
    }
});


app.put('/usuarios/:id/status', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const { status } = req.body;
    const { id: targetUserId } = req.params;
    if (req.user.id == targetUserId) {
        return res.status(403).json({ error: 'Você não pode alterar seu próprio status.' });
    }
    try {
        const [targetUserRows] = await pool.execute('SELECT perfil, email FROM usuarios WHERE id = ?', [targetUserId]);
        if (targetUserRows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        if (targetUserRows[0].email === 'admin@guinchooliveira.com') {
            return res.status(403).json({ error: 'O Administrador Geral não pode ser bloqueado.' });
        }
        if (req.user.perfil === 'admin' && targetUserRows[0].perfil === 'admin') {
            return res.status(403).json({ error: 'Administradores não podem bloquear outros administradores.' });
        }
        const sql = `UPDATE usuarios SET status = ? WHERE id = ?`;
        await pool.execute(sql, [status, targetUserId]);
        
        // NOVO LOG: Mudança de status do usuário
        const acao = status === 'ativo' ? 'desbloqueado' : 'bloqueado';
        const detalhes = `O status do usuário ID ${targetUserId} foi alterado para ${status}.`;
        await registrarLog(req.user.id, req.user.nome, 'USUARIO_STATUS_ALTERADO', detalhes);

        res.json({ message: `Usuário ${acao} com sucesso.` });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao alterar status do usuário.' });
    }
});

app.get('/usuarios/me', authMiddleware, async (req, res) => {
    try {
        // Adição para depuração, mostrando o ID que está sendo buscado
        console.log("Tentando buscar usuário com ID:", req.user.id);
        const [rows] = await pool.execute('SELECT id, nome, email, perfil, matricula, cpf, filial, cargo, centroDeCusto, foto_perfil, tema FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            // Este log irá aparecer no seu console quando o erro acontecer
            console.error("Erro: Usuário não encontrado no banco de dados para o ID:", req.user.id);
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        console.log('Backend está retornando o perfil:', rows[0].perfil);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar dados do perfil.' });
    }
});

app.put('/usuarios/me/foto', authMiddleware, async (req, res) => {
    const { foto_perfil } = req.body;
    if (!foto_perfil) {
        return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
    }
    try {
        await pool.execute('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [foto_perfil, req.user.id]);
        res.json({ message: 'Foto de perfil atualizada com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao atualizar a foto de perfil.' });
    }
});

app.put('/usuarios/me/tema', authMiddleware, async (req, res) => {
    const { tema } = req.body;
    if (!['light', 'dark'].includes(tema)) {
        return res.status(400).json({ error: 'Tema inválido.' });
    }
    try {
        await pool.execute('UPDATE usuarios SET tema = ? WHERE id = ?', [tema, req.user.id]);
        res.json({ message: 'Tema atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao atualizar o tema.' });
    }
});


// --- ROTAS DE CLIENTES ---
app.get('/clientes', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { query } = req.query;
    let sql = 'SELECT * FROM clientes';
    let params = [];
    if (query) {
        sql += ' WHERE nome LIKE ? OR cpf_cnpj LIKE ? OR telefone LIKE ?';
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/clientes', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { nome, telefone, email, endereco, cpf_cnpj } = req.body;
    const sql = `INSERT INTO clientes (nome, telefone, email, endereco, cpf_cnpj) VALUES (?, ?, ?, ?, ?)`;
    try {
        const [result] = await pool.execute(sql, [nome, telefone, email, endereco, cpf_cnpj]);
        const detalhes = `Cliente: ${nome}, ID: ${result.insertId}`;
        await registrarLog(req.user.id, req.user.nome, 'CLIENTE_CRIADO', detalhes);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/clientes/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { nome, telefone, email, endereco, cpf_cnpj } = req.body;
    const sql = `UPDATE clientes SET nome = ?, telefone = ?, email = ?, endereco = ?, cpf_cnpj = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [nome, telefone, email, endereco, cpf_cnpj, req.params.id]);
        
        // NOVO LOG: Cliente atualizado
        const detalhes = `Cliente ID ${req.params.id} (${nome}) foi atualizado.`;
        await registrarLog(req.user.id, req.user.nome, 'CLIENTE_ATUALIZADO', detalhes);

        res.json({ updated: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/clientes/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        // NOVO LOG: Cliente excluído
        const detalhes = `Cliente ID ${req.params.id} foi excluído.`;
        await registrarLog(req.user.id, req.user.nome, 'CLIENTE_EXCLUIDO', detalhes);
        
        const [result] = await pool.execute('DELETE FROM clientes WHERE id = ?', [req.params.id]);
        res.json({ deleted: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS DE MOTORISTAS ---
app.get('/motoristas', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { query } = req.query;
    let sql = 'SELECT * FROM motoristas';
    let params = [];
    if (query) {
        sql += ' WHERE nome LIKE ? OR cnh_numero LIKE ?';
        params.push(`%${query}%`, `%${query}%`);
    }
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/motoristas', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { nome, cnh_numero, categoria_cnh, telefone } = req.body;
    const sql = `INSERT INTO motoristas (nome, cnh_numero, categoria_cnh, telefone) VALUES (?, ?, ?, ?)`;
    try {
        const [result] = await pool.execute(sql, [nome, cnh_numero, categoria_cnh, telefone]);
        
        // NOVO LOG: Motorista criado
        const detalhes = `Motorista ${nome} (ID: ${result.insertId}) foi criado.`;
        await registrarLog(req.user.id, req.user.nome, 'MOTORISTA_CRIADO', detalhes);

        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/motoristas/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { nome, cnh_numero, categoria_cnh, telefone } = req.body;
    const sql = `UPDATE motoristas SET nome = ?, cnh_numero = ?, categoria_cnh = ?, telefone = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [nome, cnh_numero, categoria_cnh, telefone, req.params.id]);

        // NOVO LOG: Motorista atualizado
        const detalhes = `Motorista ID ${req.params.id} (${nome}) foi atualizado.`;
        await registrarLog(req.user.id, req.user.nome, 'MOTORISTA_ATUALIZADO', detalhes);

        res.json({ updated: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/motoristas/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        // NOVO LOG: Motorista excluído
        const detalhes = `Motorista ID ${req.params.id} foi excluído.`;
        await registrarLog(req.user.id, req.user.nome, 'MOTORISTA_EXCLUIDO', detalhes);

        const [result] = await pool.execute('DELETE FROM motoristas WHERE id = ?', [req.params.id]);
        res.json({ deleted: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS DE VEÍCULOS ---
app.get('/veiculos', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { query, status } = req.query;
    let sql = 'SELECT * FROM veiculos';
    let params = [];
    let conditions = [];
    if (query) {
        conditions.push('(placa LIKE ? OR modelo LIKE ? OR marca LIKE ?)');
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/veiculos', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { placa, modelo, marca, ano, status, motorista_id } = req.body;
    const sql = `INSERT INTO veiculos (placa, modelo, marca, ano, status, motorista_id) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        const [result] = await pool.execute(sql, [placa, modelo, marca, ano, status, motorista_id]);

        // NOVO LOG: Veículo criado
        const detalhes = `Veículo ${marca} ${modelo} (${placa}) foi criado.`;
        await registrarLog(req.user.id, req.user.nome, 'VEICULO_CRIADO', detalhes);

        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/veiculos/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { placa, modelo, marca, ano, status, motorista_id } = req.body;
    const sql = `UPDATE veiculos SET placa = ?, modelo = ?, marca = ?, ano = ?, status = ?, motorista_id = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [placa, modelo, marca, ano, status, motorista_id, req.params.id]);

        // NOVO LOG: Veículo atualizado
        const detalhes = `Veículo ID ${req.params.id} (${placa}) foi atualizado.`;
        await registrarLog(req.user.id, req.user.nome, 'VEICULO_ATUALIZADO', detalhes);

        res.json({ updated: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/veiculos/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        // NOVO LOG: Veículo excluído
        const detalhes = `Veículo ID ${req.params.id} foi excluído.`;
        await registrarLog(req.user.id, req.user.nome, 'VEICULO_EXCLUIDO', detalhes);

        const [result] = await pool.execute('DELETE FROM veiculos WHERE id = ?', [req.params.id]);
        res.json({ deleted: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- ROTAS DE ORDENS DE SERVIÇO ---
app.get('/ordens', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { status, query, motorista_id, data_criacao, data_resolucao } = req.query;
    let sql = 'SELECT * FROM ordens_servico';
    let params = [];
    let conditions = [];
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (query) {
        conditions.push('(descricao LIKE ? OR id LIKE ? OR local_atendimento LIKE ?)');
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    if (motorista_id) {
        conditions.push('motorista_id = ?');
        params.push(motorista_id);
    }
    if (data_criacao) {
        conditions.push('DATE(data_hora) = ?');
        params.push(data_criacao);
    }
    if (data_resolucao) {
        conditions.push('DATE(data_resolucao) = ?');
        params.push(data_resolucao);
    }
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/ordens', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { cliente_id, motorista_id, veiculo_id, local_atendimento, descricao, data_hora, valor } = req.body;
    const atendenteId = req.user.id;
    const statusInicial = 'Na Fila';
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const prefixo = `${mm}${yy}`;
    let proximoNumero = 1;
    try {
        const [lastOs] = await pool.execute('SELECT id FROM ordens_servico WHERE id LIKE ? ORDER BY id DESC LIMIT 1', [`${prefixo}-%`]);
        if (lastOs.length > 0) {
            const lastNumber = parseInt(lastOs[0].id.split('-')[1]);
            proximoNumero = lastNumber + 1;
        }
    } catch (err) {
        return res.status(500).json({ error: 'Falha ao gerar ID da OS.' });
    }
    const novoId = `${prefixo}-${String(proximoNumero).padStart(4, '0')}`;
    const sql = `INSERT INTO ordens_servico (id, cliente_id, motorista_id, veiculo_id, local_atendimento, descricao, data_hora, status, valor, atendente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        const params = [novoId, cliente_id, motorista_id, veiculo_id, local_atendimento, descricao, data_hora, statusInicial, valor, atendenteId];
        if (params.some(p => p === undefined)) {
            return res.status(400).json({ error: 'Um ou mais campos obrigatórios estão faltando.' });
        }
        await pool.execute(sql, params);
        
        // NOVO LOG: Ordem de Serviço criada
        const detalhes = `OS #${novoId} criada. Descrição: ${descricao}`;
        await registrarLog(req.user.id, req.user.nome, 'OS_CRIADA', detalhes);

        res.status(201).json({ id: novoId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/ordens/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM ordens_servico WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/ordens/:id/status', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { status: novoStatus } = req.body;
    const osId = req.params.id;
    const regrasDeTransicao = {
        'Na Fila': ['Agendado', 'Cancelado', 'Em Andamento'],
        'Agendado': ['Em Andamento', 'Cancelado'],
        'Em Andamento': ['Concluído', 'Cancelado', 'Agendado'],
        'Concluído': [], 
        'Cancelado': []
    };
    try {
        const [osRows] = await pool.execute('SELECT status FROM ordens_servico WHERE id = ?', [osId]);
        if (osRows.length === 0) {
            return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });
        }
        const statusAtual = osRows[0].status;
        if (!regrasDeTransicao[statusAtual]?.includes(novoStatus)) {
            return res.status(400).json({ error: `Mudança de status inválida: de "${statusAtual}" para "${novoStatus}".` });
        }
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            let sqlUpdateOS = 'UPDATE ordens_servico SET status = ?';
            const paramsUpdateOS = [novoStatus];
            if (novoStatus === 'Concluído') {
                sqlUpdateOS += ', data_resolucao = ?';
                paramsUpdateOS.push(new Date());
            }
            sqlUpdateOS += ' WHERE id = ?';
            paramsUpdateOS.push(osId);
            await connection.execute(sqlUpdateOS, paramsUpdateOS);
            if (novoStatus === 'Concluído') {
                const [ordemRows] = await connection.execute('SELECT valor, motorista_id FROM ordens_servico WHERE id = ?', [osId]);
                const ordemDeServico = ordemRows[0];
                if (ordemDeServico) {
                    const sqlInsertFinanceiro = `INSERT INTO financeiro (tipo, descricao, valor, data, os_id, motorista_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    const categoriaReceitaOS = 1; 
                    const paramsFinanceiro = ['Receita', `Receita referente à OS #${osId}`, ordemDeServico.valor, new Date(), osId, ordemDeServico.motorista_id, categoriaReceitaOS];
                    await connection.execute(sqlInsertFinanceiro, paramsFinanceiro);
                }
            }

            // NOVO LOG: Status da OS alterado
            const detalhes = `Status da OS #${osId} alterado para "${novoStatus}".`;
            await registrarLog(req.user.id, req.user.nome, 'OS_STATUS_ALTERADO', detalhes);

            await connection.commit();
            connection.release();
            res.json({ updated: true, message: 'Status da OS atualizado com sucesso.' });
        } catch (innerErr) {
            await connection.rollback();
            connection.release();
            throw innerErr;
        }
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Falha no processo de atualização.' });
        }
    }
});

app.put('/ordens/:id/reagendar', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { novaDataHora } = req.body;
    const osId = req.params.id;
    if (!novaDataHora) {
        return res.status(400).json({ error: 'A nova data e hora são obrigatórias.' });
    }
    const novaData = new Date(novaDataHora);
    if (novaData <= new Date()) {
        return res.status(400).json({ error: 'A data de reagendamento não pode ser no passado.' });
    }
    const sql = `UPDATE ordens_servico SET status = 'Agendado', data_hora = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [novaData, osId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });
        }
        res.json({ success: true, message: 'Ordem de Serviço reagendada com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao reagendar a Ordem de Serviço.' });
    }
});

app.delete('/ordens/:id', authMiddleware, permissionMiddleware(['admin_geral']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const osId = req.params.id;
        // ... (lógica de exclusão)
        await connection.execute('DELETE FROM notas_chamado WHERE os_id = ?', [osId]);
        await connection.execute('DELETE FROM ordens_servico WHERE id = ?', [osId]);
        await connection.commit();
        connection.release();
        
        // NOVO LOG: Ordem de Serviço excluída
        const detalhes = `Ordem de Serviço #${osId} foi excluída permanentemente.`;
        await registrarLog(req.user.id, req.user.nome, 'OS_EXCLUIDA', detalhes);

        res.json({ message: 'Ordem de serviço excluída com sucesso.' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Erro ao excluir ordem de serviço:', err.message);
        res.status(500).json({ error: 'Falha ao excluir ordem de serviço.' });
    }
});


app.get('/ordens/:id/notas', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional', 'financeiro']), async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM notas_chamado WHERE os_id = ? ORDER BY data_hora ASC', [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/ordens/:id/notas', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { autor, nota } = req.body;
    const { id } = req.params;
    try {
        const sql = `INSERT INTO notas_chamado (os_id, autor, nota, data_hora) VALUES (?, ?, ?, NOW())`;
        const [result] = await pool.execute(sql, [id, autor, nota]);

        // NOVO LOG: Nota adicionada à OS
        const detalhes = `Nova nota adicionada à OS #${id}. Conteúdo: "${nota.substring(0, 50)}..."`;
        await registrarLog(req.user.id, req.user.nome, 'OS_NOTA_ADICIONADA', detalhes);

        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- ROTAS FINANCEIRAS E DE DASHBOARD ---
app.get('/financeiro', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro']), async (req, res) => {
    const { dataInicio, dataFim } = req.query;
    let sql = 'SELECT * FROM financeiro';
    let params = [];
    let conditions = [];
    if (dataInicio) {
        conditions.push('data >= ?');
        params.push(dataInicio);
    }
    if (dataFim) {
        conditions.push('data <= ?');
        params.push(dataFim);
    }
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/financeiro', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro']), async (req, res) => {
    const { tipo, descricao, valor, data, motorista_id, categoria_id } = req.body;
    const sql = `INSERT INTO financeiro (tipo, descricao, valor, data, motorista_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        const [result] = await pool.execute(sql, [tipo, descricao, valor, data, motorista_id, categoria_id]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/financeiro/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro']), async (req, res) => {
    const { tipo, descricao, valor, data, motorista_id, categoria_id } = req.body;
    const sql = `UPDATE financeiro SET tipo = ?, descricao = ?, valor = ?, data = ?, motorista_id = ?, categoria_id = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [tipo, descricao, valor, data, motorista_id, categoria_id, req.params.id]);
        res.json({ updated: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/financeiro/:id', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [financeiroRows] = await connection.execute('SELECT os_id, descricao FROM financeiro WHERE id = ?', [req.params.id]);
        const osId = financeiroRows.length > 0 ? financeiroRows[0].os_id : null;
        const descricaoTransacao = financeiroRows.length > 0 ? financeiroRows[0].descricao : 'N/A';
        await connection.execute('DELETE FROM financeiro WHERE id = ?', [req.params.id]);
        if (osId) {
            await connection.execute('UPDATE ordens_servico SET status = ? WHERE id = ?', ['Lançamento Excluído', osId]);
            const notaTexto = `Lançamento de OS excluído - Financeiro dado baixa em ${new Date().toLocaleDateString('pt-BR')}.`;
            await connection.execute('INSERT INTO notas_chamado (os_id, autor, nota, tipo, data_hora) VALUES (?, ?, ?, ?, NOW())', [osId, 'Sistema', notaTexto, 'sistema']);
        }
        await connection.commit();
        connection.release();
        
        // NOVO LOG: Transação financeira excluída
        const detalhes = `Transação financeira ID ${req.params.id} (Descrição: "${descricaoTransacao}") foi excluída.`;
        await registrarLog(req.user.id, req.user.nome, 'FINANCEIRO_EXCLUIDO', detalhes);
        
        res.json({ message: 'Transação excluída e registros vinculados atualizados com sucesso.' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Erro ao excluir transação:', err.message);
        res.status(500).json({ error: 'Falha ao excluir transação e atualizar registros vinculados.' });
    }
});


app.get('/categorias-financeiras', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro']), async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM categorias_financeiras ORDER BY tipo, nome');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/dashboard/resumo', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro', 'operacional']), async (req, res) => {
    const { periodo } = req.query;
    let conditionsFinanceiro = [];
    let conditionsOS = [];
    
    // Usa a data atual do servidor como referência
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() é base 0
    
    switch (periodo) {
        case 'hoje':
            conditionsFinanceiro.push('DATE(data) = CURDATE()');
            conditionsOS.push('DATE(data_resolucao) = CURDATE()');
            break;
        case 'semanal':
            conditionsFinanceiro.push('YEARWEEK(data, 1) = YEARWEEK(CURDATE(), 1)');
            conditionsOS.push('YEARWEEK(data_resolucao, 1) = YEARWEEK(CURDATE(), 1)');
            break;
        case 'anual':
            conditionsFinanceiro.push(`YEAR(data) = ${year}`);
            conditionsOS.push(`YEAR(data_resolucao) = ${year}`);
            break;
        case 'mensal':
        default:
            conditionsFinanceiro.push(`MONTH(data) = ${month}`, `YEAR(data) = ${year}`);
            conditionsOS.push(`MONTH(data_resolucao) = ${month}`, `YEAR(data_resolucao) = ${year}`);
            break;
    }
    
    const whereClauseFinanceiro = conditionsFinanceiro.length > 0 ? `WHERE ${conditionsFinanceiro.join(' AND ')}` : '';
    const whereClauseOS = conditionsOS.length > 0 ? `WHERE ${conditionsOS.join(' AND ')}` : '';
    
    try {
        const connection = await pool.getConnection();
        const sqlReceita = `SELECT SUM(valor) AS total FROM financeiro ${whereClauseFinanceiro} AND tipo = 'Receita'`;
        const sqlDespesa = `SELECT SUM(valor) AS total FROM financeiro ${whereClauseFinanceiro} AND tipo = 'Despesa'`;
        const sqlServicos = `SELECT COUNT(id) AS total FROM ordens_servico ${whereClauseOS} AND status = 'Concluído'`;
        const sqlMeta = "SELECT valor FROM configuracoes WHERE chave = 'meta_lucro_mensal'";
        const [[receitaRows], [despesaRows], [servicosRows], [metaRows]] = await Promise.all([
            connection.execute(sqlReceita),
            connection.execute(sqlDespesa),
            connection.execute(sqlServicos),
            connection.execute(sqlMeta)
        ]);
        connection.release();
        
        const faturamento = receitaRows[0]?.total || 0;
        const despesas = despesaRows[0]?.total || 0;
        
        res.json({
            faturamento,
            despesas,
            lucro: faturamento - despesas,
            servicosConcluidos: servicosRows[0]?.total || 0,
            metaLucro: parseFloat(metaRows[0]?.valor || 0)
        });
    } catch (err) {
        console.error("Erro ao buscar dados do resumo:", err);
        res.status(500).json({ error: 'Falha ao buscar dados do resumo.' });
    }
});

app.get('/dashboard/faturamento-anual', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'financeiro', 'operacional']), async (req, res) => {
    try {
        const sql = `SELECT MONTH(data) AS mes, SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END) AS faturamento, SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END) AS despesas FROM financeiro WHERE YEAR(data) = YEAR(CURDATE()) GROUP BY MONTH(data) ORDER BY mes ASC;`;
        const [rows] = await pool.execute(sql);
        const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const faturamentoData = Array(12).fill(0);
        const despesasData = Array(12).fill(0);
        rows.forEach(row => {
            const monthIndex = row.mes - 1;
            faturamentoData[monthIndex] = parseFloat(row.faturamento);
            despesasData[monthIndex] = parseFloat(row.despesas);
        });
        res.json({ labels, faturamentoData, despesasData });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar dados do gráfico.' });
    }
});

app.get('/dashboard/lucro-por-motorista', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        const sql = `SELECT m.nome AS nome_motorista, SUM(os.lucro) AS total_lucro FROM ordens_servico os JOIN motoristas m ON os.motorista_id = m.id WHERE os.status = 'Concluído' AND os.lucro > 0 GROUP BY m.id, m.nome ORDER BY total_lucro DESC;`;
        const [rows] = await pool.execute(sql);
        const labels = rows.map(row => row.nome_motorista);
        const data = rows.map(row => parseFloat(row.total_lucro));
        res.json({ labels, data });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar dados do gráfico.' });
    }
});

app.get('/dashboard/picos-faturamento', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    const { agruparPor } = req.query;
    try {
        let sql;
        if (agruparPor === 'dia') {
            sql = `SELECT DAYOFWEEK(data_hora) as dia, SUM(valor) as faturamento_total FROM ordens_servico WHERE status = 'Concluído' AND YEAR(data_hora) = YEAR(CURDATE()) GROUP BY dia ORDER BY dia ASC;`;
        } else {
            sql = `SELECT HOUR(data_hora) as hora, SUM(valor) as faturamento_total FROM ordens_servico WHERE status = 'Concluído' AND data_hora >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY hora ORDER BY hora ASC;`;
        }
        const [rows] = await pool.execute(sql);
        let labels;
        let dataMap = new Map();
        if (agruparPor === 'dia') {
            labels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            rows.forEach(row => {
                dataMap.set(row.dia - 1, parseFloat(row.faturamento_total));
            });
        } else {
            labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
            rows.forEach(row => {
                dataMap.set(row.hora, parseFloat(row.faturamento_total));
            });
        }
        const data = labels.map((_, index) => dataMap.get(index) || 0);
        res.json({ labels, data });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar dados do gráfico.' });
    }
});

app.get('/dashboard/export/xls', authMiddleware, permissionMiddleware(['admin_geral', 'admin']), async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // 1. Busca dados de resumo (KPIs para o mês atual)
        const [[resumoRows]] = await connection.execute(`
            SELECT 
                (SELECT SUM(valor) FROM financeiro WHERE MONTH(data) = MONTH(CURDATE()) AND YEAR(data) = YEAR(CURDATE()) AND tipo = 'Receita') AS faturamento,
                (SELECT SUM(valor) FROM financeiro WHERE MONTH(data) = MONTH(CURDATE()) AND YEAR(data) = YEAR(CURDATE()) AND tipo = 'Despesa') AS despesas,
                (SELECT COUNT(id) FROM ordens_servico WHERE MONTH(data_resolucao) = MONTH(CURDATE()) AND YEAR(data_resolucao) = YEAR(CURDATE()) AND status = 'Concluído') AS servicosConcluidos
        `);
        const faturamento = resumoRows.faturamento || 0;
        const despesas = resumoRows.despesas || 0;
        const lucro = faturamento - despesas;

        const resumoData = [
            ["KPI (Mês Atual)", "Valor"],
            ["Faturamento", faturamento],
            ["Despesas", despesas],
            ["Lucro Líquido", lucro],
            ["Serviços Concluídos", resumoRows.servicosConcluidos]
        ];

        // 2. Busca dados do gráfico de faturamento anual
        const sqlAnual = `SELECT MONTH(data) AS mes, SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END) AS faturamento, SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END) AS despesas FROM financeiro WHERE YEAR(data) = YEAR(CURDATE()) GROUP BY MONTH(data) ORDER BY mes ASC;`;
        const [anualRows] = await connection.execute(sqlAnual);
        const labelsAnual = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const faturamentoAnualData = [["Mês", "Faturamento", "Despesas"]];
        labelsAnual.forEach((label, index) => {
            const row = anualRows.find(r => r.mes - 1 === index) || { faturamento: 0, despesas: 0 };
            faturamentoAnualData.push([label, parseFloat(row.faturamento) || 0, parseFloat(row.despesas) || 0]);
        });

        // 3. Busca dados do gráfico de lucro por motorista
        const sqlMotorista = `SELECT m.nome AS nome_motorista, SUM(os.lucro) AS total_lucro FROM ordens_servico os JOIN motoristas m ON os.motorista_id = m.id WHERE os.status = 'Concluído' AND os.lucro > 0 GROUP BY m.id, m.nome ORDER BY total_lucro DESC;`;
        const [motoristaRows] = await connection.execute(sqlMotorista);
        const lucroMotoristaData = [["Motorista", "Lucro Total"]];
        motoristaRows.forEach(row => {
            lucroMotoristaData.push([row.nome_motorista, parseFloat(row.total_lucro) || 0]);
        });

        connection.release();

        // 4. Criação do Workbook (arquivo .xls) e das Planilhas (abas)
        const wb = XLSX.utils.book_new();
        const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
        const wsAnual = XLSX.utils.aoa_to_sheet(faturamentoAnualData);
        const wsMotorista = XLSX.utils.aoa_to_sheet(lucroMotoristaData);

        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Mensal");
        XLSX.utils.book_append_sheet(wb, wsAnual, "Evolucao Anual");
        XLSX.utils.book_append_sheet(wb, wsMotorista, "Lucro por Motorista");

        // 5. Envia o arquivo como resposta para o frontend
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
        res.send(buffer);

    } catch (err) {
        console.error("Erro ao exportar XLS:", err.message);
        res.status(500).json({ error: 'Falha ao gerar o arquivo XLS.' });
    }
});

app.put('/ordens/:id/reagendar', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { novaDataHora } = req.body;
    const osId = req.params.id;

    if (!novaDataHora) {
        return res.status(400).json({ error: 'A nova data e hora são obrigatórias.' });
    }

    // Validação para garantir que a data não está no passado
    const novaData = new Date(novaDataHora);
    if (novaData <= new Date()) {
        return res.status(400).json({ error: 'A data de reagendamento não pode ser no passado.' });
    }

    const sql = `UPDATE ordens_servico SET status = 'Agendado', data_hora = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(sql, [novaData, osId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });
        }
        res.json({ success: true, message: 'Ordem de Serviço reagendada com sucesso.' });
    } catch (err) {
        console.error("Erro ao reagendar OS:", err.message);
        res.status(500).json({ error: 'Falha ao reagendar a Ordem de Serviço.' });
    }
});


app.post('/ordens/:id/anexos', authMiddleware, permissionMiddleware(['admin_geral', 'admin', 'operacional']), async (req, res) => {
    const { autor, fileName, fileData } = req.body;
    const { id: os_id } = req.params;

    if (!fileName || !fileData) {
        return res.status(400).json({ error: 'Dados do anexo em falta.' });
    }
    const notaTexto = `Anexo adicionado: ${fileName}`;
    const sql = `INSERT INTO notas_chamado (os_id, autor, nota, tipo, nome_anexo, url_anexo, data_hora) VALUES (?, ?, ?, 'anexo', ?, ?, NOW())`;
    
    try {
        const [result] = await pool.execute(sql, [os_id, autor, notaTexto, fileName, fileData]);
        
        // NOVO LOG: Anexo adicionado à OS
        const detalhes = `Anexo "${fileName}" adicionado à OS #${os_id}.`;
        await registrarLog(req.user.id, req.user.nome, 'OS_ANEXO_ADICIONADO', detalhes);

        res.status(201).json({ id: result.insertId, message: 'Anexo guardado com sucesso.' });
    } catch (err) {
        console.error("Erro ao guardar anexo:", err.message);
        res.status(500).json({ error: 'Falha ao guardar o anexo.' });
    }
});

app.get('/ordens/motorista/:id', authMiddleware, async (req, res) => {
    const { id: motoristaId } = req.params;
    try {
        const sql = 'SELECT * FROM ordens_servico WHERE motorista_id = ? ORDER BY data_hora DESC';
        const [rows] = await pool.execute(sql, [motoristaId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar ordens do motorista:", err.message);
        res.status(500).json({ error: 'Falha ao buscar ordens.' });
    }
});

app.get('/dashboard/motorista/:id/produtividade', authMiddleware, async (req, res) => {
    const { id: motoristaId } = req.params;
    try {
        const sql = `
            SELECT 
                DATE_FORMAT(d.d, '%d/%m') AS dia,
                COUNT(os.id) AS concluidas
            FROM 
                (SELECT CURDATE() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS d
                 FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
                 CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
                 CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS c
                ) AS d
            LEFT JOIN ordens_servico os ON DATE(os.data_resolucao) = d.d AND os.motorista_id = ? AND os.status = 'Concluído'
            WHERE d.d BETWEEN CURDATE() - INTERVAL 6 DAY AND CURDATE()
            GROUP BY d.d
            ORDER BY d.d ASC;
        `;
        const [rows] = await pool.execute(sql, [motoristaId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar produtividade do motorista:", err.message);
        res.status(500).json({ error: 'Falha ao buscar dados do gráfico.' });
    }
});


// --- INICIAR SERVIDOR (DEVE SER A ÚLTIMA COISA NO ARQUIVO) ---
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});