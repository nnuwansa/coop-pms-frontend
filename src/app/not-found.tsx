"use client";

import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {ArrowLeft, Home, Mail, MailX} from "lucide-react";

export default function NotFound() {
    const router = useRouter();
    const handleGoBack = () => {
        const lastPage = sessionStorage.getItem("lastPage");
        if (lastPage) {
            router.replace(lastPage);
        } else {
            router.replace("/");
        }
    };

    return (
        <div
            className="-mt-25 min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
                    <div className="flex justify-center">
                        <div className="relative">
                            <Mail className="w-24 h-24 text-primary/20 absolute -rotate-12 translate-x-4"/>
                            <MailX className="w-24 h-24 text-primary animate-pulse"/>
                        </div>
                    </div>
                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                            Page Not Found
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            {"The page you're looking for doesn't exist or has been moved."}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button
                            onClick={() => router.replace("/")}
                            variant="default"
                            className="transition-all duration-200 gap-2"
                            size="lg"
                        >
                            <Home className="w-4 h-4"/>
                            Return to Dashboard
                        </Button>
                        <Button
                            onClick={() => handleGoBack()}
                            variant="outline"
                            className="transition-all duration-200 gap-2"
                            size="lg"
                        >
                            <ArrowLeft className="w-4 h-4"/>
                            Go Back
                        </Button>
                    </div>
                    <div
                        className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t dark:border-gray-700">
                        <p>If you believe this is an error, please contact the system administrator</p>
                        <p className="font-mono mt-1">Error Code: PMS-404-NOTFOUND</p>
                    </div>
                </div>
            </div>
        </div>
    );
}