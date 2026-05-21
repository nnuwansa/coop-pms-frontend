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
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Filter,
    MoreVertical,
    Pencil,
    Settings2,
    Trash2,
    UserCheck,
    UserPlus,
    UserRoundX,
    Users as UsersIcon,
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
import {UpdateUserModal} from "@/app/(dashboard)/user/users/update-user-modal";
import {useDebounce} from "@/hook/debounce";
import api from "@/lib/api";

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

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    department: string | null;
    role: string | null;
    status: string;
}

interface UserFilters {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    department_id: number;
    role_id: number;
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

const defaultFilters: UserFilters = {
    id: 0,
    email: "",
    first_name: "",
    last_name: "",
    department_id: 0,
    role_id: 0,
    is_active: null
};

const statuses = [
    {id: 1, name: "Active", value: true},
    {id: 0, name: "Inactive", value: false},
]

export default function UsersPage() {
    // State for API data
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(true);
    const [activeUserCount, setActiveUserCount] = useState(0);
    const [inactiveUserCount, setInactiveUserCount] = useState(0);
    const [totalUserCount, setTotalUserCount] = useState(0);

    // State for user modal
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // State for filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<UserFilters>(defaultFilters);

    // Apply debouncing to filters to prevent excessive API calls
    const debouncedFilters = useDebounce(filters, 500); // 500ms debounce time

    // State for pagination
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizeOptions = [5, 10, 20, 50];

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState({
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        department: true,
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

    // Fetch users with pagination and debounced filters
    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const url = `/v1/system_user/list?page=${currentPage}&page_size=${pageSize}`;

                const response = await api.post(url, {
                    id: debouncedFilters.id || 0,
                    email: debouncedFilters.email || "",
                    first_name: debouncedFilters.first_name || "",
                    last_name: debouncedFilters.last_name || "",
                    department_id: debouncedFilters.department_id || 0,
                    role_id: debouncedFilters.role_id || 0,
                    is_active: debouncedFilters.is_active
                });
                const data: PaginatedResponse<User> = await response.data;

                setUsers(data.data);
                setTotalRows(data.total);
                setTotalPages(data.total_pages);

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
    }, [currentPage, pageSize, debouncedFilters, refreshTrigger]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilters]);

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

    // Delete user state
    const [deleteUserAlert, setDeleteUserAlert] = useState({
        isOpen: false,
        userId: 0,
    });

    // Delete user handler
    const handleDelete = (userId: number) => {
        setDeleteUserAlert({
            isOpen: true,
            userId: userId,
        });
    };

    // Delete user confirm
    const handleDeleteConfirm = async () => {
        try {
            // Implement your delete API call here
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
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

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
            [filterName]: typeof prev[filterName] === 'boolean' ? null : (typeof prev[filterName] === 'string' ? '' : 0)
        }));
    };

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
                <Link href="/sign-up">
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4"/>
                        New User
                    </Button>
                </Link>
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

            <Card>
                <CardHeader className="flex flex-row justify-between">
                    <div>
                        <CardTitle>System Users</CardTitle>
                        <CardDescription>
                            This section provides a list of all registered users in the system
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className={showFilters ? "bg-gray-100 dark:bg-gray-900" : ""}
                            onClick={() => {
                                setShowFilters(!showFilters);
                                console.log("Filters toggled:", showFilters);
                                if (showFilters) {
                                    setFilters(defaultFilters);
                                    setCurrentPage(1);
                                }
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
                                    first_name: "First Name",
                                    last_name: "Last Name",
                                    email: "Email",
                                    role: "Role",
                                    department: "Department",
                                    status: "Status"
                                }).map(([key, label]) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={columnVisibility[key]}
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility((prev) => ({
                                                ...prev,
                                                [key]: checked,
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
                                {columnVisibility.id && (
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
                                )}

                                {columnVisibility.first_name && (
                                    <div className="relative">
                                        <Input
                                            placeholder="Search by First Name..."
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
                                )}

                                {columnVisibility.last_name && (
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
                                )}

                                {columnVisibility.email && (
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
                                )}

                                {columnVisibility.role && (
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
                                )}

                                {columnVisibility.department && (
                                    <div className="relative">
                                        <Select
                                            value={filters.department_id !== 0 ? filters.department_id.toString() : ""}
                                            onValueChange={(value) => setFilters((prev) => ({
                                                ...prev,
                                                department_id: parseInt(value) || 0,
                                            }))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a Department"/>
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
                                )}

                                {columnVisibility.status && (
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
                                )}
                            </div>
                        )}
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columnVisibility.id && <TableHead>ID</TableHead>}
                                    {columnVisibility.first_name && <TableHead>First Name</TableHead>}
                                    {columnVisibility.last_name && <TableHead>Last Name</TableHead>}
                                    {columnVisibility.email && <TableHead>Email</TableHead>}
                                    {columnVisibility.role && <TableHead>Role</TableHead>}
                                    {columnVisibility.department && <TableHead>Department</TableHead>}
                                    {columnVisibility.status && <TableHead className="text-center">Status</TableHead>}
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-90 text-center p-0">
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
                                        <TableCell colSpan={8} className="h-90 text-center">
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
                                            {columnVisibility.id &&
                                                <TableCell className="max-w-[50px]">{user.id}</TableCell>}
                                            {columnVisibility.first_name && <TableCell
                                                className="truncate max-w-[150px]">{user.first_name}</TableCell>}
                                            {columnVisibility.last_name && <TableCell
                                                className="truncate max-w-[150px]">{user.last_name}</TableCell>}
                                            {columnVisibility.email &&
                                                <TableCell className="truncate max-w-[150px]">{user.email}</TableCell>}
                                            {columnVisibility.role && <TableCell
                                                className="truncate max-w-[150px]">{user.role || "—"}</TableCell>}
                                            {columnVisibility.department && <TableCell
                                                className="truncate max-w-[150px]">{user.department || "—"}</TableCell>}
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
                                Page {currentPage} of {totalPages || 1}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1 || totalPages === 0}
                            >
                                <ChevronsLeft className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1 || totalPages === 0}
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
                                onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))}
                                disabled={currentPage === (totalPages || 1) || totalPages === 0}
                            >
                                <ChevronRight className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(totalPages || 1)}
                                disabled={currentPage === (totalPages || 1) || totalPages === 0}
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
                statuses={statuses}
            />

            {/* User delete confirm alert */}
            <AlertDialog open={deleteUserAlert.isOpen} onOpenChange={() =>
                setDeleteUserAlert({isOpen: false, userId: 0})
            }>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this user account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete user account <span
                            className="font-semibold">#{deleteUserAlert.userId}</span>.
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