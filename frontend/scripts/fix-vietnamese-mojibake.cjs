const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const BACKUP = process.argv.includes('--no-backup') ? false : true;

const EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.json', '.md', '.txt'
]);

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.vite', 'target', '.mvn'
]);

const CP1252 = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85],
  ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8A],
  ['‹', 0x8B], ['Œ', 0x8C], ['Ž', 0x8E], ['‘', 0x91], ['’', 0x92],
  ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97],
  ['˜', 0x98], ['™', 0x99], ['š', 0x9A], ['›', 0x9B], ['œ', 0x9C],
  ['ž', 0x9E], ['Ÿ', 0x9F]
]);

const SUSPICIOUS_RE = /(Ã|Â|Ä|Æ|áº|á»|â€|â€™|â€œ|â€|â€“|â€”|â€¦|�)/;
const TOKEN_RE = /[^\s"'`<>={}()[\];,]+/g;

function suspiciousScore(text) {
  const matches = text.match(/(Ã|Â|Ä|Æ|áº|á»|â€|â€™|â€œ|â€|â€“|â€”|â€¦|�)/g);
  return matches ? matches.length : 0;
}

function toCp1252Bytes(text) {
  const bytes = [];

  for (const ch of text) {
    const code = ch.codePointAt(0);

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    if (CP1252.has(ch)) {
      bytes.push(CP1252.get(ch));
      continue;
    }

    return null;
  }

  return Buffer.from(bytes);
}

function decodeOnce(text) {
  const bytes = toCp1252Bytes(text);
  if (!bytes) return text;

  const decoded = bytes.toString('utf8');
  if (!decoded || decoded.includes('�')) return text;

  return decoded;
}

function fixToken(token) {
  if (!SUSPICIOUS_RE.test(token)) return token;

  let current = token;
  let best = token;
  let bestScore = suspiciousScore(token);

  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(current);
    if (next === current) break;

    const nextScore = suspiciousScore(next);

    if (nextScore <= bestScore) {
      best = next;
      bestScore = nextScore;
    }

    current = next;
  }

  return bestScore < suspiciousScore(token) ? best : token;
}

function fixContent(content) {
  return content.replace(TOKEN_RE, (token) => fixToken(token));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(fullPath, files);
      continue;
    }

    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function makeBackupPath(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rel = path.relative(ROOT, file);
  return path.join(ROOT, `.mojibake-backup-${stamp}`, rel);
}

function main() {
  console.log('====================================');
  console.log('Vietnamese mojibake fixer');
  console.log('Root :', ROOT);
  console.log('Mode :', APPLY ? 'APPLY changes' : 'DRY RUN only');
  console.log('Backup:', BACKUP && APPLY ? 'yes' : 'no');
  console.log('====================================');

  const files = walk(ROOT);
  let changedFiles = 0;
  let scannedFiles = 0;

  for (const file of files) {
    scannedFiles++;

    const before = fs.readFileSync(file, 'utf8');
    if (!SUSPICIOUS_RE.test(before)) continue;

    const after = fixContent(before);

    if (after !== before) {
      changedFiles++;
      console.log(`${APPLY ? 'FIX' : 'WOULD FIX'}: ${path.relative(ROOT, file)}`);

      if (APPLY) {
        if (BACKUP) {
          const backupPath = makeBackupPath(file);
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
          fs.writeFileSync(backupPath, before, 'utf8');
        }

        fs.writeFileSync(file, after, 'utf8');
      }
    }
  }

  console.log('====================================');
  console.log('Scanned files:', scannedFiles);
  console.log(APPLY ? 'Fixed files:' : 'Files that would be fixed:', changedFiles);
  console.log('====================================');

  if (!APPLY) {
    console.log('Dry run only. To really fix, run again with --apply');
  }
}

main();
