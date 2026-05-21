import {NextRequest, NextResponse} from "next/server";

const publicPaths = ['/sign-in', '/sign-up'];

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path === '/') {
        return NextResponse.redirect(new URL("/letters", request.nextUrl), {status: 308});
    }

    // Middleware level cookie check skip කරන්න
    // Auth check frontend side (auth-store) handle කරනවා
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}