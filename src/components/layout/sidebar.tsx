// 'use client';

// import {ReactNode, useState} from 'react';
// import Link from 'next/link';
// import {usePathname} from 'next/navigation';
// import {cn} from '@/lib/utils';
// import {Building2, ChevronRight, FileText, Key, Landmark, Send, Settings, ToggleRight, Users} from 'lucide-react';
// import {AnimatePresence, motion} from 'framer-motion';
// import {useAuthStore} from "@/store/auth-store";

// interface MenuItem {
//     title: string;
//     href?: string;
//     icon: ReactNode;
//     permission?: string;
//     submenu?: MenuItem[];
// }

// interface SidebarProps {
//     isOpen: boolean;
// }

// const menuItems: MenuItem[] = [
//     {
//         title: 'Letter Management',
//         icon: <FileText className="h-5 w-5"/>,
//         submenu: [
//             {
//                 title: 'Letters',
//                 href: '/letters',
//                 icon: <FileText className="h-4 w-4"/>,
//             },
//         ],
//     },
//     {
//         title: 'User Management',
//         icon: <Users className="h-5 w-5"/>,
//         submenu: [
//             {
//                 title: 'Users',
//                 href: '/user/users',
//                 icon: <Users className="h-4 w-4"/>,
//                 permission: 'user.view',
//             },
//             {
//                 title: 'Roles',
//                 href: '/user/roles',
//                 icon: <Key className="h-4 w-4"/>,
//                 permission: 'user.view',
//             },
//         ],
//     },
//     {
//         title: 'System Settings',
//         icon: <Settings className="h-5 w-5"/>,
//         submenu: [
//             {
//                 title: 'Organization',
//                 href: '/settings/organization',                icon: <Building2 className="h-4 w-4"/>,
//                 permission: 'settings.view',
//             },
//             {
//                 title: 'Sections',
//                 href: '/settings/section',
//                 icon: <Landmark className="h-4 w-4"/>,
//                 permission: 'settings.view',
//             },
//             {
//                 title: 'Source',
//                 href: '/settings/source',
//                 icon: <Send className="h-4 w-4"/>,
//                 permission: 'settings.view',
//             },
//             {
//                 title: 'Status',
//                 href: '/settings/status',
//                 icon: <ToggleRight className="h-4 w-4"/>,
//                 permission: 'settings.view',
//             },
//         ],
//     },
// ];

// const sidebarVariants = {
//     open: {
//         width: "16rem", // w-64
//         transition: {
//             type: "spring",
//             stiffness: 300,
//             damping: 30
//         }
//     },
//     closed: {
//         width: "5rem", // w-20
//         transition: {
//             type: "spring",
//             stiffness: 300,
//             damping: 30
//         }
//     }
// };

// const textVariants = {
//     open: {
//         opacity: 1,
//         width: "auto",
//         display: "block",
//         transition: {
//             delay: 0.1
//         }
//     },
//     closed: {
//         opacity: 0,
//         width: 0,
//         transitionEnd: {
//             display: "none"
//         }
//     }
// };

// export function Sidebar({isOpen}: SidebarProps) {
//     const [openMenus, setOpenMenus] = useState<string[]>([]);
//     const pathname = usePathname();
//     const {hasPermission} = useAuthStore();

//     const toggleSubmenu = (title: string) => {
//         setOpenMenus((prev) =>
//             prev.includes(title)
//                 ? prev.filter((item) => item !== title)
//                 : [...prev, title]
//         );
//     };

//     const isActive = (href?: string) => href && pathname === href;

//     const renderMenuItem = (item: MenuItem) => {
//         const isSubmenuOpen = openMenus.includes(item.title);

//         if (item.submenu) {
//             return (
//                 <div key={item.title}>
//                     <button
//                         onClick={() => toggleSubmenu(item.title)}
//                         className="flex w-full items-center justify-between py-3 text-white hover:bg-neutral-800 rounded-md transition-colors px-4"
//                     >
//                         <div className="flex items-center gap-3">
//                             <span className="text-slate-300">{item.icon}</span>
//                             <motion.span
//                                 variants={textVariants}
//                                 initial={false}
//                                 animate={isOpen ? "open" : "closed"}
//                                 className="whitespace-nowrap font-medium text-sm"
//                             >
//                                 {item.title}
//                             </motion.span>
//                         </div>
//                         <motion.div
//                             animate={{rotate: isSubmenuOpen ? 90 : 0}}
//                             transition={{duration: 0.2}}
//                             className={cn("h-4 w-4 text-slate-300", {"hidden": !isOpen})}
//                         >
//                             <ChevronRight className="h-4 w-4"/>
//                         </motion.div>
//                     </button>

//                     <AnimatePresence>
//                         {isSubmenuOpen && (
//                             <motion.div
//                                 initial={{height: 0, opacity: 0}}
//                                 animate={{height: "auto", opacity: 1}}
//                                 exit={{height: 0, opacity: 0}}
//                                 transition={{duration: 0.2}}
//                                 className="overflow-hidden"
//                             >
//                                 <div className={cn("space-y-1 py-1", !isOpen && "pl-1")}>
//                                     {item.submenu.map((subItem) => (
//                                         subItem?.permission && !hasPermission(subItem.permission) ? (
//                                             <div
//                                                 key={subItem.title}
//                                                 className={cn(
//                                                     'flex items-center gap-3 py-2 rounded-md transition-colors opacity-40 cursor-not-allowed text-slate-400',
//                                                     isOpen ? "px-8" : "px-4 justify-center"
//                                                 )}
//                                             >
//                                                 {subItem.icon}
//                                                 <motion.span
//                                                     variants={textVariants}
//                                                     initial={false}
//                                                     animate={isOpen ? "open" : "closed"}
//                                                     className="whitespace-nowrap text-sm"
//                                                 >
//                                                     {subItem.title}
//                                                 </motion.span>
//                                             </div>
//                                         ) : (
//                                             <Link
//                                                 key={subItem.title}
//                                                 href={subItem.href || '#'}
//                                                 className={cn(
//                                                     'relative flex items-center gap-3 py-2 rounded-md transition-colors text-sm',
//                                                     isOpen ? "px-8" : "px-4 justify-center",
//                                                     isActive(subItem.href)
//                                                         ? 'bg-neutral-800 text-blue-400 font-medium'
//                                                         : 'text-white hover:bg-neutral-800'
//                                                 )}
//                                             >
//                                                 {isActive(subItem.href) && (
//                                                     <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-400"/>
//                                                 )}
//                                                 {subItem.icon}
//                                                 <motion.span
//                                                     variants={textVariants}
//                                                     initial={false}
//                                                     animate={isOpen ? "open" : "closed"}
//                                                     className="whitespace-nowrap"
//                                                 >
//                                                     {subItem.title}
//                                                 </motion.span>
//                                             </Link>
//                                         )))}
//                                 </div>
//                             </motion.div>
//                         )}
//                     </AnimatePresence>
//                 </div>
//             );
//         }

//         return (
//             <Link
//                 key={item.title}
//                 href={item.href || '#'}
//                 className={cn(
//                     'flex items-center py-2.5 rounded-md transition-colors px-4 gap-3 text-sm',
//                     isActive(item.href)
//                         ? 'bg-neutral-800 text-blue-400 font-medium'
//                         : 'text-white hover:bg-neutral-800'
//                 )}
//             >
//                 {item.icon}
//                 <motion.span
//                     variants={textVariants}
//                     initial={false}
//                     animate={isOpen ? "open" : "closed"}
//                     className="whitespace-nowrap"
//                 >
//                     {item.title}
//                 </motion.span>
//             </Link>
//         );
//     };

//     return (
//         <motion.aside
//             initial={false}
//             animate={isOpen ? "open" : "closed"}
//             variants={sidebarVariants}
//             className={cn(
//                 'fixed inset-y-0 left-0 z-40 transform border-r border-neutral-800 bg-gradient-to-b from-black via-neutral-900 to-neutral-700 shadow-sm lg:translate-x-0 top-16',
//                 {
//                     'translate-x-0': isOpen,
//                     '-translate-x-full lg:translate-x-0': !isOpen,
//                 }
//             )}
//         >
//             <nav className="space-y-1 p-2">
//                 {menuItems.map(renderMenuItem)}
//             </nav>
//         </motion.aside>
//     );
// }

'use client';

import {ReactNode, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {Building2, ChevronRight, FileText, Key, Landmark, Send, Settings, ToggleRight, Trash2, UploadCloud, Users, FolderCog, Stamp} from 'lucide-react';
import {AnimatePresence, motion} from 'framer-motion';
import {useAuthStore} from "@/store/auth-store";

interface MenuItem {
    title: string;
    href?: string;
    icon: ReactNode;
    permission?: string;
    permissions?: string[];   // NEW — shown if the user has ANY of these (used when a page is reachable via more than one permission, e.g. Upload Collection)
    submenu?: MenuItem[];
}

interface SidebarProps {
    isOpen: boolean;
}

const menuItems: MenuItem[] = [
    {
        title: 'Letter Management',
        icon: <FileText className="h-5 w-5"/>,
        submenu: [
            {
                title: 'Letters',
                href: '/letters',
                icon: <FileText className="h-4 w-4"/>,
            },
            {
                // NEW — Upload Collection, visible if the user can either
                // upload their own files there OR (as an admin) view/download
                // everyone's uploads.
                title: 'Upload Collection',
                href: '/letters/uploads',
                icon: <UploadCloud className="h-4 w-4"/>,
                permissions: ['letter.upload_collection', 'letter.upload_collection_view'],
            },
            {
                // NEW — Deleted Letters, only shown to roles that can view
                // that collection (letter.view_deleted). Permanently
                // deleting is a separate, stricter permission checked
                // inside the page itself, not gating this link.
                title: 'Deleted Letters',
                href: '/letters/deleted',
                icon: <Trash2 className="h-4 w-4"/>,
                permission: 'letter.view_deleted',
            },
        ],
    },
    {
        title: 'User Management',
        icon: <Users className="h-5 w-5"/>,
        submenu: [
            {
                title: 'Users',
                href: '/user/users',
                icon: <Users className="h-4 w-4"/>,
                permission: 'user.view',
            },
            {
                title: 'Roles',
                href: '/user/roles',
                icon: <Key className="h-4 w-4"/>,
                permission: 'user.view',
            },
            {
                // NEW — File Management, for pre-registering file numbers
                // that later show up in the Assignee Status File Name
                // picker on the Letter View page.
                title: 'File Management',
                href: '/user/file-management',
                icon: <FolderCog className="h-4 w-4"/>,
                permission: 'file.update',
            },
        ],
    },
    {
        title: 'System Settings',
        icon: <Settings className="h-5 w-5"/>,
        submenu: [
            {
                title: 'Organization',
                href: '/settings/organization',                icon: <Building2 className="h-4 w-4"/>,
                permission: 'settings.view',
            },
            {
                title: 'Sections',
                href: '/settings/section',
                icon: <Landmark className="h-4 w-4"/>,
                permission: 'settings.view',
            },
            {
                title: 'Source',
                href: '/settings/source',
                icon: <Send className="h-4 w-4"/>,
                permission: 'settings.view',
            },
            {
                title: 'Status',
                href: '/settings/status',
                icon: <ToggleRight className="h-4 w-4"/>,
                permission: 'settings.view',
            },
            {
              // NEW — Order By Options: manage the seal / designation               // titles selectable in the Letter View's Order By field
               title: 'Order By Options',
               href: '/settings/order-by-options',
               icon: <Stamp className="h-4 w-4"/>,              
               permission: 'settings.view',          },
        ],
    },
];

const sidebarVariants = {
    open: {
        width: "16rem",
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    },
    closed: {
        width: "5rem",
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    }
};

const textVariants = {
    open: {
        opacity: 1,
        width: "auto",
        display: "block",
        transition: {
            delay: 0.1
        }
    },
    closed: {
        opacity: 0,
        width: 0,
        transitionEnd: {
            display: "none"
        }
    }
};

export function Sidebar({isOpen}: SidebarProps) {
    const [openMenus, setOpenMenus] = useState<string[]>([]);
    const pathname = usePathname();
    const {hasPermission} = useAuthStore();

    const toggleSubmenu = (title: string) => {
        setOpenMenus((prev) =>
            prev.includes(title)
                ? prev.filter((item) => item !== title)
                : [...prev, title]
        );
    };

    const isActive = (href?: string) => href && pathname === href;

    const renderMenuItem = (item: MenuItem) => {
        const isSubmenuOpen = openMenus.includes(item.title);

        if (item.submenu) {
            return (
                <div key={item.title}>
                    <button
                        onClick={() => toggleSubmenu(item.title)}
                        className="flex w-full items-center justify-between py-3 text-white hover:bg-neutral-800 rounded-md transition-colors px-4"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-slate-300">{item.icon}</span>
                            <motion.span
                                variants={textVariants}
                                initial={false}
                                animate={isOpen ? "open" : "closed"}
                                className="whitespace-nowrap font-medium text-sm"
                            >
                                {item.title}
                            </motion.span>
                        </div>
                        <motion.div
                            animate={{rotate: isSubmenuOpen ? 90 : 0}}
                            transition={{duration: 0.2}}
                            className={cn("h-4 w-4 text-slate-300", {"hidden": !isOpen})}
                        >
                            <ChevronRight className="h-4 w-4"/>
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {isSubmenuOpen && (
                            <motion.div
                                initial={{height: 0, opacity: 0}}
                                animate={{height: "auto", opacity: 1}}
                                exit={{height: 0, opacity: 0}}
                                transition={{duration: 0.2}}
                                className="overflow-hidden"
                            >
                                <div className={cn("space-y-1 py-1", !isOpen && "pl-1")}>
                                    {item.submenu.map((subItem) => {
                                        const isAllowed =
                                            (!subItem?.permission || hasPermission(subItem.permission)) &&
                                            (!subItem?.permissions || subItem.permissions.some(p => hasPermission(p)));
                                        return !isAllowed ? (
                                            <div
                                                key={subItem.title}
                                                className={cn(
                                                    'flex items-center gap-3 py-2 rounded-md transition-colors opacity-40 cursor-not-allowed text-slate-400',
                                                    isOpen ? "px-8" : "px-4 justify-center"
                                                )}
                                            >
                                                {subItem.icon}
                                                <motion.span
                                                    variants={textVariants}
                                                    initial={false}
                                                    animate={isOpen ? "open" : "closed"}
                                                    className="whitespace-nowrap text-sm"
                                                >
                                                    {subItem.title}
                                                </motion.span>
                                            </div>
                                        ) : (
                                            <Link
                                                key={subItem.title}
                                                href={subItem.href || '#'}
                                                className={cn(
                                                    'relative flex items-center gap-3 py-2 rounded-md transition-colors text-sm',
                                                    isOpen ? "px-8" : "px-4 justify-center",
                                                    isActive(subItem.href)
                                                        ? 'bg-neutral-800 text-blue-400 font-medium'
                                                        : 'text-white hover:bg-neutral-800'
                                                )}
                                            >
                                                {isActive(subItem.href) && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-400"/>
                                                )}
                                                {subItem.icon}
                                                <motion.span
                                                    variants={textVariants}
                                                    initial={false}
                                                    animate={isOpen ? "open" : "closed"}
                                                    className="whitespace-nowrap"
                                                >
                                                    {subItem.title}
                                                </motion.span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        return (
            <Link
                key={item.title}
                href={item.href || '#'}
                className={cn(
                    'flex items-center py-2.5 rounded-md transition-colors px-4 gap-3 text-sm',
                    isActive(item.href)
                        ? 'bg-neutral-800 text-blue-400 font-medium'
                        : 'text-white hover:bg-neutral-800'
                )}
            >
                {item.icon}
                <motion.span
                    variants={textVariants}
                    initial={false}
                    animate={isOpen ? "open" : "closed"}
                    className="whitespace-nowrap"
                >
                    {item.title}
                </motion.span>
            </Link>
        );
    };

    return (
        <motion.aside
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={sidebarVariants}
            className={cn(
                'fixed inset-y-0 left-0 z-40 transform border-r border-neutral-800 bg-gradient-to-b from-black via-neutral-900 to-neutral-700 shadow-sm lg:translate-x-0 top-16',
                {
                    'translate-x-0': isOpen,
                    '-translate-x-full lg:translate-x-0': !isOpen,
                }
            )}
        >
            <nav className="space-y-1 p-2">
                {menuItems.map(renderMenuItem)}
            </nav>
        </motion.aside>
    );
}