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

  const protectedRoutes = ['/admin/dashboard/overview', '/admin/dashboard/students'];

  const isProtected = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`));

  // 2. Unauthenticated Redirects
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Prevent logged-in users from seeing the login page and landing page
  if (user && publicRoutes.includes(path)) {
    const home = profile?.role ? `${profile.role}/dashboard/overview` : 'admin/dashboard/overview';
    return NextResponse.redirect(new URL(`/${home}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/:path*/dashboard/:path*'],
};
