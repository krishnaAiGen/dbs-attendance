import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Student trying to access professor routes
    if (path.startsWith('/professor') && token?.role !== 'professor') {
      return NextResponse.redirect(new URL('/student/dashboard', req.url))
    }

    // Professor trying to access student routes
    if (path.startsWith('/student') && token?.role !== 'student') {
      return NextResponse.redirect(new URL('/professor/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/student/:path*', '/professor/:path*'],
}

