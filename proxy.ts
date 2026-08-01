import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Refresh Auth Token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null };

  const path = request.nextUrl.pathname;

  const publicRoutes = ['/login', '/'];

  const roleRoutes: Record<string, string> = {
    admin: '/admin',
    teacher: '/teacher',
    student: '/student',
  };

  const currentRolePrefix = Object.values(roleRoutes).find(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  const home = profile?.role
    ? `/${profile.role}/dashboard/overview`
    : '/admin/dashboard/overview';

  // 2. Unauthenticated Redirects
  if (!user && currentRolePrefix) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Prevent logged-in users from seeing the login page and landing page
  if (user && publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // 4. Role-based Access Control - redirect to own home on role mismatch
  if (user && currentRolePrefix && currentRolePrefix !== `/${profile?.role}`) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
