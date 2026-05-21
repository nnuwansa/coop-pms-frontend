import "../globals.css";
import {DashboardLayout} from "@/components/layout/dashboard-layout";


export const metadata = {
    title: "COOP PMS",
    description: "COOP Postal Management System",
};

export default function RootLayout({children}) {
    return (
        <DashboardLayout>{children}</DashboardLayout>
    );
}
