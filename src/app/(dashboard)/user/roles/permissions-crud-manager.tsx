'use client';

import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Loader2, Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
// Matches PermissionModelOut on the backend: permissions come back grouped
// by (category, action), so they're flattened below into one row per
// permission for this CRUD table.
interface PermissionCategory {
    category: string;
    action: "radio" | "check";
    permissions: {id: number; name: string; code: string; description: string}[];
}

interface FlatPermission {
    id: number;
    name: string;
    code: string;
    description: string;
    category: string;
    action: string;
}

interface PermissionFormState {
    name: string;
    code: string;
    description: string;
    category: string;   // NEW — required, NOT NULL in the DB
    action: "check" | "radio";   // NEW — required, NOT NULL in the DB
}

const emptyForm: PermissionFormState = {name: "", code: "", description: "", category: "", action: "check"};

export function PermissionsCrudManager() {
    const [permissions, setPermissions] = useState<FlatPermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showFormDialog, setShowFormDialog] = useState(false);
    const [editingPermission, setEditingPermission] = useState<FlatPermission | null>(null);
    const [form, setForm] = useState<PermissionFormState>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    const [deletingPermission, setDeletingPermission] = useState<FlatPermission | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPermissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/v1/permission/list');
            const grouped: PermissionCategory[] = res.data.data || [];
            const flat: FlatPermission[] = grouped.flatMap(cat =>
                cat.permissions.map(p => ({...p, category: cat.category, action: cat.action}))
            );
            setPermissions(flat);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load permissions');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

    const openCreate = () => {
        setEditingPermission(null);
        setForm(emptyForm);
        setShowFormDialog(true);
    };

    const openEdit = (permission: FlatPermission) => {
        setEditingPermission(permission);
        setForm({
            name: permission.name,
            code: permission.code,
            description: permission.description,
            category: permission.category,
            action: (permission.action === "radio" ? "radio" : "check"),
        });
        setShowFormDialog(true);
    };

    const closeForm = () => {
        if (isSaving) return;
        setShowFormDialog(false);
        setEditingPermission(null);
        setForm(emptyForm);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.code.trim() || !form.category.trim()) {
            toast.error('Name, code, and category are required');
            return;
        }
        try {
            setIsSaving(true);
            const payload = {
                name: form.name.trim(),
                code: form.code.trim(),
                description: form.description.trim(),
                category: form.category.trim(),
                action: form.action,
            };
            if (editingPermission) {
                await api.put(`/v1/permission/${editingPermission.id}`, payload);
                toast.success('Permission updated');
            } else {
                await api.post('/v1/permission/', payload);
                toast.success('Permission created');
            }
            closeForm();
            fetchPermissions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save permission');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingPermission) return;
        try {
            setIsDeleting(true);
            await api.delete(`/v1/permission/${deletingPermission.id}`);
            toast.success('Permission deleted');
            setDeletingPermission(null);
            fetchPermissions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete permission');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Create, edit, or remove the individual permissions that roles are built from.
                </p>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4"/>Add Permission
                </Button>
            </div>

            <div className="rounded-md border">
                <ScrollArea className="w-full" style={{height: permissions.length > 15 ? '550px' : 'auto'}}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin"/>Loading permissions...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : permissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                        No permissions found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                permissions.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{p.code}</TableCell>
                                        <TableCell className="truncate max-w-[280px]">{p.description}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{p.category}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                                                    <Pencil className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeletingPermission(p)}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {/* Create / Edit dialog */}
            <Dialog open={showFormDialog} onOpenChange={(open) => { if (!open) closeForm(); }}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>{editingPermission ? 'Edit Permission' : 'Add Permission'}</DialogTitle>
                        <DialogDescription>
                            {editingPermission
                                ? 'Update this permission\'s name, code, or description.'
                                : 'Create a new permission that roles can be given.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                                placeholder="e.g. Update Cheque Details"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Code</Label>
                            <Input
                                value={form.code}
                                onChange={(e) => setForm(f => ({...f, code: e.target.value}))}
                                placeholder="e.g. letter.cheque_update"
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                This is the exact string checked in code (hasPermission(&apos;...&apos;)) — keep it stable once other code depends on it.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Category</Label>
                            <Input
                                value={form.category}
                                onChange={(e) => setForm(f => ({...f, category: e.target.value}))}
                                placeholder="e.g. Letter Management"
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                Groups this permission with others under the same heading in Manage Permissions. Use an existing category name to add to that group.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Selection type</Label>
                            <Select value={form.action} onValueChange={(v: "check" | "radio") => setForm(f => ({...f, action: v}))} disabled={isSaving}>
                                <SelectTrigger className="w-full">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="check">Checkbox (multiple can be selected)</SelectItem>
                                    <SelectItem value="radio">Radio (only one per category)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Radio only makes sense when every other permission in this category is also set to Radio.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm(f => ({...f, description: e.target.value}))}
                                placeholder="Shown to admins in Manage Permissions"
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeForm} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
                            ) : editingPermission ? 'Save Changes' : 'Create Permission'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deletingPermission} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingPermission(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this permission?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingPermission && (
                                <>Deleting <span className="font-medium text-foreground">{deletingPermission.name}</span> ({deletingPermission.code})
                                    {' '}will remove it from every role that currently has it. This can&apos;t be undone.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}