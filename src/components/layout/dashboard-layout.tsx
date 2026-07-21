'use client';

import {Sidebar} from './sidebar';
import {Navbar} from './navbar';
import {ReactNode, useEffect, useState} from 'react';
import {useAuthStore} from "@/store/auth-store";
import {ACCESS_TOKEN_EXPIRE_MINUTES} from "@/lib/client-config";

export function DashboardLayout({children}: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true); 
    const {refreshToken} = useAuthStore();

    useEffect(() => {
        let isSubscribed = true;

        const attemptRefresh = async () => {
            const success = await refreshToken();
            if (isSubscribed) {
                setIsLoading(false); // check karana ekata
                if (!success) {
                    window.location.href = '/sign-in';
                }
            }
        };

        attemptRefresh();

        const refreshInterval = setInterval(attemptRefresh,
            (ACCESS_TOKEN_EXPIRE_MINUTES * 60 - 30) * 1000
        );

        return () => {
            isSubscribed = false;
            clearInterval(refreshInterval);
        };
    }, [refreshToken]);

   
    if (isLoading) return null;

    // if (isAuthenticated === false) return null;

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