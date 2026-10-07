import { test, expect } from '@playwright/test';
import {
  uniqueUser,
  getNextBookableEvent,
  selectFirstFreeTable,
  selectFreeTableWithPartner,
  clickFreeTableExcluding,
  fillInlineSignup,
  saveState,
} from './e2e-helpers';

// Fluxo do cliente (Gate 1 §109): cadastro inline obrigatório, 1–2 mesas,
// roxo/incompatível, 3ª mesa bloqueada, >8 → WhatsApp, duplicada bloqueada,
// isolamento RLS. Roda contra o Supabase oficial — dados limpos no teardown.
test.describe.configure({ mode: 'serial' });

let eventId: string;

test.beforeAll(async () => {
  const event = await getNextBookableEvent();
  eventId = event.id;
  saveState({ eventTitle: event.title });
});

test('cadastro inline + 1 mesa → redirect para o detalhe, e duplicada é bloqueada', async ({ page }) => {
  const userA = uniqueUser('userA');
  await page.goto(`/reservar/${eventId}`);

  await selectFirstFreeTable(page);
  await expect(page.getByText('1 mesa(s) selecionada(s)')).toBeVisible();

  await fillInlineSignup(page, userA);
  await page.getByRole('button', { name: 'Criar Conta e Reservar' }).click();

  // Fim da tela morta (§46): redirect direto para o detalhe da reserva
  await page.waitForURL(/\/minha-conta\/reservas\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await expect(page.getByText(/CAS-[A-Z0-9]{8}/)).toBeVisible();

  const reservationUrl = page.url();
  const code = (await page.getByText(/CAS-[A-Z0-9]{8}/).first().textContent())?.match(/CAS-[A-Z0-9]{8}/)?.[0] ?? '';
  saveState({ reservationUrl, reservationCode: code, userAEmail: userA.email, userAPassword: userA.password });

  // Uma reserva self-service ativa por customer+event (§47)
  await page.goto(`/reservar/${eventId}`);
  await selectFirstFreeTable(page);
  await page.getByRole('button', { name: 'Confirmar Reserva' }).click();
  await expect(page.getByText(/já possui uma reserva/i)).toBeVisible();
});

test('multimesa: roxo para incompatíveis, 2ª não substitui, 3ª bloqueia, >8 vai para WhatsApp', async ({ page, context }) => {
  await context.clearCookies();
  const userB = uniqueUser('userB');
  await page.goto(`/reservar/${eventId}`);

  // 1ª mesa — precisa ter parceira combinável (deny-by-default: 01/02 não têm)
  const firstLabel = await selectFreeTableWithPartner(page);
  await expect(page.getByText('1 mesa(s) selecionada(s)')).toBeVisible();

  // Estado roxo: com 1 selecionada, mesas sem regra de combinação ficam
  // desabilitadas e anunciadas como não combináveis (§57-59)
  const incompatible = page.getByRole('button', { name: /Não combinável/ });
  await expect(incompatible.first()).toBeVisible();
  expect(await incompatible.count()).toBeGreaterThan(0);

  // 2ª mesa compatível (livre, habilitada, diferente da 1ª) — NÃO substitui
  const secondLabel = await clickFreeTableExcluding(page, [firstLabel]);
  await expect(page.getByText('2 mesa(s) selecionada(s)')).toBeVisible();

  // 3ª mesa: bloqueia com aviso + CTA WhatsApp (§57), seleção intacta
  await clickFreeTableExcluding(page, [firstLabel, secondLabel]);
  await expect(page.getByText('Máximo de 2 mesas por reserva online')).toBeVisible();
  await expect(page.getByText('2 mesa(s) selecionada(s)')).toBeVisible();

  // >8 pessoas: esconde submit e oferece reserva personalizada via WhatsApp
  const people = page.locator('input[type="number"]');
  await people.fill('9');
  await expect(page.getByText('Reserva Personalizada para Grupos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar Conta e Reservar' })).toBeHidden();

  // Volta para 4 e concluí com cadastro inline — 1 reservation, 2 mesas
  await people.fill('4');
  await fillInlineSignup(page, userB);
  await page.getByRole('button', { name: 'Criar Conta e Reservar' }).click();
  await page.waitForURL(/\/minha-conta\/reservas\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await expect(page.getByText(/CAS-[A-Z0-9]{8}/)).toBeVisible();

  saveState({ userBEmail: userB.email, userBPassword: userB.password });
});

test('RLS: cliente B não abre a reserva do cliente A', async ({ page }) => {
  const { readState } = await import('./e2e-helpers');
  const state = readState();
  test.skip(!state.reservationUrl || !state.userBEmail, 'dados dos specs anteriores não disponíveis');

  // Cada teste tem contexto novo — loga como userB primeiro
  await page.goto('/entrar');
  await page.getByPlaceholder('seu@email.com').fill(state.userBEmail);
  await page.getByPlaceholder('••••••••••').fill(state.userBPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/\/minha-conta/, { timeout: 20_000 });

  await page.goto(state.reservationUrl);
  await expect(page.getByText('Reserva não encontrada')).toBeVisible();
});
