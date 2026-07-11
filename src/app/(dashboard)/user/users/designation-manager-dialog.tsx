'use client';

import {useState} from "react";
import {toast} from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Loader2, Pencil, Plus, Trash2, X, Check, Briefcase} from "lucide-react";
import api from "@/lib/api";

interface Designation {
    id: number;
    name: string;
    description?: string | null;
    is_active?: boolean;
    create_datetime: string;
    update_datetime: string;
}

interface DesignationManagerDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    designations: Designation[];
    onChanged: () => void; // called after any successful add/update/delete so parent can refetch
}

export function DesignationManagerDialog({
    isOpen,
    setIsOpen,
    designations,
    onChanged,
}: DesignationManagerDialogProps) {
    // Add new designation
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Delete confirm state
    const [deleteAlert, setDeleteAlert] = useState<{ isOpen: boolean; id: number | null; name: string }>({
        isOpen: false,
        id: null,
        name: "",
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const resetAddForm = () => {
        setNewName("");
        setNewDescription("");
    };

    const handleAdd = async () => {
        if (!newName.trim()) {
            toast.error("Designation name is required");
            return;
        }
        try {
            setIsAdding(true);
            const response = await api.post('/v1/designation/', {
                name: newName.trim(),
                description: newDescription.trim() || null,
            });
            toast.success(response.data.message || "Designation created successfully");
            resetAddForm();
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (designation: Designation) => {
        setEditingId(designation.id);
        setEditName(designation.name);
        setEditDescription(designation.description || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditDescription("");
    };

    const handleSaveEdit = async (id: number) => {
        if (!editName.trim()) {
            toast.error("Designation name is required");
            return;
        }
        try {
            setIsSavingEdit(true);
            const response = await api.put(`/v1/designation/${id}`, {
                name: editName.trim(),
                description: editDescription.trim() || null,
                is_active: true,
            });
            toast.success(response.data.message || "Designation updated successfully");
            cancelEdit();
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteAlert.id) return;
        try {
            setIsDeleting(true);
            const response = await api.delete(`/v1/designation/${deleteAlert.id}`);
            toast.success(response.data.message || "Designation deleted successfully");
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsDeleting(false);
            setDeleteAlert({isOpen: false, id: null, name: ""});
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4"/>
                            Manage Designations
                        </DialogTitle>
                        <DialogDescription>
                            Add, edit or remove designations. These are used across the Users table and Sign-Up
                            page.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Add new designation */}
                    <div className="flex items-end gap-2 border-b pb-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="e.g. Accountant"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                disabled={isAdding}
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-sm font-medium">Description (optional)</label>
                            <Input
                                placeholder="Short description"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                disabled={isAdding}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                            <span className="ml-1">Add</span>
                        </Button>
                    </div>

                    {/* Designation list */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {designations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                                            No designations yet. Add one above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    designations.map((designation) => (
                                        <TableRow key={designation.id}>
                                            {editingId === designation.id ? (
                                                <>
                                                    <TableCell>
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            disabled={isSavingEdit}
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={editDescription}
                                                            onChange={(e) => setEditDescription(e.target.value)}
                                                            disabled={isSavingEdit}
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleSaveEdit(designation.id)}
                                                                disabled={isSavingEdit}
                                                            >
                                                                {isSavingEdit
                                                                    ? <Loader2 className="h-4 w-4 animate-spin"/>
                                                                    : <Check className="h-4 w-4 text-green-600"/>}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={cancelEdit}
                                                                disabled={isSavingEdit}
                                                            >
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="font-medium">{designation.name}</TableCell>
                                                    <TableCell className="text-muted-foreground truncate max-w-[220px]">
                                                        {designation.description || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => startEdit(designation)}
                                                            >
                                                                <Pencil className="h-4 w-4"/>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => setDeleteAlert({
                                                                    isOpen: true,
                                                                    id: designation.id,
                                                                    name: designation.name,
                                                                })}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-600"/>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <AlertDialog
                open={deleteAlert.isOpen}
                onOpenChange={(open) => !open && setDeleteAlert({isOpen: false, id: null, name: ""})}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{deleteAlert.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this designation. Users currently assigned to it will
                            need to be reassigned first if the deletion is blocked.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}