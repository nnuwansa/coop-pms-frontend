'use client';

import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Trash2
} from "lucide-react";
import {toast} from "sonner";
import {ScrollArea} from "@/components/ui/scroll-area";
import {DeleteDialog} from "@/app/(dashboard)/settings/department/delete-dialog";
import {AddDialog} from "@/app/(dashboard)/settings/department/add-dialog";
import {UpdateDialog} from "@/app/(dashboard)/settings/department/update-dialog";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import api from "@/lib/api";

interface Department {
    id: string;
    name: string;
}

interface PaginationState {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export default function DepartmentPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1
    });
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Department | null>(null);
    const [deleteAlert, setDeleteAlert] = useState({
        isOpen: false,
        Id: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        fetchDepartments().catch(
            (error) => {
                console.error("Error loading departments", {error});
            }
        )
    }, [refreshTrigger]);

    const applySearchAndPagination = useCallback(() => {
        let filteredData = [...allDepartments];

        // Apply search filter
        if (searchTerm.trim() !== "") {
            filteredData = filteredData.filter(dept =>
                dept.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Update pagination based on filtered data
        const totalItems = filteredData.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));

        // Adjust current page if it exceeds the new total pages
        const currentPage = Math.min(pagination.currentPage, totalPages);

        // Apply pagination
        const startIndex = (currentPage - 1) * pagination.pageSize;
        const endIndex = Math.min(startIndex + pagination.pageSize, totalItems);
        const paginatedData = filteredData.slice(startIndex, endIndex);

        setDepartments(paginatedData);
        setPagination(prev => ({
            ...prev,
            currentPage,
            totalItems,
            totalPages
        }));
    }, [allDepartments, pagination.currentPage, pagination.pageSize, searchTerm])

    useEffect(() => {
        // Apply search and pagination whenever these dependencies change
        applySearchAndPagination();
    }, [searchTerm, pagination.currentPage, pagination.pageSize, allDepartments, applySearchAndPagination]);

    const fetchDepartments = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/v1/department/list');
            const data = await response.data;

            setAllDepartments(data.data);
            setPagination(prev => ({
                ...prev,
                totalItems: data.data.length,
                totalPages: Math.ceil(data.data.length / prev.pageSize)
            }));
        } catch (error) {
            console.log("Error fetching departments", {error});
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsLoading(false);
        }
    };

    const getPageNumbers = () => {
        const totalPages = pagination.totalPages;
        const currentPage = pagination.currentPage;
        const maxPages = 5;

        if (totalPages <= maxPages) {
            return Array.from({length: totalPages}, (_, i) => i + 1);
        }

        if (currentPage <= 3) {
            return [1, 2, 3, 4, 5];
        }

        if (currentPage >= totalPages - 2) {
            return Array.from({length: 5}, (_, i) => totalPages - 4 + i);
        }

        return Array.from({length: 5}, (_, i) => currentPage - 2 + i);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItem) return;

        try {
            const response = await api.delete(`/v1/department/${selectedItem.id}`);
            const data = await response.data;

            refreshDepartments();
            toast.success("Department Deleted", {description: data.message});
        } catch (error) {
            toast.error("Failed to delete department", {
                description: error.response?.data.message || 'Something went wrong. Please try again'
            });
        }
    };

    const handleDeleteAlert = (departmentId: string) => {
        const department = allDepartments.find(r => r.id === departmentId);
        if (department) {
            setSelectedItem(department);
            setDeleteAlert({isOpen: true, Id: parseInt(departmentId)});
        }
    };

    const handleUpdate = (department: Department) => {
        setSelectedItem(department);
        setIsUpdateModalOpen(true);
    };

    const refreshDepartments = () => {
        setRefreshTrigger(prev => !prev);
    };

    const handlePageChange = (page: number) => {
        setPagination(prev => ({
            ...prev,
            currentPage: page
        }));
    };

    const handlePageSizeChange = (size: string) => {
        setPagination(prev => ({
            ...prev,
            pageSize: parseInt(size),
            currentPage: 1 // Reset to first page when changing page size
        }));
    };

    return (
        <div className="space-y-6 w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Department Management</h1>
                    <p className="text-muted-foreground">
                        Assigning letters to specific departments ensures organized workflows and accountability
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Department
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Department List</CardTitle>
                    <CardDescription>
                        This section lists all departments that can be assigned to letters
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative w-full sm:w-100">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                                placeholder="Search departments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
                            <Select
                                value={pagination.pageSize.toString()}
                                onValueChange={handlePageSizeChange}
                            >
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="10"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <div className="w-full">
                            <ScrollArea className="w-full" style={{height: departments.length > 15 ? '500px' : 'auto'}}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-90 text-center p-0">
                                                    <div
                                                        className="w-full flex flex-col items-center justify-center py-8">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-4">Loading
                                                            department
                                                            data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : departments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}
                                                           className="text-center py-8 text-muted-foreground">
                                                    {searchTerm ?
                                                        "No departments found matching your search." :
                                                        "No departments found. Create a new department to get started."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            departments.map((department, index) => (
                                                <TableRow key={department.id}>
                                                    <TableCell className="text-center">
                                                        {(pagination.currentPage - 1) * pagination.pageSize + index + 1}
                                                    </TableCell>
                                                    <TableCell
                                                        className="font-medium truncate max-w-40">{department.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center h-full">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-5 w-8 p-0">
                                                                        <MoreVertical className="h-4 w-4"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleUpdate(department)}>
                                                                        <Pencil className="mr-2 h-4 w-4"/>
                                                                        Update
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteAlert(department.id)}
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
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {pagination.totalItems > 0 ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0} to {
                            Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)
                        } of {pagination.totalItems} entries
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePageChange(1)}
                                disabled={pagination.currentPage === 1 || isLoading}
                            >
                                <ChevronFirst className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4"/>
                            </Button>

                            <div className="flex items-center gap-1 mx-1">
                                {getPageNumbers().map((pageNum) => (
                                    <Button
                                        key={pageNum}
                                        variant={pageNum === pagination.currentPage ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handlePageChange(pageNum)}
                                        disabled={isLoading}
                                    >
                                        {pageNum}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages || isLoading}
                            >
                                <ChevronRight className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePageChange(pagination.totalPages)}
                                disabled={pagination.currentPage === pagination.totalPages || isLoading}
                            >
                                <ChevronLast className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Update Modal */}
            <UpdateDialog
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                initialData={selectedItem}
                onSuccess={() => {
                    refreshDepartments();
                }}
            />

            {/* Add Modal */}
            <AddDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refreshDepartments();
                }}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteDialog
                deleteAlert={deleteAlert}
                setDeleteAlert={setDeleteAlert}
                onSuccess={handleDeleteConfirm}
            />
        </div>
    );
}