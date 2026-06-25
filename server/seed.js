import bcrypt from 'bcryptjs';
import { initSchema, run, get } from './db.js';

async function seed() {
  await initSchema();

  // Default roles
  const adminRole = await get(`SELECT id FROM roles WHERE name = ?`, ['admin']);
  let adminRoleId = adminRole?.id;
  if (!adminRoleId) {
    const result = await run(
      `INSERT INTO roles (name, permissions) VALUES (?, ?)`,
      ['admin', JSON.stringify(['board', 'backlog', 'wiki', 'reports', 'team', 'settings', 'manage_users'])]
    );
    adminRoleId = result.id;
  }

  const userRole = await get(`SELECT id FROM roles WHERE name = ?`, ['user']);
  let userRoleId = userRole?.id;
  if (!userRoleId) {
    const result = await run(
      `INSERT INTO roles (name, permissions) VALUES (?, ?)`,
      ['user', JSON.stringify(['board', 'wiki', 'team'])]
    );
    userRoleId = result.id;
  }

  // Default admin account
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskflow.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = await get(`SELECT id FROM users WHERE email = ?`, [adminEmail]);

  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await run(
      `INSERT INTO users (email, password_hash, name, role_id) VALUES (?, ?, ?, ?)`,
      [adminEmail, hash, 'Administrator', adminRoleId]
    );
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
