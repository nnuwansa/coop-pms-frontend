'use client';

import {Sidebar} from './sidebar';
import {Navbar} from './navbar';
import {ReactNode, useEffect, useState} from 'react';
import {useAuthStore} from "@/store/auth-store";
import {redirect} from "next/navigation";
import {ACCESS_TOKEN_EXPIRE_MINUTES} from "@/lib/client-config";

export function DashboardLayout({children}: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const {refreshToken} = useAuthStore();

    // Try to refresh the token when the app loads
    useEffect(() => {
        let isSubscribed = true;

        const attemptRefresh = async () => {
            const success = await refreshToken();
            if (!success && isSubscribed) {
                console.error('Failed to refresh token');
                redirect('/sign-in');
            }
        };

        // Initial refresh attempt
        attemptRefresh();

        // Set up a refresh interval
        const refreshInterval = setInterval(attemptRefresh,
            // Refresh slightly before token expires
            (ACCESS_TOKEN_EXPIRE_MINUTES * 60 - 30) * 1000
        );

        // Cleanup function
        return () => {
            isSubscribed = false;
            clearInterval(refreshInterval);
        };
    }, [refreshToken]);
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar isOpen={isSidebarOpen}/>
            <Navbar isOpen={isSidebarOpen} onMenuClickAction={() => setIsSidebarOpen(!isSidebarOpen)}/>
            <main className={`pt-16 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
                <div className="container mx-auto p-4">{children}</div>
            </main>
        </div>
    );
}