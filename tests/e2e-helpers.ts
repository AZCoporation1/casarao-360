import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import './env';

// Todo dado E2E usa este domínio — o global-teardown limpa por ele.
export const E2E_EMAIL_DOMAIN = 'casarao360.test';

export interface E2EUser {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

let userCounter = 0;

export function uniqueUser(tag: string): E2EUser {
  const runId = Date.now().toString(36);
  userCounter += 1;
  const phoneSuffix = String(Date.now() + userCounter).slice(-8);
  return {
    name: `E2E ${tag} ${runId}`,
    email: `e2e_${tag}_${runId}_${userCounter}@${E2E_EMAIL_DOMAIN}`,
    phone: `119${phoneSuffix}`,
    cpf: '390.533.447-05',
    password: `E2e!${runId}${userCounter}`,
  };
}

export async function getEventIdByTitle(title: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apikey) throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes no .env.local');
  const res = await fetch(
    `${url}/rest/v1/events?title=eq.${encodeURIComponent(title)}&select=id`,
    { headers: { apikey, Authorization: `Bearer ${apikey}` } }
  );
  const rows = (await res.json()) as { id: string }[];
  if (!rows?.[0]?.id) throw new Error(`Evento não encontrado: ${title}`);
  return rows[0].id;
}

// Próximo evento reservável (data futura) — fixture dinâmico: eventos passam
// a "realizado" com o tempo, então nenhum spec pode fixar um título.
export async function getNextBookableEvent(): Promise<{ id: string; title: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apikey) throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes no .env.local');
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `${url}/rest/v1/events?select=id,title,event_date&event_date=gt.${today}&public_visibility=eq.true&order=event_date&limit=1`,
    { headers: { apikey, Authorization: `Bearer ${apikey}` } }
  );
  const rows = (await res.json()) as { id: string; title: string }[];
  if (!rows?.[0]?.id) throw new Error('Nenhum evento futuro reservável encontrado');
  return { id: rows[0].id, title: rows[0].title };
}

// Mesas livres: botões habilitados cujo aria-label contém "Disponível"
export function freeTableButtons(page: Page) {
  return page.getByRole('button', { name: /— Disponível —/ }).and(page.locator(':enabled'));
}

export async function selectFirstFreeTable(page: Page): Promise<string> {
  const btn = freeTableButtons(page).first();
  const label = (await btn.getAttribute('aria-label')) || '';
  await btn.click();
  return label;
}

// Clica em uma mesa livre DIFERENTE das já selecionadas (mesas selecionadas
// continuam com aria-label "Disponível" e habilitadas — clicar de novo
// desselecionaria). excludeLabels usa o prefixo "Mesa X-YY".
export async function clickFreeTableExcluding(page: Page, excludeLabels: string[]): Promise<string> {
  const prefixes = excludeLabels.map(l => l.split(' — ')[0]);
  const buttons = freeTableButtons(page);
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const label = (await b.getAttribute('aria-label')) || '';
    if (!prefixes.includes(label.split(' — ')[0])) {
      await b.click();
      return label;
    }
  }
  throw new Error('Nenhuma mesa livre alternativa encontrada no mapa');
}

// Seleciona uma mesa livre que TENHA pelo menos uma parceira combinável
// (deny-by-default: nem toda mesa tem par permitido — ex.: 01 e 02 não têm).
// Após selecionar, alguma mesa livre precisa continuar habilitada além da
// própria; senão desseleciona e tenta a próxima.
export async function selectFreeTableWithPartner(page: Page): Promise<string> {
  const buttons = freeTableButtons(page);
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const label = (await b.getAttribute('aria-label')) || '';
    await b.click();
    // aguarda o recálculo de compatibilidade
    await page.waitForTimeout(300);
    const stillFree = freeTableButtons(page);
    const freeCount = await stillFree.count();
    // >1 = existe outra mesa livre habilitada além da própria selecionada
    if (freeCount > 1) return label;
    // sem parceiras: desseleciona e tenta a próxima
    await page.getByRole('button', { name: label }).click();
    await page.waitForTimeout(150);
  }
  throw new Error('Nenhuma mesa livre com parceira combinável encontrada');
}

export async function fillInlineSignup(page: Page, user: E2EUser) {
  await page.getByPlaceholder('Ex: João da Silva').fill(user.name);
  await page.getByPlaceholder('(11) 99999-9999').fill(user.phone);
  await page.getByPlaceholder('000.000.000-00').fill(user.cpf);
  await page.getByPlaceholder('seu@email.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
}

// Estado compartilhado entre specs (workers=1, ordem alfabética de arquivos)
const STATE_FILE = path.resolve(__dirname, '.e2e-state.json');

export function saveState(data: Record<string, string>) {
  const current = readState();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...data }, null, 2));
}

export function readState(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}
