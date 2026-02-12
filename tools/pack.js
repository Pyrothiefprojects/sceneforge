#!/usr/bin/env node

// Packs asset files for deployment
// Usage: node pack.js <file> <key>

const fs = require('fs');
const crypto = require('crypto');

const inputFile = process.argv[2];
const key = process.argv[3];

if (!inputFile || !key) {
    console.error('Usage: node pack.js <file> <key>');
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
}

const salt = Buffer.from('sceneforge-audio', 'utf8');
const dk = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
const iv = crypto.randomBytes(12);

const data = fs.readFileSync(inputFile);
const c = crypto.createCipheriv('aes-256-gcm', dk, iv);
const out = Buffer.concat([c.update(data), c.final()]);
const tag = c.getAuthTag();

fs.writeFileSync(inputFile, Buffer.concat([iv, tag, out]));

console.log(`${inputFile} (${data.length} -> ${iv.length + tag.length + out.length})`);
