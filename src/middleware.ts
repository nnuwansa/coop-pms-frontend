// import {NextRequest, NextResponse} from "next/server";
// import {decodeJwt} from "jose";

// const publicPaths = ['/sign-in', '/sign-up'];

// // Define route permission mappings
// const routePermissions: Record<string, string> = {
//     '/user': 'user.view',
//     '/settings': 'settings.view'
// };

// export default async function middleware(request: NextRequest) {
//     // Get the pathname of the request (e.g. /dashboard)
//     const path = request.nextUrl.pathname;
//     console.log('Middleware path:', path);

//     // Dashboard url config
//     if (path === '/') {
//         return NextResponse.redirect(new URL("/letters", request.nextUrl), {status: 308});
//     }

//     // Define public paths that don't require authentication
//     const isPublicPath = publicPaths.includes(path);

//     // Check if the user is authenticated by looking for the is_authenticated cookie
//     // const is_authenticated = request.cookies.get('is_authenticated')?.value;
//     // const isAuthenticated = !!is_authenticated;
   


// const access_token = request.cookies.get('access_token')?.value;
// let isAuthenticated = false;

// if (access_token) {
//     try {
//         const decoded = decodeJwt(access_token);
//         isAuthenticated = !!decoded;
//     } catch {
//         isAuthenticated = false;
//     }
// }

//     // If the path requires authentication and the user isn't authenticated
//     if (!isPublicPath && !isAuthenticated) {
//         // Store the original URL the user was trying to access
//         const url = new URL('/sign-in', request.url);
//         const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
//         url.searchParams.set('callbackUrl', encodeURI(callbackUrl));
//         return NextResponse.redirect(url);
//     }

//     // If the user is already authenticated and tries to access login page
//     if (path === '/sign-in' && isAuthenticated) {
//         return NextResponse.redirect(new URL('/', request.url));
//     }

//     // If the user is authenticated and the path requires specific permissions
//     if (isAuthenticated && !isPublicPath) {
//         // Check if the current path (or any parent path) requires specific permissions
//         const requiredPermission = getRequiredPermission(path);

//         if (requiredPermission) {
//             // Get user permissions from the JWT token or session cookie
//             const permissions = await getUserPermissions(request);

//             // If the user doesn't have the required permission
//             if (!permissions.includes(requiredPermission)) {
//                 // Redirect to an unauthorized page or the home page
//                 return NextResponse.redirect(new URL('/unauthorized', request.url));
//             }
//         }
//     }

//     // Otherwise, continue with the request
//     return NextResponse.next();
// }

// // Helper function to get the required permission for a path
// function getRequiredPermission(path: string): string | null {
//     // Exact match
//     if (routePermissions[path]) {
//         return routePermissions[path];
//     }

//     // Check for parent paths
//     // For example, if /letters/123/edit doesn't have a specific permission, check /letters
//     const pathParts = path.split('/').filter(Boolean);

//     while (pathParts.length > 0) {
//         const parentPath = '/' + pathParts.join('/');
//         if (routePermissions[parentPath]) {
//             return routePermissions[parentPath];
//         }
//         pathParts.pop();
//     }

//     return null; // No permission required for this path
// }

// // Function to extract user permissions from the request
// async function getUserPermissions(request: NextRequest): Promise<string[]> {
//     try {
//         // Try to get permissions from JWT token
//         const token = request.cookies.get('access_token')?.value;

//         if (token) {
//             try {
//                 const decoded = decodeJwt<{ permissions: string[] }>(token);
//                 return decoded.permissions || [];
//             } catch (error) {
//                 console.error('Error decoding JWT token:', error);
//             }
//         }

//         return []; // Return empty array if no permissions found
//     } catch (error) {
//         console.error('Error getting user permissions:', error);
//         return [];
//     }
// }

// export const config = {
//     matcher: [
//         /*
//          * Match all request paths except for the ones starting with:
//          * - api (API routes)
//          * - _next/static (static files)
//          * - _next/image (image optimization files)
//          * - favicon.ico, sitemap.xml, robots.txt (metadata files)
//          */
//         '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
//     ],
// }




// import {NextRequest, NextResponse} from "next/server";

// const publicPaths = ['/sign-in', '/sign-up'];

// export default async function middleware(request: NextRequest) {
//     const path = request.nextUrl.pathname;

//     if (path === '/') {
//         return NextResponse.redirect(new URL("/letters", request.nextUrl), {status: 308});
//     }

//     // Middleware level cookie check skip කරන්න
//     // Auth check frontend side (auth-store) handle කරනවා
//     return NextResponse.next();
// }

// export const config = {
//     matcher: [
//         '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
//     ],
// }




import {NextRequest, NextResponse} from "next/server";

const publicPaths = ['/sign-in', '/sign-up'];

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path === '/') {
        return NextResponse.redirect(new URL("/letters", request.nextUrl), {status: 308});
    }

    const isPublicPath = publicPaths.some(p => path.startsWith(p));
    
    // Cookie check කරන්න
    const accessToken = request.cookies.get('access_token')?.value;
    const isAuthenticated = !!accessToken;

    if (!isPublicPath && !isAuthenticated) {
        const url = new URL('/sign-in', request.url);
        url.searchParams.set('callbackUrl', encodeURI(path));
        return NextResponse.redirect(url);
    }

    if (isPublicPath && isAuthenticated) {
        return NextResponse.redirect(new URL('/letters', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}