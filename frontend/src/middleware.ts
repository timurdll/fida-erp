import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthed = request.cookies.has('is_authed')
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === '/login'

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL('/journal', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}
