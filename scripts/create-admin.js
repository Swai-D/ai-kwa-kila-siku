#!/usr/bin/env node
// Usage: npm run create-admin -- you@example.com "Your Name"
// The password is read from the prompt (or ADMIN_PASSWORD for automation). Re-running for an
// existing email resets that user's password.
const readline = require('readline');
const db = require('../src/db');
const { hashPassword } = require('../src/admin/auth');

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim() || 'Admin';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
      else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n');
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

(async () => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Usage: npm run create-admin -- you@example.com "Your Name"');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 10 characters): '));
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }
  const hash = hashPassword(password);
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?').run(hash, name, existing.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    console.log(`Updated password for ${email}.`);
  } else {
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run(email.toLowerCase(), hash, name);
    console.log(`Created admin ${email}.`);
  }
})();
