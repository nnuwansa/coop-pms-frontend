'use client';

import {useCallback, useEffect, useState} from "react";
import {toast} from "sonner";
import {Loader2, Pencil, Plus, Trash2} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";

// NEW — File Management. Files (a Section/Unit + Subject + a pre-registered
// file number) are created here ahead of time and optionally assigned to a
// specific person. That's what backs the Assignee Status "File Name"
// picker on the Letter View page: an assignee only ever sees the files
// pre-assigned to THEM there, instead of typing a name from memory.

interface Department {id: number; name: string}
interface DepartmentUnit {id: number; name: string}
interface SystemUserOption {id: number; name: string}

interface ManagedFile {
    id: number;
    file_number: string;
    department_id: number;
    department_name: string;
    department_unit_id: number | null;
    department_unit_name: string | null;
    subject: string;
    assigned_to_id: number | null;
    assigned_to_name: string | null;
}

interface FormState {
    file_number: string;
    department_id: number;
    department_unit_id: number;
    subject: string;
    assigned_to_id: number;
}

const emptyForm: FormState = {file_number: "", department_id: 0, department_unit_id: 0, subject: "", assigned_to_id: 0};

export default function FileManagementPage() {
    const {hasPermission} = useAuthStore();
    const canManage = hasPermission('file.update');

    const [files, setFiles] = useState<ManagedFile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [units, setUnits] = useState<DepartmentUnit[]>([]);
    const [users, setUsers] = useState<SystemUserOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showFormDialog, setShowFormDialog] = useState(false);
    const [editingFile, setEditingFile] = useState<ManagedFile | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    const [deletingFile, setDeletingFile] = useState<ManagedFile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadFiles = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/v1/managed-file/list');
            setFiles(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load files');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadDropdownData = useCallback(async () => {
        try {
            const [deptRes, userRes] = await Promise.all([
                api.get('/v1/department/list'),
                api.get('/v1/system_user/names'),
            ]);
            if (deptRes.data.success) setDepartments(deptRes.data.data);
            if (userRes.data.success) setUsers(userRes.data.data);
        } catch {
            // dropdown data failing isn't fatal — the table itself will still load
        }
    }, []);

    useEffect(() => { if (canManage) { loadFiles(); loadDropdownData(); } else { setIsLoading(false); } }, [canManage, loadFiles, loadDropdownData]);

    useEffect(() => {
        if (!form.department_id) { setUnits([]); return; }
        api.get(`/v1/department/${form.department_id}/units`)
            .then(r => setUnits(r.data.data || []))
            .catch(() => setUnits([]));
    }, [form.department_id]);

    const openCreate = () => {
        setEditingFile(null);
        setForm(emptyForm);
        setShowFormDialog(true);
    };

    const openEdit = (file: ManagedFile) => {
        setEditingFile(file);
        setForm({
            file_number: file.file_number,
            department_id: file.department_id,
            department_unit_id: file.department_unit_id || 0,
            subject: file.subject,
            assigned_to_id: file.assigned_to_id || 0,
        });
        setShowFormDialog(true);
    };

    const closeForm = () => {
        if (isSaving) return;
        setShowFormDialog(false);
        setEditingFile(null);
        setForm(emptyForm);
    };

    const handleSubmit = async () => {
        if (!form.file_number.trim() || !form.department_id || !form.subject.trim()) {
            toast.error('File number, section, and subject are required');
            return;
        }
        try {
            setIsSaving(true);
            const payload = {
                file_number: form.file_number.trim(),
                department_id: form.department_id,
                department_unit_id: form.department_unit_id || null,
                subject: form.subject.trim(),
                assigned_to_id: form.assigned_to_id || null,
            };
            if (editingFile) {
                await api.put(`/v1/managed-file/${editingFile.id}`, payload);
                toast.success('File updated');
            } else {
                await api.post('/v1/managed-file/', payload);
                toast.success('File created');
            }
            closeForm();
            loadFiles();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save file');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingFile) return;
        try {
            setIsDeleting(true);
            await api.delete(`/v1/managed-file/${deletingFile.id}`);
            toast.success('File deleted');
            setDeletingFile(null);
            loadFiles();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete file');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!canManage) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">You don&apos;t have permission to manage files.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">File Management</h1>
                    <p className="text-muted-foreground">
                        Pre-register file numbers under a Section/Unit and Subject, and optionally assign
                        each one to a specific person.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4"/>Add File
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Files</CardTitle>
                    <CardDescription>Every pre-registered file number in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <ScrollArea className="w-full" style={{height: files.length > 15 ? '550px' : 'auto'}}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>File Number</TableHead>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={6} className="h-40 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/>
                                        </TableCell></TableRow>
                                    ) : files.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                            No files yet. Add one to get started.
                                        </TableCell></TableRow>
                                    ) : files.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{f.file_number}</TableCell>
                                            <TableCell>{f.department_name}</TableCell>
                                            <TableCell>{f.department_unit_name || "—"}</TableCell>
                                            <TableCell className="max-w-[240px] truncate">{f.subject}</TableCell>
                                            <TableCell>{f.assigned_to_name || "—"}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                                                        <Pencil className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingFile(f)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showFormDialog} onOpenChange={(open) => { if (!open) closeForm(); }}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>{editingFile ? 'Edit File' : 'Add File'}</DialogTitle>
                        <DialogDescription>
                            {editingFile ? 'Update this file\'s details.' : 'Pre-register a new file number.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>File Number</Label>
                            <Input value={form.file_number} onChange={(e) => setForm(f => ({...f, file_number: e.target.value}))} placeholder="e.g. ADM/2026/014" disabled={isSaving}/>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Section</Label>
                            <Select value={form.department_id ? form.department_id.toString() : ""} onValueChange={(v) => setForm(f => ({...f, department_id: parseInt(v) || 0, department_unit_id: 0}))} disabled={isSaving}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select a section"/></SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Unit (optional)</Label>
                            <Select value={form.department_unit_id ? form.department_unit_id.toString() : "0"} onValueChange={(v) => setForm(f => ({...f, department_unit_id: parseInt(v) || 0}))} disabled={isSaving || !form.department_id || units.length === 0}>
                                <SelectTrigger className="w-full"><SelectValue placeholder={units.length === 0 ? "No units for this section" : "Select a unit"}/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No unit</SelectItem>
                                    {units.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Subject</Label>
                            <Input value={form.subject} onChange={(e) => setForm(f => ({...f, subject: e.target.value}))} placeholder="What this file is about" disabled={isSaving}/>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Assigned To (optional)</Label>
                            <Select value={form.assigned_to_id ? form.assigned_to_id.toString() : "0"} onValueChange={(v) => setForm(f => ({...f, assigned_to_id: parseInt(v) || 0}))} disabled={isSaving}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned"/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Unassigned</SelectItem>
                                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Only this person will see this file when picking a File Name on a letter.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeForm} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : editingFile ? 'Save Changes' : 'Create File'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingFile} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingFile(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingFile && <>File number <span className="font-medium text-foreground">{deletingFile.file_number}</span> will be removed. This can&apos;t be undone.</>}
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