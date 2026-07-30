

// 'use client';

// import {useCallback, useEffect, useRef, useState} from "react";
// import {useParams, useRouter} from "next/navigation";
// import {toast} from "sonner";
// import {
//     AlertTriangle, ArrowLeft, Loader2, MoreVertical, Paperclip, Save, X, Pencil,
//     Download, FileText, ZoomIn, Trash2, History as HistoryIcon,
// } from "lucide-react";

// import {Button} from "@/components/ui/button";
// import {Card, CardContent, CardHeader} from "@/components/ui/card";
// import {Badge} from "@/components/ui/badge";
// import {Checkbox} from "@/components/ui/checkbox";
// import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
// import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
// import {Separator} from "@/components/ui/separator";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import api from "@/lib/api";
// import {formatDate, formatDateTime} from "@/lib/utils";
// import {useAuthStore} from "@/store/auth-store";
// import {UpdateLetterModal} from "@/app/(dashboard)/letters/[id]/update-letter-modal";
// import {InsertRemarkModal} from "@/app/(dashboard)/letters/[id]/insert-remark-modal";
// import {AttachmentPreview} from "@/app/(dashboard)/letters/[id]/attachment-preview";

// // ─── Interfaces ───────────────────────────────────────────────────────────────

// interface AttachmentItem {
//     id: number;
//     title: string;
//     url: string;
//     file_size?: number | null;
// }

// interface LetterDetail {
//     id: number;
//     code: string;
//     subject: string;
//     sender: string | null;
//     organization: {id: number; name: string} | null;
//     source: {id: number; name: string} | null;
//     email: string | null;
//     telephone: string | null;
//     other: string | null;
//     sender_subject_no?: string | null;
//     registered_post_no?: string | null;
//     received_datetime: string;
//     create_datetime: string;
//     status: {id: number; name: string} | null;
//     status_days?: number | null;   // NEW
//     status_id: number;
//     departments: {id: number; name: string}[];
//     assignees: {id: number; name: string}[];
//     recommended_to?: {id: number; name: string} | null;   // NEW — separate from assignees
//     attachments: AttachmentItem[];
//     completion_file_name?: string | null;   // NEW
//     cheque_deposited?: boolean;
//     cheque_deposit_date?: string | null;
//     cheque_account_no?: string | null;
//     cheque_bank?: string | null;
//     cheque_branch?: string | null;

// }

// interface Remark {
//     id: number;
//     content: string;
//     assignee: string | null;
//     department: string | null;
//     status: string | null;
//     created_by?: string | null;
//     create_datetime: string;
//     attachments: RemarkAttachment[];
// }

// interface RemarkAttachment {
//     id: number;
//     title: string;
//     filename?: string;
//     url: string;
//     file_size?: number | null;
// }

// interface HistoryEntry {
//     id: number;
//     description: string;
//     username: string;
//     email: string;
//     create_datetime: string;
//     letter_id: number;
// }

// // NEW — remark edit/delete audit log entry
// interface RemarkHistoryEntry {
//     id: number;
//     remark_id: number;
//     letter_id: number;
//     action: 'edit' | 'delete' | string;
//     content_before: string | null;
//     content_after: string | null;
//     reason: string;
//     changed_by: string;
//     changed_by_email?: string | null;
//     create_datetime: string;
// }

// interface Department {id: number; name: string}
// interface Status {id: number; name: string; requires_file_name?: boolean;}   // CHANGED
// interface Assignee {id: number; name: string; department_id?: number | null; department_unit_id?: number | null}

// type LeftTab = 'remarks' | 'history' | 'remarkLog';

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getStatusClassName = (status: string): string => {
//     if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
//     if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
//     if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
//    if (status === 'Not Relevant') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';   // CHANGED
//     return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
// };

// const arraysEqual = (a: number[], b: number[]): boolean => {
//     if (a.length !== b.length) return false;
//     const sortedA = [...a].sort((x, y) => x - y);
//     const sortedB = [...b].sort((x, y) => x - y);
//     return sortedA.every((val, idx) => val === sortedB[idx]);
// };

// const formatFileSize = (bytes?: number | null): string => {
//     if (bytes === undefined || bytes === null) return '';
//     if (bytes < 1024) return `${bytes} B`;
//     const kb = bytes / 1024;
//     if (kb < 1024) return `${kb.toFixed(1)} KB`;
//     return `${(kb / 1024).toFixed(1)} MB`;
// };

// const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
// const PDF_EXTENSIONS = ['.pdf']; // NEW — used to enable in-browser PDF preview

// const isImageAttachment = (nameOrUrl: string): boolean => {
//     const lower = nameOrUrl.toLowerCase().split('?')[0];
//     return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
// };

// // NEW — PDFs can be rendered natively by the browser via <iframe>, unlike
// // Excel/Word files, which have no built-in browser renderer.
// const isPdfAttachment = (nameOrUrl: string): boolean => {
//     const lower = nameOrUrl.toLowerCase().split('?')[0];
//     return PDF_EXTENSIONS.some(ext => lower.endsWith(ext));
// };

// // NEW — badge styling per remark-log action
// const getActionClassName = (action: string): string => {
//     if (action === 'edit') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
//     if (action === 'delete') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
//     return 'bg-muted text-muted-foreground';
// };

// const getActionLabel = (action: string): string => {
//     if (action === 'edit') return 'Edited';
//     if (action === 'delete') return 'Deleted';
//     return action;
// };

// // Triggers a browser download using a temporary anchor, without navigating the page.
// // Uses the authenticated `api` axios instance (not raw fetch) so the request
// // carries whatever auth mechanism the app uses (bearer token / cookies).
// const downloadAttachment = async (att: AttachmentItem) => {
//     try {
//         const res = await api.get(att.url, { responseType: 'blob' });
//         const blobUrl = window.URL.createObjectURL(res.data);
//         const link = document.createElement('a');
//         link.href = blobUrl;
//         link.download = att.title || 'attachment';
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         window.URL.revokeObjectURL(blobUrl);
//     } catch {
//         toast.error('Failed to download attachment');
//     }
// };

// // ─── Attachment Preview Modal ──────────────────────────────────────────────────

// function AttachmentPreviewDialog({
//     attachment,
//     onCloseAction,
// }: {
//     attachment: AttachmentItem | null;
//     onCloseAction: () => void;
// }) {
//     if (!attachment) return null;
//     const isImage = isImageAttachment(attachment.title || attachment.url);
//     const isPdf = isPdfAttachment(attachment.title || attachment.url); // NEW

//     return (
//         <Dialog open={!!attachment} onOpenChange={(open) => { if (!open) onCloseAction(); }}>
//             <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
//                 <DialogHeader className="px-5 pt-5 pb-3 border-b flex-row items-center justify-between space-y-0">
//                     <div className="min-w-0">
//                         <DialogTitle className="truncate text-base">{attachment.title}</DialogTitle>
//                         {attachment.file_size !== undefined && attachment.file_size !== null && (
//                             <DialogDescription className="mt-0.5">
//                                 {formatFileSize(attachment.file_size)}
//                             </DialogDescription>
//                         )}
//                     </div>
//                 </DialogHeader>

//                 <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4 min-h-[300px]">
//                     {isImage ? (
//                         // eslint-disable-next-line @next/next/no-img-element
//                         <img
//                             src={attachment.url}
//                             alt={attachment.title}
//                             className="max-w-full max-h-[60vh] object-contain rounded-md shadow-sm"
//                         />
//                     ) : isPdf ? (
//                         // NEW — PDFs render natively in the browser via iframe.
//                         // Excel/Word files have no browser-native renderer, so
//                         // they fall through to the "download to view" message below.
//                         <iframe
//                             src={attachment.url}
//                             className="w-full h-[65vh] rounded-md border bg-white"
//                             title={attachment.title}
//                         />
//                     ) : (
//                         <div className="flex flex-col items-center gap-3 text-center py-10">
//                             <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
//                                 <FileText className="h-7 w-7 text-muted-foreground"/>
//                             </div>
//                             <p className="text-sm text-muted-foreground max-w-xs">
//                                 Preview isn&apos;t available for this file type. Download it to view the contents.
//                             </p>
//                         </div>
//                     )}
//                 </div>

//                 <DialogFooter className="px-5 py-4 border-t sm:justify-between gap-2">
//                     <Button variant="outline" onClick={onCloseAction}>Close</Button>
//                     <Button onClick={() => downloadAttachment(attachment)}>
//                         <Download className="mr-2 h-4 w-4"/>Download
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// }

// // ─── Attachment Chip (list item) ────────────────────────────────────────────────

// function AttachmentChip({att, onPreview}: {att: AttachmentItem; onPreview: (att: AttachmentItem) => void}) {
//     const isImage = isImageAttachment(att.title || att.url);

//     return (
//         <div className="inline-flex items-center gap-1 rounded-md border text-sm overflow-hidden">
//             <button
//                 type="button"
//                 onClick={() => onPreview(att)}
//                 className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted transition-colors"
//                 title={isImage ? "Preview image" : "Preview file"}
//             >
//                 {isImage ? (
//                     <ZoomIn className="h-3.5 w-3.5 text-muted-foreground"/>
//                 ) : (
//                     <Paperclip className="h-3.5 w-3.5 text-muted-foreground"/>
//                 )}
//                 <span className="max-w-[220px] truncate">{att.title}</span>
//                 {att.file_size !== undefined && att.file_size !== null && (
//                     <span className="text-xs text-muted-foreground">
//                         ({formatFileSize(att.file_size)})
//                     </span>
//                 )}
//             </button>
//             <button
//                 type="button"
//                 onClick={() => downloadAttachment(att)}
//                 className="px-2 py-1.5 border-l hover:bg-muted transition-colors"
//                 title="Download"
//             >
//                 <Download className="h-3.5 w-3.5 text-muted-foreground"/>
//             </button>
//         </div>
//     );
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function LetterViewPage() {
//     const {id} = useParams<{id: string}>();
//     const router = useRouter();
//     const {hasPermission, user} = useAuthStore();
// const allowedStatusIds = user?.allowed_status_ids ?? [];

//     const [letter, setLetter] = useState<LetterDetail | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [allDepartments, setAllDepartments] = useState<Department[]>([]);
//     const [allStatuses, setAllStatuses] = useState<Status[]>([]);
//     const [allAssignees, setAllAssignees] = useState<Assignee[]>([]);
//     // NEW — narrows the Assignees checklist by Department, then Sub-Unit
//     // (if that department has any), plus free-text search.
//     const [assigneeDeptFilter, setAssigneeDeptFilter] = useState<number>(0);
//     const [assigneeUnitFilter, setAssigneeUnitFilter] = useState<number>(0);
//     const [assigneeUnits, setAssigneeUnits] = useState<{id: number; name: string}[]>([]);
//     const [assigneeSearch, setAssigneeSearch] = useState("");
//     const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
//     const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
//     const [selectedStatusId, setSelectedStatusId] = useState<number>(0);
//     // NEW — "Recommended To" is its own selection, entirely separate from
//     // Assignees, so picking who to recommend the letter to never removes the
//     // person the letter is actually assigned to.
//     const [selectedRecommendedToId, setSelectedRecommendedToId] = useState<number>(0);
//     const [originalRecommendedToId, setOriginalRecommendedToId] = useState<number>(0);
//     // NEW — Department/Sub-Unit filter for the "Recommended To" picker, same
//     // pattern as the Assignees filter above, so long user lists can be
//     // narrowed down by department first.
//     const [recommendedDeptFilter, setRecommendedDeptFilter] = useState<number>(0);
//     const [recommendedUnitFilter, setRecommendedUnitFilter] = useState<number>(0);
//     const [recommendedUnits, setRecommendedUnits] = useState<{id: number; name: string}[]>([]);
//     // NEW — "Send to Recommendation" is now a standalone checkbox, independent
//     // of whatever status is selected. Previously this was driven by checking
//     // whether the Status dropdown happened to say "Recommendation", which
//     // forced people to change the status just to recommend a letter.
//     const [sendToRecommendation, setSendToRecommendation] = useState(false);
//     const [originalSendToRecommendation, setOriginalSendToRecommendation] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [activeTab, setActiveTab] = useState<LeftTab>('remarks');
//     const [remarks, setRemarks] = useState<Remark[]>([]);
//     const [remarksLoading, setRemarksLoading] = useState(false);
//     const [history, setHistory] = useState<HistoryEntry[]>([]);
//     const [historyLoading, setHistoryLoading] = useState(false);
//     const [isEditingDepts, setIsEditingDepts] = useState(false);
//     const [isEditingAssignees, setIsEditingAssignees] = useState(false);
//     const [showEditModal, setShowEditModal] = useState(false);
//     const [previewAttachment, setPreviewAttachment] = useState<AttachmentItem | null>(null);
//     const [completionFileName, setCompletionFileName] = useState("");
//    const selectedStatusObj = allStatuses.find(s => s.id === selectedStatusId);
// const isFileNameRequiredNow = !!selectedStatusObj?.requires_file_name;   // CHANGED — generalized
// const [chequeDeposited, setChequeDeposited] = useState(false);
// const [chequeDepositDate, setChequeDepositDate] = useState("");
// const [chequeAccountNo, setChequeAccountNo] = useState("");
// const [chequeBank, setChequeBank] = useState("");
// const [chequeBranch, setChequeBranch] = useState("");
// const [isEditingCheque, setIsEditingCheque] = useState(false);
// const [isSavingCheque, setIsSavingCheque] = useState(false);
// const [departmentAccounts, setDepartmentAccounts] = useState([]);

//     // NEW — remark edit/delete audit log state
//     const [remarkHistory, setRemarkHistory] = useState<RemarkHistoryEntry[]>([]);
//     const [remarkHistoryLoading, setRemarkHistoryLoading] = useState(false);

//     // ── Remark edit/delete state ────────────────────────────────────────────
//     const [editingRemark, setEditingRemark] = useState<Remark | null>(null);
//     const [editContent, setEditContent] = useState("");
//     const [editReason, setEditReason] = useState("");
//     const [isUpdatingRemark, setIsUpdatingRemark] = useState(false);

//     const [deletingRemark, setDeletingRemark] = useState<Remark | null>(null);
//     const [deleteReason, setDeleteReason] = useState("");
//     const [isDeletingRemark, setIsDeletingRemark] = useState(false);

//     // Baseline ("last saved") state used to detect unsaved changes
//     const [originalDeptIds, setOriginalDeptIds] = useState<number[]>([]);
//     const [originalAssigneeIds, setOriginalAssigneeIds] = useState<number[]>([]);
//     const [originalStatusId, setOriginalStatusId] = useState<number>(0);

//     const isDirty =
//         selectedStatusId !== originalStatusId ||
//         !arraysEqual(selectedDeptIds, originalDeptIds) ||
//         !arraysEqual(selectedAssigneeIds, originalAssigneeIds) ||
//         selectedRecommendedToId !== originalRecommendedToId ||   // NEW
//         sendToRecommendation !== originalSendToRecommendation;   // NEW

//     const isDirtyRef = useRef(isDirty);
//     useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

//     // Custom "unsaved changes" popup dialog state.
//     const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
//     const pendingActionRef = useRef<(() => void) | null>(null);

//     // NEW — fetch this department's sub-units whenever the assignee dept filter changes
//     useEffect(() => {
//         setAssigneeUnitFilter(0);
//         if (!assigneeDeptFilter) { setAssigneeUnits([]); return; }
//         api.get(`/v1/department/${assigneeDeptFilter}/units`)
//             .then(r => setAssigneeUnits(r.data.data || []))
//             .catch(() => setAssigneeUnits([]));
//     }, [assigneeDeptFilter]);

//     // NEW — fetch this department's sub-units whenever the "Recommended To"
//     // dept filter changes, mirroring the assignee filter behaviour above.
//     useEffect(() => {
//         setRecommendedUnitFilter(0);
//         if (!recommendedDeptFilter) { setRecommendedUnits([]); return; }
//         api.get(`/v1/department/${recommendedDeptFilter}/units`)
//             .then(r => setRecommendedUnits(r.data.data || []))
//             .catch(() => setRecommendedUnits([]));
//     }, [recommendedDeptFilter]);

//     const filteredAssignees = allAssignees.filter(a =>
//         (!assigneeDeptFilter || a.department_id === assigneeDeptFilter) &&
//         (!assigneeUnitFilter || a.department_unit_id === assigneeUnitFilter) &&
//         (!assigneeSearch.trim() || a.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
//     );

//     // NEW — same department/sub-unit narrowing, applied to the
//     // "Recommended To" user picker instead of the Assignees picker.
//     const filteredRecommendedToAssignees = allAssignees.filter(a =>
//         (!recommendedDeptFilter || a.department_id === recommendedDeptFilter) &&
//         (!recommendedUnitFilter || a.department_unit_id === recommendedUnitFilter)
//     );

//     const requestNavigation = (action: () => void) => {
//         if (isDirtyRef.current) {
//             pendingActionRef.current = action;
//             setShowUnsavedDialog(true);
//         } else {
//             action();
//         }
//     };

//     const confirmLeave = () => {
//         setShowUnsavedDialog(false);
//         const action = pendingActionRef.current;
//         pendingActionRef.current = null;
//         if (action) action();
//     };

//     const cancelLeave = () => {
//         setShowUnsavedDialog(false);
//         pendingActionRef.current = null;
//     };

//     // ── Fetch letter ──────────────────────────────────────────────────────────

//     const fetchLetter = useCallback(async () => {
//         try {
//             setIsLoading(true);
//             const [letterRes, deptRes, statusRes, assigneeRes, deptAccountsRes] = await Promise.all([
//                 api.get(`/v1/letter/${id}`),
//                 api.get('/v1/department/list'),
//                 api.get('/v1/status/list'),
//                 api.get('/v1/system_user/names'),
//                  api.get('/v1/system_user/department-accounts'),  
//             ]);
//             const data: LetterDetail = letterRes.data.data;
//             setLetter(data);

//             const deptIds = (data.departments || []).map(d => d.id);
//             const assigneeIds = (data.assignees || []).map(a => a.id);

//             setSelectedDeptIds(deptIds);
//             setSelectedAssigneeIds(assigneeIds);
//             setSelectedStatusId(data.status_id);

//             setOriginalDeptIds(deptIds);
//             setOriginalAssigneeIds(assigneeIds);
//             setOriginalStatusId(data.status_id);
//             setChequeDeposited(!!data.cheque_deposited);
//             setChequeDepositDate(data.cheque_deposit_date ? data.cheque_deposit_date.slice(0, 10) : "");
//             setChequeAccountNo(data.cheque_account_no || "");
//             setChequeBank(data.cheque_bank || "");
//             setChequeBranch(data.cheque_branch || "");
//             setCompletionFileName(data.completion_file_name || "");   // NEW — keep the input in sync with saved value
//             setSelectedRecommendedToId(data.recommended_to?.id || 0);   // NEW
//             setOriginalRecommendedToId(data.recommended_to?.id || 0);   // NEW
//             setSendToRecommendation(!!data.recommended_to);   // NEW
//             setOriginalSendToRecommendation(!!data.recommended_to);   // NEW

//             if (deptRes.data.success) setAllDepartments(deptRes.data.data);
//             if (statusRes.data.success) setAllStatuses(statusRes.data.data);
//             if (assigneeRes.data.success) setAllAssignees(assigneeRes.data.data);
//             if (deptAccountsRes.data.success) setDepartmentAccounts(deptAccountsRes.data.data); 
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to load letter');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [id]);

//     useEffect(() => { fetchLetter(); }, [fetchLetter]);

//     // ── Fetch remarks ─────────────────────────────────────────────────────────

//     const fetchRemarks = useCallback(async () => {
//         try {
//             setRemarksLoading(true);
//             const res = await api.get(`/v1/letter/${id}/remarks`);
//             setRemarks(res.data.data || []);
//         } catch {
//             toast.error('Failed to load remarks');
//         } finally {
//             setRemarksLoading(false);
//         }
//     }, [id]);

//     const handleSaveCheque = async () => {
//     try {
//         setIsSavingCheque(true);
//         await api.put(`/v1/letter/${id}/cheque`, {
//             deposited: chequeDeposited,
//             deposit_date: chequeDeposited && chequeDepositDate ? new Date(chequeDepositDate).toISOString() : null,
//             account_no: chequeDeposited ? chequeAccountNo : null,
//             bank: chequeDeposited ? chequeBank : null,
//             branch: chequeDeposited ? chequeBranch : null,
//         });
//         toast.success("Cheque details saved");
//         setIsEditingCheque(false);   // NEW — collapse back to read-only view after saving
//         fetchLetter();
//     } catch (error) {
//         toast.error(error.response?.data?.message || 'Failed to save cheque details');
//     } finally {
//         setIsSavingCheque(false);
//     }
//     };

//     // ── Fetch letter history ────────────────────────────────────────────────

//     const fetchHistory = useCallback(async () => {
//         try {
//             setHistoryLoading(true);
//             const res = await api.get(`/v1/letter/${id}/history`);
//             setHistory(res.data.data || []);
//         } catch {
//             toast.error('Failed to load history');
//         } finally {
//             setHistoryLoading(false);
//         }
//     }, [id]);

//     // ── Fetch remark edit/delete log — NEW ──────────────────────────────────

//     const fetchRemarkHistory = useCallback(async () => {
//         try {
//             setRemarkHistoryLoading(true);
//             const res = await api.get(`/v1/letter/${id}/remarks/history`);
//             setRemarkHistory(res.data.data || []);
//         } catch {
//             toast.error('Failed to load remark log');
//         } finally {
//             setRemarkHistoryLoading(false);
//         }
//     }, [id]);

//     useEffect(() => {
//         if (activeTab === 'remarks') fetchRemarks();
//         else if (activeTab === 'history') fetchHistory();
//         else if (activeTab === 'remarkLog') fetchRemarkHistory();
//     }, [activeTab, fetchRemarks, fetchHistory, fetchRemarkHistory]);

//     // ── Warn on browser tab close / refresh while there are unsaved changes ────

//     useEffect(() => {
//         const handleBeforeUnload = (e: BeforeUnloadEvent) => {
//             if (isDirtyRef.current) {
//                 e.preventDefault();
//                 e.returnValue = '';
//             }
//         };
//         window.addEventListener('beforeunload', handleBeforeUnload);
//         return () => window.removeEventListener('beforeunload', handleBeforeUnload);
//     }, []);

//     // ── Warn on browser Back/Forward navigation while there are unsaved changes ─

//     useEffect(() => {
//         window.history.pushState(null, '', window.location.href);

//         const handlePopState = () => {
//             if (isDirtyRef.current) {
//                 window.history.pushState(null, '', window.location.href);
//                 requestNavigation(() => router.push('/letters'));
//             } else {
//                 router.push('/letters');
//             }
//         };

//         window.addEventListener('popstate', handlePopState);
//         return () => window.removeEventListener('popstate', handlePopState);
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [router]);

//     // ── Save assignment ───────────────────────────────────────────────────────

//     const handleSave = async () => {
//     if (isFileNameRequiredNow && !completionFileName.trim()) {   // CHANGED
//         toast.error(`File Name is required when setting status to "${selectedStatusObj?.name}"`);
//         return;
//     }
//     if (sendToRecommendation && !selectedRecommendedToId) {   // CHANGED — now driven by the checkbox, not the status
//         toast.error('Please select who this should be recommended to before saving.');
//         return;
//     }
//     try {
//         setIsSaving(true);
//         await api.put(`/v1/letter/assignment/${id}`, {
//             status_id: selectedStatusId,
//             department_ids: selectedDeptIds,
//             assignee_ids: selectedAssigneeIds,
//             file_name: isFileNameRequiredNow ? completionFileName.trim() : undefined,   // CHANGED
//             recommended_to_id: sendToRecommendation ? selectedRecommendedToId : null,   // CHANGED — explicit null clears it when unchecked
//         });
//         toast.success("Letter updated successfully");
//         setOriginalStatusId(selectedStatusId);
//         setOriginalDeptIds(selectedDeptIds);
//         setOriginalAssigneeIds(selectedAssigneeIds);
//         setOriginalRecommendedToId(selectedRecommendedToId);   // NEW
//         setOriginalSendToRecommendation(sendToRecommendation);   // NEW
//         fetchLetter();
//     } catch (error) {
//         toast.error(error.response?.data?.message || 'Failed to save changes');
//     } finally {
//         setIsSaving(false);
//     }
// };
//     // Used by "Save Changes and Go Back" in the unsaved-changes dialog.
//     // Saves the pending assignment changes first, then runs the queued navigation.
//     const handleSaveAndProceed = async () => {
//         if (sendToRecommendation && !selectedRecommendedToId) {   // CHANGED
//             toast.error('Please select who this should be recommended to before saving.');
//             return;
//         }
//         try {
//             setIsSaving(true);
//             await api.put(`/v1/letter/assignment/${id}`, {
//                 status_id: selectedStatusId,
//                 department_ids: selectedDeptIds,
//                 assignee_ids: selectedAssigneeIds,
//                 file_name: isFileNameRequiredNow ? completionFileName.trim() : undefined,   // NEW
//                 recommended_to_id: sendToRecommendation ? selectedRecommendedToId : null,   // CHANGED
//             });
//             toast.success("Letter updated successfully");

//             setOriginalStatusId(selectedStatusId);
//             setOriginalDeptIds(selectedDeptIds);
//             setOriginalAssigneeIds(selectedAssigneeIds);
//             setOriginalRecommendedToId(selectedRecommendedToId);   // NEW
//             setOriginalSendToRecommendation(sendToRecommendation);   // NEW

//             setShowUnsavedDialog(false);
//             const action = pendingActionRef.current;
//             pendingActionRef.current = null;
//             fetchLetter();
//             if (action) action();
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to save changes');
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const toggleDept = (deptId: number) =>
//         setSelectedDeptIds(prev => prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]);

//     const toggleAssignee = (assigneeId: number) =>
//         setSelectedAssigneeIds(prev => prev.includes(assigneeId) ? prev.filter(a => a !== assigneeId) : [...prev, assigneeId]);

//     const handleBackToLetters = () => {
//         requestNavigation(() => router.push('/letters'));
//     };

//     // ── Remark edit handlers ────────────────────────────────────────────────

//     const openEditRemark = (remark: Remark) => {
//         setEditingRemark(remark);
//         setEditContent(remark.content);
//         setEditReason("");
//     };

//     const closeEditRemark = () => {
//         if (isUpdatingRemark) return;
//         setEditingRemark(null);
//         setEditContent("");
//         setEditReason("");
//     };

//     const handleUpdateRemark = async () => {
//         if (!editingRemark) return;
//         if (!editContent.trim()) {
//             toast.error("Remark content cannot be empty");
//             return;
//         }
//         if (!editReason.trim()) {
//             toast.error("Please provide a reason for the change");
//             return;
//         }
//         try {
//             setIsUpdatingRemark(true);
//             await api.put(`/v1/letter/remark/${editingRemark.id}`, {
//                 content: editContent.trim(),
//                 reason: editReason.trim(),
//             });
//             toast.success("Remark updated successfully");
//             setEditingRemark(null);
//             setEditContent("");
//             setEditReason("");
//             fetchRemarks();
//             // Keep the remark log fresh too, in case the user checks it next
//             if (activeTab === 'remarkLog') fetchRemarkHistory();
//         } catch (error) {
//             toast.error(error.response?.data?.message || "Failed to update remark");
//         } finally {
//             setIsUpdatingRemark(false);
//         }
//     };

//     // ── Remark delete handlers ──────────────────────────────────────────────

//     const openDeleteRemark = (remark: Remark) => {
//         setDeletingRemark(remark);
//         setDeleteReason("");
//     };

//     const closeDeleteRemark = () => {
//         if (isDeletingRemark) return;
//         setDeletingRemark(null);
//         setDeleteReason("");
//     };

//     const handleDeleteRemark = async () => {
//         if (!deletingRemark) return;
//         if (!deleteReason.trim()) {
//             toast.error("Please provide a reason for deleting this remark");
//             return;
//         }
//         try {
//             setIsDeletingRemark(true);
//             await api.delete(`/v1/letter/remark/${deletingRemark.id}`, {
//                 data: { reason: deleteReason.trim() },
//             });
//             toast.success("Remark deleted successfully");
//             setDeletingRemark(null);
//             setDeleteReason("");
//             fetchRemarks();
//             if (activeTab === 'remarkLog') fetchRemarkHistory();
//         } catch (error) {
//             toast.error(error.response?.data?.message || "Failed to delete remark");
//         } finally {
//             setIsDeletingRemark(false);
//         }
//     };

//     // ── Render ────────────────────────────────────────────────────────────────

//     if (isLoading) {
//         return (
//             <div className="flex items-center justify-center h-[60vh]">
//                 <div className="flex flex-col items-center gap-3">
//                     <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"/>
//                     <p className="text-sm text-muted-foreground">Loading letter...</p>
//                 </div>
//             </div>
//         );
//     }

//     if (!letter) {
//         return (
//             <div className="flex items-center justify-center h-[60vh]">
//                 <p className="text-muted-foreground">Letter not found.</p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-6">
//             {/* Unsaved changes confirmation popup */}
//             <Dialog open={showUnsavedDialog} onOpenChange={(open) => { if (!open) cancelLeave(); }}>
//                 <DialogContent className="sm:max-w-[460px]">
//                     <DialogHeader>
//                         <div className="flex items-center gap-2">
//                             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
//                                 <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
//                             </div>
//                             <DialogTitle>Unsaved changes</DialogTitle>
//                         </div>
//                         <DialogDescription className="pt-2">
//                             You have unsaved changes. If you leave this page without clicking
//                             {' '}<span className="font-medium text-foreground">&ldquo;Save Changes&rdquo;</span>,
//                             your changes will not be saved.
//                         </DialogDescription>
//                     </DialogHeader>
//                     <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
//                         <Button
//                             className="w-full bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
//                             onClick={handleSaveAndProceed}
//                             disabled={isSaving}
//                         >
//                             {isSaving ? (
//                                 <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
//                             ) : (
//                                 <><Save className="mr-2 h-4 w-4"/>Save Changes and Go Back</>
//                             )}
//                         </Button>
//                         <div className="flex gap-2 w-full">
//                             <Button variant="outline" className="flex-1" onClick={cancelLeave} disabled={isSaving}>
//                                 Stay on this page
//                             </Button>
//                             <Button variant="destructive" className="flex-1" onClick={confirmLeave} disabled={isSaving}>
//                                 Leave without saving
//                             </Button>
//                         </div>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             {/* Attachment preview modal */}
//             <AttachmentPreviewDialog
//                 attachment={previewAttachment}
//                 onCloseAction={() => setPreviewAttachment(null)}
//             />

//             {/* Edit Remark dialog */}
//             <Dialog open={!!editingRemark} onOpenChange={(open) => { if (!open) closeEditRemark(); }}>
//                 <DialogContent className="sm:max-w-[480px]">
//                     <DialogHeader>
//                         <DialogTitle>Edit Remark</DialogTitle>
//                         <DialogDescription>
//                             Editing a remark keeps a record of the change. Please explain why you&apos;re editing it.
//                         </DialogDescription>
//                     </DialogHeader>
//                     <div className="space-y-4 py-2">
//                         <div className="space-y-1.5">
//                             <label className="text-sm font-medium">Remark</label>
//                             <textarea
//                                 value={editContent}
//                                 onChange={(e) => setEditContent(e.target.value)}
//                                 rows={4}
//                                 className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
//                                 disabled={isUpdatingRemark}
//                             />
//                         </div>
//                         <div className="space-y-1.5">
//                             <label className="text-sm font-medium">Reason for change</label>
//                             <textarea
//                                 value={editReason}
//                                 onChange={(e) => setEditReason(e.target.value)}
//                                 rows={2}
//                                 placeholder="e.g. Corrected a typo in the department name"
//                                 className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
//                                 disabled={isUpdatingRemark}
//                             />
//                         </div>
//                     </div>
//                     <DialogFooter>
//                         <Button variant="outline" onClick={closeEditRemark} disabled={isUpdatingRemark}>
//                             Cancel
//                         </Button>
//                         <Button onClick={handleUpdateRemark} disabled={isUpdatingRemark}>
//                             {isUpdatingRemark ? (
//                                 <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
//                             ) : (
//                                 "Save Changes"
//                             )}
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             {/* Delete Remark dialog */}
//             <Dialog open={!!deletingRemark} onOpenChange={(open) => { if (!open) closeDeleteRemark(); }}>
//                 <DialogContent className="sm:max-w-[460px]">
//                     <DialogHeader>
//                         <div className="flex items-center gap-2">
//                             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
//                                 <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400"/>
//                             </div>
//                             <DialogTitle>Delete Remark</DialogTitle>
//                         </div>
//                         <DialogDescription className="pt-2">
//                             This will remove the remark from the list. This action keeps a record in the
//                             remark log and cannot be undone. Please provide a reason.
//                         </DialogDescription>
//                     </DialogHeader>
//                     <div className="space-y-4 py-2">
//                         {deletingRemark && (
//                             <div className="rounded-md border bg-muted/30 p-3">
//                                 <p className="text-sm whitespace-pre-wrap line-clamp-3">{deletingRemark.content}</p>
//                             </div>
//                         )}
//                         <div className="space-y-1.5">
//                             <label className="text-sm font-medium">Reason for deletion</label>
//                             <textarea
//                                 value={deleteReason}
//                                 onChange={(e) => setDeleteReason(e.target.value)}
//                                 rows={2}
//                                 placeholder="e.g. Duplicate remark, added by mistake"
//                                 className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
//                                 disabled={isDeletingRemark}
//                             />
//                         </div>
//                     </div>
//                     <DialogFooter>
//                         <Button variant="outline" onClick={closeDeleteRemark} disabled={isDeletingRemark}>
//                             Cancel
//                         </Button>
//                         <Button variant="destructive" onClick={handleDeleteRemark} disabled={isDeletingRemark}>
//                             {isDeletingRemark ? (
//                                 <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</>
//                             ) : (
//                                 <><Trash2 className="mr-2 h-4 w-4"/>Delete Remark</>
//                             )}
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             {/* Header */}
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold">Letter View</h1>
//                     <p className="text-muted-foreground text-sm">
//                         Review letter details, track history, and forward correspondence to the appropriate department or personnel for further action
//                     </p>
//                 </div>

//                 <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                         <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent align="end">
//                         {hasPermission('letter.update') && (
//                             <DropdownMenuItem onClick={() => requestNavigation(() => setShowEditModal(true))}>
//                                 <Pencil className="mr-2 h-4 w-4"/>Edit Letter Details
//                             </DropdownMenuItem>
//                         )}
//                         <DropdownMenuItem onClick={handleBackToLetters}>
//                             <ArrowLeft className="mr-2 h-4 w-4"/>Back to Letters
//                         </DropdownMenuItem>
//                     </DropdownMenuContent>
//                 </DropdownMenu>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
//                 {/* ── Left panel ───────────────────────────────────────────── */}
//                 <div className="space-y-4">
//                     {/* Letter details */}
//                     <Card>
//                         <CardContent className="pt-6">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Code</p>
//                                     <p className="font-semibold mt-0.5">{letter.code}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Sender's Address</p>
//                                     <p className="font-semibold mt-0.5">{letter.sender || "—"}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Subject / Content</p>
//                                     <p className="font-semibold mt-0.5">{letter.subject}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Sender / Organization</p>
//                                     <p className="font-semibold mt-0.5">{letter.organization?.name || "—"}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Source</p>
//                                     <p className="font-semibold mt-0.5">{letter.source?.name || "—"}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Email</p>
//                                     <p className="font-semibold mt-0.5">{letter.email || "N/A"}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Received Date</p>
//                                     <p className="font-semibold mt-0.5">{formatDate(letter.received_datetime)}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Telephone</p>
//                                     <p className="font-semibold mt-0.5">{letter.telephone || "N/A"}</p>
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">System Date</p>
//                                     <p className="font-semibold mt-0.5">{formatDate(letter.create_datetime)}</p>
//                                 </div>
//                                 {letter.sender_subject_no && (
//                                     <div>
//                                         <p className="text-sm text-muted-foreground">Sender's Subject No</p>
//                                         <p className="font-semibold mt-0.5">{letter.sender_subject_no}</p>
//                                     </div>
//                                 )}
//                                 {letter.registered_post_no && (
//                                     <div>
//                                         <p className="text-sm text-muted-foreground">Registered Postal Number</p>
//                                         <p className="font-semibold mt-0.5">{letter.registered_post_no}</p>
//                                     </div>
//                                 )}
//                                 {letter.other && (
//                                     <div className="md:col-span-2">
//                                         <p className="text-sm text-muted-foreground">Cheque No / Money Order No</p>
//                                         <p className="font-semibold mt-0.5">{letter.other}</p>
//                                     </div>
//                                 )}
//                                 {/* NEW — completion file name, shown whenever a status that required
//                                     a file name was saved with one attached. Kept visible regardless
//                                     of which status is currently selected, so the historical record
//                                     of "what file this was completed/filed under" is never hidden. */}
//                                 {letter.completion_file_name && (
//                                     <div className="md:col-span-2">
//                                         <p className="text-sm text-muted-foreground">File Name</p>
//                                         <p className="font-semibold mt-0.5">{letter.completion_file_name}</p>
//                                     </div>
//                                 )}
//                               {letter.other && (
//                                             <>
//                                                 <Separator className="my-5"/>
//                                                 <div className="space-y-3">
//                                                     <div className="flex items-center justify-between">
//                                                         <div className="flex items-center space-x-2">
//                                                             <Checkbox
//                                                                 id="cheque-deposited"
//                                                                 checked={chequeDeposited}
//                                                                 onCheckedChange={(checked) => setChequeDeposited(!!checked)}
//                                                                 // FIXED — previously this was disabled whenever `isEditingCheque`
//                                                                 // was false, but the "Edit" button that turns `isEditingCheque`
//                                                                 // on only renders once `letter.cheque_deposited` is already true
//                                                                 // (see the button just below). On a brand new letter that had
//                                                                 // never been saved, that meant the checkbox could never be
//                                                                 // clicked at all. Now it's only locked once a deposit has
//                                                                 // already been saved and the user isn't actively editing it.
//                                                                 disabled={!hasPermission('letter.cheque_update') || (letter.cheque_deposited && !isEditingCheque)}
//                                                             />
//                                                             <label htmlFor="cheque-deposited" className="text-sm font-medium cursor-pointer">
//                                                                 Cheque Deposited
//                                                             </label>
//                                                         </div>
//                                                         {hasPermission('letter.cheque_update') && letter.cheque_deposited && !isEditingCheque && (
//                                                             <Button
//                                                                 type="button"
//                                                                 variant="ghost"
//                                                                 size="sm"
//                                                                 className="h-7 px-2 text-xs"
//                                                                 onClick={() => setIsEditingCheque(true)}
//                                                             >
//                                                                 <Pencil className="mr-1 h-3 w-3"/>Edit
//                                                             </Button>
//                                                         )}
//                                                     </div>

//                                                     {/* Editable form — shown when not yet saved, or when Edit was clicked */}
//                                                     {(isEditingCheque || !letter.cheque_deposited) && chequeDeposited && (
//                                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
//                                                             <div>
//                                                                 <label className="text-xs text-muted-foreground">Deposit Date</label>
//                                                                 <input type="date" value={chequeDepositDate}
//                                                                     onChange={(e) => setChequeDepositDate(e.target.value)}
//                                                                     className="w-full rounded-md border px-3 py-2 text-sm"/>
//                                                             </div>
//                                                             <div>
//                                                                 <label className="text-xs text-muted-foreground">Account No</label>
//                                                                 <input type="text" value={chequeAccountNo}
//                                                                     onChange={(e) => setChequeAccountNo(e.target.value)}
//                                                                     className="w-full rounded-md border px-3 py-2 text-sm"/>
//                                                             </div>
//                                                             <div>
//                                                                 <label className="text-xs text-muted-foreground">Bank</label>
//                                                                 <input type="text" value={chequeBank}
//                                                                     onChange={(e) => setChequeBank(e.target.value)}
//                                                                     className="w-full rounded-md border px-3 py-2 text-sm"/>
//                                                             </div>
//                                                             <div>
//                                                                 <label className="text-xs text-muted-foreground">Branch</label>
//                                                                 <input type="text" value={chequeBranch}
//                                                                     onChange={(e) => setChequeBranch(e.target.value)}
//                                                                     className="w-full rounded-md border px-3 py-2 text-sm"/>
//                                                             </div>
//                                                         </div>
//                                                     )}

//                                                     {/* Save / Cancel — only while actively editing (first-time entry or Edit clicked) */}
//                                                     {hasPermission('letter.cheque_update') && (isEditingCheque || !letter.cheque_deposited) && (
//                                                         <div className="flex gap-2">
//                                                             <Button size="sm" onClick={handleSaveCheque} disabled={isSavingCheque}>
//                                                                 {isSavingCheque ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : "Save Cheque Details"}
//                                                             </Button>
//                                                             {isEditingCheque && (
//                                                                 <Button
//                                                                     type="button"
//                                                                     size="sm"
//                                                                     variant="outline"
//                                                                     onClick={() => {
//                                                                         // revert unsaved edits back to the last saved values
//                                                                         setChequeDeposited(!!letter.cheque_deposited);
//                                                                         setChequeDepositDate(letter.cheque_deposit_date ? letter.cheque_deposit_date.slice(0, 10) : "");
//                                                                         setChequeAccountNo(letter.cheque_account_no || "");
//                                                                         setChequeBank(letter.cheque_bank || "");
//                                                                         setChequeBranch(letter.cheque_branch || "");
//                                                                         setIsEditingCheque(false);
//                                                                     }}
//                                                                 >
//                                                                     Cancel
//                                                                 </Button>
//                                                             )}
//                                                         </div>
//                                                     )}

//                                                     {/* Read-only summary — shown whenever saved data exists and we're not editing */}
//                                                     {letter.cheque_deposited && !isEditingCheque && (
//                                                         <div className="border rounded-md p-3 space-y-1 bg-muted/20">
//                                                             <p className="text-xs font-medium text-muted-foreground mb-1">Saved deposit details</p>
//                                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
//                                                                 <p><span className="text-muted-foreground">Deposit Date:</span> {letter.cheque_deposit_date ? formatDate(letter.cheque_deposit_date) : "—"}</p>
//                                                                 <p><span className="text-muted-foreground">Account No:</span> {letter.cheque_account_no || "—"}</p>
//                                                                 <p><span className="text-muted-foreground">Bank:</span> {letter.cheque_bank || "—"}</p>
//                                                                 <p><span className="text-muted-foreground">Branch:</span> {letter.cheque_branch || "—"}</p>
//                                                             </div>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </>
//                                         )}

//                             </div>        

//                             {/* Attachments — preview + download, no page navigation */}
//                             {letter.attachments && letter.attachments.length > 0 && (
//                                 <>
//                                     <Separator className="my-5"/>
//                                     <div>
//                                         <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
//                                             <Paperclip className="h-3.5 w-3.5"/>Attachments
//                                         </p>
//                                         <div className="flex flex-wrap gap-2">
//                                             {letter.attachments.map(att => (
//                                                 <AttachmentChip
//                                                     key={att.id}
//                                                     att={att}
//                                                     onPreview={setPreviewAttachment}
//                                                 />
//                                             ))}
//                                         </div>
//                                     </div>
//                                 </>
//                             )}
//                         </CardContent>
//                     </Card>

//                     {/* Remarks / Letter History / Remark Log tabs */}
//                     <Card>
//                         <CardHeader className="pb-0 pt-5 px-5">
//                             <div className="flex items-center justify-between flex-wrap gap-2">
//                                 <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
//                                     <button
//                                         onClick={() => setActiveTab('remarks')}
//                                         className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
//                                             activeTab === 'remarks'
//                                                 ? 'bg-background shadow-sm text-foreground'
//                                                 : 'text-muted-foreground hover:text-foreground'
//                                         }`}
//                                     >
//                                         Remarks
//                                     </button>
//                                     <button
//                                         onClick={() => setActiveTab('history')}
//                                         className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
//                                             activeTab === 'history'
//                                                 ? 'bg-background shadow-sm text-foreground'
//                                                 : 'text-muted-foreground hover:text-foreground'
//                                         }`}
//                                     >
//                                         Letter History
//                                     </button>
//                                     {/* NEW — Remark Log tab */}
//                                     <button
//                                         onClick={() => setActiveTab('remarkLog')}
//                                         className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
//                                             activeTab === 'remarkLog'
//                                                 ? 'bg-background shadow-sm text-foreground'
//                                                 : 'text-muted-foreground hover:text-foreground'
//                                         }`}
//                                     >
//                                         Remark Log
//                                     </button>
//                                 </div>
//                                 {activeTab === 'remarks' && (
//                                     <InsertRemarkModal letter_id={id} onSuccess={fetchRemarks}/>
//                                 )}
//                             </div>
//                         </CardHeader>
//                         <CardContent className="pt-4 px-5 pb-5">
//                             {activeTab === 'remarks' && (
//                                 remarksLoading ? (
//                                     <div className="flex justify-center py-10">
//                                         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
//                                     </div>
//                                 ) : remarks.length === 0 ? (
//                                     <div className="flex flex-col items-center justify-center py-10 text-center">
//                                         <p className="text-sm text-muted-foreground">No remarks yet</p>
//                                     </div>
//                                 ) : (
//                                     <div className="space-y-3">
//                                         {remarks.map(remark => (
//                                             <div key={remark.id} className="border rounded-lg p-4 space-y-2">
//                                                 <div className="flex items-start justify-between gap-2">
//                                                     <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
//                                                         <span className="font-medium text-foreground">
//                                                             {remark.created_by || "Unknown"}
//                                                         </span>
//                                                         {remark.department && (
//                                                             <span>{remark.department}</span>
//                                                         )}
//                                                         {remark.assignee && (
//                                                             <span>| {remark.assignee}</span>
//                                                         )}
//                                                         {remark.status && (
//                                                             <span>| {remark.status}</span>
//                                                         )}
//                                                     </div>
//                                                     <div className="flex items-center gap-2 shrink-0">
//                                                         <span className="text-xs text-muted-foreground whitespace-nowrap">
//                                                             {formatDateTime(remark.create_datetime)}
//                                                         </span>
//                                                         {hasPermission('remark.update') && (
//                                                             <button
//                                                                 onClick={() => openEditRemark(remark)}
//                                                                 className="text-muted-foreground hover:text-foreground"
//                                                                 title="Edit remark"
//                                                             >
//                                                                 <Pencil className="h-3.5 w-3.5"/>
//                                                             </button>
//                                                         )}
//                                                         {hasPermission('remark.delete') && (
//                                                             <button
//                                                                 onClick={() => openDeleteRemark(remark)}
//                                                                 className="text-muted-foreground hover:text-destructive"
//                                                                 title="Delete remark"
//                                                             >
//                                                                 <Trash2 className="h-3.5 w-3.5"/>
//                                                             </button>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                                 <p className="text-sm whitespace-pre-wrap">{remark.content}</p>
//                                                 {remark.attachments?.length > 0 && (
//                                                     <div className="flex flex-wrap gap-2 pt-1">
//                                                         {remark.attachments.map(att => (
//                                                             <AttachmentPreview key={att.id} attachment={att}/>
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )
//                             )}

//                             {activeTab === 'history' && (
//                                 historyLoading ? (
//                                     <div className="flex justify-center py-10">
//                                         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
//                                     </div>
//                                 ) : history.length === 0 ? (
//                                     <div className="flex flex-col items-center justify-center py-10">
//                                         <p className="text-sm text-muted-foreground">No history available</p>
//                                     </div>
//                                 ) : (
//                                     <div className="relative pl-6 space-y-0">
//                                         <div className="absolute left-2 top-2 bottom-2 w-px bg-border"/>

//                                         {history.map((entry) => (
//                                             <div key={entry.id} className="relative pb-6 last:pb-0">
//                                                 <div className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background ring-1 ring-border"/>

//                                                 <div className="pl-4">
//                                                     <p className="text-xs text-muted-foreground mb-1">
//                                                         {formatDateTime(entry.create_datetime)}
//                                                     </p>
//                                                     <p className="text-sm font-medium">{entry.description}</p>
//                                                     <p className="text-xs text-muted-foreground mt-0.5">
//                                                         by {entry.username}
//                                                     </p>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )
//                             )}

//                             {/* NEW — Remark Log content: who edited/deleted what remark, and why */}
//                             {activeTab === 'remarkLog' && (
//                                 remarkHistoryLoading ? (
//                                     <div className="flex justify-center py-10">
//                                         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
//                                     </div>
//                                 ) : remarkHistory.length === 0 ? (
//                                     <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
//                                         <HistoryIcon className="h-8 w-8 text-muted-foreground/50"/>
//                                         <p className="text-sm text-muted-foreground">No remark edits or deletions yet</p>
//                                     </div>
//                                 ) : (
//                                     <div className="space-y-3">
//                                         {remarkHistory.map((entry) => (
//                                             <div key={entry.id} className="border rounded-lg p-4 space-y-2.5">
//                                                 <div className="flex items-start justify-between gap-2 flex-wrap">
//                                                     <div className="flex items-center gap-2 flex-wrap">
//                                                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionClassName(entry.action)}`}>
//                                                             {getActionLabel(entry.action)}
//                                                         </span>
//                                                         <span className="text-sm font-medium">{entry.changed_by}</span>
//                                                         {entry.changed_by_email && (
//                                                             <span className="text-xs text-muted-foreground">
//                                                                 ({entry.changed_by_email})
//                                                             </span>
//                                                         )}
//                                                     </div>
//                                                     <span className="text-xs text-muted-foreground whitespace-nowrap">
//                                                         {formatDateTime(entry.create_datetime)}
//                                                     </span>
//                                                 </div>

//                                                 {entry.action === 'edit' ? (
//                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                                         <div className="space-y-1">
//                                                             <p className="text-xs font-medium text-muted-foreground">Before</p>
//                                                             <div className="rounded-md border bg-red-50/50 dark:bg-red-950/20 p-2.5">
//                                                                 <p className="text-sm whitespace-pre-wrap text-muted-foreground line-through decoration-red-400/60">
//                                                                     {entry.content_before || "—"}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                         <div className="space-y-1">
//                                                             <p className="text-xs font-medium text-muted-foreground">After</p>
//                                                             <div className="rounded-md border bg-green-50/50 dark:bg-green-950/20 p-2.5">
//                                                                 <p className="text-sm whitespace-pre-wrap">
//                                                                     {entry.content_after || "—"}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 ) : (
//                                                     <div className="space-y-1">
//                                                         <p className="text-xs font-medium text-muted-foreground">Deleted remark</p>
//                                                         <div className="rounded-md border bg-muted/30 p-2.5">
//                                                             <p className="text-sm whitespace-pre-wrap text-muted-foreground">
//                                                                 {entry.content_before || "—"}
//                                                             </p>
//                                                         </div>
//                                                     </div>
//                                                 )}

//                                                 <div className="space-y-1">
//                                                     <p className="text-xs font-medium text-muted-foreground">Reason</p>
//                                                     <p className="text-sm">{entry.reason}</p>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>

//                 {/* ── Right panel ───────────────────────────────────────────── */}
//                 <div className="space-y-4">
//                     <Card>
//                         <CardContent className="pt-6 space-y-5">
//                             {/* Status */}
// <div className="space-y-2">
//     <p className="text-sm font-medium">Status</p>
//     <Select
//     value={selectedStatusId ? selectedStatusId.toString() : ""}
//     onValueChange={(v) => setSelectedStatusId(parseInt(v) || 0)}
//     disabled={!hasPermission('letter.change_status')}   // CHANGED
// >
//         <SelectTrigger className="w-full">
//             <SelectValue placeholder="Select Status"/>
//         </SelectTrigger>
//         <SelectContent>
//             {allStatuses
//                 .filter(s =>
//                     !allowedStatusIds?.length ||               // no restriction set → show all
//                     allowedStatusIds.includes(s.id) ||          // status this role is allowed to set
//                     s.id === selectedStatusId                   // always show the letter's current status, even if not settable
//                 )
//                 .map(s => (
//                     <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
//                 ))}
//         </SelectContent>
//     </Select>
//     {isFileNameRequiredNow && (
//     <div className="space-y-1 pt-1">
//         <label className="text-xs font-medium text-muted-foreground">
//             File Name <span className="text-destructive">*</span>
//         </label>
//         <input
//             type="text"
//             value={completionFileName}
//             onChange={(e) => setCompletionFileName(e.target.value)}
//             placeholder={`Enter the file name for status "${selectedStatusObj?.name}"`}
//             className="w-full rounded-md border px-3 py-2 text-sm"
//         />
//     </div>
// )}
//                 {letter.status && (
//                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(letter.status.name)}`}>
//                     Current: {letter.status.name}
//                 </span>
//             )}
//             {typeof letter.status_days === 'number' && (
//                 <p className="text-xs text-muted-foreground">
//                     {letter.status_days} day{letter.status_days !== 1 ? 's' : ''} in this status
//                 </p>
//             )}
//             {/* NEW — surface the file name that was recorded for this status,
//                 so anyone viewing the letter can see it without opening edit mode */}
//             {letter.completion_file_name && (
//                 <p className="text-xs text-muted-foreground">
//                     File Name: <span className="font-medium text-foreground">{letter.completion_file_name}</span>
//                 </p>
//             )}
// </div>

//                             <Separator/>

//                             {/* Departments */}
//                             <div className="space-y-2">
//                                 <div className="flex items-center justify-between">
//                                     <p className="text-sm font-medium">Departments</p>
//                                     {hasPermission('letter.change_department') && (
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-7 px-2 text-xs"
//                                             onClick={() => setIsEditingDepts(prev => !prev)}
//                                         >
//                                             {isEditingDepts ? 'Done' : 'Edit'}
//                                         </Button>
//                                     )}
//                                 </div>
//                                 {selectedDeptIds.length > 0 ? (
//                                     <div className="flex flex-wrap gap-1">
//                                         {selectedDeptIds.map(deptId => {
//                                             const da = departmentAccounts.find(d => d.department_id === deptId);
//                                             return da ? (
//                                                 <Badge key={deptId} variant="secondary" className="text-xs gap-1">
//                                                     {da.department_name}
//                                                     {hasPermission('letter.change_department') && isEditingDepts && (
//                                                         <button onClick={() => toggleDept(deptId)} className="ml-0.5 hover:text-destructive">
//                                                             <X className="h-3 w-3"/>
//                                                         </button>
//                                                     )}
//                                                 </Badge>
//                                             ) : null;
//                                         })}
//                                     </div>
//                                 ) : (
//                                     <p className="text-sm text-muted-foreground">No departments assigned</p>
//                                 )}
//                                 {isEditingDepts && (
//                                     <div className="border rounded-md p-3 grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
//                                         {departmentAccounts.length === 0 ? (
//                                             <p className="text-sm text-muted-foreground">No department accounts have been created yet</p>
//                                         ) : departmentAccounts.map(da => (
//                                             <div key={da.department_id} className="flex items-center space-x-2">
//                                                 <Checkbox
//                                                     id={`dept-${da.department_id}`}
//                                                     checked={selectedDeptIds.includes(da.department_id)}
//                                                     onCheckedChange={() => toggleDept(da.department_id)}
//                                                     disabled={!hasPermission('letter.change_department')}
//                                                 />
//                                                 <label htmlFor={`dept-${da.department_id}`} className="text-sm cursor-pointer leading-tight">
//                                                     {da.department_name}
//                                                 </label>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 )}
                                                                
//                             </div>
//                             <Separator/>

//                             {/* Assignees */}
//                             <div className="space-y-2">
//                                 <div className="flex items-center justify-between">
//                                     <p className="text-sm font-medium">Assignees</p>
//                                     {hasPermission('letter.assign') && (
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-7 px-2 text-xs"
//                                             onClick={() => setIsEditingAssignees(prev => !prev)}
//                                         >
//                                             {isEditingAssignees ? 'Done' : 'Edit'}
//                                         </Button>
//                                     )}
//                                 </div>
//                                 {selectedAssigneeIds.length > 0 ? (
//                                     <div className="flex flex-wrap gap-1">
//                                         {selectedAssigneeIds.map(assigneeId => {
//                                             const assignee = allAssignees.find(a => a.id === assigneeId);
//                                             return assignee ? (
//                                                 <Badge key={assigneeId} variant="secondary" className="text-xs gap-1">
//                                                     {assignee.name}
//                                                     {hasPermission('letter.assign') && isEditingAssignees && (
//                                                         <button onClick={() => toggleAssignee(assigneeId)} className="ml-0.5 hover:text-destructive">
//                                                             <X className="h-3 w-3"/>
//                                                         </button>
//                                                     )}
//                                                 </Badge>
//                                             ) : null;
//                                         })}
//                                     </div>
//                                 ) : (
//                                     <p className="text-sm text-muted-foreground">No assignees assigned</p>
//                                 )}
//                                 {isEditingAssignees && (
//                                     <div className="space-y-2 border rounded-md p-3">
//                                         {/* NEW — narrow down a long assignee list by Department, then
//                                             Sub-Unit (if that department has any), plus free-text search */}
//                                         <div className="grid grid-cols-1 gap-2">
//                                             <Select
//                                                 value={assigneeDeptFilter ? assigneeDeptFilter.toString() : "0"}
//                                                 onValueChange={(v) => setAssigneeDeptFilter(parseInt(v) || 0)}
//                                             >
//                                                 <SelectTrigger className="h-8 text-xs">
//                                                     <SelectValue placeholder="Filter by department"/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     <SelectItem value="0">All sectionss</SelectItem>
//                                                     {allDepartments.map(d => (
//                                                         <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             <Select
//                                                 value={assigneeUnitFilter ? assigneeUnitFilter.toString() : "0"}
//                                                 onValueChange={(v) => setAssigneeUnitFilter(parseInt(v) || 0)}
//                                                 disabled={!assigneeDeptFilter || assigneeUnits.length === 0}
//                                             >
//                                                 <SelectTrigger className="h-8 text-xs">
//                                                     <SelectValue placeholder={assigneeUnits.length === 0 ? "No sub-units" : "Filter by sub-unit"}/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     <SelectItem value="0">All sub-units</SelectItem>
//                                                     {assigneeUnits.map(u => (
//                                                         <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                         </div>
//                                         <input
//                                             type="text"
//                                             placeholder="Search assignees by name..."
//                                             value={assigneeSearch}
//                                             onChange={(e) => setAssigneeSearch(e.target.value)}
//                                             className="w-full rounded-md border px-2 h-8 text-xs"
//                                         />
//                                         <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
//                                             {filteredAssignees.length === 0 ? (
//                                                 <p className="text-sm text-muted-foreground">No assignees match this filter</p>
//                                             ) : filteredAssignees.map(a => (
//                                                 <div key={a.id} className="flex items-center space-x-2">
//                                                     <Checkbox
//                                                         id={`assignee-${a.id}`}
//                                                         checked={selectedAssigneeIds.includes(a.id)}
//                                                         onCheckedChange={() => toggleAssignee(a.id)}
//                                                         disabled={!hasPermission('letter.assign')}
//                                                     />
//                                                     <label htmlFor={`assignee-${a.id}`} className="text-sm cursor-pointer leading-tight">
//                                                         {a.name}
//                                                     </label>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* NEW — Recommended To: entirely separate from Assignees, so
//                                 choosing who to recommend the letter to never removes or
//                                 overwrites who it's actually assigned to. Editable only
//                                 while "Recommendation" is the selected status; the current
//                                 saved value stays visible afterwards as a record of who it
//                                 was sent to. */}
//                                  <div className="flex items-center space-x-2">
//                                  <Checkbox
//         id="send-to-recommendation"
//         checked={sendToRecommendation}
//         onCheckedChange={(checked) => setSendToRecommendation(!!checked)}
//         disabled={!hasPermission('letter.recommend')}
//     />
//     <label htmlFor="send-to-recommendation" className="text-sm font-medium cursor-pointer">
//         Send to Recommendation
//     </label>
// </div>
//                             {(sendToRecommendation || letter.recommended_to) && ( 
//                                 <>
//                                     <Separator/>
//                                     <div className="space-y-2">
//                                         <p className="text-sm font-medium">Recommended To</p>
//                                         {sendToRecommendation && hasPermission('letter.assign') ? (
//                                             <div className="space-y-2">
//                                                 {/* NEW — Department / Sub-Unit filters, same pattern as
//                                                     Assignees, so the "who to recommend to" list can be
//                                                     narrowed down before picking a system user. */}
//                                                 <div className="grid grid-cols-1 gap-2">
//                                                     <Select
//                                                         value={recommendedDeptFilter ? recommendedDeptFilter.toString() : "0"}
//                                                         onValueChange={(v) => {
//                                                             const deptId = parseInt(v) || 0;
//                                                             setRecommendedDeptFilter(deptId);
//                                                             // Clear a previously selected user if they no longer
//                                                             // match the newly chosen department filter.
//                                                             const stillValid = allAssignees.find(a =>
//                                                                 a.id === selectedRecommendedToId &&
//                                                                 (!deptId || a.department_id === deptId)
//                                                             );
//                                                             if (!stillValid) setSelectedRecommendedToId(0);
//                                                         }}
//                                                     >
//                                                         <SelectTrigger className="h-8 text-xs">
//                                                             <SelectValue placeholder="Filter by department"/>
//                                                         </SelectTrigger>
//                                                         <SelectContent>
//                                                             <SelectItem value="0">All sections</SelectItem>
//                                                             {allDepartments.map(d => (
//                                                                 <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
//                                                             ))}
//                                                         </SelectContent>
//                                                     </Select>
//                                                     <Select
//                                                         value={recommendedUnitFilter ? recommendedUnitFilter.toString() : "0"}
//                                                         onValueChange={(v) => {
//                                                             const unitId = parseInt(v) || 0;
//                                                             setRecommendedUnitFilter(unitId);
//                                                             const stillValid = allAssignees.find(a =>
//                                                                 a.id === selectedRecommendedToId &&
//                                                                 (!unitId || a.department_unit_id === unitId)
//                                                             );
//                                                             if (!stillValid) setSelectedRecommendedToId(0);
//                                                         }}
//                                                         disabled={!recommendedDeptFilter || recommendedUnits.length === 0}
//                                                     >
//                                                         <SelectTrigger className="h-8 text-xs">
//                                                             <SelectValue placeholder={recommendedUnits.length === 0 ? "No sub-units" : "Filter by sub-unit"}/>
//                                                         </SelectTrigger>
//                                                         <SelectContent>
//                                                             <SelectItem value="0">All sub-units</SelectItem>
//                                                             {recommendedUnits.map(u => (
//                                                                 <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
//                                                             ))}
//                                                         </SelectContent>
//                                                     </Select>
//                                                 </div>
//                                                 <Select
//                                                     value={selectedRecommendedToId ? selectedRecommendedToId.toString() : ""}
//                                                     onValueChange={(v) => setSelectedRecommendedToId(parseInt(v) || 0)}
//                                                 >
//                                                     <SelectTrigger className="w-full">
//                                                         <SelectValue placeholder="Select who to recommend this to"/>
//                                                     </SelectTrigger>
//                                                     <SelectContent>
//                                                         {filteredRecommendedToAssignees.length === 0 ? (
//                                                             <div className="px-2 py-1.5 text-sm text-muted-foreground">
//                                                                 No system users match this filter
//                                                             </div>
//                                                         ) : filteredRecommendedToAssignees.map(a => (
//                                                             <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
//                                                         ))}
//                                                     </SelectContent>
//                                                 </Select>
//                                             </div>
//                                         ) : letter.recommended_to ? (
//                                             <Badge variant="secondary" className="text-xs">
//                                                 Recommendation: {letter.recommended_to.name}
//                                             </Badge>
//                                         ) : (
//                                             <p className="text-sm text-muted-foreground">Not yet selected</p>
//                                         )}
//                                     </div>
//                                 </>
//                             )}


//                             {/* Save */}
//                             {(hasPermission('letter.change_status') || hasPermission('letter.change_department') || hasPermission('letter.assign')) && (
//                                 <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={isSaving || !isDirty}>
//                                     {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Save className="mr-2 h-4 w-4"/>Save Changes</>}
//                                 </Button>
//                             )}
//                             {(hasPermission('letter.change_status') || hasPermission('letter.change_department') || hasPermission('letter.assign')) && isDirty && !isSaving && (
//                                 <p className="text-xs text-amber-600 dark:text-amber-400 text-center -mt-2">
//                                     You have unsaved changes.
//                                 </p>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>
//             </div>

//             {letter && (
//                 <UpdateLetterModal
//                     isOpen={showEditModal}
//                     onCloseAction={() => setShowEditModal(false)}
//                     letterData={letter}
//                     onSuccess={fetchLetter}
//                 />
//             )}
//         </div>
//     );
// }





'use client';

import {useCallback, useEffect, useRef, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {toast} from "sonner";
import {
    AlertTriangle, ArrowLeft, Loader2, MoreVertical, Paperclip, Save, X, Pencil,
    Download, FileText, ZoomIn, Trash2, History as HistoryIcon,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Separator} from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import {formatDate, formatDateTime} from "@/lib/utils";
import {useAuthStore} from "@/store/auth-store";
import {UpdateLetterModal} from "@/app/(dashboard)/letters/[id]/update-letter-modal";
import {InsertRemarkModal} from "@/app/(dashboard)/letters/[id]/insert-remark-modal";
import {AttachmentPreview} from "@/app/(dashboard)/letters/[id]/attachment-preview";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AttachmentItem {
    id: number;
    title: string;
    url: string;
    file_size?: number | null;
}

interface LetterDetail {
    id: number;
    code: string;
    subject: string;
    sender: string | null;
    organization: {id: number; name: string} | null;
    source: {id: number; name: string} | null;
    email: string | null;
    telephone: string | null;
    other: string | null;
    sender_subject_no?: string | null;
    registered_post_no?: string | null;
    received_datetime: string;
    create_datetime: string;
    status: {id: number; name: string} | null;
    status_days?: number | null;   // NEW
    status_id: number;
    departments: {id: number; name: string}[];
    assignees: {id: number; name: string}[];
    recommended_to?: {id: number; name: string} | null;   // NEW — separate from assignees
    attachments: AttachmentItem[];
    completion_file_name?: string | null;   // NEW
    cheque_deposited?: boolean;
    cheque_deposit_date?: string | null;
    cheque_account_no?: string | null;
    cheque_bank?: string | null;
    cheque_branch?: string | null;

}

interface Remark {
    id: number;
    content: string;
    assignee: string | null;
    department: string | null;
    status: string | null;
    created_by?: string | null;
    create_datetime: string;
    attachments: RemarkAttachment[];
}

interface RemarkAttachment {
    id: number;
    title: string;
    filename?: string;
    url: string;
    file_size?: number | null;
}

interface HistoryEntry {
    id: number;
    description: string;
    username: string;
    email: string;
    create_datetime: string;
    letter_id: number;
}

// NEW — remark edit/delete audit log entry
interface RemarkHistoryEntry {
    id: number;
    remark_id: number;
    letter_id: number;
    action: 'edit' | 'delete' | string;
    content_before: string | null;
    content_after: string | null;
    reason: string;
    changed_by: string;
    changed_by_email?: string | null;
    create_datetime: string;
}

interface Department {id: number; name: string}
interface Status {id: number; name: string; requires_file_name?: boolean;}   // CHANGED
interface Assignee {id: number; name: string; department_id?: number | null; department_unit_id?: number | null}

type LeftTab = 'remarks' | 'history' | 'remarkLog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusClassName = (status: string): string => {
    if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
    if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
    if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
   if (status === 'Not Relevant') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';   // CHANGED
    return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
};

const arraysEqual = (a: number[], b: number[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((x, y) => x - y);
    const sortedB = [...b].sort((x, y) => x - y);
    return sortedA.every((val, idx) => val === sortedB[idx]);
};

const formatFileSize = (bytes?: number | null): string => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
const PDF_EXTENSIONS = ['.pdf']; // NEW — used to enable in-browser PDF preview

const isImageAttachment = (nameOrUrl: string): boolean => {
    const lower = nameOrUrl.toLowerCase().split('?')[0];
    return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

// NEW — PDFs can be rendered natively by the browser via <iframe>, unlike
// Excel/Word files, which have no built-in browser renderer.
const isPdfAttachment = (nameOrUrl: string): boolean => {
    const lower = nameOrUrl.toLowerCase().split('?')[0];
    return PDF_EXTENSIONS.some(ext => lower.endsWith(ext));
};

// NEW — badge styling per remark-log action
const getActionClassName = (action: string): string => {
    if (action === 'edit') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    if (action === 'delete') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    return 'bg-muted text-muted-foreground';
};

const getActionLabel = (action: string): string => {
    if (action === 'edit') return 'Edited';
    if (action === 'delete') return 'Deleted';
    return action;
};

// Triggers a browser download using a temporary anchor, without navigating the page.
// Uses the authenticated `api` axios instance (not raw fetch) so the request
// carries whatever auth mechanism the app uses (bearer token / cookies).
const downloadAttachment = async (att: AttachmentItem) => {
    try {
        const res = await api.get(att.url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = att.title || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch {
        toast.error('Failed to download attachment');
    }
};

// ─── Attachment Preview Modal ──────────────────────────────────────────────────

function AttachmentPreviewDialog({
    attachment,
    onCloseAction,
}: {
    attachment: AttachmentItem | null;
    onCloseAction: () => void;
}) {
    if (!attachment) return null;
    const isImage = isImageAttachment(attachment.title || attachment.url);
    const isPdf = isPdfAttachment(attachment.title || attachment.url); // NEW

    return (
        <Dialog open={!!attachment} onOpenChange={(open) => { if (!open) onCloseAction(); }}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b flex-row items-center justify-between space-y-0">
                    <div className="min-w-0">
                        <DialogTitle className="truncate text-base">{attachment.title}</DialogTitle>
                        {attachment.file_size !== undefined && attachment.file_size !== null && (
                            <DialogDescription className="mt-0.5">
                                {formatFileSize(attachment.file_size)}
                            </DialogDescription>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4 min-h-[300px]">
                    {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={attachment.url}
                            alt={attachment.title}
                            className="max-w-full max-h-[60vh] object-contain rounded-md shadow-sm"
                        />
                    ) : isPdf ? (
                        // NEW — PDFs render natively in the browser via iframe.
                        // Excel/Word files have no browser-native renderer, so
                        // they fall through to the "download to view" message below.
                        <iframe
                            src={attachment.url}
                            className="w-full h-[65vh] rounded-md border bg-white"
                            title={attachment.title}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-center py-10">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <FileText className="h-7 w-7 text-muted-foreground"/>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Preview isn&apos;t available for this file type. Download it to view the contents.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-5 py-4 border-t sm:justify-between gap-2">
                    <Button variant="outline" onClick={onCloseAction}>Close</Button>
                    <Button onClick={() => downloadAttachment(attachment)}>
                        <Download className="mr-2 h-4 w-4"/>Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Attachment Chip (list item) ────────────────────────────────────────────────

function AttachmentChip({att, onPreview}: {att: AttachmentItem; onPreview: (att: AttachmentItem) => void}) {
    const isImage = isImageAttachment(att.title || att.url);

    return (
        <div className="inline-flex items-center gap-1 rounded-md border text-sm overflow-hidden">
            <button
                type="button"
                onClick={() => onPreview(att)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted transition-colors"
                title={isImage ? "Preview image" : "Preview file"}
            >
                {isImage ? (
                    <ZoomIn className="h-3.5 w-3.5 text-muted-foreground"/>
                ) : (
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground"/>
                )}
                <span className="max-w-[220px] truncate">{att.title}</span>
                {att.file_size !== undefined && att.file_size !== null && (
                    <span className="text-xs text-muted-foreground">
                        ({formatFileSize(att.file_size)})
                    </span>
                )}
            </button>
            <button
                type="button"
                onClick={() => downloadAttachment(att)}
                className="px-2 py-1.5 border-l hover:bg-muted transition-colors"
                title="Download"
            >
                <Download className="h-3.5 w-3.5 text-muted-foreground"/>
            </button>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LetterViewPage() {
    const {id} = useParams<{id: string}>();
    const router = useRouter();
    const {hasPermission, user} = useAuthStore();
const allowedStatusIds = user?.allowed_status_ids ?? [];

    const [letter, setLetter] = useState<LetterDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allStatuses, setAllStatuses] = useState<Status[]>([]);
    const [allAssignees, setAllAssignees] = useState<Assignee[]>([]);
    // NEW — narrows the Assignees checklist by Department, then Sub-Unit
    // (if that department has any), plus free-text search.
    const [assigneeDeptFilter, setAssigneeDeptFilter] = useState<number>(0);
    const [assigneeUnitFilter, setAssigneeUnitFilter] = useState<number>(0);
    const [assigneeUnits, setAssigneeUnits] = useState<{id: number; name: string}[]>([]);
    const [assigneeSearch, setAssigneeSearch] = useState("");
    const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
    const [selectedStatusId, setSelectedStatusId] = useState<number>(0);
    // NEW — "Recommended To" is its own selection, entirely separate from
    // Assignees, so picking who to recommend the letter to never removes the
    // person the letter is actually assigned to.
    const [selectedRecommendedToId, setSelectedRecommendedToId] = useState<number>(0);
    const [originalRecommendedToId, setOriginalRecommendedToId] = useState<number>(0);
    // NEW — Department/Sub-Unit filter for the "Recommended To" picker, same
    // pattern as the Assignees filter above, so long user lists can be
    // narrowed down by department first.
    const [recommendedDeptFilter, setRecommendedDeptFilter] = useState<number>(0);
    const [recommendedUnitFilter, setRecommendedUnitFilter] = useState<number>(0);
    const [recommendedUnits, setRecommendedUnits] = useState<{id: number; name: string}[]>([]);
    // NEW — "Send to Recommendation" is now a standalone checkbox, independent
    // of whatever status is selected. Previously this was driven by checking
    // whether the Status dropdown happened to say "Recommendation", which
    // forced people to change the status just to recommend a letter.
    const [sendToRecommendation, setSendToRecommendation] = useState(false);
    const [originalSendToRecommendation, setOriginalSendToRecommendation] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<LeftTab>('remarks');
    const [remarks, setRemarks] = useState<Remark[]>([]);
    const [remarksLoading, setRemarksLoading] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isEditingDepts, setIsEditingDepts] = useState(false);
    const [isEditingAssignees, setIsEditingAssignees] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<AttachmentItem | null>(null);
    const [completionFileName, setCompletionFileName] = useState("");
   const selectedStatusObj = allStatuses.find(s => s.id === selectedStatusId);
const isFileNameRequiredNow = !!selectedStatusObj?.requires_file_name;   // CHANGED — generalized
const [chequeDeposited, setChequeDeposited] = useState(false);
const [chequeDepositDate, setChequeDepositDate] = useState("");
const [chequeAccountNo, setChequeAccountNo] = useState("");
const [chequeBank, setChequeBank] = useState("");
const [chequeBranch, setChequeBranch] = useState("");
const [isEditingCheque, setIsEditingCheque] = useState(false);
const [isSavingCheque, setIsSavingCheque] = useState(false);
const [departmentAccounts, setDepartmentAccounts] = useState([]);

    // NEW — remark edit/delete audit log state
    const [remarkHistory, setRemarkHistory] = useState<RemarkHistoryEntry[]>([]);
    const [remarkHistoryLoading, setRemarkHistoryLoading] = useState(false);

    // ── Remark edit/delete state ────────────────────────────────────────────
    const [editingRemark, setEditingRemark] = useState<Remark | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editReason, setEditReason] = useState("");
    const [isUpdatingRemark, setIsUpdatingRemark] = useState(false);

    const [deletingRemark, setDeletingRemark] = useState<Remark | null>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [isDeletingRemark, setIsDeletingRemark] = useState(false);

    // Baseline ("last saved") state used to detect unsaved changes
    const [originalDeptIds, setOriginalDeptIds] = useState<number[]>([]);
    const [originalAssigneeIds, setOriginalAssigneeIds] = useState<number[]>([]);
    const [originalStatusId, setOriginalStatusId] = useState<number>(0);

    const isDirty =
        selectedStatusId !== originalStatusId ||
        !arraysEqual(selectedDeptIds, originalDeptIds) ||
        !arraysEqual(selectedAssigneeIds, originalAssigneeIds) ||
        selectedRecommendedToId !== originalRecommendedToId ||   // NEW
        sendToRecommendation !== originalSendToRecommendation;   // NEW

    const isDirtyRef = useRef(isDirty);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

    // Custom "unsaved changes" popup dialog state.
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const pendingActionRef = useRef<(() => void) | null>(null);

    // NEW — fetch this department's sub-units whenever the assignee dept filter changes
    useEffect(() => {
        setAssigneeUnitFilter(0);
        if (!assigneeDeptFilter) { setAssigneeUnits([]); return; }
        api.get(`/v1/department/${assigneeDeptFilter}/units`)
            .then(r => setAssigneeUnits(r.data.data || []))
            .catch(() => setAssigneeUnits([]));
    }, [assigneeDeptFilter]);

    // NEW — fetch this department's sub-units whenever the "Recommended To"
    // dept filter changes, mirroring the assignee filter behaviour above.
    useEffect(() => {
        setRecommendedUnitFilter(0);
        if (!recommendedDeptFilter) { setRecommendedUnits([]); return; }
        api.get(`/v1/department/${recommendedDeptFilter}/units`)
            .then(r => setRecommendedUnits(r.data.data || []))
            .catch(() => setRecommendedUnits([]));
    }, [recommendedDeptFilter]);

    const filteredAssignees = allAssignees.filter(a =>
        (!assigneeDeptFilter || a.department_id === assigneeDeptFilter) &&
        (!assigneeUnitFilter || a.department_unit_id === assigneeUnitFilter) &&
        (!assigneeSearch.trim() || a.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
    );

    // NEW — same department/sub-unit narrowing, applied to the
    // "Recommended To" user picker instead of the Assignees picker.
    const filteredRecommendedToAssignees = allAssignees.filter(a =>
        (!recommendedDeptFilter || a.department_id === recommendedDeptFilter) &&
        (!recommendedUnitFilter || a.department_unit_id === recommendedUnitFilter)
    );

    const requestNavigation = (action: () => void) => {
        if (isDirtyRef.current) {
            pendingActionRef.current = action;
            setShowUnsavedDialog(true);
        } else {
            action();
        }
    };

    const confirmLeave = () => {
        setShowUnsavedDialog(false);
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        if (action) action();
    };

    const cancelLeave = () => {
        setShowUnsavedDialog(false);
        pendingActionRef.current = null;
    };

    // ── Fetch letter ──────────────────────────────────────────────────────────

    const fetchLetter = useCallback(async () => {
        try {
            setIsLoading(true);
            const [letterRes, deptRes, statusRes, assigneeRes, deptAccountsRes] = await Promise.all([
                api.get(`/v1/letter/${id}`),
                api.get('/v1/department/list'),
                api.get('/v1/status/list'),
                api.get('/v1/system_user/names'),
                 api.get('/v1/system_user/department-accounts'),  
            ]);
            const data: LetterDetail = letterRes.data.data;
            setLetter(data);

            const deptIds = (data.departments || []).map(d => d.id);
            const assigneeIds = (data.assignees || []).map(a => a.id);

            setSelectedDeptIds(deptIds);
            setSelectedAssigneeIds(assigneeIds);
            setSelectedStatusId(data.status_id);

            setOriginalDeptIds(deptIds);
            setOriginalAssigneeIds(assigneeIds);
            setOriginalStatusId(data.status_id);
            setChequeDeposited(!!data.cheque_deposited);
            setChequeDepositDate(data.cheque_deposit_date ? data.cheque_deposit_date.slice(0, 10) : "");
            setChequeAccountNo(data.cheque_account_no || "");
            setChequeBank(data.cheque_bank || "");
            setChequeBranch(data.cheque_branch || "");
            setCompletionFileName(data.completion_file_name || "");   // NEW — keep the input in sync with saved value
            setSelectedRecommendedToId(data.recommended_to?.id || 0);   // NEW
            setOriginalRecommendedToId(data.recommended_to?.id || 0);   // NEW
            setSendToRecommendation(!!data.recommended_to);   // NEW
            setOriginalSendToRecommendation(!!data.recommended_to);   // NEW

            if (deptRes.data.success) setAllDepartments(deptRes.data.data);
            if (statusRes.data.success) setAllStatuses(statusRes.data.data);
            if (assigneeRes.data.success) setAllAssignees(assigneeRes.data.data);
            if (deptAccountsRes.data.success) setDepartmentAccounts(deptAccountsRes.data.data); 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load letter');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchLetter(); }, [fetchLetter]);

    // ── Fetch remarks ─────────────────────────────────────────────────────────

    const fetchRemarks = useCallback(async () => {
        try {
            setRemarksLoading(true);
            const res = await api.get(`/v1/letter/${id}/remarks`);
            setRemarks(res.data.data || []);
        } catch {
            toast.error('Failed to load remarks');
        } finally {
            setRemarksLoading(false);
        }
    }, [id]);

    const handleSaveCheque = async () => {
    try {
        setIsSavingCheque(true);
        await api.put(`/v1/letter/${id}/cheque`, {
            deposited: chequeDeposited,
            deposit_date: chequeDeposited && chequeDepositDate ? new Date(chequeDepositDate).toISOString() : null,
            account_no: chequeDeposited ? chequeAccountNo : null,
            bank: chequeDeposited ? chequeBank : null,
            branch: chequeDeposited ? chequeBranch : null,
        });
        toast.success("Cheque details saved");
        setIsEditingCheque(false);   // NEW — collapse back to read-only view after saving
        fetchLetter();
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to save cheque details');
    } finally {
        setIsSavingCheque(false);
    }
    };

    // ── Fetch letter history ────────────────────────────────────────────────

    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await api.get(`/v1/letter/${id}/history`);
            setHistory(res.data.data || []);
        } catch {
            toast.error('Failed to load history');
        } finally {
            setHistoryLoading(false);
        }
    }, [id]);

    // ── Fetch remark edit/delete log — NEW ──────────────────────────────────

    const fetchRemarkHistory = useCallback(async () => {
        try {
            setRemarkHistoryLoading(true);
            const res = await api.get(`/v1/letter/${id}/remarks/history`);
            setRemarkHistory(res.data.data || []);
        } catch {
            toast.error('Failed to load remark log');
        } finally {
            setRemarkHistoryLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'remarks') fetchRemarks();
        else if (activeTab === 'history') fetchHistory();
        else if (activeTab === 'remarkLog') fetchRemarkHistory();
    }, [activeTab, fetchRemarks, fetchHistory, fetchRemarkHistory]);

    // ── Warn on browser tab close / refresh while there are unsaved changes ────

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ── Warn on browser Back/Forward navigation while there are unsaved changes ─

    useEffect(() => {
        window.history.pushState(null, '', window.location.href);

        const handlePopState = () => {
            if (isDirtyRef.current) {
                window.history.pushState(null, '', window.location.href);
                requestNavigation(() => router.push('/letters'));
            } else {
                router.push('/letters');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // ── Save assignment ───────────────────────────────────────────────────────

    const handleSave = async () => {
    if (isFileNameRequiredNow && !completionFileName.trim()) {   // CHANGED
        toast.error(`File Name is required when setting status to "${selectedStatusObj?.name}"`);
        return;
    }
    if (sendToRecommendation && !selectedRecommendedToId) {   // CHANGED — now driven by the checkbox, not the status
        toast.error('Please select who this should be recommended to before saving.');
        return;
    }
    try {
        setIsSaving(true);
        await api.put(`/v1/letter/assignment/${id}`, {
            status_id: selectedStatusId,
            department_ids: selectedDeptIds,
            assignee_ids: selectedAssigneeIds,
            file_name: isFileNameRequiredNow ? completionFileName.trim() : undefined,   // CHANGED
            recommended_to_id: sendToRecommendation ? selectedRecommendedToId : null,   // CHANGED — explicit null clears it when unchecked
        });
        toast.success("Letter updated successfully");
        setOriginalStatusId(selectedStatusId);
        setOriginalDeptIds(selectedDeptIds);
        setOriginalAssigneeIds(selectedAssigneeIds);
        setOriginalRecommendedToId(selectedRecommendedToId);   // NEW
        setOriginalSendToRecommendation(sendToRecommendation);   // NEW
        fetchLetter();
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to save changes');
    } finally {
        setIsSaving(false);
    }
};
    // Used by "Save Changes and Go Back" in the unsaved-changes dialog.
    // Saves the pending assignment changes first, then runs the queued navigation.
    const handleSaveAndProceed = async () => {
        if (sendToRecommendation && !selectedRecommendedToId) {   // CHANGED
            toast.error('Please select who this should be recommended to before saving.');
            return;
        }
        try {
            setIsSaving(true);
            await api.put(`/v1/letter/assignment/${id}`, {
                status_id: selectedStatusId,
                department_ids: selectedDeptIds,
                assignee_ids: selectedAssigneeIds,
                file_name: isFileNameRequiredNow ? completionFileName.trim() : undefined,   // NEW
                recommended_to_id: sendToRecommendation ? selectedRecommendedToId : null,   // CHANGED
            });
            toast.success("Letter updated successfully");

            setOriginalStatusId(selectedStatusId);
            setOriginalDeptIds(selectedDeptIds);
            setOriginalAssigneeIds(selectedAssigneeIds);
            setOriginalRecommendedToId(selectedRecommendedToId);   // NEW
            setOriginalSendToRecommendation(sendToRecommendation);   // NEW

            setShowUnsavedDialog(false);
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            fetchLetter();
            if (action) action();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDept = (deptId: number) =>
        setSelectedDeptIds(prev => prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]);

    const toggleAssignee = (assigneeId: number) =>
        setSelectedAssigneeIds(prev => prev.includes(assigneeId) ? prev.filter(a => a !== assigneeId) : [...prev, assigneeId]);

    const handleBackToLetters = () => {
        requestNavigation(() => router.push('/letters'));
    };

    // ── Remark edit handlers ────────────────────────────────────────────────

    const openEditRemark = (remark: Remark) => {
        setEditingRemark(remark);
        setEditContent(remark.content);
        setEditReason("");
    };

    const closeEditRemark = () => {
        if (isUpdatingRemark) return;
        setEditingRemark(null);
        setEditContent("");
        setEditReason("");
    };

    const handleUpdateRemark = async () => {
        if (!editingRemark) return;
        if (!editContent.trim()) {
            toast.error("Remark content cannot be empty");
            return;
        }
        if (!editReason.trim()) {
            toast.error("Please provide a reason for the change");
            return;
        }
        try {
            setIsUpdatingRemark(true);
            await api.put(`/v1/letter/remark/${editingRemark.id}`, {
                content: editContent.trim(),
                reason: editReason.trim(),
            });
            toast.success("Remark updated successfully");
            setEditingRemark(null);
            setEditContent("");
            setEditReason("");
            fetchRemarks();
            // Keep the remark log fresh too, in case the user checks it next
            if (activeTab === 'remarkLog') fetchRemarkHistory();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update remark");
        } finally {
            setIsUpdatingRemark(false);
        }
    };

    // ── Remark delete handlers ──────────────────────────────────────────────

    const openDeleteRemark = (remark: Remark) => {
        setDeletingRemark(remark);
        setDeleteReason("");
    };

    const closeDeleteRemark = () => {
        if (isDeletingRemark) return;
        setDeletingRemark(null);
        setDeleteReason("");
    };

    const handleDeleteRemark = async () => {
        if (!deletingRemark) return;
        if (!deleteReason.trim()) {
            toast.error("Please provide a reason for deleting this remark");
            return;
        }
        try {
            setIsDeletingRemark(true);
            await api.delete(`/v1/letter/remark/${deletingRemark.id}`, {
                data: { reason: deleteReason.trim() },
            });
            toast.success("Remark deleted successfully");
            setDeletingRemark(null);
            setDeleteReason("");
            fetchRemarks();
            if (activeTab === 'remarkLog') fetchRemarkHistory();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete remark");
        } finally {
            setIsDeletingRemark(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"/>
                    <p className="text-sm text-muted-foreground">Loading letter...</p>
                </div>
            </div>
        );
    }

    if (!letter) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-muted-foreground">Letter not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Unsaved changes confirmation popup */}
            <Dialog open={showUnsavedDialog} onOpenChange={(open) => { if (!open) cancelLeave(); }}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
                            </div>
                            <DialogTitle>Unsaved changes</DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            You have unsaved changes. If you leave this page without clicking
                            {' '}<span className="font-medium text-foreground">&ldquo;Save Changes&rdquo;</span>,
                            your changes will not be saved.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                            onClick={handleSaveAndProceed}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4"/>Save Changes and Go Back</>
                            )}
                        </Button>
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1" onClick={cancelLeave} disabled={isSaving}>
                                Stay on this page
                            </Button>
                            <Button variant="destructive" className="flex-1" onClick={confirmLeave} disabled={isSaving}>
                                Leave without saving
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attachment preview modal */}
            <AttachmentPreviewDialog
                attachment={previewAttachment}
                onCloseAction={() => setPreviewAttachment(null)}
            />

            {/* Edit Remark dialog */}
            <Dialog open={!!editingRemark} onOpenChange={(open) => { if (!open) closeEditRemark(); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Edit Remark</DialogTitle>
                        <DialogDescription>
                            Editing a remark keeps a record of the change. Please explain why you&apos;re editing it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Remark</label>
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={4}
                                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                disabled={isUpdatingRemark}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason for change</label>
                            <textarea
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                rows={2}
                                placeholder="e.g. Corrected a typo in the department name"
                                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                disabled={isUpdatingRemark}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditRemark} disabled={isUpdatingRemark}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateRemark} disabled={isUpdatingRemark}>
                            {isUpdatingRemark ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Remark dialog */}
            <Dialog open={!!deletingRemark} onOpenChange={(open) => { if (!open) closeDeleteRemark(); }}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400"/>
                            </div>
                            <DialogTitle>Delete Remark</DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            This will remove the remark from the list. This action keeps a record in the
                            remark log and cannot be undone. Please provide a reason.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {deletingRemark && (
                            <div className="rounded-md border bg-muted/30 p-3">
                                <p className="text-sm whitespace-pre-wrap line-clamp-3">{deletingRemark.content}</p>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason for deletion</label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                rows={2}
                                placeholder="e.g. Duplicate remark, added by mistake"
                                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                disabled={isDeletingRemark}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDeleteRemark} disabled={isDeletingRemark}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteRemark} disabled={isDeletingRemark}>
                            {isDeletingRemark ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</>
                            ) : (
                                <><Trash2 className="mr-2 h-4 w-4"/>Delete Remark</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Letter View</h1>
                    <p className="text-muted-foreground text-sm">
                        Review letter details, track history, and forward correspondence to the appropriate department or personnel for further action
                    </p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {hasPermission('letter.update') && (
                            <DropdownMenuItem onClick={() => requestNavigation(() => setShowEditModal(true))}>
                                <Pencil className="mr-2 h-4 w-4"/>Edit Letter Details
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleBackToLetters}>
                            <ArrowLeft className="mr-2 h-4 w-4"/>Back to Letters
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* ── Left panel ───────────────────────────────────────────── */}
                <div className="space-y-4">
                    {/* Letter details */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                <div>
                                    <p className="text-sm text-muted-foreground">Code</p>
                                    <p className="font-semibold mt-0.5">{letter.code}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Sender's Address</p>
                                    <p className="font-semibold mt-0.5">{letter.sender || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Subject / Content</p>
                                    <p className="font-semibold mt-0.5">{letter.subject}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Sender / Organization</p>
                                    <p className="font-semibold mt-0.5">{letter.organization?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Source</p>
                                    <p className="font-semibold mt-0.5">{letter.source?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-semibold mt-0.5">{letter.email || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Received Date</p>
                                    <p className="font-semibold mt-0.5">{formatDate(letter.received_datetime)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Telephone</p>
                                    <p className="font-semibold mt-0.5">{letter.telephone || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">System Date</p>
                                    <p className="font-semibold mt-0.5">{formatDate(letter.create_datetime)}</p>
                                </div>
                                {letter.sender_subject_no && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Sender's Subject No</p>
                                        <p className="font-semibold mt-0.5">{letter.sender_subject_no}</p>
                                    </div>
                                )}
                                {letter.registered_post_no && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Registered Postal Number</p>
                                        <p className="font-semibold mt-0.5">{letter.registered_post_no}</p>
                                    </div>
                                )}
                                {letter.other && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground">Cheque No / Money Order No</p>
                                        <p className="font-semibold mt-0.5">{letter.other}</p>
                                    </div>
                                )}
                                {/* NEW — completion file name, shown whenever a status that required
                                    a file name was saved with one attached. Kept visible regardless
                                    of which status is currently selected, so the historical record
                                    of "what file this was completed/filed under" is never hidden. */}
                                {letter.completion_file_name && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground">File Name</p>
                                        <p className="font-semibold mt-0.5">{letter.completion_file_name}</p>
                                    </div>
                                )}
                              {letter.other && (
                                            <>
                                                <Separator className="my-5"/>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="cheque-deposited"
                                                                checked={chequeDeposited}
                                                                onCheckedChange={(checked) => setChequeDeposited(!!checked)}
                                                                // FIXED — previously this was disabled whenever `isEditingCheque`
                                                                // was false, but the "Edit" button that turns `isEditingCheque`
                                                                // on only renders once `letter.cheque_deposited` is already true
                                                                // (see the button just below). On a brand new letter that had
                                                                // never been saved, that meant the checkbox could never be
                                                                // clicked at all. Now it's only locked once a deposit has
                                                                // already been saved and the user isn't actively editing it.
                                                                // CHANGED — this now checks the exact same permission code
                                                                // ('letter.cheque_update') that was created via Manage
                                                                // Permissions. It previously checked 'letter.update_cheque'
                                                                // (words swapped), which never matched any real permission
                                                                // code, so this control was permanently disabled for everyone.
                                                                disabled={!hasPermission('letter.cheque_update') || (letter.cheque_deposited && !isEditingCheque)}
                                                            />
                                                            <label htmlFor="cheque-deposited" className="text-sm font-medium cursor-pointer">
                                                                Cheque Deposited
                                                            </label>
                                                        </div>
                                                        {hasPermission('letter.cheque_update') && letter.cheque_deposited && !isEditingCheque && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => setIsEditingCheque(true)}
                                                            >
                                                                <Pencil className="mr-1 h-3 w-3"/>Edit
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Editable form — shown when not yet saved, or when Edit was clicked */}
                                                    {(isEditingCheque || !letter.cheque_deposited) && chequeDeposited && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                                            <div>
                                                                <label className="text-xs text-muted-foreground">Deposit Date</label>
                                                                <input type="date" value={chequeDepositDate}
                                                                    onChange={(e) => setChequeDepositDate(e.target.value)}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm"/>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-muted-foreground">Account No</label>
                                                                <input type="text" value={chequeAccountNo}
                                                                    onChange={(e) => setChequeAccountNo(e.target.value)}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm"/>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-muted-foreground">Bank</label>
                                                                <input type="text" value={chequeBank}
                                                                    onChange={(e) => setChequeBank(e.target.value)}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm"/>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-muted-foreground">Branch</label>
                                                                <input type="text" value={chequeBranch}
                                                                    onChange={(e) => setChequeBranch(e.target.value)}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm"/>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Save / Cancel — only while actively editing (first-time entry or Edit clicked) */}
                                                    {hasPermission('letter.cheque_update') && (isEditingCheque || !letter.cheque_deposited) && (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={handleSaveCheque} disabled={isSavingCheque}>
                                                                {isSavingCheque ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : "Save Cheque Details"}
                                                            </Button>
                                                            {isEditingCheque && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        // revert unsaved edits back to the last saved values
                                                                        setChequeDeposited(!!letter.cheque_deposited);
                                                                        setChequeDepositDate(letter.cheque_deposit_date ? letter.cheque_deposit_date.slice(0, 10) : "");
                                                                        setChequeAccountNo(letter.cheque_account_no || "");
                                                                        setChequeBank(letter.cheque_bank || "");
                                                                        setChequeBranch(letter.cheque_branch || "");
                                                                        setIsEditingCheque(false);
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Read-only summary — shown whenever saved data exists and we're not editing */}
                                                    {letter.cheque_deposited && !isEditingCheque && (
                                                        <div className="border rounded-md p-3 space-y-1 bg-muted/20">
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Saved deposit details</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                                <p><span className="text-muted-foreground">Deposit Date:</span> {letter.cheque_deposit_date ? formatDate(letter.cheque_deposit_date) : "—"}</p>
                                                                <p><span className="text-muted-foreground">Account No:</span> {letter.cheque_account_no || "—"}</p>
                                                                <p><span className="text-muted-foreground">Bank:</span> {letter.cheque_bank || "—"}</p>
                                                                <p><span className="text-muted-foreground">Branch:</span> {letter.cheque_branch || "—"}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                            </div>        

                            {/* Attachments — preview + download, no page navigation */}
                            {letter.attachments && letter.attachments.length > 0 && (
                                <>
                                    <Separator className="my-5"/>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                            <Paperclip className="h-3.5 w-3.5"/>Attachments
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {letter.attachments.map(att => (
                                                <AttachmentChip
                                                    key={att.id}
                                                    att={att}
                                                    onPreview={setPreviewAttachment}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Remarks / Letter History / Remark Log tabs */}
                    <Card>
                        <CardHeader className="pb-0 pt-5 px-5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
                                    <button
                                        onClick={() => setActiveTab('remarks')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'remarks'
                                                ? 'bg-background shadow-sm text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Remarks
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'history'
                                                ? 'bg-background shadow-sm text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Letter History
                                    </button>
                                    {/* NEW — Remark Log tab */}
                                    <button
                                        onClick={() => setActiveTab('remarkLog')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'remarkLog'
                                                ? 'bg-background shadow-sm text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Remark Log
                                    </button>
                                </div>
                                {activeTab === 'remarks' && (
                                    <InsertRemarkModal letter_id={id} onSuccess={fetchRemarks}/>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 px-5 pb-5">
                            {activeTab === 'remarks' && (
                                remarksLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : remarks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <p className="text-sm text-muted-foreground">No remarks yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {remarks.map(remark => (
                                            <div key={remark.id} className="border rounded-lg p-4 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground">
                                                            {remark.created_by || "Unknown"}
                                                        </span>
                                                        {remark.department && (
                                                            <span>{remark.department}</span>
                                                        )}
                                                        {remark.assignee && (
                                                            <span>| {remark.assignee}</span>
                                                        )}
                                                        {remark.status && (
                                                            <span>| {remark.status}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDateTime(remark.create_datetime)}
                                                        </span>
                                                        {hasPermission('remark.update') && (
                                                            <button
                                                                onClick={() => openEditRemark(remark)}
                                                                className="text-muted-foreground hover:text-foreground"
                                                                title="Edit remark"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5"/>
                                                            </button>
                                                        )}
                                                        {hasPermission('remark.delete') && (
                                                            <button
                                                                onClick={() => openDeleteRemark(remark)}
                                                                className="text-muted-foreground hover:text-destructive"
                                                                title="Delete remark"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5"/>
                                                            </button>
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
                                    </div>
                                )
                            )}

                            {activeTab === 'history' && (
                                historyLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <p className="text-sm text-muted-foreground">No history available</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-6 space-y-0">
                                        <div className="absolute left-2 top-2 bottom-2 w-px bg-border"/>

                                        {history.map((entry) => (
                                            <div key={entry.id} className="relative pb-6 last:pb-0">
                                                <div className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background ring-1 ring-border"/>

                                                <div className="pl-4">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {formatDateTime(entry.create_datetime)}
                                                    </p>
                                                    <p className="text-sm font-medium">{entry.description}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        by {entry.username}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* NEW — Remark Log content: who edited/deleted what remark, and why */}
                            {activeTab === 'remarkLog' && (
                                remarkHistoryLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : remarkHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                                        <HistoryIcon className="h-8 w-8 text-muted-foreground/50"/>
                                        <p className="text-sm text-muted-foreground">No remark edits or deletions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {remarkHistory.map((entry) => (
                                            <div key={entry.id} className="border rounded-lg p-4 space-y-2.5">
                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionClassName(entry.action)}`}>
                                                            {getActionLabel(entry.action)}
                                                        </span>
                                                        <span className="text-sm font-medium">{entry.changed_by}</span>
                                                        {entry.changed_by_email && (
                                                            <span className="text-xs text-muted-foreground">
                                                                ({entry.changed_by_email})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatDateTime(entry.create_datetime)}
                                                    </span>
                                                </div>

                                                {entry.action === 'edit' ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Before</p>
                                                            <div className="rounded-md border bg-red-50/50 dark:bg-red-950/20 p-2.5">
                                                                <p className="text-sm whitespace-pre-wrap text-muted-foreground line-through decoration-red-400/60">
                                                                    {entry.content_before || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">After</p>
                                                            <div className="rounded-md border bg-green-50/50 dark:bg-green-950/20 p-2.5">
                                                                <p className="text-sm whitespace-pre-wrap">
                                                                    {entry.content_after || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Deleted remark</p>
                                                        <div className="rounded-md border bg-muted/30 p-2.5">
                                                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                                                {entry.content_before || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Reason</p>
                                                    <p className="text-sm">{entry.reason}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right panel ───────────────────────────────────────────── */}
                <div className="space-y-4">
                    <Card>
                        <CardContent className="pt-6 space-y-5">
                            {/* Status */}
<div className="space-y-2">
    <p className="text-sm font-medium">Status</p>
    <Select
    value={selectedStatusId ? selectedStatusId.toString() : ""}
    onValueChange={(v) => setSelectedStatusId(parseInt(v) || 0)}
    disabled={!hasPermission('letter.change_status')}   // CHANGED
>
        <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Status"/>
        </SelectTrigger>
        <SelectContent>
            {allStatuses
                .filter(s =>
                    !allowedStatusIds?.length ||               // no restriction set → show all
                    allowedStatusIds.includes(s.id) ||          // status this role is allowed to set
                    s.id === selectedStatusId                   // always show the letter's current status, even if not settable
                )
                .map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
        </SelectContent>
    </Select>
    {isFileNameRequiredNow && (
    <div className="space-y-1 pt-1">
        <label className="text-xs font-medium text-muted-foreground">
            File Name <span className="text-destructive">*</span>
        </label>
        <input
            type="text"
            value={completionFileName}
            onChange={(e) => setCompletionFileName(e.target.value)}
            placeholder={`Enter the file name for status "${selectedStatusObj?.name}"`}
            className="w-full rounded-md border px-3 py-2 text-sm"
        />
    </div>
)}
                {letter.status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(letter.status.name)}`}>
                    Current: {letter.status.name}
                </span>
            )}
            {typeof letter.status_days === 'number' && (
                <p className="text-xs text-muted-foreground">
                    {letter.status_days} day{letter.status_days !== 1 ? 's' : ''} in this status
                </p>
            )}
            {/* NEW — surface the file name that was recorded for this status,
                so anyone viewing the letter can see it without opening edit mode */}
            {letter.completion_file_name && (
                <p className="text-xs text-muted-foreground">
                    File Name: <span className="font-medium text-foreground">{letter.completion_file_name}</span>
                </p>
            )}
</div>

                            <Separator/>

                            {/* Departments */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Departments</p>
                                    {hasPermission('letter.change_department') && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setIsEditingDepts(prev => !prev)}
                                        >
                                            {isEditingDepts ? 'Done' : 'Edit'}
                                        </Button>
                                    )}
                                </div>
                                {selectedDeptIds.length > 0 ? (
    <div className="flex flex-wrap gap-1">
        {selectedDeptIds.map(accId => {
            const da = departmentAccounts.find(d => d.id === accId);   // CHANGED
            return da ? (
                <Badge key={accId} variant="secondary" className="text-xs gap-1">
                    {da.department_unit_name || da.department_name}
                    {hasPermission('letter.change_department') && isEditingDepts && (
                        <button onClick={() => toggleDept(accId)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3"/>
                        </button>
                    )}
                </Badge>
            ) : null;
        })}
    </div>
) : (
    <p className="text-sm text-muted-foreground">No departments assigned</p>
)}
{isEditingDepts && (
    <div className="border rounded-md p-3 grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
        {departmentAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No department accounts have been created yet</p>
        ) : departmentAccounts.map(da => (
            <div key={da.id} className="flex items-center space-x-2">
                <Checkbox
                    id={`dept-${da.id}`}
                    checked={selectedDeptIds.includes(da.id)}          // CHANGED
                    onCheckedChange={() => toggleDept(da.id)}          // CHANGED
                    disabled={!hasPermission('letter.change_department')}
                />
                <label htmlFor={`dept-${da.id}`} className="text-sm cursor-pointer leading-tight">
                    {da.department_unit_name || da.department_name}
                </label>
            </div>
        ))}
    </div>
)}
                                                                
                            </div>
                            <Separator/>

                            {/* Assignees */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Assignees</p>
                                    {hasPermission('letter.assign') && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setIsEditingAssignees(prev => !prev)}
                                        >
                                            {isEditingAssignees ? 'Done' : 'Edit'}
                                        </Button>
                                    )}
                                </div>
                                {selectedAssigneeIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedAssigneeIds.map(assigneeId => {
                                            const assignee = allAssignees.find(a => a.id === assigneeId);
                                            return assignee ? (
                                                <Badge key={assigneeId} variant="secondary" className="text-xs gap-1">
                                                    {assignee.name}
                                                    {hasPermission('letter.assign') && isEditingAssignees && (
                                                        <button onClick={() => toggleAssignee(assigneeId)} className="ml-0.5 hover:text-destructive">
                                                            <X className="h-3 w-3"/>
                                                        </button>
                                                    )}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No assignees assigned</p>
                                )}
                                {isEditingAssignees && (
                                    <div className="space-y-2 border rounded-md p-3">
                                        {/* NEW — narrow down a long assignee list by Department, then
                                            Sub-Unit (if that department has any), plus free-text search */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <Select
                                                value={assigneeDeptFilter ? assigneeDeptFilter.toString() : "0"}
                                                onValueChange={(v) => setAssigneeDeptFilter(parseInt(v) || 0)}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Filter by department"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">All sectionss</SelectItem>
                                                    {allDepartments.map(d => (
                                                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={assigneeUnitFilter ? assigneeUnitFilter.toString() : "0"}
                                                onValueChange={(v) => setAssigneeUnitFilter(parseInt(v) || 0)}
                                                disabled={!assigneeDeptFilter || assigneeUnits.length === 0}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={assigneeUnits.length === 0 ? "No sub-units" : "Filter by sub-unit"}/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">All sub-units</SelectItem>
                                                    {assigneeUnits.map(u => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search assignees by name..."
                                            value={assigneeSearch}
                                            onChange={(e) => setAssigneeSearch(e.target.value)}
                                            className="w-full rounded-md border px-2 h-8 text-xs"
                                        />
                                        <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
                                            {filteredAssignees.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No assignees match this filter</p>
                                            ) : filteredAssignees.map(a => (
                                                <div key={a.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`assignee-${a.id}`}
                                                        checked={selectedAssigneeIds.includes(a.id)}
                                                        onCheckedChange={() => toggleAssignee(a.id)}
                                                        disabled={!hasPermission('letter.assign')}
                                                    />
                                                    <label htmlFor={`assignee-${a.id}`} className="text-sm cursor-pointer leading-tight">
                                                        {a.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* NEW — Recommended To: entirely separate from Assignees, so
                                choosing who to recommend the letter to never removes or
                                overwrites who it's actually assigned to. Editable only
                                while "Recommendation" is the selected status; the current
                                saved value stays visible afterwards as a record of who it
                                was sent to. */}
                                 <div className="flex items-center space-x-2">
                                 <Checkbox
        id="send-to-recommendation"
        checked={sendToRecommendation}
        onCheckedChange={(checked) => setSendToRecommendation(!!checked)}
        disabled={!hasPermission('letter.recommend')}
    />
    <label htmlFor="send-to-recommendation" className="text-sm font-medium cursor-pointer">
        Send to Recommendation
    </label>
</div>
                            {(sendToRecommendation || letter.recommended_to) && ( 
                                <>
                                    <Separator/>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Recommended To</p>
                                        {sendToRecommendation && hasPermission('letter.recommend') ? (
                                            <div className="space-y-2">
                                                {/* NEW — Department / Sub-Unit filters, same pattern as
                                                    Assignees, so the "who to recommend to" list can be
                                                    narrowed down before picking a system user. */}
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Select
                                                        value={recommendedDeptFilter ? recommendedDeptFilter.toString() : "0"}
                                                        onValueChange={(v) => {
                                                            const deptId = parseInt(v) || 0;
                                                            setRecommendedDeptFilter(deptId);
                                                            // Clear a previously selected user if they no longer
                                                            // match the newly chosen department filter.
                                                            const stillValid = allAssignees.find(a =>
                                                                a.id === selectedRecommendedToId &&
                                                                (!deptId || a.department_id === deptId)
                                                            );
                                                            if (!stillValid) setSelectedRecommendedToId(0);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Filter by department"/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">All sections</SelectItem>
                                                            {allDepartments.map(d => (
                                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={recommendedUnitFilter ? recommendedUnitFilter.toString() : "0"}
                                                        onValueChange={(v) => {
                                                            const unitId = parseInt(v) || 0;
                                                            setRecommendedUnitFilter(unitId);
                                                            const stillValid = allAssignees.find(a =>
                                                                a.id === selectedRecommendedToId &&
                                                                (!unitId || a.department_unit_id === unitId)
                                                            );
                                                            if (!stillValid) setSelectedRecommendedToId(0);
                                                        }}
                                                        disabled={!recommendedDeptFilter || recommendedUnits.length === 0}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={recommendedUnits.length === 0 ? "No sub-units" : "Filter by sub-unit"}/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">All sub-units</SelectItem>
                                                            {recommendedUnits.map(u => (
                                                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Select
                                                    value={selectedRecommendedToId ? selectedRecommendedToId.toString() : ""}
                                                    onValueChange={(v) => setSelectedRecommendedToId(parseInt(v) || 0)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select who to recommend this to"/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filteredRecommendedToAssignees.length === 0 ? (
                                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                No system users match this filter
                                                            </div>
                                                        ) : filteredRecommendedToAssignees.map(a => (
                                                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : letter.recommended_to ? (
                                            <Badge variant="secondary" className="text-xs">
                                                Recommendation: {letter.recommended_to.name}
                                            </Badge>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Not yet selected</p>
                                        )}
                                    </div>
                                </>
                            )}


                            {/* Save */}
                            {(hasPermission('letter.change_status') || hasPermission('letter.change_department') || hasPermission('letter.assign')) && (
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={isSaving || !isDirty}>
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Save className="mr-2 h-4 w-4"/>Save Changes</>}
                                </Button>
                            )}
                            {(hasPermission('letter.change_status') || hasPermission('letter.change_department') || hasPermission('letter.assign')) && isDirty && !isSaving && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 text-center -mt-2">
                                    You have unsaved changes.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {letter && (
                <UpdateLetterModal
                    isOpen={showEditModal}
                    onCloseAction={() => setShowEditModal(false)}
                    letterData={letter}
                    onSuccess={fetchLetter}
                />
            )}
        </div>
    );
}