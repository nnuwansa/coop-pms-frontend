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
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
import {Loader2} from "lucide-react";
import api from "@/lib/api";

// Define validation schema
const signUpSchema = z.object({
    first_name: z.string()
        .min(1, 'First name is required')
        .max(50, 'First name must be at most 50 characters'),
    last_name: z.string()
        .min(1, 'Last name is required')
        .max(50, 'Last name must be at most 50 characters'),
    email: z.string()
        .min(1, 'Email is required')
        .email('Invalid email address')
        .max(150, "Email cannot exceed 150 characters"),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export default function SignUpPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form with react-hook-form and zod resolver
    const form = useForm({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: { email: any; first_name: any; last_name: any; password: any; }) => {
        try {
            setIsSubmitting(true);

            const response = await api.post('/v1/system_user/', {
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                password: data.password
            });

            const responseData = await response.data;
            toast.success(
                responseData.message,
                {description: 'Please contact the system administrator to activate your account'}
            );
            router.push('/user/users');

        } catch (error) {
            console.error("Error creating user:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>Sign up for a new account</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isSubmitting}
                                                placeholder="Enter your first name" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isSubmitting}
                                                placeholder="Enter your last name" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isSubmitting}
                                                placeholder="Enter your email" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password"
                                                   disabled={isSubmitting}
                                                   placeholder="Enter your password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input type="password"
                                                   disabled={isSubmitting}
                                                   placeholder="Confirm your password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button
                                type="submit"
                                className="w-full mt-6"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ?
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Creating Account...
                                    </> : 'Sign Up'}
                            </Button>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                                Already have an account?{' '}
                                <Link href="/sign-in" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                    Sign In
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}