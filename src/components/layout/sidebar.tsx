// // 'use client';

// // import {ReactNode, useState} from 'react';
// // import Link from 'next/link';
// // import {usePathname} from 'next/navigation';
// // import {cn} from '@/lib/utils';
// // import {Building2, ChevronRight, FileText, Key, Landmark, Send, Settings, ToggleRight, Users} from 'lucide-react';
// // import {AnimatePresence, motion} from 'framer-motion';
// // import {useAuthStore} from "@/store/auth-store";

// // interface MenuItem {
// //     title: string;
// //     href?: string;
// //     icon: ReactNode;
// //     permission?: string;
// //     submenu?: MenuItem[];
// // }

// // interface SidebarProps {
// //     isOpen: boolean;
// // }

// // const menuItems: MenuItem[] = [
// //     {
// //         title: 'Letter Management',
// //         icon: <FileText className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Letters',
// //                 href: '/letters',
// //                 icon: <FileText className="h-4 w-4"/>,
// //             },
// //         ],
// //     },
// //     {
// //         title: 'User Management',
// //         icon: <Users className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Users',
// //                 href: '/user/users',
// //                 icon: <Users className="h-4 w-4"/>,
// //                 permission: 'user.view',
// //             },
// //             {
// //                 title: 'Roles',
// //                 href: '/user/roles',
// //                 icon: <Key className="h-4 w-4"/>,
// //                 permission: 'user.view',
// //             },
// //         ],
// //     },
// //     {
// //         title: 'System Settings',
// //         icon: <Settings className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Organization',
// //                 href: '/settings/organization',
// //                 icon: <Building2 className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Department',
// //                 href: '/settings/department',
// //                 icon: <Landmark className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Source',
// //                 href: '/settings/source',
// //                 icon: <Send className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Status',
// //                 href: '/settings/status',
// //                 icon: <ToggleRight className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //         ],
// //     },
// // ];

// // const sidebarVariants = {
// //     open: {
// //         width: "16rem", // w-64
// //         transition: {
// //             type: "spring",
// //             stiffness: 300,
// //             damping: 30
// //         }
// //     },
// //     closed: {
// //         width: "5rem", // w-20
// //         transition: {
// //             type: "spring",
// //             stiffness: 300,
// //             damping: 30
// //         }
// //     }
// // };

// // const textVariants = {
// //     open: {
// //         opacity: 1,
// //         width: "auto",
// //         display: "block",
// //         transition: {
// //             delay: 0.1
// //         }
// //     },
// //     closed: {
// //         opacity: 0,
// //         width: 0,
// //         transitionEnd: {
// //             display: "none"
// //         }
// //     }
// // };

// // export function Sidebar({isOpen}: SidebarProps) {
// //     const [openMenus, setOpenMenus] = useState<string[]>([]);
// //     const pathname = usePathname();
// //     const {hasPermission} = useAuthStore();

// //     const toggleSubmenu = (title: string) => {
// //         setOpenMenus((prev) =>
// //             prev.includes(title)
// //                 ? prev.filter((item) => item !== title)
// //                 : [...prev, title]
// //         );
// //     };

// //     const isActive = (href?: string) => href && pathname === href;

// //     const renderMenuItem = (item: MenuItem) => {
// //         const isSubmenuOpen = openMenus.includes(item.title);

// //         if (item.submenu) {
// //             return (
// //                 <div key={item.title}>
// //                     <button
// //                         onClick={() => toggleSubmenu(item.title)}
// //                         className="flex w-full items-center justify-between py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors px-4"
// //                     >
// //                         <div className="flex items-center gap-3">
// //                             {item.icon}
// //                             <motion.span
// //                                 variants={textVariants}
// //                                 initial={false}
// //                                 animate={isOpen ? "open" : "closed"}
// //                                 className="whitespace-nowrap"
// //                             >
// //                                 {item.title}
// //                             </motion.span>
// //                         </div>
// //                         <motion.div
// //                             animate={{rotate: isSubmenuOpen ? 90 : 0}}
// //                             transition={{duration: 0.2}}
// //                             className={cn("h-4 w-4", {"hidden": !isOpen})}
// //                         >
// //                             <ChevronRight className="h-4 w-4"/>
// //                         </motion.div>
// //                     </button>

// //                     <AnimatePresence>
// //                         {isSubmenuOpen && (
// //                             <motion.div
// //                                 initial={{height: 0, opacity: 0}}
// //                                 animate={{height: "auto", opacity: 1}}
// //                                 exit={{height: 0, opacity: 0}}
// //                                 transition={{duration: 0.2}}
// //                                 className="overflow-hidden"
// //                             >
// //                                 <div className={cn("space-y-1", !isOpen && "pl-1")}>
// //                                     {item.submenu.map((subItem) => (
// //                                         subItem?.permission && !hasPermission(subItem.permission) ? (
// //                                             <div
// //                                                 key={subItem.title}
// //                                                 className={cn(
// //                                                     'flex items-center gap-3 py-2 rounded-md transition-colors opacity-50 cursor-not-allowed',
// //                                                     isOpen ? "px-8" : "px-4 justify-center"
// //                                                 )}
// //                                             >
// //                                                 {subItem.icon}
// //                                                 <motion.span
// //                                                     variants={textVariants}
// //                                                     initial={false}
// //                                                     animate={isOpen ? "open" : "closed"}
// //                                                     className="whitespace-nowrap"
// //                                                 >
// //                                                     {subItem.title}
// //                                                 </motion.span>
// //                                             </div>
// //                                         ) : (
// //                                             <Link
// //                                                 key={subItem.title}
// //                                                 href={subItem.href || '#'}
// //                                                 className={cn(
// //                                                     'flex items-center gap-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors',
// //                                                     isOpen ? "px-8" : "px-4 justify-center",
// //                                                     {
// //                                                         'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400': isActive(subItem.href),
// //                                                     }
// //                                                 )}
// //                                             >
// //                                                 {subItem.icon}
// //                                                 <motion.span
// //                                                     variants={textVariants}
// //                                                     initial={false}
// //                                                     animate={isOpen ? "open" : "closed"}
// //                                                     className="whitespace-nowrap"
// //                                                 >
// //                                                     {subItem.title}
// //                                                 </motion.span>
// //                                             </Link>
// //                                         )))}
// //                                 </div>
// //                             </motion.div>
// //                         )}
// //                     </AnimatePresence>
// //                 </div>
// //             );
// //         }

// //         return (
// //             <Link
// //                 key={item.title}
// //                 href={item.href || '#'}
// //                 className={cn(
// //                     'flex items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors px-4 gap-3',
// //                     {
// //                         'bg-gray-200 dark:bg-gray-700 text-blue-600': isActive(item.href),
// //                     }
// //                 )}
// //             >
// //                 {item.icon}
// //                 <motion.span
// //                     variants={textVariants}
// //                     initial={false}
// //                     animate={isOpen ? "open" : "closed"}
// //                     className="whitespace-nowrap"
// //                 >
// //                     {item.title}
// //                 </motion.span>
// //             </Link>
// //         );
// //     };

// //     return (
// //         <motion.aside
// //             initial={false}
// //             animate={isOpen ? "open" : "closed"}
// //             variants={sidebarVariants}
// //             className={cn(
// //     'fixed inset-y-0 left-0 z-40 transform border-r border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 top-16',
// //     {
// //         'translate-x-0': isOpen,
// //         '-translate-x-full lg:translate-x-0': !isOpen,
// //     }
// // )}
// //         >
// //             <nav className="space-y-1 p-2">
// //                 {menuItems.map(renderMenuItem)}
// //             </nav>
// //         </motion.aside>
// //     );
// // }




// // 'use client';

// // import {ReactNode, useState} from 'react';
// // import Link from 'next/link';
// // import {usePathname} from 'next/navigation';
// // import {cn} from '@/lib/utils';
// // import {Building2, ChevronRight, FileText, Key, Landmark, Send, Settings, ToggleRight, Users} from 'lucide-react';
// // import {AnimatePresence, motion} from 'framer-motion';
// // import {useAuthStore} from "@/store/auth-store";

// // interface MenuItem {
// //     title: string;
// //     href?: string;
// //     icon: ReactNode;
// //     permission?: string;
// //     submenu?: MenuItem[];
// // }

// // interface SidebarProps {
// //     isOpen: boolean;
// // }

// // const menuItems: MenuItem[] = [
// //     {
// //         title: 'Letter Management',
// //         icon: <FileText className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Letters',
// //                 href: '/letters',
// //                 icon: <FileText className="h-4 w-4"/>,
// //             },
// //         ],
// //     },
// //     {
// //         title: 'User Management',
// //         icon: <Users className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Users',
// //                 href: '/user/users',
// //                 icon: <Users className="h-4 w-4"/>,
// //                 permission: 'user.view',
// //             },
// //             {
// //                 title: 'Roles',
// //                 href: '/user/roles',
// //                 icon: <Key className="h-4 w-4"/>,
// //                 permission: 'user.view',
// //             },
// //         ],
// //     },
// //     {
// //         title: 'System Settings',
// //         icon: <Settings className="h-5 w-5"/>,
// //         submenu: [
// //             {
// //                 title: 'Organization',
// //                 href: '/settings/organization',
// //                 icon: <Building2 className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Department',
// //                 href: '/settings/department',
// //                 icon: <Landmark className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Source',
// //                 href: '/settings/source',
// //                 icon: <Send className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //             {
// //                 title: 'Status',
// //                 href: '/settings/status',
// //                 icon: <ToggleRight className="h-4 w-4"/>,
// //                 permission: 'settings.view',
// //             },
// //         ],
// //     },
// // ];

// // const sidebarVariants = {
// //     open: {
// //         width: "16rem", // w-64
// //         transition: {
// //             type: "spring",
// //             stiffness: 300,
// //             damping: 30
// //         }
// //     },
// //     closed: {
// //         width: "5rem", // w-20
// //         transition: {
// //             type: "spring",
// //             stiffness: 300,
// //             damping: 30
// //         }
// //     }
// // };

// // const textVariants = {
// //     open: {
// //         opacity: 1,
// //         width: "auto",
// //         display: "block",
// //         transition: {
// //             delay: 0.1
// //         }
// //     },
// //     closed: {
// //         opacity: 0,
// //         width: 0,
// //         transitionEnd: {
// //             display: "none"
// //         }
// //     }
// // };

// // export function Sidebar({isOpen}: SidebarProps) {
// //     const [openMenus, setOpenMenus] = useState<string[]>([]);
// //     const pathname = usePathname();
// //     const {hasPermission} = useAuthStore();

// //     const toggleSubmenu = (title: string) => {
// //         setOpenMenus((prev) =>
// //             prev.includes(title)
// //                 ? prev.filter((item) => item !== title)
// //                 : [...prev, title]
// //         );
// //     };

// //     const isActive = (href?: string) => href && pathname === href;

// //     const renderMenuItem = (item: MenuItem) => {
// //         const isSubmenuOpen = openMenus.includes(item.title);

// //         if (item.submenu) {
// //             return (
// //                 <div key={item.title}>
// //                     <button
// //                         onClick={() => toggleSubmenu(item.title)}
// //                         className="flex w-full items-center justify-between py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-md transition-colors px-4"
// //                     >
// //                         <div className="flex items-center gap-3">
// //                             <span className="text-slate-500 dark:text-slate-400">{item.icon}</span>
// //                             <motion.span
// //                                 variants={textVariants}
// //                                 initial={false}
// //                                 animate={isOpen ? "open" : "closed"}
// //                                 className="whitespace-nowrap font-medium text-sm"
// //                             >
// //                                 {item.title}
// //                             </motion.span>
// //                         </div>
// //                         <motion.div
// //                             animate={{rotate: isSubmenuOpen ? 90 : 0}}
// //                             transition={{duration: 0.2}}
// //                             className={cn("h-4 w-4 text-slate-400", {"hidden": !isOpen})}
// //                         >
// //                             <ChevronRight className="h-4 w-4"/>
// //                         </motion.div>
// //                     </button>

// //                     <AnimatePresence>
// //                         {isSubmenuOpen && (
// //                             <motion.div
// //                                 initial={{height: 0, opacity: 0}}
// //                                 animate={{height: "auto", opacity: 1}}
// //                                 exit={{height: 0, opacity: 0}}
// //                                 transition={{duration: 0.2}}
// //                                 className="overflow-hidden"
// //                             >
// //                                 <div className={cn("space-y-1 py-1", !isOpen && "pl-1")}>
// //                                     {item.submenu.map((subItem) => (
// //                                         subItem?.permission && !hasPermission(subItem.permission) ? (
// //                                             <div
// //                                                 key={subItem.title}
// //                                                 className={cn(
// //                                                     'flex items-center gap-3 py-2 rounded-md transition-colors opacity-40 cursor-not-allowed text-slate-500 dark:text-slate-500',
// //                                                     isOpen ? "px-8" : "px-4 justify-center"
// //                                                 )}
// //                                             >
// //                                                 {subItem.icon}
// //                                                 <motion.span
// //                                                     variants={textVariants}
// //                                                     initial={false}
// //                                                     animate={isOpen ? "open" : "closed"}
// //                                                     className="whitespace-nowrap text-sm"
// //                                                 >
// //                                                     {subItem.title}
// //                                                 </motion.span>
// //                                             </div>
// //                                         ) : (
// //                                             <Link
// //                                                 key={subItem.title}
// //                                                 href={subItem.href || '#'}
// //                                                 className={cn(
// //                                                     'relative flex items-center gap-3 py-2 rounded-md transition-colors text-sm',
// //                                                     isOpen ? "px-8" : "px-4 justify-center",
// //                                                     isActive(subItem.href)
// //                                                         ? 'bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium'
// //                                                         : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
// //                                                 )}
// //                                             >
// //                                                 {isActive(subItem.href) && (
// //                                                     <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400"/>
// //                                                 )}
// //                                                 {subItem.icon}
// //                                                 <motion.span
// //                                                     variants={textVariants}
// //                                                     initial={false}
// //                                                     animate={isOpen ? "open" : "closed"}
// //                                                     className="whitespace-nowrap"
// //                                                 >
// //                                                     {subItem.title}
// //                                                 </motion.span>
// //                                             </Link>
// //                                         )))}
// //                                 </div>
// //                             </motion.div>
// //                         )}
// //                     </AnimatePresence>
// //                 </div>
// //             );
// //         }

// //         return (
// //             <Link
// //                 key={item.title}
// //                 href={item.href || '#'}
// //                 className={cn(
// //                     'flex items-center py-2.5 rounded-md transition-colors px-4 gap-3 text-sm',
// //                     isActive(item.href)
// //                         ? 'bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium'
// //                         : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
// //                 )}
// //             >
// //                 {item.icon}
// //                 <motion.span
// //                     variants={textVariants}
// //                     initial={false}
// //                     animate={isOpen ? "open" : "closed"}
// //                     className="whitespace-nowrap"
// //                 >
// //                     {item.title}
// //                 </motion.span>
// //             </Link>
// //         );
// //     };

// //     return (
// //         <motion.aside
// //             initial={false}
// //             animate={isOpen ? "open" : "closed"}
// //             variants={sidebarVariants}
// //             className={cn(
// //                 'fixed inset-y-0 left-0 z-40 transform border-r border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 top-16',
// //                 {
// //                     'translate-x-0': isOpen,
// //                     '-translate-x-full lg:translate-x-0': !isOpen,
// //                 }
// //             )}
// //         >
// //             <nav className="space-y-1 p-2">
// //                 {menuItems.map(renderMenuItem)}
// //             </nav>
// //         </motion.aside>
// //     );
// // }


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
//                 href: '/settings/organization',
//                 icon: <Building2 className="h-4 w-4"/>,
//                 permission: 'settings.view',
//             },
//             {
//                 title: 'Department',
//                 href: '/settings/department',
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
//                 'fixed inset-y-0 left-0 z-40 transform border-r border-neutral-800 bg-neutral-900 shadow-sm lg:translate-x-0 top-16',
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
import {Building2, ChevronRight, FileText, Key, Landmark, Send, Settings, ToggleRight, Users} from 'lucide-react';
import {AnimatePresence, motion} from 'framer-motion';
import {useAuthStore} from "@/store/auth-store";

interface MenuItem {
    title: string;
    href?: string;
    icon: ReactNode;
    permission?: string;
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
        ],
    },
    {
        title: 'System Settings',
        icon: <Settings className="h-5 w-5"/>,
        submenu: [
            {
                title: 'Organization',
                href: '/settings/organization',
                icon: <Building2 className="h-4 w-4"/>,
                permission: 'settings.view',
            },
            {
                title: 'Department',
                href: '/settings/department',
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
        ],
    },
];

const sidebarVariants = {
    open: {
        width: "16rem", // w-64
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    },
    closed: {
        width: "5rem", // w-20
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
                                    {item.submenu.map((subItem) => (
                                        subItem?.permission && !hasPermission(subItem.permission) ? (
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
                                        )))}
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