// Exercise the packed artifact outside the repository's module-resolution tree.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (cmd, args, cwd) => {
    const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0) throw new Error(`${cmd} failed: ${result.error ?? result.status}`);
};
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const file = process.env.TEST_TARBALL ?? (pkg.name.replace('@', '').replace('/', '-') + '-' + pkg.version + '.tgz');
if (!process.env.TEST_TARBALL) run('npm', ['pack'], process.cwd());
const consumer = mkdtempSync(join(tmpdir(), 'cletter-consumer-'));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'package-consumer', private: true, type: 'module' }));
const manager = process.env.TEST_MANAGER ?? 'npm';
copyFileSync(resolve(file), join(consumer, 'package.tgz'));
const tarball = './package.tgz';
if (manager === 'npm') run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);
else if (manager === 'pnpm') run('npx', ['--yes', 'pnpm@10.15.1', 'add', '--ignore-scripts', tarball], consumer);
else if (manager === 'yarn') run('npx', ['--yes', 'yarn@1.22.22', 'add', '--ignore-scripts', tarball], consumer);
else if (manager === 'bun') run('bun', ['add', '--ignore-scripts', tarball], consumer);
else throw new Error(`Unknown manager ${manager}`);
for (const script of ['consumer.mjs', 'verify-api.mjs']) copyFileSync('scripts/' + script, join(consumer, script));
run('node', ['consumer.mjs'], consumer);
run('bun', ['consumer.mjs'], consumer);
// Both TypeScript resolver modes must find declarations from the installed package.
const verify = readFileSync('scripts/verify-api.mjs', 'utf8');
const body = verify.slice(verify.indexOf('    check(api.')).replace(/\n}\n$/, '\n');
const sample = `import * as api from '${pkg.name}';\nconst check = (a: unknown, b: unknown): void => {};\n${body}`;
for (const extension of ['mts', 'cts']) writeFileSync(join(consumer, 'consumer.' + extension), sample);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({compilerOptions: {noEmit: true, strict: true, module: 'NodeNext', target: 'ES2022', types: []}, files: ['consumer.mts', 'consumer.cts']}));
run('node', [resolve('node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], consumer);
console.log(`${pkg.name}: ${manager} installation and both declaration modes passed`);
