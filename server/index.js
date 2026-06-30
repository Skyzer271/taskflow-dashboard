import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema, run, get, all } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-change-in-production';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true; // allow all in development

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requirePermission(permission) {
  return async (req, res, next) => {
    const role = await get(`SELECT permissions FROM roles WHERE id = ?`, [req.user.role_id]);
    const permissions = JSON.parse(role?.permissions || '[]');
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user.role_name !== 'admin') {
    return res.status(403).json({ error: 'Admin required' });
  }
  next();
}

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await get(
    `SELECT users.id, users.email, users.name, users.password_hash, users.role_id, roles.name as role_name, roles.permissions
     FROM users JOIN roles ON users.role_id = roles.id WHERE users.email = ?`,
    [email]
  );

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role_id: user.role_id, role_name: user.role_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role_id: user.role_id,
      role_name: user.role_name,
      permissions: JSON.parse(user.permissions || '[]'),
    },
  });
});

// Current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  const role = await get(`SELECT name, permissions FROM roles WHERE id = ?`, [req.user.role_id]);
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role_id: req.user.role_id,
    role_name: role?.name,
    permissions: JSON.parse(role?.permissions || '[]'),
  });
});

// List roles
app.get('/api/roles', authenticate, async (req, res) => {
  const roles = await all(`SELECT id, name, permissions FROM roles ORDER BY id`);
  res.json(roles.map((r) => ({ ...r, permissions: JSON.parse(r.permissions || '[]') })));
});

// List users (admin only)
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
  const users = await all(
    `SELECT users.id, users.email, users.name, users.created_at, roles.id as role_id, roles.name as role_name
     FROM users JOIN roles ON users.role_id = roles.id ORDER BY users.id`
  );
  res.json(users);
});

// Public team list for any authenticated user
app.get('/api/team', authenticate, async (req, res) => {
  const users = await all(
    `SELECT users.id, users.email, users.name, roles.name as role_name
     FROM users JOIN roles ON users.role_id = roles.id ORDER BY users.name`
  );
  res.json(users);
});

// Create user (admin only)
app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { email, name, password, role_id } = req.body;
  if (!email || !name || !password || !role_id) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const role = await get(`SELECT id FROM roles WHERE id = ?`, [role_id]);
  if (!role) return res.status(400).json({ error: 'Invalid role' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (email, password_hash, name, role_id) VALUES (?, ?, ?, ?)`,
      [email, hash, name, role_id]
    );
    res.status(201).json({ id: result.id, email, name, role_id });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

// Update user (admin only)
app.patch('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, name, role_id, password } = req.body;

  const existing = await get(`SELECT id FROM users WHERE id = ?`, [id]);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (role_id) {
    const role = await get(`SELECT id FROM roles WHERE id = ?`, [role_id]);
    if (!role) return res.status(400).json({ error: 'Invalid role' });
  }

  const updates = [];
  const params = [];
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (role_id !== undefined) { updates.push('role_id = ?'); params.push(role_id); }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  try {
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.status(200).json({ id: Number(id), email, name, role_id });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  await run(`DELETE FROM users WHERE id = ?`, [id]);
  res.status(204).send();
});

// Permission check helper
app.get('/api/permissions/:permission', authenticate, async (req, res) => {
  const permission = req.params.permission;
  const role = await get(`SELECT permissions FROM roles WHERE id = ?`, [req.user.role_id]);
  const permissions = JSON.parse(role?.permissions || '[]');
  res.json({ allowed: permissions.includes(permission) });
});

async function start() {
  await initSchema();

  // Serve static frontend build in production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, '..', 'dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(distPath));
    app.use((req, res) => {
      if (req.url.startsWith('/api')) return res.status(404).send('Not found');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskFlow server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
