import { test, expect } from '@playwright/test';

// Smoke — verificações estruturais rápidas. Os fluxos completos estão em
// 10-booking.spec.ts e 20-admin.spec.ts.
test.describe('Casarão 360 — Smoke', () => {

  test('01. Homepage carrega com título do Casarão', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Casarão|Reserva/i);
  });

  test('02. CTA de reserva visível na homepage', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page.getByRole('link', { name: /Reservar|Experiência/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('03. Programação lista eventos', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page.locator('h1', { hasText: /Agenda|Programação|Experiências/i })).toBeVisible();
    const events = page.locator('.grid > div');
    await expect(events).not.toHaveCount(0);
  });

  test('04. Mapa do salão renderiza mesas interativas', async ({ page }) => {
    await page.goto('/eventos');
    const firstEvent = page.locator('a[href^="/reservar/"]').first();
    await firstEvent.click();
    // O mapa renderiza botões de mesa com aria-label "Mesa X — status — N lugares"
    await expect(page.getByRole('button', { name: /^Mesa / }).first()).toBeVisible({ timeout: 15_000 });
    // Legenda inclui o estado "Não combinável" (roxo)
    await expect(page.getByText('Não combinável')).toBeVisible();
  });

  test('05. /admin sem sessão redireciona para /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('06. Todas as rotas /admin/* exigem sessão', async ({ page }) => {
    await page.goto('/admin/reservas');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
