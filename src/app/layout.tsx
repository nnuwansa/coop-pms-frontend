import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import {Toaster} from "@/components/ui/sonner";
import {ThemeProvider} from "next-themes";


const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "COOP PMS",
    description: "COOP Postal Management System",
};

export default function RootLayout({children}) {
    return (
        <html lang="en">
        {/* <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        > */}
        <body
    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    suppressHydrationWarning
>
        <ThemeProvider attribute="class" defaultTheme="light">
            <Toaster richColors/>
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}
