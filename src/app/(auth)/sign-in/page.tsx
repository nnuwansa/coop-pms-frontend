'use client';

import {redirect, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import * as z from 'zod';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
import {useAuthStore} from '@/store/auth-store';
import {AlertCircle, Loader2} from "lucide-react";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Suspense} from "react";

// Define the form schema
const formSchema = z.object({
    email: z.string().email({message: "Please enter a valid email address"}),
    password: z.string().min(1, {message: "Password is required"}),
});

function LoginForm() {
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('callbackUrl') || '/';

    // Get state and actions from auth store
    const {login, loading, error, clearError} = useAuthStore();


    // Initialize the form
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        // Clear any previous errors
        clearError();

        // Attempt login
        const success = await login(data.email, data.password);

        if (success) {
            // On successful login, redirect to callback URL or dashboard
            redirect(nextUrl.toString());
        }
    }

    return (
        <div
            className="min-h-screen overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Sign In</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                autoComplete="username email"
                                                placeholder="Enter your email"
                                                disabled={loading}
                                                {...field}
                                            />
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
                                            <Input
                                                type="password"
                                                autoComplete="current-password"
                                                placeholder="Enter your password"
                                                disabled={loading}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full mt-6">
                                {loading ?
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Signing In...
                                    </> : 'Sign In'}
                            </Button>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                                Don&#39;t have an account?{' '}
                                <Link href="/sign-up" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                    Sign Up
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm/>
        </Suspense>
    );
}