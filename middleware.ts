

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();



  const path = request.nextUrl.pathname;

  const publicRoutes = ['/login', '/'];

  const protectedRoutes = ["/admin/dashboard/overview"];

  // 2. Unauthenticated Redirects
  if (!user && protectedRoutes.includes(path)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Prevent logged-in users from seeing the login page and landing page
  if (user && publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL(`${profile?.role}/dashboard/overview`, request.url));
  }



  return supabaseResponse;
}

export const config = {
  matcher: ['/:path*/dashboard', '/login', '/'],
};
