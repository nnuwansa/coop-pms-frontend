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
import {DeleteDialog} from "@/app/(dashboard)/settings/source/delete-dialog";
import {AddDialog} from "@/app/(dashboard)/settings/source/add-dialog";
import {UpdateDialog} from "@/app/(dashboard)/settings/source/update-dialog";

interface Source {
    id: string;
    name: string;
}

export default function SourcePage() {
    const [sources, setSources] = useState<Source[]>([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Source | null>(null);
    const [deleteAlert, setDeleteAlert] = useState({
        isOpen: false,
        Id: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        fetchSources().catch(
            (error) => {
                console.error("Error loading sources", {error});
            }
        )
    }, [refreshTrigger]);

    const fetchSources = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/v1/source/list');
            const data = await response.data;

            setSources(data.data);
        } catch (error) {
            console.log("Error fetching sources", {error});
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItem) return;

        try {
            const response = await api.delete(`/v1/source/${selectedItem.id}`);
            const data = await response.data;

            refreshSources();
            toast.success("Source Deleted", {description: data.message});
        } catch (error) {
            toast.error("Failed to delete source", {
                description: error.response?.data.message || 'Something went wrong. Please try again'
            });
        }
    };

    const handleDeleteAlert = (sourceId: string) => {
        const source = sources.find(r => r.id === sourceId);
        if (source) {
            setSelectedItem(source);
            setDeleteAlert({isOpen: true, Id: parseInt(sourceId)});
        }
    };

    const handleUpdate = (source: Source) => {
        setSelectedItem(source);
        setIsUpdateModalOpen(true);
    };

    const refreshSources = () => {
        setRefreshTrigger(prev => !prev);
    };

    return (
        <div className="space-y-6 w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Source Management</h1>
                    <p className="text-muted-foreground">
                        This helps categorize and track the origin of correspondence
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Source
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Source List</CardTitle>
                    <CardDescription>
                        This section displays all available sources that can be assigned to letters
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="w-full">
                            <ScrollArea className="w-full" style={{height: sources.length > 15 ? '550px' : 'auto'}}>
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
                                                        <p className="text-sm text-muted-foreground mt-4">Loading source
                                                            data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : sources.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}
                                                           className="text-center py-8 text-muted-foreground">
                                                    No sources found. Create a new source to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            sources.map((source, index) => (
                                                <TableRow key={source.id}>
                                                    <TableCell className="text-center">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell
                                                        className="font-medium truncate max-w-20">{source.name}</TableCell>
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
                                                                        onClick={() => handleUpdate(source)}>
                                                                        <Pencil className="mr-2 h-4 w-4"/>
                                                                        Update
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteAlert(source.id)}
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
                </CardContent>
            </Card>

            {/* Update Modal */}
            <UpdateDialog
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                initialData={selectedItem}
                onSuccess={() => {
                    refreshSources();
                }}
            />

            {/* Add Modal */}
            <AddDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refreshSources();
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
