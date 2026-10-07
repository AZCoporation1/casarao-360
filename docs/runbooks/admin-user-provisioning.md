# Runbook — Provisionamento de usuário administrativo (staff)

**Projeto:** xhemqctqilpfjycesusr · **Atualizado:** 2026-09-01

O Acesso Restrito (`/login` → `/admin`) agora exige **Supabase Auth real +
profile administrativo**. As credenciais mock (`davi@casarao360.com/casarao2024`)
só funcionam em modo mock (desenvolvimento) e NUNCA em produção.

Camadas de proteção (todas precisam passar):
1. `proxy.ts` — sessão + `profiles.role` ∈ {owner, admin, manager, staff, viewer};
2. `app/admin/layout.tsx` — revalida no servidor;
3. `loginAction` — não-staff recebe signOut + mensagem;
4. RLS — policies staff via `has_org_role`/`profiles`.

## Criar um novo usuário staff

**Passo 1 — Criar o usuário no Supabase Auth** (nunca por SQL com senha):
- Dashboard → Authentication → Users → *Add user* → email + senha forte
  (✔ Auto Confirm User), **ou** via Auth Admin API:

```bash
curl -X POST "https://api.supabase.com/v1/projects/xhemqctqilpfjycesusr/auth/users" \
  -H "Authorization: Bearer <management-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"davi@ocasarao.com.br","password":"<senha-forte>","email_confirm":true}'
```

**Passo 2 — Criar o profile administrativo** (Management API / SQL Editor):

```sql
INSERT INTO public.profiles (id, organization_id, full_name, role)
VALUES (
  '<auth_user_id do passo 1>',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- organização O Casarão
  'Davi',
  'admin'  -- owner | admin | manager | staff | viewer
)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
```

**Passo 3 — Validar:**
- Login em `/login` com as novas credenciais → deve abrir `/admin`;
- Login com conta de CLIENTE em `/login` → deve ser recusado com
  "Esta conta não tem acesso administrativo";
- Cliente logado acessando `/admin` direto → redirect para `/minha-conta?erro=acesso`.

## Papéis

| Role | Uso |
|---|---|
| owner | proprietário (Davi) — acesso total |
| admin | administração geral |
| manager | operação de reservas (confirmar/cancelar exigem owner/admin/manager) |
| staff | operação de salão (leitura) |
| viewer | somente leitura |

Os RPCs `admin_confirm_reservation`/`admin_cancel_reservation` (00023) exigem
owner/admin/manager — staff/viewer conseguem VER o painel mas não transicionar
reservas.

## Nunca fazer

- Senhas em arquivos SQL/commits;
- INSERT manual em `auth.users`;
- Adicionar `customer` ao enum `user_role` (handoff §37/§97);
- Usar `profiles` para clientes — cliente é `customers.auth_user_id`.
