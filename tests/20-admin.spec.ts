import { test, expect } from '@playwright/test';
import { readState } from './e2e-helpers';
import './env';

// ADM sincronizado (Gate 1 §109/§111): staff real entra, vê a MESMA reserva
// criada pelo cliente, confirma e cancela via RPCs transacionais; cliente
// comum não entra no /admin.
test.describe.configure({ mode: 'serial' });

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test('cliente autenticado NÃO acessa /admin (gate de role)', async ({ page, context }) => {
  const state = readState();
  test.skip(!state.userBEmail, 'login de cliente E2E não disponível');

  await context.clearCookies();
  await page.goto('/entrar');
  await page.getByPlaceholder('seu@email.com').fill(state.userBEmail);
  await page.getByPlaceholder('••••••••••').fill(state.userBPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/\/minha-conta/);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/minha-conta\?erro=acesso/);
});

test('staff: login real → Central de Reservas mostra a reserva do cliente → confirmar e cancelar', async ({ page, context }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD não configurados no .env.local');
  const state = readState();
  test.skip(!state.reservationCode, 'código de reserva E2E não disponível');

  await context.clearCookies();
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(ADMIN_EMAIL!);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /Entrar|Acessar/i }).click();
  await page.waitForURL(/\/admin/);

  await page.goto('/admin/reservas');
  // O evento do fixture é o primeiro futuro (auto-selecionado); garante via select
  const select = page.locator('select').first();
  if (state.eventTitle) {
    await select.selectOption({ label: await select.locator('option', { hasText: state.eventTitle }).first().textContent() ?? '' }).catch(() => {});
  }

  // A MESMA reservation do cliente aparece para o ADM (§115)
  const code = state.reservationCode;
  await expect(page.getByText(code)).toBeVisible({ timeout: 15_000 });

  // Card da reserva = menor container com o código E os botões de ação
  const card = page
    .locator('div')
    .filter({ hasText: code })
    .filter({ has: page.getByRole('button', { name: /Confirmar/ }) })
    .last();

  await card.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByText(code)).toBeVisible();
  // Após confirmar, o card passa a oferecer Cancelar (estado confirmada)
  const cardAfter = page
    .locator('div')
    .filter({ hasText: code })
    .filter({ has: page.getByRole('button', { name: /Cancelar/ }) })
    .last();
  await expect(cardAfter.getByRole('button', { name: /Cancelar/ })).toBeVisible({ timeout: 15_000 });

  // Cancela (RPC libera allocations e o trigger devolve as mesas para free)
  page.once('dialog', dialog => dialog.accept());
  await cardAfter.getByRole('button', { name: /Cancelar/ }).click();
  await expect(page.getByText(/Cancelada/i).first()).toBeVisible({ timeout: 15_000 });
});
