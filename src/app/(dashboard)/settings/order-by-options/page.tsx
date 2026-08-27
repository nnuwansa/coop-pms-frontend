'use client';

import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Badge} from "@/components/ui/badge";
import {
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    ShieldOff,
    ShieldCheck,
} from "lucide-react";
import {toast} from "sonner";
import {DeleteDialog} from "@/app/(dashboard)/settings/order-by-options/delete-dialog";
import {AddDialog} from "@/app/(dashboard)/settings/order-by-options/add-dialog";
import {UpdateDialog} from "@/app/(dashboard)/settings/order-by-options/update-dialog";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import api from "@/lib/api";

interface OrderByOption {
    id: number;
    name: string;
    category: string;
    is_active: boolean;
    create_datetime: string;
}

interface PaginationState {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export default function OrderByOptionsPage() {
    const [options, setOptions] = useState<OrderByOption[]>([]);
    const [allOptions, setAllOptions] = useState<OrderByOption[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1
    });
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrderByOption | null>(null);
    const [deleteAlert, setDeleteAlert] = useState({
        isOpen: false,
        Id: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        fetchOrderByOptions().catch(
            (error) => {
                console.error("Error loading order by options", {error});
            }
        )
    }, [refreshTrigger]);

    const applySearchAndPagination = useCallback(() => {
        let filteredData = [...allOptions];

        // Apply search filter
        if (searchTerm.trim() !== "") {
            filteredData = filteredData.filter(opt =>
                opt.name.toLowerCase().includes(searchTerm.toLowerCase())
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

        setOptions(paginatedData);
        setPagination(prev => ({
            ...prev,
            currentPage,
            totalItems,
            totalPages
        }));
    }, [allOptions, pagination.currentPage, pagination.pageSize, searchTerm])

    useEffect(() => {
        applySearchAndPagination();
    }, [searchTerm, pagination.currentPage, pagination.pageSize, allOptions, applySearchAndPagination]);

    const fetchOrderByOptions = async () => {
        setIsLoading(true);
        try {
            // include_inactive=true so this admin page shows deactivated
            // titles too — the Letter View picker hits the same endpoint
            // without this param and only gets active ones
            const response = await api.get('/v1/order-by-option/list?include_inactive=true');
            const data = await response.data;

            setAllOptions(data.data);
            setPagination(prev => ({
                ...prev,
                totalItems: data.data.length,
                totalPages: Math.ceil(data.data.length / prev.pageSize)
            }));
        } catch (error) {
            console.log("Error fetching order by options", {error});
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

    // soft-delete → deactivate. Confirmed via the same DeleteDialog used
    // elsewhere, so the wording there should say "Deactivate" not "Delete"
    // for this entity (see delete-dialog.tsx entityLabel prop below)
    const handleDeleteConfirm = async () => {
        if (!selectedItem) return;

        try {
            const response = await api.delete(`/v1/order-by-option/${selectedItem.id}`);
            const data = await response.data;

            refreshOrderByOptions();
            toast.success("Order By option deactivated", {description: data.message});
        } catch (error) {
            toast.error("Failed to deactivate option", {
                description: error.response?.data.message || 'Something went wrong. Please try again'
            });
        }
    };

    const handleDeleteAlert = (optionId: number) => {
        const option = allOptions.find(o => o.id === optionId);
        if (option) {
            setSelectedItem(option);
            setDeleteAlert({isOpen: true, Id: optionId});
        }
    };

    const handleUpdate = (option: OrderByOption) => {
        setSelectedItem(option);
        setIsUpdateModalOpen(true);
    };

    // reactivating an inactive option — no confirmation needed, unlike
    // deactivation, since it can't hide anything from a live letter
    const handleReactivate = async (option: OrderByOption) => {
        try {
            await api.put(`/v1/order-by-option/${option.id}`, {is_active: true});
            toast.success("Order By option reactivated");
            refreshOrderByOptions();
        } catch (error) {
            toast.error("Failed to reactivate option", {
                description: error.response?.data.message || 'Something went wrong. Please try again'
            });
        }
    };

    const refreshOrderByOptions = () => {
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
            currentPage: 1
        }));
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Order By Options</h1>
                    <p className="text-muted-foreground">
                        Manage the seal / designation titles selectable in the Letter View&apos;s Order By field
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Title
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Order By Option List</CardTitle>
                    <CardDescription>
                        These titles appear in the Order By picker on the Letter View page
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative w-full sm:w-100">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                                placeholder="Search titles..."
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
                        <div
                            className="w-full overflow-x-auto"
                            style={{maxHeight: options.length > 15 ? '500px' : 'none', overflowY: options.length > 15 ? 'auto' : 'visible'}}
                        >
                            <Table className="min-w-[700px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">ID</TableHead>
                                        <TableHead>Title</TableHead>
                                         <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center sticky right-0 bg-background border-l">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-90 text-center p-0">
                                                <div className="w-full flex flex-col items-center justify-center py-8">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                        <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                        <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-4">Loading order by options...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : options.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                {searchTerm ?
                                                    "No titles found matching your search" :
                                                    "No Order By titles found. Add one to get started"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        options.map((option, index) => (
                                            <TableRow key={option.id}>
                                                <TableCell className="text-center">
                                                    {(pagination.currentPage - 1) * pagination.pageSize + index + 1}
                                                </TableCell>
                                                <TableCell className={`font-medium ${!option.is_active ? 'text-muted-foreground line-through' : ''}`}>
                                                    {option.name}
                                                </TableCell>
                                                <TableCell>
+                                                   <Badge variant="outline" className="text-xs">
+                                                       {option.category === 'role' ? 'Role' : 'Action'}
+                                                   </Badge>
+                                               </TableCell>
                                                <TableCell>
                                                    {option.is_active ? (
                                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center sticky right-0 bg-background border-l">
                                                    <div className="flex items-center justify-center h-full">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-5 w-8 p-0">
                                                                    <MoreVertical className="h-4 w-4"/>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleUpdate(option)}>
                                                                    <Pencil className="mr-2 h-4 w-4"/>
                                                                    Update
                                                                </DropdownMenuItem>
                                                                {option.is_active ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteAlert(option.id)}
                                                                        className="text-red-600 focus:text-red-600"
                                                                    >
                                                                        <ShieldOff className="mr-2 h-4 w-4"/>
                                                                        Deactivate
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => handleReactivate(option)}>
                                                                        <ShieldCheck className="mr-2 h-4 w-4"/>
                                                                        Reactivate
                                                                    </DropdownMenuItem>
                                                                )}
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
                    refreshOrderByOptions();
                }}
            />

            {/* Add Modal */}
            <AddDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refreshOrderByOptions();
                }}
                existingOptions={allOptions}
            />

            {/* Deactivate Confirmation Dialog */}
            <DeleteDialog
                deleteAlert={deleteAlert}
                setDeleteAlert={setDeleteAlert}
                onSuccess={handleDeleteConfirm}
            />
        </div>
    );
}