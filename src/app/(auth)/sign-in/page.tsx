// // 'use client';

// // import {redirect, useSearchParams} from 'next/navigation';
// // import Link from 'next/link';
// // import {zodResolver} from '@hookform/resolvers/zod';
// // import {useForm} from 'react-hook-form';
// // import * as z from 'zod';

// // import {Button} from '@/components/ui/button';
// // import {Input} from '@/components/ui/input';
// // import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
// // import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
// // import {useAuthStore} from '@/store/auth-store';
// // import {AlertCircle, Loader2} from "lucide-react";
// // import {Alert, AlertDescription} from "@/components/ui/alert";
// // import {Suspense} from "react";

// // // Define the form schema
// // const formSchema = z.object({
// //     email: z.string().email({message: "Please enter a valid email address"}),
// //     password: z.string().min(1, {message: "Password is required"}),
// // });

// // function LoginForm() {
// //     const searchParams = useSearchParams();
// //     const nextUrl = searchParams.get('callbackUrl') || '/';

// //     // Get state and actions from auth store
// //     const {login, loading, error, clearError} = useAuthStore();


// //     // Initialize the form
// //     const form = useForm({
// //         resolver: zodResolver(formSchema),
// //         defaultValues: {
// //             email: "",
// //             password: "",
// //         },
// //     });

// //     const onSubmit = async (data: z.infer<typeof formSchema>) => {
// //         // Clear any previous errors
// //         clearError();

// //         // Attempt login
// //         const success = await login(data.email, data.password);

// //         if (success) {
// //             // On successful login, redirect to callback URL or dashboard
// //             redirect(nextUrl.toString());
// //         }
// //     }

// //     return (
// //         <div
// //             className="min-h-screen overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
// //             <Card className="w-full max-w-md">
// //                 <CardHeader>
// //                     <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Sign In</CardTitle>
// //                     <CardDescription>Enter your credentials to access your account</CardDescription>
// //                     {error && (
// //                         <Alert variant="destructive">
// //                             <AlertCircle className="h-4 w-4"/>
// //                             <AlertDescription>
// //                                 {error}
// //                             </AlertDescription>
// //                         </Alert>
// //                     )}
// //                 </CardHeader>

// //                 <Form {...form}>
// //                     <form onSubmit={form.handleSubmit(onSubmit)}>
// //                         <CardContent className="space-y-4">
// //                             <FormField
// //                                 control={form.control}
// //                                 name="email"
// //                                 render={({field}) => (
// //                                     <FormItem>
// //                                         <FormLabel>Email</FormLabel>
// //                                         <FormControl>
// //                                             <Input
// //                                                 autoComplete="username email"
// //                                                 placeholder="Enter your email"
// //                                                 disabled={loading}
// //                                                 {...field}
// //                                             />
// //                                         </FormControl>
// //                                         <FormMessage/>
// //                                     </FormItem>
// //                                 )}
// //                             />

// //                             <FormField
// //                                 control={form.control}
// //                                 name="password"
// //                                 render={({field}) => (
// //                                     <FormItem>
// //                                         <FormLabel>Password</FormLabel>
// //                                         <FormControl>
// //                                             <Input
// //                                                 type="password"
// //                                                 autoComplete="current-password"
// //                                                 placeholder="Enter your password"
// //                                                 disabled={loading}
// //                                                 {...field}
// //                                             />
// //                                         </FormControl>
// //                                         <FormMessage/>
// //                                     </FormItem>
// //                                 )}
// //                             />
// //                         </CardContent>

// //                         <CardFooter className="flex flex-col space-y-4">
// //                             <Button type="submit" className="w-full mt-6">
// //                                 {loading ?
// //                                     <>
// //                                         <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
// //                                         Signing In...
// //                                     </> : 'Sign In'}
// //                             </Button>
// //                             <p className="text-sm text-center text-gray-600 dark:text-gray-400">
// //                                 Don&#39;t have an account?{' '}
// //                                 <Link href="/sign-up" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
// //                                     Sign Up
// //                                 </Link>
// //                             </p>
// //                         </CardFooter>
// //                     </form>
// //                 </Form>
// //             </Card>
// //         </div>
// //     );
// // }

// // export default function LoginPage() {
// //     return (
// //         <Suspense fallback={<div>Loading...</div>}>
// //             <LoginForm/>
// //         </Suspense>
// //     );
// // }




// 'use client';

// import { useSearchParams} from 'next/navigation';
// import Link from 'next/link';
// import {zodResolver} from '@hookform/resolvers/zod';
// import {useForm} from 'react-hook-form';
// import * as z from 'zod';

// import {Button} from '@/components/ui/button';
// import {Input} from '@/components/ui/input';
// import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
// import {useAuthStore} from '@/store/auth-store';
// import {AlertCircle, Loader2} from "lucide-react";
// import {Alert, AlertDescription} from "@/components/ui/alert";
// import {Suspense} from "react";

// const formSchema = z.object({
//     email: z.string().email({message: "Please enter a valid email address"}),
//     password: z.string().min(1, {message: "Password is required"}),
// });

// function LoginForm() {
    
//     const searchParams = useSearchParams();
//     const nextUrl = searchParams.get('callbackUrl') || '/letters';

//     const {login, loading, error, clearError} = useAuthStore();

//     const form = useForm({
//         resolver: zodResolver(formSchema),
//         defaultValues: {
//             email: "",
//             password: "",
//         },
//     });
    

//     // const onSubmit = async (data: z.infer<typeof formSchema>) => {
//     //     clearError();
//     //     const success = await login(data.email, data.password);
//     //     if (success) {
//     //         // router.push(nextUrl.toString());
//     //         window.location.href = nextUrl.toString();
//     //     }
//     // }

//     const onSubmit = async (data: z.infer<typeof formSchema>) => {
//     clearError();
//     const success = await login(data.email, data.password);
//     if (success) {
//         window.location.href = nextUrl.toString();
//     }
// }

//     return (
//         <div className="min-h-screen overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
//             <Card className="w-full max-w-md">
//                 <CardHeader>
//                     <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Sign In</CardTitle>
//                     <CardDescription>Enter your credentials to access your account</CardDescription>
//                     {error && (
//                         <Alert variant="destructive">
//                             <AlertCircle className="h-4 w-4"/>
//                             <AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                 </CardHeader>
//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)}>
//                         <CardContent className="space-y-4">
//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>Email</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 autoComplete="username email"
//                                                 placeholder="Enter your email"
//                                                 disabled={loading}
//                                                 {...field}
//                                             />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="password"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>Password</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 type="password"
//                                                 autoComplete="current-password"
//                                                 placeholder="Enter your password"
//                                                 disabled={loading}
//                                                 {...field}
//                                             />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />
//                         </CardContent>
//                         <CardFooter className="flex flex-col space-y-4">
//                             <Button type="submit" className="w-full mt-6">
//                                 {loading ? <>
//                                     <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
//                                     Signing In...
//                                 </> : 'Sign In'}
//                             </Button>
//                             <p className="text-sm text-center text-gray-600 dark:text-gray-400">
//                                 Don&#39;t have an account?{' '}
//                                 <Link href="/sign-up" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
//                                     Sign Up
//                                 </Link>
//                             </p>
//                         </CardFooter>
//                     </form>
//                 </Form>
//             </Card>
//         </div>
//     );
// }

// export default function LoginPage() {
//     return (
//         <Suspense fallback={<div>Loading...</div>}>
//             <LoginForm/>
//         </Suspense>
//     );
// }






'use client';

import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import * as z from 'zod';
import {useState, Suspense} from "react";
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {useAuthStore} from '@/store/auth-store';
import {AlertCircle, Eye, EyeOff, Loader2, Mail, Lock} from "lucide-react";
import {Alert, AlertDescription} from "@/components/ui/alert";

const formSchema = z.object({
    email: z.string().email({message: "Please enter a valid email address"}),
    password: z.string().min(1, {message: "Password is required"}),
});

function LoginForm() {
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('callbackUrl') || '/letters';
    const {login, loading, error, clearError} = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {email: "", password: ""},
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        clearError();
        const success = await login(data.email, data.password);
        if (success) {
            window.location.href = nextUrl.toString();
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left decorative panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 dark:bg-zinc-900 flex-col justify-between p-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <Mail className="h-4 w-4 text-zinc-950"/>
                    </div>
                    <span className="text-white font-medium text-lg">COOP PMS</span>
                </div>
                <div>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                        Manage all incoming and outgoing correspondence — track letters, assign departments, and stay on top of every request.
                    </p>
                    <p className="text-zinc-600 text-xs mt-6">© 2026 COOP PMS. All rights reserved.</p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 dark:bg-zinc-950">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-6 lg:hidden">
                            <div className="w-7 h-7 bg-zinc-950 dark:bg-white rounded-lg flex items-center justify-center">
                                <Mail className="h-3.5 w-3.5 text-white dark:text-zinc-950"/>
                            </div>
                            <span className="font-medium text-base">COOP PMS</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Welcome back</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField control={form.control} name="email" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Email address</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                            <Input
                                                autoComplete="username email"
                                                placeholder="you@example.com"
                                                disabled={loading}
                                                className="pl-9 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="password" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                placeholder="Enter your password"
                                                disabled={loading}
                                                className="pl-9 pr-10 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowPassword(prev => !prev)}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <Button
                                type="submit"
                                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-gray-100 font-medium"
                                disabled={loading}
                            >
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Signing in...</> : 'Sign in'}
                            </Button>
                        </form>
                    </Form>

                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
                        Don&#39;t have an account?{' '}
                        <Link href="/sign-up" className="text-gray-900 dark:text-gray-100 font-medium hover:underline underline-offset-4">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400"/></div>}>
            <LoginForm/>
        </Suspense>
    );
}