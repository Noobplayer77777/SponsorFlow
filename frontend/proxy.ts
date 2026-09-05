import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    const isAuth = !!token;
    const isAuthPage = path.startsWith('/login');

    // If trying to access login page while already logged in
    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL(token.role === 'ADMIN' ? '/admin' : '/member', req.url));
      }
      return null;
    }

    // Unauthenticated users are sent to login
    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-based routing enforcement
    if (token.role === 'ADMIN') {
      // Admins should stay on Admin pages, block them from /member
      if (path.startsWith('/member')) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    } else {
      // Members should stay on Member pages, block them from /admin and /users
      if (path.startsWith('/admin') || path.startsWith('/users')) {
        return NextResponse.redirect(new URL('/member', req.url));
      }
    }

    return null;
  },
  {
    callbacks: {
      // The authorized callback must return true to let the middleware function handle all routing logic
      authorized: () => true,
    }
  }
);

export const config = {
  matcher: [
    '/admin/:path*', 
    '/member/:path*', 
    '/users/:path*',
    '/companies/:path*',
    '/login'
  ]
};
