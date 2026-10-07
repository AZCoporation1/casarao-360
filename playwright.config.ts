import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — Central Casarão 360 (Gate 1)
 *
 * Os testes rodam contra o dev server local apontando para o Supabase OFICIAL
 * (não há ambiente local de banco). Todo dado criado usa o domínio
 * @casarao360.test e é removido no globalTeardown (tests/global-teardown.ts,
 * service role). Pós-lançamento: migrar para um projeto/branch de staging.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // dados compartilham o banco vivo — serial evita corrida entre specs
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalTeardown: './tests/global-teardown.ts',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // firefox/webkit só quando explicitamente pedido (velocidade no dia a dia)
    ...(process.env.PW_ALL_BROWSERS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
