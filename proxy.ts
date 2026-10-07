import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Papéis administrativos válidos (profiles é domínio exclusivamente staff —
// clientes vivem em customers.auth_user_id e nunca têm row aqui)
const STAFF_ROLES = ['owner', 'admin', 'manager', 'staff', 'viewer'];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Se não tem Supabase configurado (modo mock), permite tudo
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  // Lê a role administrativa (RLS auth_read_own_profile: só a própria row).
  // Cliente comum não tem row em profiles → não é staff.
  async function getStaffRole(): Promise<string | null> {
    if (!user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role;
    return role && STAFF_ROLES.includes(role) ? role : null;
  }

  // Proteger rotas /admin: exige sessão E profile administrativo válido
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    const role = await getStaffRole();
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = '/minha-conta';
      url.search = '';
      url.searchParams.set('erro', 'acesso');
      return NextResponse.redirect(url);
    }
  }

  // Proteger rotas /minha-conta
  if (request.nextUrl.pathname.startsWith('/minha-conta')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/entrar';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Logado tentando acessar /login: staff vai para /admin, cliente para /minha-conta
  if (request.nextUrl.pathname === '/login' && user) {
    const role = await getStaffRole();
    const url = request.nextUrl.clone();
    url.pathname = role ? '/admin' : '/minha-conta';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Se está logado e tenta acessar /entrar, redirecionar para /minha-conta
  if (request.nextUrl.pathname === '/entrar' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/minha-conta';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/minha-conta/:path*', '/entrar'],
};
