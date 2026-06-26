'use client';

import {useCallback, useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {toast} from "sonner";
import {ArrowLeft, Loader2, MoreVertical, Paperclip, Save, X} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Separator} from "@/components/ui/separator";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";
import {formatDate} from "@/lib/utils";
import {InsertRemarkModal} from "@/app/(dashboard)/letters/[id]/insert-remark-modal";

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
    received_datetime: string;
    create_datetime: string;
    status: {id: number; name: string} | null;
    status_id: number;
    departments: {id: number; name: string}[];
    assignees: {id: number; name: string}[];
    attachments: {id: number; title: string; url: string}[];
}

interface Remark {
    id: number;
    content: string;
    assignee: string | null;
    department: string | null;
    status: string | null;
    create_datetime: string;
}

interface HistoryEntry {
    id: number;
    description: string;
    username: string;
    email: string;
    create_datetime: string;
    letter_id: number;
}

interface Department {id: number; name: string}
interface Status {id: number; name: string}
interface Assignee {id: number; name: string}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusClassName = (status: string): string => {
    if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
    if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
    if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LetterViewPage() {
    const {id} = useParams<{id: string}>();
    const router = useRouter();
    const {hasPermission} = useAuthStore();

    const [letter, setLetter] = useState<LetterDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allStatuses, setAllStatuses] = useState<Status[]>([]);
    const [allAssignees, setAllAssignees] = useState<Assignee[]>([]);
    const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
    const [selectedStatusId, setSelectedStatusId] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'remarks' | 'history'>('remarks');
    const [remarks, setRemarks] = useState<Remark[]>([]);
    const [remarksLoading, setRemarksLoading] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // ── Fetch letter ──────────────────────────────────────────────────────────

    const fetchLetter = useCallback(async () => {
        try {
            setIsLoading(true);
            const [letterRes, deptRes, statusRes, assigneeRes] = await Promise.all([
                api.get(`/v1/letter/${id}`),
                api.get('/v1/department/list'),
                api.get('/v1/status/list'),
                api.get('/v1/system_user/names'),
            ]);
            const data: LetterDetail = letterRes.data.data;
            setLetter(data);
            setSelectedDeptIds((data.departments || []).map(d => d.id));
            setSelectedAssigneeIds((data.assignees || []).map(a => a.id));
            setSelectedStatusId(data.status_id);
            if (deptRes.data.success) setAllDepartments(deptRes.data.data);
            if (statusRes.data.success) setAllStatuses(statusRes.data.data);
            if (assigneeRes.data.success) setAllAssignees(assigneeRes.data.data);
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

    // ── Fetch history ─────────────────────────────────────────────────────────

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

    useEffect(() => {
        if (activeTab === 'remarks') fetchRemarks();
        else fetchHistory();
    }, [activeTab, fetchRemarks, fetchHistory]);

    // ── Save assignment ───────────────────────────────────────────────────────

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await api.put(`/v1/letter/assignment/${id}`, {
                
                status_id: selectedStatusId,
                department_ids: selectedDeptIds,
                assignee_ids: selectedAssigneeIds,
            });
            toast.success("Letter updated successfully");
            fetchLetter();
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
                        <DropdownMenuItem onClick={() => router.push('/letters')}>
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
                                {letter.other && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground">Cheque No / Money Order No</p>
                                        <p className="font-semibold mt-0.5">{letter.other}</p>
                                    </div>
                                )}
                            </div>

                            {/* Attachments */}
                            {letter.attachments && letter.attachments.length > 0 && (
                                <>
                                    <Separator className="my-5"/>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                            <Paperclip className="h-3.5 w-3.5"/>Attachments
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {letter.attachments.map(att => (
                                                <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors">
                                                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground"/>
                                                    {att.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Remarks / History tabs */}
                    <Card>
                        <CardHeader className="pb-0 pt-5 px-5">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
                                    <button
                                        onClick={() => setActiveTab('remarks')}
                                        className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'remarks'
                                                ? 'bg-background shadow-sm text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Remarks
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                            activeTab === 'history'
                                                ? 'bg-background shadow-sm text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        History
                                    </button>
                                </div>
                                {activeTab === 'remarks' && (
                                    <InsertRemarkModal letter_id={id} onSuccess={fetchRemarks}/>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 px-5 pb-5">
                            {activeTab === 'remarks' ? (
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
                                                        {/* <span className="font-medium text-foreground">
                                                            ID: {remark.id}
                                                        </span> */}
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
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatDate(remark.create_datetime)}
                                                    </span>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap">{remark.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
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
                                        {/* Timeline line */}
                                        <div className="absolute left-2 top-2 bottom-2 w-px bg-border"/>

                                        {history.map((entry) => (
                                            <div key={entry.id} className="relative pb-6 last:pb-0">
                                                {/* Timeline dot */}
                                                <div className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background ring-1 ring-border"/>

                                                <div className="pl-4">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {formatDate(entry.create_datetime)}
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
                                    disabled={!hasPermission('letter.update')}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Status"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allStatuses.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {letter.status && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(letter.status.name)}`}>
                                        Current: {letter.status.name}
                                    </span>
                                )}
                            </div>

                            <Separator/>

                            {/* Departments */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Departments</p>
                                {selectedDeptIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {selectedDeptIds.map(deptId => {
                                            const dept = allDepartments.find(d => d.id === deptId);
                                            return dept ? (
                                                <Badge key={deptId} variant="secondary" className="text-xs gap-1">
                                                    {dept.name}
                                                    {hasPermission('letter.update') && (
                                                        <button onClick={() => toggleDept(deptId)} className="ml-0.5 hover:text-destructive">
                                                            <X className="h-3 w-3"/>
                                                        </button>
                                                    )}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                                <div className="border rounded-md p-3 grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
                                    {allDepartments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No departments available</p>
                                    ) : allDepartments.map(dept => (
                                        <div key={dept.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`dept-${dept.id}`}
                                                checked={selectedDeptIds.includes(dept.id)}
                                                onCheckedChange={() => toggleDept(dept.id)}
                                                disabled={!hasPermission('letter.update')}
                                            />
                                            <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer leading-tight">
                                                {dept.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator/>

                            {/* Assignees */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Assignees</p>
                                {selectedAssigneeIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {selectedAssigneeIds.map(assigneeId => {
                                            const assignee = allAssignees.find(a => a.id === assigneeId);
                                            return assignee ? (
                                                <Badge key={assigneeId} variant="secondary" className="text-xs gap-1">
                                                    {assignee.name}
                                                    {hasPermission('letter.update') && (
                                                        <button onClick={() => toggleAssignee(assigneeId)} className="ml-0.5 hover:text-destructive">
                                                            <X className="h-3 w-3"/>
                                                        </button>
                                                    )}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                                <div className="border rounded-md p-3 grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
                                    {allAssignees.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No assignees available</p>
                                    ) : allAssignees.map(a => (
                                        <div key={a.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`assignee-${a.id}`}
                                                checked={selectedAssigneeIds.includes(a.id)}
                                                onCheckedChange={() => toggleAssignee(a.id)}
                                                disabled={!hasPermission('letter.update')}
                                            />
                                            <label htmlFor={`assignee-${a.id}`} className="text-sm cursor-pointer leading-tight">
                                                {a.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Save */}
                            {hasPermission('letter.update') && (
                                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Save className="mr-2 h-4 w-4"/>Save Changes</>}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
