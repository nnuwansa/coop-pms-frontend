'use client';

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ArchiveRestore, ChevronLeft, ChevronRight, Loader2, MailSearch, Trash2} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
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
import {formatDate} from "@/lib/utils";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";

// NEW — Deleted Letters collection. Deleting a letter from the main
// dashboard only ever soft-deletes it (Letter.is_active = False); this page
// is the other half of that: everything currently in that soft-deleted
// state, with the option to bring one back (Restore) or remove it for good
// (Permanently Delete). Two different permissions gate the two actions
// deliberately — restoring is low-stakes and reversible, permanently
// deleting is not.

interface DeletedLetter {
    id: number;
    code: string;
    subject: string;
    organization: string | null;
    department: string | null;
    assignee: string | null;
    create_datetime: string;
}

export default function DeletedLettersPage() {
    const router = useRouter();
    const {hasPermission} = useAuthStore();

    const [letters, setLetters] = useState<DeletedLetter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const pageSize = 10;

    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [letterToPurge, setLetterToPurge] = useState<DeletedLetter | null>(null);
    const [isPurging, setIsPurging] = useState(false);

    const canRestore = hasPermission('letter.view_deleted');
    const canPermanentlyDelete = hasPermission('letter.permanent_delete');

    const loadDeletedLetters = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/v1/letter/deleted/list?page=${currentPage}&page_size=${pageSize}`);
            setLetters(res.data.data || []);
            setTotalPages(res.data.total_pages || 0);
            setTotalRows(res.data.total || 0);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load deleted letters');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage]);

    useEffect(() => { loadDeletedLetters(); }, [loadDeletedLetters]);

    const handleRestore = async (letter: DeletedLetter) => {
        try {
            setRestoringId(letter.id);
            await api.put(`/v1/letter/${letter.id}/restore`);
            toast.success(`Letter ${letter.code} restored`);
            if (letters.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                loadDeletedLetters();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to restore letter');
        } finally {
            setRestoringId(null);
        }
    };

    const handlePermanentDeleteConfirm = async () => {
        if (!letterToPurge) return;
        try {
            setIsPurging(true);
            await api.delete(`/v1/letter/${letterToPurge.id}/permanent`);
            toast.success(`Letter ${letterToPurge.code} permanently deleted`);
            setLetterToPurge(null);
            if (letters.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                loadDeletedLetters();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to permanently delete letter');
        } finally {
            setIsPurging(false);
        }
    };

    // If the person has neither permission, there's nothing useful to show
    // here at all — send them back rather than rendering an empty shell.
    if (!canRestore && !canPermanentlyDelete) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">You don&apos;t have permission to view deleted letters.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Deleted Letters</h1>
                <p className="text-muted-foreground">
                    Letters removed from the main list land here first. Restore one back to normal,
                    or permanently delete it if it should never come back.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Deleted Letters</CardTitle>
                    <CardDescription>A collection of every letter currently deleted from the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Subject/Content of the Letter</TableHead>
                                    <TableHead>Sender/Organization</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Deleted On</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-60 text-center">
                                            <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin"/>
                                                Loading deleted letters...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : letters.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-60 text-center">
                                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                <MailSearch className="h-10 w-10 text-muted-foreground/40"/>
                                                <p className="text-sm text-muted-foreground">No deleted letters</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    letters.map(letter => (
                                        <TableRow key={letter.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{letter.code}</TableCell>
                                            <TableCell className="max-w-[280px]">
                                                <div className="truncate">{letter.subject || "—"}</div>
                                            </TableCell>
                                            <TableCell>{letter.organization || "—"}</TableCell>
                                            <TableCell>{letter.department || "—"}</TableCell>
                                            <TableCell>{letter.assignee || "—"}</TableCell>
                                            <TableCell className="whitespace-nowrap">{formatDate(letter.create_datetime)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canRestore && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-xs"
                                                            onClick={() => handleRestore(letter)}
                                                            disabled={restoringId === letter.id}
                                                        >
                                                            {restoringId === letter.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                                            ) : (
                                                                <><ArchiveRestore className="mr-1 h-3.5 w-3.5"/>Restore</>
                                                            )}
                                                        </Button>
                                                    )}
                                                    {canPermanentlyDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                                            onClick={() => setLetterToPurge(letter)}
                                                        >
                                                            <Trash2 className="mr-1 h-3.5 w-3.5"/>Delete Permanently
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!isLoading && letters.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-muted-foreground">
                                Total {totalRows} deleted letter{totalRows !== 1 ? 's' : ''} · Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline" size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4"/>
                                </Button>
                                <Button
                                    variant="outline" size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Permanent delete confirmation — deliberately heavier-weight
                than the ordinary delete confirm, since this one can't be undone. */}
            <AlertDialog open={!!letterToPurge} onOpenChange={(open) => { if (!open && !isPurging) setLetterToPurge(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete this letter?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {letterToPurge && (
                                <>Letter <span className="font-medium text-foreground">{letterToPurge.code}</span> and everything
                                    attached to it (remarks, attachments, history) will be permanently removed.
                                    {' '}<span className="font-medium text-destructive">This cannot be undone.</span></>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handlePermanentDeleteConfirm(); }}
                            disabled={isPurging}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPurging ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : 'Delete Permanently'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}