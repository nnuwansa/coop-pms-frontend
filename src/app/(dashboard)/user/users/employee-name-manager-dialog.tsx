'use client';

import {useState} from "react";
import {toast} from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Pencil, Plus, Trash2, X, Check, Users} from "lucide-react";
import api from "@/lib/api";

interface EmployeeName {
    id: number;
    full_name: string;
    is_active?: boolean;
}

interface Props {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    names: EmployeeName[];
    onChanged: () => void;
}

export function EmployeeNameManagerDialog({isOpen, setIsOpen, names, onChanged}: Props) {
    const [newName, setNewName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [deleteAlert, setDeleteAlert] = useState<{ isOpen: boolean; id: number | null }>({
        isOpen: false,
        id: null
    });

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            setIsSubmitting(true);
            const response = await api.post("/v1/employee_name/", {full_name: newName.trim()});
            toast.success(response.data.message || "Name added");
            setNewName("");
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || "Something went wrong. Please try again");
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (name: EmployeeName) => {
        setEditingId(name.id);
        setEditValue(name.full_name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const saveEdit = async (name: EmployeeName) => {
        if (!editValue.trim()) return;
        try {
            await api.put(`/v1/employee_name/${name.id}`, {
                full_name: editValue.trim(),
                is_active: name.is_active ?? true
            });
            toast.success("Name updated");
            cancelEdit();
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || "Something went wrong. Please try again");
        }
    };

    const toggleActive = async (name: EmployeeName) => {
        try {
            await api.put(`/v1/employee_name/${name.id}`, {
                full_name: name.full_name,
                is_active: !(name.is_active ?? true)
            });
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || "Something went wrong. Please try again");
        }
    };

    const confirmDelete = (id: number) => setDeleteAlert({isOpen: true, id});

    const handleDelete = async () => {
        if (!deleteAlert.id) return;
        try {
            await api.delete(`/v1/employee_name/${deleteAlert.id}`);
            toast.success("Name deleted");
            onChanged();
        } catch (error) {
            toast.error(error.response?.data.message || "Something went wrong. Please try again");
        } finally {
            setDeleteAlert({isOpen: false, id: null});
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5"/>
                            Manage Names
                        </DialogTitle>
                        <DialogDescription>
                            Add names here so people can pick theirs when signing up
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Full name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            disabled={isSubmitting}
                        />
                        <Button onClick={handleAdd} disabled={isSubmitting || !newName.trim()}>
                            <Plus className="h-4 w-4 mr-1"/> Add
                        </Button>
                    </div>

                    <div className="max-h-80 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {names.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                            No names added yet
                                        </TableCell>
                                    </TableRow>
                                ) : names.map((name) => (
                                    <TableRow key={name.id}>
                                        <TableCell>
                                            {editingId === name.id ? (
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && saveEdit(name)}
                                                    autoFocus
                                                />
                                            ) : name.full_name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" onClick={() => toggleActive(name)}>
                                                {(name.is_active ?? true)
                                                    ? <Check className="h-4 w-4 text-green-600"/>
                                                    : <X className="h-4 w-4 text-red-600"/>}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingId === name.id ? (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => saveEdit(name)}>
                                                        <Check className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => startEdit(name)}>
                                                        <Pencil className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon"
                                                            onClick={() => confirmDelete(name.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-600"/>
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlert.isOpen}
                         onOpenChange={(open) => !open && setDeleteAlert({isOpen: false, id: null})}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this name?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This can&#39;t be undone. It will no longer appear in the sign-up name list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}