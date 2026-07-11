'use client';

import {useCallback, useEffect, useState} from "react";
import {toast} from "sonner";
import {AlertTriangle, Loader2, Pencil, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";
import {formatDate} from "@/lib/utils";
import {AttachmentPreview} from "@/app/(dashboard)/letters/[id]/attachment-preview";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface RemarkAttachment {
    id: number;
    title: string;
    filename?: string;
    url: string;
    file_size?: number | null;
}

interface Remark {
    id: number;
    content: string;
    subject_no?: string | null;
    assignee: string | null;
    department: string | null;
    status: string | null;
    created_by?: string | null;
    create_datetime: string;
    attachments: RemarkAttachment[];
}

interface RemarkHistoryEntry {
    id: number;
    remark_id: number;
    action: 'edit' | 'delete';
    content_before: string;
    content_after: string | null;
    reason: string;
    changed_by: string;
    changed_by_email?: string;
    create_datetime: string;
}

interface RemarksListProps {
    letterId: string;
    remarks: Remark[];
    onRefresh: () => void;
}

type PendingAction = {type: 'edit' | 'delete'; remark: Remark} | null;

// ─── Component ────────────────────────────────────────────────────────────────

export function RemarksList({letterId, remarks, onRefresh}: RemarksListProps) {
    const {hasPermission} = useAuthStore();
    const [pending, setPending] = useState<PendingAction>(null);
    const [editContent, setEditContent] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openEdit = (remark: Remark) => {
        setEditContent(remark.content);
        setReason("");
        setPending({type: 'edit', remark});
    };

    const openDelete = (remark: Remark) => {
        setReason("");
        setPending({type: 'delete', remark});
    };

    const closeDialog = () => {
        setPending(null);
        setReason("");
        setEditContent("");
    };

    const submitEdit = async () => {
        if (!reason.trim()) {
            toast.error("Reason for change is required");
            return;
        }
        if (!editContent.trim()) {
            toast.error("Content cannot be empty");
            return;
        }
        if (!pending) return;
        setIsSubmitting(true);
        try {
            await api.put(`/v1/letter/remark/${pending.remark.id}`, {
                content: editContent,
                subject_no: pending.remark.subject_no || null,
                reason: reason.trim(),
            });
            toast.success("Remark updated successfully");
            closeDialog();
            onRefresh();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update remark');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitDelete = async () => {
        if (!reason.trim()) {
            toast.error("Reason for change is required");
            return;
        }
        if (!pending) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/v1/letter/remark/${pending.remark.id}`, {
                data: {reason: reason.trim()},
            });
            toast.success("Remark deleted successfully");
            closeDialog();
            onRefresh();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete remark');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (remarks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No remarks yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {remarks.map(remark => (
                <div key={remark.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                                {remark.created_by || "Unknown user"}
                            </span>
                            <span className="whitespace-nowrap">{formatDate(remark.create_datetime)}</span>
                            {remark.subject_no && <span>| Subject No: {remark.subject_no}</span>}
                            {remark.department && <span>| {remark.department}</span>}
                            {remark.assignee && <span>| {remark.assignee}</span>}
                            {remark.status && <span>| {remark.status}</span>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                            {hasPermission('remark.update') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => openEdit(remark)} aria-label="Edit remark">
                                    <Pencil className="h-3.5 w-3.5"/>
                                </Button>
                            )}
                            {hasPermission('remark.delete') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => openDelete(remark)} aria-label="Delete remark">
                                    <Trash2 className="h-3.5 w-3.5"/>
                                </Button>
                            )}
                        </div>
                    </div>

                    <p className="text-sm whitespace-pre-wrap">{remark.content}</p>

                    {remark.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {remark.attachments.map(att => (
                                <AttachmentPreview key={att.id} attachment={att}/>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Edit / Delete reason dialog */}
            <Dialog open={!!pending} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
                            </div>
                            <DialogTitle>
                                {pending?.type === 'edit' ? 'Edit Remark' : 'Delete Remark'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            {pending?.type === 'edit'
                                ? "Update the remark content below. A reason for this change is required and will be recorded in the change history."
                                : "This remark will be removed. A reason for deletion is required and will be recorded in the change history."}
                        </DialogDescription>
                    </DialogHeader>

                    {pending?.type === 'edit' && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Content</label>
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[100px]"
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            Reason for Change <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this remark is being edited or deleted..."
                            className="min-h-[80px]"
                            disabled={isSubmitting}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            variant={pending?.type === 'delete' ? 'destructive' : 'default'}
                            onClick={pending?.type === 'edit' ? submitEdit : submitDelete}
                            disabled={isSubmitting || !reason.trim() || (pending?.type === 'edit' && !editContent.trim())}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</>
                            ) : pending?.type === 'edit' ? 'Save Changes' : 'Confirm Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Remark change history (separate export, used in the "Remark Log" tab) ────

interface RemarkHistoryListProps {
    letterId: string;
}

export function RemarkHistoryList({letterId}: RemarkHistoryListProps) {
    const [history, setHistory] = useState<RemarkHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/v1/letter/${letterId}/remarks/history`);
            setHistory(res.data.data || []);
        } catch {
            toast.error('Failed to load remark history');
        } finally {
            setLoading(false);
        }
    }, [letterId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">No remark changes recorded</p>
            </div>
        );
    }

    return (
        <div className="relative pl-6 space-y-0">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border"/>
            {history.map(entry => (
                <div key={entry.id} className="relative pb-6 last:pb-0">
                    <div className={`absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-background ring-1 ring-border ${
                        entry.action === 'delete' ? 'bg-destructive' : 'bg-primary'
                    }`}/>
                    <div className="pl-4 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                entry.action === 'delete'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                                    : 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200'
                            }`}>
                                {entry.action === 'delete' ? 'Deleted' : 'Edited'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatDate(entry.create_datetime)}
                            </span>
                        </div>

                        <div className="text-sm space-y-1 border rounded-md p-3 bg-muted/30">
                            <p><span className="font-medium">Before: </span>
                                <span className="text-muted-foreground whitespace-pre-wrap">{entry.content_before}</span>
                            </p>
                            {entry.action === 'edit' && (
                                <p><span className="font-medium">After: </span>
                                    <span className="whitespace-pre-wrap">{entry.content_after}</span>
                                </p>
                            )}
                            <p><span className="font-medium">Reason: </span>
                                <span className="whitespace-pre-wrap">{entry.reason}</span>
                            </p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            by {entry.changed_by}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}