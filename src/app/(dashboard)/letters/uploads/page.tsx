'use client';

import {useCallback, useEffect, useState} from "react";
import {toast} from "sonner";
import {Download, FileUp, Loader2, Trash2, UploadCloud} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
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
import {formatDateTime} from "@/lib/utils";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";

// NEW — Letter Upload Collection. Anyone with `letter.upload_collection`
// can drop a file (e.g. a scanned copy received outside the normal letter
// registration flow) into their own personal collection here. Anyone with
// `letter.upload_collection_view` (typically admins) can see and download
// everything uploaded by everyone, in one place, without chasing people
// down individually.

interface UploadItem {
    id: number;
    title: string;
    description?: string | null;
    file_size?: number | null;
    url: string;
    uploaded_by: string;
    uploaded_by_id: number;
    create_datetime: string;
}

const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
};

export default function UploadCollectionPage() {
    const {hasPermission} = useAuthStore();
    const canUpload = hasPermission('letter.upload_collection');
    const canViewAll = hasPermission('letter.upload_collection_view');

    const [myUploads, setMyUploads] = useState<UploadItem[]>([]);
    const [allUploads, setAllUploads] = useState<UploadItem[]>([]);
    const [isLoadingMine, setIsLoadingMine] = useState(true);
    const [isLoadingAll, setIsLoadingAll] = useState(true);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [deletingItem, setDeletingItem] = useState<UploadItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadMine = useCallback(async () => {
        if (!canUpload) { setIsLoadingMine(false); return; }
        try {
            setIsLoadingMine(true);
            const res = await api.get('/v1/letter-upload/mine');
            setMyUploads(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load your uploads');
        } finally {
            setIsLoadingMine(false);
        }
    }, [canUpload]);

    const loadAll = useCallback(async () => {
        if (!canViewAll) { setIsLoadingAll(false); return; }
        try {
            setIsLoadingAll(true);
            const res = await api.get('/v1/letter-upload/all');
            setAllUploads(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load uploads');
        } finally {
            setIsLoadingAll(false);
        }
    }, [canViewAll]);

    useEffect(() => { loadMine(); }, [loadMine]);
    useEffect(() => { loadAll(); }, [loadAll]);

    const handleUpload = async () => {
        if (!title.trim()) {
            toast.error('Enter a title for this file');
            return;
        }
        if (!file) {
            toast.error('Choose a file to upload');
            return;
        }
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('title', title.trim());
            if (description.trim()) formData.append('description', description.trim());
            formData.append('file', file);
            await api.post('/v1/letter-upload/', formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            toast.success('File uploaded');
            setTitle("");
            setDescription("");
            setFile(null);
            loadMine();
            if (canViewAll) loadAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingItem) return;
        try {
            setIsDeleting(true);
            await api.delete(`/v1/letter-upload/${deletingItem.id}`);
            toast.success('Upload removed');
            setDeletingItem(null);
            loadMine();
            if (canViewAll) loadAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete upload');
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadFile = async (item: UploadItem) => {
        try {
            const res = await api.get(item.url, {responseType: 'blob'});
            const blobUrl = window.URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = item.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            toast.error('Failed to download file');
        }
    };

    if (!canUpload && !canViewAll) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">You don&apos;t have permission to use the Upload Collection.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Upload Collection</h1>
                <p className="text-muted-foreground">
                    Upload a letter file received outside the normal registration flow. It lands in your own
                    collection here, and stays visible to admins for review or download.
                </p>
            </div>

            {canUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload a File</CardTitle>
                        <CardDescription>Add a title, an optional note, and the file itself</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Title</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scanned letter from XYZ Society" disabled={isUploading}/>
                            </div>
                            <div className="space-y-1.5">
                                <Label>File</Label>
                                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={isUploading}/>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description (optional)</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any extra context" disabled={isUploading}/>
                        </div>
                        <Button onClick={handleUpload} disabled={isUploading}>
                            {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4"/>Upload</>}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {canUpload && (
                <Card>
                    <CardHeader>
                        <CardTitle>My Uploads</CardTitle>
                        <CardDescription>Files you&apos;ve uploaded to this collection</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingMine ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/>
                                        </TableCell></TableRow>
                                    ) : myUploads.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <FileUp className="h-8 w-8 opacity-40"/>
                                                No uploads yet
                                            </div>
                                        </TableCell></TableRow>
                                    ) : myUploads.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell className="text-muted-foreground max-w-[240px] truncate">{item.description || "—"}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(item.create_datetime)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(item)}>
                                                        <Download className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingItem(item)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {canViewAll && (
                <Card>
                    <CardHeader>
                        <CardTitle>All Uploads</CardTitle>
                        <CardDescription>Everything uploaded by everyone in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Uploaded By</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingAll ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/>
                                        </TableCell></TableRow>
                                    ) : allUploads.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No uploads yet
                                        </TableCell></TableRow>
                                    ) : allUploads.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell>{item.uploaded_by}</TableCell>
                                            <TableCell className="text-muted-foreground max-w-[220px] truncate">{item.description || "—"}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(item.create_datetime)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(item)}>
                                                        <Download className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingItem(item)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={!!deletingItem} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingItem(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this upload?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingItem && <>&quot;{deletingItem.title}&quot; will be removed. This cannot be undone.</>}
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