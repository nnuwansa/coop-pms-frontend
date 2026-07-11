'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {z} from 'zod';
import {toast} from 'sonner';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
import {Eye, EyeOff, Loader2, Mail, Lock, IdCard, FileBadge2} from "lucide-react";
import api from "@/lib/api";

const signUpSchema = z.object({
    fullNameId: z.string().min(1, 'Please select your name'),
    email: z.string().min(1, 'Email is required').email('Invalid email address').max(150),
    designationId: z.string().optional(),
    employee_id: z.string().max(50).optional().or(z.literal('')),
    nic: z.string().max(20).optional().or(z.literal('')),
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

    const [names, setNames] = useState<{id: number; full_name: string}[]>([]);
    const [designations, setDesignations] = useState<{id: number; name: string}[]>([]);

    useEffect(() => {
        api.get('/v1/employee_name/public-list').then(r => setNames(r.data.data)).catch(console.error);
        api.get('/v1/designation/public-list').then(r => setDesignations(r.data.data)).catch(console.error);
    }, []);

    const form = useForm({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            fullNameId: '',
            email: '',
            designationId: '',
            employee_id: '',
            nic: '',
            password: '',
            confirmPassword: '',
        },
    });

    // split full name into first/last since backend still stores both
    const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
        try {
            setIsSubmitting(true);
            // const selected = names.find(n => n.id.toString() === data.fullNameId);
            // const parts = (selected?.full_name || "").trim().split(/\s+/);
            // const first_name = parts[0] || "";
            // const last_name = parts.slice(1).join(" ") || first_name;
            const selected = names.find(n => n.id.toString() === data.fullNameId);
const parts = (selected?.full_name || "").trim().split(/\s+/);
const first_name = parts[0] || "";
const last_name = parts.slice(1).join(" ");   

            const response = await api.post('/v1/system_user/', {
                email: data.email,
                first_name,
                last_name,
                employee_id: data.employee_id || null,
                nic: data.nic || null,
                designation_id: data.designationId ? parseInt(data.designationId) : null,
                password: data.password,
            });
            toast.success(response.data.message, {
                description: 'Please contact the system administrator to activate your account',
            });
            router.push('/sign-in');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
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
                            <FormField control={form.control} name="fullNameId" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Full name</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger className="h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700">
                                                <SelectValue placeholder="Select your name"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {names.map((n) => (
                                                <SelectItem key={n.id} value={n.id.toString()}>{n.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

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

                            <FormField control={form.control} name="employee_id" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Employee ID</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                            <Input disabled={isSubmitting} placeholder="e.g. EMP0123"
                                                className="pl-9 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700" {...field}/>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={form.control} name="nic" render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">NIC</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <FileBadge2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                                <Input disabled={isSubmitting} placeholder="e.g. 200012345678"
                                                    className="pl-9 h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700" {...field}/>
                                            </div>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="designationId" render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300 text-sm">Designation</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700">
                                                    <SelectValue placeholder="Select designation"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {designations.map((d) => (
                                                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                            </div>

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