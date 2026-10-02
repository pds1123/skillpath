import { spawnSync } from 'node:child_process';

const compose = (...args) => spawnSync('docker', ['compose', ...args], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'inherit',
});

const database = compose('--profile', 'test', 'up', '--detach', '--wait', 'postgres-e2e');
if (database.status !== 0) {
  process.exit(database.status ?? 1);
}

try {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const tests = spawnSync(command, ['playwright', 'test'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SKILLPATH_E2E_CONNECTION_STRING:
        'Host=127.0.0.1;Port=55432;Database=skillpath_e2e;Username=skillpath;Password=skillpath-test-password',
    },
    stdio: 'inherit',
  });
  process.exitCode = tests.status ?? 1;
} finally {
  compose('--profile', 'test', 'rm', '--stop', '--force', 'postgres-e2e');
}
