// 'use client';

// import {useTheme} from 'next-themes';
// import {Button} from '@/components/ui/button';
// import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
// import {ArrowLeft, ArrowRight, LogIn, LogOut, Moon, PanelLeftOpen, PanelRightClose, Sun, User} from 'lucide-react';
// import {usePathname, useRouter} from 'next/navigation';
// import {useAuthStore} from "@/store/auth-store";
// import Link from "next/link";

// interface NavbarProps {
//     onMenuClickAction: () => void;
//     isOpen: boolean;
// }

// export function Navbar({isOpen, onMenuClickAction}: NavbarProps) {
//     const router = useRouter();
//     const {theme, setTheme} = useTheme();
//     const pathname = usePathname();
//     const {user, logout} = useAuthStore();

//     const breadcrumbs = pathname
//         .split('/')
//         .filter(Boolean)
//         .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

//     return (
//         <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
//             <div className="flex h-full items-center justify-between px-4">
//                 <div className="flex items-center space-x-4">
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={onMenuClickAction}
//                     >
//                         <span
//                             className={`inline-block transition-transform duration-300 ease-in-out ${
//                                 isOpen ? "rotate-y-180" : "rotate-y-0"
//                             }`}>
//                         {isOpen ? <PanelRightClose className="h-6 w-6"/>
//                             :
//                             <PanelLeftOpen className="h-6 w-6"/>}
//                         </span>
//                     </Button>
//                     <Link href="/">
//                         <h1 className={"hidden lg:block text-xl font-bold transition-opacity"}>
//                             COOP PMS
//                         </h1>
//                     </Link>
//                     <nav className="hidden lg:block pl-15">
//                         <ol className="flex items-center space-x-2">
//                             <li>
//                                 <Button
//                                     variant="ghost"
//                                     size="icon"
//                                     onClick={() => router.back()}
//                                     className="h-8 w-8"
//                                 >
//                                     <ArrowLeft className="h-4 w-4"/>
//                                 </Button>
//                             </li>
//                             <li>
//                                 <Button
//                                     variant="ghost"
//                                     size="icon"
//                                     onClick={() => router.forward()}
//                                     className="h-8 w-8"
//                                 >
//                                     <ArrowRight className="h-4 w-4"/>
//                                 </Button>
//                             </li>
//                             <li>
//                                 <span className="text-gray-500">Dashboard</span>
//                             </li>
//                             {breadcrumbs.map((crumb, index) => (
//                                 <li key={index} className="flex items-center space-x-2">
//                                     <span className="text-gray-500">/</span>
//                                     <span>{crumb}</span>
//                                 </li>
//                             ))}
//                         </ol>
//                     </nav>
//                 </div>

//                 <div className="flex items-center space-x-4">
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         className="rounded-full"
//                         onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//                     >
//                         <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
//                         <Moon
//                             className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
//                     </Button>

//                     <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" className="relative h-8 w-8 rounded-full">
//                                 <User className="h-5 w-5"/>
//                             </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent className="w-56" align="end">
//                             <DropdownMenuItem>
//                                 <User className="mr-2 h-4 w-4"/>
//                                 <span>{user?.email || 'Guest'}</span>
//                             </DropdownMenuItem>
//                             {user ? (
//                                 <DropdownMenuItem
//                                     onClick={async () => {
//                                         await logout();
//                                         router.push('/sign-in');
//                                     }}
//                                     className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
//                                 >
//                                     <LogOut className="mr-2 h-4 w-4"/>
//                                     <span>Sign out</span>
//                                 </DropdownMenuItem>
//                             ) : (
//                                 <Link href="/sign-in" passHref>
//                                     <DropdownMenuItem
//                                         className="text-green-600 focus:bg-green-50 focus:text-green-600 dark:focus:bg-green-950">
//                                         <LogIn className="mr-2 h-4 w-4"/>
//                                         <span>Sign in</span>
//                                     </DropdownMenuItem>
//                                 </Link>
//                             )}
//                         </DropdownMenuContent>
//                     </DropdownMenu>
//                 </div>
//             </div>
//         </header>
//     );
// }



'use client';

import {useTheme} from 'next-themes';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {ArrowLeft, ArrowRight, LogIn, LogOut, Moon, PanelLeftOpen, PanelRightClose, Sun, User} from 'lucide-react';
import {usePathname, useRouter} from 'next/navigation';
import {useAuthStore} from "@/store/auth-store";
import Link from "next/link";

interface NavbarProps {
    onMenuClickAction: () => void;
    isOpen: boolean;
}

export function Navbar({isOpen, onMenuClickAction}: NavbarProps) {
    const router = useRouter();
    const {theme, setTheme} = useTheme();
    const pathname = usePathname();
    const {user, logout} = useAuthStore();

    const breadcrumbs = pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

    return (
        <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm shadow-sm text-white">
            <div className="flex h-full items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClickAction}
                        className="text-white hover:bg-neutral-800 hover:text-white"
                    >
                        <span
                            className={`inline-block transition-transform duration-300 ease-in-out ${
                                isOpen ? "rotate-y-180" : "rotate-y-0"
                            }`}>
                        {isOpen ? <PanelRightClose className="h-6 w-6"/>
                            :
                            <PanelLeftOpen className="h-6 w-6"/>}
                        </span>
                    </Button>
                    <Link href="/">
                        <h1 className={"hidden lg:block text-xl font-bold text-white transition-opacity"}>
                            COOP PMS
                        </h1>
                    </Link>
                    <nav className="hidden lg:block pl-15">
                        <ol className="flex items-center space-x-2">
                            <li>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.back()}
                                    className="h-8 w-8 text-white hover:bg-neutral-800 hover:text-white"
                                >
                                    <ArrowLeft className="h-4 w-4"/>
                                </Button>
                            </li>
                            <li>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.forward()}
                                    className="h-8 w-8 text-white hover:bg-neutral-800 hover:text-white"
                                >
                                    <ArrowRight className="h-4 w-4"/>
                                </Button>
                            </li>
                            <li>
                                <span className="text-slate-300">Dashboard</span>
                            </li>
                            {breadcrumbs.map((crumb, index) => (
                                <li key={index} className="flex items-center space-x-2">
                                    <span className="text-slate-400">/</span>
                                    <span className="text-white">{crumb}</span>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </div>

                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-white hover:bg-neutral-800 hover:text-white"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
                        <Moon
                            className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full text-white hover:bg-neutral-800 hover:text-white">
                                <User className="h-5 w-5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-neutral-900 border-neutral-800 text-white" align="end">
                            <DropdownMenuItem className="focus:bg-neutral-800 focus:text-white">
                                <User className="mr-2 h-4 w-4"/>
                                <span>{user?.email || 'Guest'}</span>
                            </DropdownMenuItem>
                            {user ? (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        await logout();
                                        router.push('/sign-in');
                                    }}
                                    className="text-red-500 focus:bg-red-950 focus:text-red-500"
                                >
                                    <LogOut className="mr-2 h-4 w-4"/>
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            ) : (
                                <Link href="/sign-in" passHref>
                                    <DropdownMenuItem
                                        className="text-green-500 focus:bg-green-950 focus:text-green-500">
                                        <LogIn className="mr-2 h-4 w-4"/>
                                        <span>Sign in</span>
                                    </DropdownMenuItem>
                                </Link>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}