// 'use client';

// import {useState} from 'react';
// import {useRouter} from 'next/navigation';
// import Link from 'next/link';
// import {z} from 'zod';
// import {toast} from 'sonner';
// import {useForm} from 'react-hook-form';
// import {zodResolver} from '@hookform/resolvers/zod';

// import {Button} from '@/components/ui/button';
// import {Input} from '@/components/ui/input';
// import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
// import {Loader2} from "lucide-react";
// import api from "@/lib/api";

// // Define validation schema
// const signUpSchema = z.object({
//     first_name: z.string()
//         .min(1, 'First name is required')
//         .max(50, 'First name must be at most 50 characters'),
//     last_name: z.string()
//         .min(1, 'Last name is required')
//         .max(50, 'Last name must be at most 50 characters'),
//     email: z.string()
//         .min(1, 'Email is required')
//         .email('Invalid email address')
//         .max(150, "Email cannot exceed 150 characters"),
//     password: z.string()
//         .min(8, 'Password must be at least 8 characters')
//         .regex(/[A-Za-z]/, 'Password must contain at least one letter')
//         .regex(/[0-9]/, 'Password must contain at least one number')
//         .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol'),
//     confirmPassword: z.string().min(1, 'Please confirm your password'),
// }).refine((data) => data.password === data.confirmPassword, {
//     message: "Passwords don't match",
//     path: ['confirmPassword'],
// });

// export default function SignUpPage() {
//     const router = useRouter();
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // Initialize form with react-hook-form and zod resolver
//     const form = useForm({
//         resolver: zodResolver(signUpSchema),
//         defaultValues: {
//             first_name: '',
//             last_name: '',
//             email: '',
//             password: '',
//             confirmPassword: '',
//         },
//     });

//     const onSubmit = async (data: { email: any; first_name: any; last_name: any; password: any; }) => {
//         try {
//             setIsSubmitting(true);

//             const response = await api.post('/v1/system_user/', {
//                 email: data.email,
//                 first_name: data.first_name,
//                 last_name: data.last_name,
//                 password: data.password
//             });

//             const responseData = await response.data;
//             toast.success(
//                 responseData.message,
//                 {description: 'Please contact the system administrator to activate your account'}
//             );
//             router.push('/user/users');

//         } catch (error) {
//             console.error("Error creating user:", error);
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     return (
//         <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
//             <Card className="w-full max-w-md">
//                 <CardHeader>
//                     <CardTitle>Create Account</CardTitle>
//                     <CardDescription>Sign up for a new account</CardDescription>
//                 </CardHeader>
//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)}>
//                         <CardContent className="space-y-4">
//                             <FormField
//                                 control={form.control}
//                                 name="first_name"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>First Name</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 disabled={isSubmitting}
//                                                 placeholder="Enter your first name" {...field} />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />

//                             <FormField
//                                 control={form.control}
//                                 name="last_name"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>Last Name</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 disabled={isSubmitting}
//                                                 placeholder="Enter your last name" {...field} />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />

//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>Email</FormLabel>
//                                         <FormControl>
//                                             <Input
//                                                 disabled={isSubmitting}
//                                                 placeholder="Enter your email" {...field} />
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
//                                             <Input type="password"
//                                                    disabled={isSubmitting}
//                                                    placeholder="Enter your password" {...field} />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />

//                             <FormField
//                                 control={form.control}
//                                 name="confirmPassword"
//                                 render={({field}) => (
//                                     <FormItem>
//                                         <FormLabel>Confirm Password</FormLabel>
//                                         <FormControl>
//                                             <Input type="password"
//                                                    disabled={isSubmitting}
//                                                    placeholder="Confirm your password" {...field} />
//                                         </FormControl>
//                                         <FormMessage/>
//                                     </FormItem>
//                                 )}
//                             />
//                         </CardContent>

//                         <CardFooter className="flex flex-col space-y-4">
//                             <Button
//                                 type="submit"
//                                 className="w-full mt-6"
//                                 disabled={isSubmitting}
//                             >
//                                 {isSubmitting ?
//                                     <>
//                                         <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
//                                         Creating Account...
//                                     </> : 'Sign Up'}
//                             </Button>
//                             <p className="text-sm text-center text-gray-600 dark:text-gray-400">
//                                 Already have an account?{' '}
//                                 <Link href="/sign-in" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
//                                     Sign In
//                                 </Link>
//                             </p>
//                         </CardFooter>
//                     </form>
//                 </Form>
//             </Card>
//         </div>
//     );
// }





'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {z} from 'zod';
import {toast} from 'sonner';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Eye, EyeOff, Loader2, Mail, Lock, User} from "lucide-react";
import api from "@/lib/api";

const signUpSchema = z.object({
    first_name: z.string().min(1, 'First name is required').max(50),
    last_name: z.string().min(1, 'Last name is required').max(50),
    email: z.string().min(1, 'Email is required').email('Invalid email address').max(150),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Za-z]/, 'Must contain at least one letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one symbol'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export default function SignUpPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const form = useForm({
        resolver: zodResolver(signUpSchema),
        defaultValues: {first_name: '', last_name: '', email: '', password: '', confirmPassword: ''},
    });

    const onSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            const response = await api.post('/v1/system_user/', {
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                password: data.password,
            });
            toast.success(response.data.message, {
                description: 'Please contact the system administrator to activate your account',
            });
            router.push('/sign-in');
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
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
                        Join your team on COOP PMS. Once registered, a system administrator will activate your account.
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
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Create an account</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill in your details to get started</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={form.control} name="first_name" render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">First name</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                                <Input disabled={isSubmitting} 
                                                    className="pl-9 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700" {...field}/>
                                            </div>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="last_name" render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Last name</FormLabel>
                                        <FormControl>
                                            <Input disabled={isSubmitting} 
                                                className="h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700" {...field}/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                            </div>

                            <FormField control={form.control} name="email" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Email address</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                            <Input disabled={isSubmitting} 
                                                className="pl-9 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700" {...field}/>
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
                                                disabled={isSubmitting}
                                                placeholder="Min. 8 characters"
                                                className="pl-9 pr-10 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                                                {...field}
                                            />
                                            <Button type="button" variant="ghost" size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowPassword(prev => !prev)}>
                                                {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="confirmPassword" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Confirm password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                            <Input
                                                type={showConfirm ? "text" : "password"}
                                                disabled={isSubmitting}
                                                placeholder="Re-enter password"
                                                className="pl-9 pr-10 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                                                {...field}
                                            />
                                            <Button type="button" variant="ghost" size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowConfirm(prev => !prev)}>
                                                {showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <Button
                                type="submit"
                                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-gray-100 font-medium mt-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating account...</> : 'Create account'}
                            </Button>
                        </form>
                    </Form>

                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
                        Already have an account?{' '}
                        <Link href="/sign-in" className="text-gray-900 dark:text-gray-100 font-medium hover:underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}