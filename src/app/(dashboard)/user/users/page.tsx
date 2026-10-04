
'use client';

import {useEffect, useState} from "react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {
    Briefcase,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Filter,
    History as HistoryIcon,
    MoreVertical,
    Pencil,
    Settings2,
    Trash2,
    UserCheck,
    UserPlus,
    UserRoundX,
    Users as UsersIcon,
    Users,
    X
} from "lucide-react";
import {toast} from "sonner";
import Link from "next/link";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {UpdateUserModal} from "@/app/(dashboard)/user/users/update-user-modal";
import {DesignationManagerDialog} from "@/app/(dashboard)/user/users/designation-manager-dialog";
import {EmployeeNameManagerDialog} from "@/app/(dashboard)/user/users/employee-name-manager-dialog";
import api from "@/lib/api";
import {AddDepartmentAccountModal} from "@/app/(dashboard)/user/users/add-department-account-modal";

// Interfaces for API data
interface Department {
    id: number;
    name: string;
    create_datetime: string;
    update_datetime: string;
}

interface Role {
    id: number;
    name: string;
    create_datetime: string;
    update_datetime: string;
}

interface Designation {
    id: number;
    name: string;
    description?: string | null;
    is_active?: boolean;
    create_datetime: string;
    update_datetime: string;
}

interface EmployeeName {
    id: number;
    full_name: string;
    is_active?: boolean;
}

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    department: string | null;
    department_unit: string | null;
    role: string | null;
    designation: string | null;
    status: string;
    is_department_account: boolean;   // true for department/sub-unit shared accounts
}

interface UserFilters {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    department_id: number;
    role_id: number;
    designation_id: number;
    is_active: boolean | null;
}

interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    total: number;
    total_pages: number;
    page: number;
    page_size: number;
}

interface UserHistoryEntry {
    id: number;
    action: string;
    description: string;
    performed_by: string | null;
    create_datetime: string;
}

// top-level tab: split the system users list by user category.
// 'main'       -> ordinary employee accounts
// 'department' -> shared section (department) login accounts
// 'subunit'    -> shared sub-unit login accounts
type UserTab = 'main' | 'department' | 'subunit';

const userTabs: {value: UserTab; label: string}[] = [
    {value: 'main', label: ' Users'},
    {value: 'department', label: 'Section Accounts '},
    {value: 'subunit', label: 'Unit Accounts'},
];

const defaultFilters: UserFilters = {
    id: 0,
    email: "",
    first_name: "",
    last_name: "",
    department_id: 0,
    role_id: 0,
    designation_id: 0,
    is_active: null
};

const statuses = [
    {id: 1, name: "Active", value: true},
    {id: 0, name: "Inactive", value: false},
]

// lower-case + trim, so every text comparison below ignores case and stray spaces
const norm = (value?: string | null): string => (value ?? '').toLowerCase().trim();

// Formats a naive UTC datetime string coming from the backend
// (func.utc_timestamp()) into the user's local time.
const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(dateStr);
    const iso = hasTz ? dateStr : `${dateStr}Z`;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function UsersPage() {
    // which user-category tab is active
    const [activeTab, setActiveTab] = useState<UserTab>('main');

    // State for API data
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    // allUsers holds EVERY user. The filters, the tab split and the pagination
    // are all applied in the browser below, so they work the same no matter how
    // the backend list endpoint treats its filter fields.
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(true);
    const [activeUserCount, setActiveUserCount] = useState(0);
    const [inactiveUserCount, setInactiveUserCount] = useState(0);
    const [totalUserCount, setTotalUserCount] = useState(0);
    const [employeeNames, setEmployeeNames] = useState<EmployeeName[]>([]);
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [isDeptAccountModalOpen, setIsDeptAccountModalOpen] = useState(false);

    // State for user modal
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // State for designation manager modal
    const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);

    // State for history modal
    const [historyModal, setHistoryModal] = useState<{
        isOpen: boolean;
        user: User | null;
        entries: UserHistoryEntry[];
        isLoading: boolean;
    }>({isOpen: false, user: null, entries: [], isLoading: false});

    // State for filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<UserFilters>(defaultFilters);

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [5, 10, 20, 50];

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        department: true,
        department_unit: true,
        designation: true,
        status: true,
    });

    // Fetch stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/v1/system_user/stats');
                const data = await response.data;

                setActiveUserCount(data.data.active_users);
                setInactiveUserCount(data.data.inactive_users);
                setTotalUserCount(data.data.total_users);

            } catch (error) {
                console.error("Error fetching user stats:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };
        fetchStats().catch(
            (error) => {
                console.error("Error in fetchStats:", error);
            }
        )
    }, [refreshTrigger]);

    // Fetch departments
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await api.get('/v1/department/list');
                const data = await response.data;

                setDepartments(data.data);

            } catch (error) {
                console.error("Error fetching departments:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        fetchDepartments().catch(
            (error) => {
                console.error("Error in fetchDepartments:", error);
            }
        )
    }, []);

    // Fetch roles
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await api.get('/v1/role/list');
                const data = await response.data;

                setRoles(data.data);

            } catch (error) {
                console.error("Error fetching roles:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        fetchRoles().catch(
            (error) => {
                console.error("Error in fetchRoles:", error);
            }
        )
    }, []);

    // Fetch designations
    const fetchDesignations = async () => {
        try {
            const response = await api.get('/v1/designation/list');
            const data = await response.data;

            setDesignations(data.data);

        } catch (error) {
            console.error("Error fetching designations:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    };

    const fetchEmployeeNames = async () => {
        try {
            const response = await api.get('/v1/employee_name/list');
            setEmployeeNames(response.data.data);
        } catch (error) {
            console.error("Error fetching names:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    };

    useEffect(() => {
        fetchEmployeeNames().catch((error) => console.error("Error in fetchEmployeeNames:", error));
    }, []);

    const handleNamesChanged = () => {
        fetchEmployeeNames().catch((error) => console.error("Error in fetchEmployeeNames:", error));
    };

    useEffect(() => {
        fetchDesignations().catch(
            (error) => {
                console.error("Error in fetchDesignations:", error);
            }
        )
    }, []);

    // Fetch ALL users once (and again after any change). NO filter values are
    // sent to the backend any more — filtering is done below in the browser,
    // so it can't be affected by how the backend treats its filter fields.
    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await api.post(`/v1/system_user/list?page=1&page_size=100000`, {
                    id: 0,
                    email: "",
                    first_name: "",
                    last_name: "",
                    department_id: 0,
                    role_id: 0,
                    designation_id: 0,
                    is_active: null,
                });
                const data: PaginatedResponse<User> = await response.data;

                setAllUsers(data.data);

            } catch (error) {
                console.error("Error fetching users:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers().catch(
            (error) => {
                console.error("Error in fetchUsers:", error);
            }
        )
    }, [refreshTrigger]);

    // Filter by the search boxes / dropdowns (all combined, AND). Text boxes are
    // "contains", ignoring case. Role / Section / Designation are matched on the
    // NAME shown in the table.
    const roleFilterName = filters.role_id ? norm(roles.find(r => r.id === filters.role_id)?.name) : "";
    const deptFilterName = filters.department_id ? norm(departments.find(d => d.id === filters.department_id)?.name) : "";
    const designationFilterName = filters.designation_id ? norm(designations.find(d => d.id === filters.designation_id)?.name) : "";

    const filteredUsers = allUsers.filter((user) => {
        if (filters.id && user.id !== filters.id) return false;

        // the "Name" box searches the full name (first + last), so "Shalika Hennayaka" works too
        if (filters.first_name.trim()) {
            const fullName = norm(`${user.first_name} ${user.last_name || ''}`);
            if (!fullName.includes(norm(filters.first_name))) return false;
        }
        if (filters.last_name.trim() && !norm(user.last_name).includes(norm(filters.last_name))) return false;
        if (filters.email.trim() && !norm(user.email).includes(norm(filters.email))) return false;

        if (filters.role_id && norm(user.role) !== roleFilterName) return false;
        if (filters.department_id && norm(user.department) !== deptFilterName) return false;
        if (filters.designation_id && norm(user.designation) !== designationFilterName) return false;

        if (filters.is_active !== null && user.status !== (filters.is_active ? "Active" : "Inactive")) return false;

        return true;
    });

    // client-side tab split: classify each user by is_department_account + department_unit.
    // Regular employees can still have a department/sub-unit, so 'main' just means
    // "not a shared department/sub-unit login".
    const usersForTab = filteredUsers.filter((user) => {
        if (activeTab === 'subunit') return user.is_department_account && !!user.department_unit;
        if (activeTab === 'department') return user.is_department_account && !user.department_unit;
        return !user.is_department_account; // 'main' — ordinary employees
    });

    // client-side pagination over the tab-filtered list
    const totalRows = usersForTab.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const users = usersForTab.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Back to page 1 whenever the filters, the tab or the page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, activeTab, pageSize]);

    // switch user-category tab (also clears any active filters so the new tab starts clean)
    const handleTabChange = (tab: UserTab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setFilters(defaultFilters);
        setShowFilters(false);
    };

    // Update user modal
    const handleUpdate = (user: User) => {
        setSelectedUser(user);
        setIsUpdateModalOpen(true);
    };

    const updateModalHandler = (isOpen: boolean) => {
        setIsUpdateModalOpen(isOpen);
        if (!isOpen) {
            setSelectedUser(null);
            setRefreshTrigger(!refreshTrigger);
        }
    };

    const designationModalHandler = (isOpen: boolean) => {
        setIsDesignationModalOpen(isOpen);
    };

    const handleDesignationsChanged = () => {
        fetchDesignations().catch((error) => console.error("Error in fetchDesignations:", error));
        setRefreshTrigger((prev) => !prev);
    };

    // History modal
    const handleViewHistory = async (user: User) => {
        setHistoryModal({isOpen: true, user, entries: [], isLoading: true});
        try {
            const response = await api.get(`/v1/system_user/${user.id}/history`);
            const data = await response.data;
            setHistoryModal(prev => ({...prev, entries: data.data, isLoading: false}));
        } catch (error) {
            console.error("Error fetching user history:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            setHistoryModal(prev => ({...prev, isLoading: false}));
        }
    };

    const closeHistoryModal = () => {
        setHistoryModal({isOpen: false, user: null, entries: [], isLoading: false});
    };

    // Delete user state
    const [deleteUserAlert, setDeleteUserAlert] = useState({
        isOpen: false,
        userId: 0,
    });

    const handleDelete = (userId: number) => {
        setDeleteUserAlert({
            isOpen: true,
            userId: userId,
        });
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await api.delete(`/v1/system_user/${deleteUserAlert.userId}`, {
                method: 'DELETE',
            });
            const data = await response.data;

            toast.success("User Deleted", {
                description: data.message,
            });
            setRefreshTrigger(!refreshTrigger);

        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setDeleteUserAlert({
                isOpen: false,
                userId: 0,
            });
        }
    };

    // Helper for pagination
    const generatePageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return pageNumbers;
    };

    // Clear individual filter
    const clearFilter = (filterName: keyof UserFilters) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: typeof prev[filterName] === 'boolean' || prev[filterName] === null
                ? null
                : (typeof prev[filterName] === 'string' ? '' : 0)
        }));
    };

    const actionBadgeClass = (action: string) => cn(
        "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
        {
            "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200": action === "Created",
            "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200": action === "Updated",
            "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200": action === "Deleted",
        }
    );

    // number of visible table columns (+1 for the actions column), for the colSpan of the loading / empty rows
    const visibleColumnCount = Object.values(columnVisibility).filter(Boolean).length + 1;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">
                        Create and manage all users in the system. Control user access by assigning roles and monitoring
                        activity to ensure secure and efficient system usage
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsDesignationModalOpen(true)}>
                        <Briefcase className="mr-2 h-4 w-4"/>
                        Manage Designations
                    </Button>
                    <Button variant="outline" onClick={() => setIsNameModalOpen(true)}>
                        <Users className="mr-2 h-4 w-4"/>
                        Manage Users
                    </Button>
                    <Link href="/sign-up">
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4"/>
                            New User
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={() => setIsDeptAccountModalOpen(true)}>
                        <Briefcase className="mr-2 h-4 w-4"/>
                        Create Section/Unit Account
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <UsersIcon className="h-4 w-4 text-blue-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{totalUserCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Total registered users
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{activeUserCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Currently active users
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                        <UserRoundX className="h-4 w-4 text-red-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{inactiveUserCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Currently inactive users
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* tab switcher: Users / Section Accounts / Unit Accounts */}
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
                {userTabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => handleTabChange(tab.value)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.value
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between">
                    <div>
                        <CardTitle>
                            {userTabs.find(t => t.value === activeTab)?.label ?? "System Users"}
                        </CardTitle>
                        <CardDescription>
                            {activeTab === 'main' && "Ordinary employee accounts (may belong to a department)"}
                            {activeTab === 'department' && "Shared login accounts for a department"}
                            {activeTab === 'subunit' && "Shared login accounts for a department sub-unit"}
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className={showFilters ? "bg-gray-100 dark:bg-gray-900" : ""}
                            onClick={() => {
                                // closing the filter panel also clears every filter
                                if (showFilters) {
                                    setFilters(defaultFilters);
                                    setCurrentPage(1);
                                }
                                setShowFilters(!showFilters);
                            }}
                        >
                            <Filter className="h-4 w-4"/>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Settings2 className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {Object.entries({
                                    id: "ID",
                                    first_name: "Name",
                                    email: "Email",
                                    role: "Role",
                                    department: "Section",
                                    department_unit: "Sub-Unit",
                                    designation: "Designation",
                                    status: "Status"
                                }).map(([key, label]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={columnVisibility[key]}
                                        // keep the menu open so several columns can be toggled in a row
                                        onSelect={(e) => e.preventDefault()}
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility((prev) => ({
                                                ...prev,
                                                [key]: !!checked,
                                            }))
                                        }
                                    >
                                        {label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full">
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                                <div className="relative">
                                    <Input
                                        placeholder="Search by ID..."
                                        value={filters.id === 0 ? "" : filters.id}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            id: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full"
                                        type="number"
                                    />
                                    {filters.id !== 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('id')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Input
                                        placeholder="Search by Name..."
                                        value={filters.first_name}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            first_name: e.target.value
                                        }))}
                                        className="w-full"
                                    />
                                    {filters.first_name && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('first_name')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Input
                                        placeholder="Search by Last Name..."
                                        value={filters.last_name}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            last_name: e.target.value
                                        }))}
                                        className="w-full"
                                    />
                                    {filters.last_name && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('last_name')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Input
                                        placeholder="Search by Email..."
                                        value={filters.email}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            email: e.target.value
                                        }))}
                                        className="w-full"
                                    />
                                    {filters.email && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('email')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Select
                                        value={filters.role_id !== 0 ? filters.role_id.toString() : ""}
                                        onValueChange={(value) => setFilters((prev) => ({
                                            ...prev,
                                            role_id: parseInt(value) || 0,
                                        }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a Role"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filters.role_id !== 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('role_id')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Select
                                        value={filters.department_id !== 0 ? filters.department_id.toString() : ""}
                                        onValueChange={(value) => setFilters((prev) => ({
                                            ...prev,
                                            department_id: parseInt(value) || 0,
                                        }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a Section"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filters.department_id !== 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('department_id')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Select
                                        value={filters.designation_id !== 0 ? filters.designation_id.toString() : ""}
                                        onValueChange={(value) => setFilters((prev) => ({
                                            ...prev,
                                            designation_id: parseInt(value) || 0,
                                        }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a Designation"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {designations.map((designation) => (
                                                <SelectItem key={designation.id} value={designation.id.toString()}>
                                                    {designation.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filters.designation_id !== 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('designation_id')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Select
                                        value={filters.is_active !== null ? filters.is_active.toString() : ""}
                                        onValueChange={(value) => setFilters((prev) => ({
                                            ...prev,
                                            is_active: value === "true" ? true : value === "false" ? false : null,
                                        }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Status"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((status) => (
                                                <SelectItem key={status.id} value={status.value.toString()}>
                                                    {status.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filters.is_active !== null && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => clearFilter('is_active')}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columnVisibility.id && <TableHead>ID</TableHead>}
                                    {columnVisibility.first_name && <TableHead> Name</TableHead>}
                                    {columnVisibility.email && <TableHead>Email</TableHead>}
                                    {columnVisibility.role && <TableHead>Role</TableHead>}
                                    {columnVisibility.department && <TableHead>Section</TableHead>}
                                    {columnVisibility.department_unit && <TableHead> Unit</TableHead>}
                                    {columnVisibility.designation && <TableHead>Designation</TableHead>}
                                    {columnVisibility.status && <TableHead className="text-center">Status</TableHead>}
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="h-90 text-center p-0">
                                            <div className="w-full flex flex-col items-center justify-center py-8">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <div
                                                        className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div
                                                        className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div
                                                        className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-4">Loading user
                                                    data...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="h-90 text-center">
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <UsersIcon className="h-10 w-10 text-muted-foreground/40 mb-2"/>
                                                <p className="text-sm text-muted-foreground">No users found</p>
                                                {showFilters && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="mt-2"
                                                        onClick={() => {
                                                            setFilters(defaultFilters);
                                                            setCurrentPage(1);
                                                        }}
                                                    >
                                                        Clear all filters
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            {/* CHANGED — shows the user's REAL id, so the "Search by ID" box matches what the table shows */}
                                            {columnVisibility.id &&
                                                <TableCell className="max-w-[50px]">{user.id}</TableCell>}
                                            {columnVisibility.first_name && <TableCell
                                                className="truncate max-w-[150px]">{`${user.first_name} ${user.last_name || ''}`.trim()}</TableCell>}
                                            {columnVisibility.email &&
                                                <TableCell className="truncate max-w-[150px]">{user.email}</TableCell>}
                                            {columnVisibility.role && <TableCell
                                                className="truncate max-w-[150px]">{user.role || "—"}</TableCell>}
                                            {columnVisibility.department && <TableCell
                                                className="truncate max-w-[150px]">{user.department || "—"}</TableCell>}
                                            {columnVisibility.department_unit && <TableCell
                                                className="truncate max-w-[150px]">{user.department_unit || "—"}</TableCell>}
                                            {columnVisibility.designation && <TableCell
                                                className="truncate max-w-[150px]">{user.designation || "—"}</TableCell>}
                                            {columnVisibility.status &&
                                                <TableCell className="max-w-[100px] text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-2.5 text-xs font-medium",
                                                        {
                                                            "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200": user.status === "Active",
                                                            "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200": user.status === "Inactive"
                                                        }
                                                    )}>
                                                        {user.status}
                                                    </span>
                                                </TableCell>}
                                            <TableCell className="text-right align-middle max-w-[50px]">
                                                <div className="flex items-center justify-end h-full">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"
                                                                    className="rounded-full h-5 w-6 p-0">
                                                                <MoreVertical className="h-4 w-4"/>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleUpdate(user)}>
                                                                <Pencil className="mr-2 h-4 w-4"/>
                                                                Update
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleViewHistory(user)}>
                                                                <HistoryIcon className="mr-2 h-4 w-4"/>
                                                                History
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(user.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Total {totalRows}</span>
                            <span className="text-sm text-muted-foreground">rows per page</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={pageSize}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4"/>
                            </Button>
                            {generatePageNumbers().map((pageNumber) => (
                                <Button
                                    key={pageNumber}
                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                    size="icon"
                                    onClick={() => setCurrentPage(pageNumber)}
                                >
                                    {pageNumber}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Update user modal */}
            <UpdateUserModal
                isUpdateModalOpen={isUpdateModalOpen}
                setIsUpdateModalOpen={updateModalHandler}
                userData={selectedUser}
                roles={roles}
                departments={departments}
                designations={designations}
                statuses={statuses}
            />

            {/* Designation manager modal */}
            <DesignationManagerDialog
                isOpen={isDesignationModalOpen}
                setIsOpen={designationModalHandler}
                designations={designations}
                onChanged={handleDesignationsChanged}
            />
            <AddDepartmentAccountModal
                isOpen={isDeptAccountModalOpen}
                onClose={() => setIsDeptAccountModalOpen(false)}
                departments={departments}
                onSuccess={() => setRefreshTrigger(prev => !prev)}
            />

            <EmployeeNameManagerDialog
                isOpen={isNameModalOpen}
                setIsOpen={setIsNameModalOpen}
                names={employeeNames}
                onChanged={handleNamesChanged}
            />

            {/* User history modal */}
            <Dialog open={historyModal.isOpen} onOpenChange={(open) => !open && closeHistoryModal()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Activity History
                            {historyModal.user && ` — ${historyModal.user.first_name} ${historyModal.user.last_name}`}
                        </DialogTitle>
                        <DialogDescription>
                            Create, update and delete actions for this account, with date and time
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[26rem] overflow-y-auto space-y-4 pr-1">
                        {historyModal.isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="flex items-center space-x-2">
                                    <div className="h-3 w-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-3 w-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-3 w-3 bg-primary/60 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        ) : historyModal.entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <HistoryIcon className="h-8 w-8 text-muted-foreground/40 mb-2"/>
                                <p className="text-sm text-muted-foreground">No history found for this user</p>
                            </div>
                        ) : (
                            historyModal.entries.map((entry) => (
                                <div key={entry.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                                    <div className="mt-0.5 shrink-0">
                                        {entry.action === "Created" && <UserPlus className="h-4 w-4 text-green-600"/>}
                                        {entry.action === "Updated" && <Pencil className="h-4 w-4 text-blue-600"/>}
                                        {entry.action === "Deleted" && <Trash2 className="h-4 w-4 text-red-600"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={actionBadgeClass(entry.action)}>{entry.action}</span>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDateTime(entry.create_datetime)}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1">{entry.description}</p>
                                        {entry.performed_by && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                by {entry.performed_by}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* User delete confirm alert */}
            <AlertDialog open={deleteUserAlert.isOpen} onOpenChange={() =>
                setDeleteUserAlert({isOpen: false, userId: 0})
            }>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this user account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete user account.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}