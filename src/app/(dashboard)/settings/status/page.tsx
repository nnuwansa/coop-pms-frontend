'use client';

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {MoreVertical, Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";
import {ScrollArea} from "@/components/ui/scroll-area";
import api from "@/lib/api";
import {DeleteDialog} from "@/app/(dashboard)/settings/status/delete-dialog";
import {AddDialog} from "@/app/(dashboard)/settings/status/add-dialog";
import {UpdateDialog} from "@/app/(dashboard)/settings/status/update-dialog";

interface Status {
    id: string;
    name: string;
}

export default function StatusPage() {
    const [status, setStatus] = useState<Status[]>([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Status | null>(null);
    const [deleteAlert, setDeleteAlert] = useState({
        isOpen: false,
        Id: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        fetchStatus().catch(
            (error) => {
                console.error("Error loading status", {error});
            }
        )
    }, [refreshTrigger]);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/v1/status/list');
            const data = await response.data;

            setStatus(data.data);
        } catch (error) {
            console.log("Error fetching status", {error});
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItem) return;

        try {
            const response = await api.delete(`/v1/status/${selectedItem.id}`);
            const data = await response.data;

            refreshStatus();
            toast.success("Status Deleted", {description: data.message});
        } catch (error) {
            toast.error("Failed to delete status", {
                description: error.response?.data.message || 'Something went wrong. Please try again'
            });
        }
    };

    const handleDeleteAlert = (statusId: string) => {
        const _status = status.find(r => r.id === statusId);
        if (_status) {
            setSelectedItem(_status);
            setDeleteAlert({isOpen: true, Id: parseInt(statusId)});
        }
    };

    const handleUpdate = (status: Status) => {
        setSelectedItem(status);
        setIsUpdateModalOpen(true);
    };

    const refreshStatus = () => {
        setRefreshTrigger(prev => !prev);
    };

    return (
        <div className="space-y-6 w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Status Management</h1>
                    <p className="text-muted-foreground">
                        These statuses help track each letter&#39;s progress through various stages
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Status
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Status List</CardTitle>
                    <CardDescription>
                        List of statuses that can be assigned to letters in the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="w-full">
                            <ScrollArea className="w-full" style={{height: status.length > 15 ? '550px' : 'auto'}}>
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
                                                        <p className="text-sm text-muted-foreground mt-4">Loading status
                                                            data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : status.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}
                                                           className="text-center py-8 text-muted-foreground">
                                                    No status found. Create a new status to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            status.map((status, index) => (
                                                <TableRow key={status.id}>
                                                    <TableCell className="text-center">{status.id}</TableCell>
                                                    <TableCell
                                                        className="font-medium truncate max-w-20">{status.name}</TableCell>
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
                                                                        onClick={() => handleUpdate(status)}
                                                                        disabled={index <= 3}
                                                                    >
                                                                        <Pencil className="mr-2 h-4 w-4"/>
                                                                        Update
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteAlert(status.id)}
                                                                        className="text-red-600 focus:text-red-600"
                                                                        disabled={index <= 3}
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
                </CardContent>
            </Card>

            {/* Update Modal */}
            <UpdateDialog
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                initialData={selectedItem}
                onSuccess={() => {
                    refreshStatus();
                }}
            />

            {/* Add Modal */}
            <AddDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refreshStatus();
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
