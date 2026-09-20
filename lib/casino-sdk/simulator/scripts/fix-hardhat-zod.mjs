import { createRequire } from 'node:module';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const majorOf = packageJsonPath => Number(require(packageJsonPath).version.split('.')[0]);

let zodUtilsDir;
try {
  zodUtilsDir = dirname(require.resolve('@nomicfoundation/hardhat-zod-utils/package.json'));
} catch {
  process.exit(0); // hardhat not installed — nothing to fix
}

const requireFromZodUtils = createRequire(resolve(zodUtilsDir, 'noop.js'));
try {
  if (majorOf(requireFromZodUtils.resolve('zod/package.json')) === 3) process.exit(0);
} catch {
  // zod not resolvable at all — fall through and link one in
}

const hardhatDir = dirname(require.resolve('hardhat/package.json'));
const requireFromHardhat = createRequire(resolve(hardhatDir, 'noop.js'));
const hardhatZod = dirname(requireFromHardhat.resolve('zod/package.json'));
if (majorOf(resolve(hardhatZod, 'package.json')) !== 3) {
  console.error('[fix-hardhat-zod] No zod v3 copy found in the hardhat tree; cannot fix.');
  process.exit(1);
}

const link = resolve(zodUtilsDir, 'node_modules/zod');
mkdirSync(dirname(link), { recursive: true });
rmSync(link, { recursive: true, force: true });
symlinkSync(hardhatZod, link, 'junction');
console.log(`[fix-hardhat-zod] Linked ${link} -> ${hardhatZod}`);
