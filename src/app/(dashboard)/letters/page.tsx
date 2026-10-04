'use client';

import {useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronsUpDown,
    CircleAlert,
    Download,
    Eye,
    Filter,
    Loader2,
    MailCheck,
    MailPlus,
    MailSearch,
    Pencil,
    RotateCw,
    Save,
    Settings2,
    Trash2,
    UserX,
    X,
    PenLine, Stamp,
} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {InsertLetterModal} from "@/app/(dashboard)/letters/insert-letter-modal";
import {ExportModal} from "@/app/(dashboard)/letters/export-modal";
import {DeleteLetterAlert} from "@/app/(dashboard)/letters/delete-letter-alert";
import {useDebounce} from "@/hook/debounce";
import {cn, formatDate} from "@/lib/utils";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";

// Interfaces
interface Department {
    id: number;
    name: string;
}

interface Status {
    id: number;
    name: string;
}

interface Assignee {
    id: number;
    name: string;
    department_id?: number | null;
    department_unit_id?: number | null;
}

interface Organization {
    id: number;
    name: string;
}

// matches the backend's AssigneeStatusBrief model
interface AssigneeStatusBrief {
    assignee_name: string;
    status_name: string;
    file_name?: string | null;
}

interface Letter {
    id: number;
    code: string;
    subject: string;
    organization: string;
    department: string;
    department_ids?: number[];
    department_account_ids?: number[];
    assignee: string;
    assignee_ids?: number[];
    status_id?: number;
    create_datetime: string;
    // the letter's actual Received Date (as entered), distinct from
    // create_datetime (when the record was saved in the system)
    received_datetime?: string;
    status: string;
    status_days?: number | null;
    other?: string;
    days_pending?: number | null;
    assignee_statuses?: AssigneeStatusBrief[];
    cheque_deposited?: boolean;
    cheque_deposit_date?: string | null;
    cheque_account_no?: string | null;
    cheque_bank?: string | null;
    cheque_branch?: string | null;
    completion_file_name?: string | null;
    remarks_count?: number;
    initials_by_pending?: {id: number; name: string} | null;
    order_by_role?: {id: number; name: string} | null;
    order_by_action?: {id: number; name: string} | null;
}

interface LetterFilters {
    id: number;
    code: string;
    subject: string;
    department_id: number;
    assignee_id: number;
    status_id: number;
    assignee_status_id: number;
    organization_id: number;
    create_date_start: string | null;
    create_date_end: string | null;
    other: string;
    has_cheque: boolean;
    pending_only: boolean;
    pending_days_min: number | null;
    pending_days_max: number | null;
    is_public_complaint: boolean | null;
    no_section: boolean;     // NEW — only letters with NO section routed yet
    no_assignee: boolean;    // NEW — only letters with NO assignee yet
}

interface ColumnVisibility {
    id: boolean;
    code: boolean;
    title: boolean;
    organization: boolean;
    department: boolean;
    assignee: boolean;
    date: boolean;
    other: boolean;
    chequeStatus: boolean;
    fileName: boolean;
    assigneeStatus: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    total?: number;
    total_pages?: number;
}

interface LetterStat {
    status_id: number;
    count: number;
    status_name: string;
}

// NEW — counts for the "Section Not Selected" / "Assignee Not Selected" cards
interface GapCounts {
    section_not_selected: number;
    assignee_not_selected: number;
}

interface OrderByOptionItem {id: number; name: string; category: 'role' | 'action'}

interface InitialsByCandidate {id: number; name: string; is_default: boolean}

const pageSizeOptions = [5, 10, 20, 50];

const initialFilters: LetterFilters = {
    id: 0,
    code: "",
    subject: "",
    department_id: 0,
    assignee_id: 0,
    status_id: 0,
    assignee_status_id: 0,
    organization_id: 0,
    create_date_start: null,
    create_date_end: null,
    other: "",
    has_cheque: false,
    pending_only: false,
    pending_days_min: null,
    pending_days_max: null,
    is_public_complaint: null,
    no_section: false,     // NEW
    no_assignee: false,    // NEW
};

const initialColumnVisibility: ColumnVisibility = {
    id: true,
    code: true,
    title: true,
    organization: true,
    department: true,
    assignee: true,
    date: true,
    other: false,
    chequeStatus: false,
    fileName: false,
    assigneeStatus: true,
};

// ─── Quick Edit Dialog ──────────────────────────────────────────────────────
interface DepartmentAccount {
    id: number;
    department_id: number;
    department_name: string;
    department_unit_id?: number | null;
    department_unit_name?: string | null;
    email: string;
}

function QuickEditLetterDialog({
    letter,
    departmentAccounts,
    assignees,
    organizations,
    onClose,
    onSaved,
}: {
    letter: Letter | null;
    departmentAccounts: DepartmentAccount[];
    assignees: Assignee[];
    organizations: Organization[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [selectedDeptAccountIds, setSelectedDeptAccountIds] = useState<number[]>([]);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<number>(0);
    const [subjectText, setSubjectText] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const {hasPermission} = useAuthStore();
    const canUpdateDetails = hasPermission('letter.update');
    const canChangeDepartment = hasPermission('letter.change_department');
    const canAssign = hasPermission('letter.assign');
    const canManageInitialsBy = hasPermission('letter.initials_by_manage');
    const [assigneeDeptFilter, setAssigneeDeptFilter] = useState<number>(0);
    const [assigneeUnitFilter, setAssigneeUnitFilter] = useState<number>(0);
    const [assigneeUnits, setAssigneeUnits] = useState<{id: number; name: string}[]>([]);
    const [assigneeSearch, setAssigneeSearch] = useState("");

    const [initialsByCandidates, setInitialsByCandidates] = useState<InitialsByCandidate[]>([]);
    const [selectedPendingCandidateId, setSelectedPendingCandidateId] = useState<number>(0);
    const [isLoadingInitialsBy, setIsLoadingInitialsBy] = useState(false);
    const [isAssigningInitialsBy, setIsAssigningInitialsBy] = useState(false);

    useEffect(() => {
        setAssigneeUnitFilter(0);
        if (!assigneeDeptFilter) { setAssigneeUnits([]); return; }
        api.get(`/v1/department/${assigneeDeptFilter}/units`)
            .then(r => setAssigneeUnits(r.data.data || []))
            .catch(() => setAssigneeUnits([]));
    }, [assigneeDeptFilter]);

    // CHANGED — the assignee list stays EMPTY until a section (and optionally a
    // sub-unit) is chosen in the filter, or a name is typed in the search box.
    const hasAssigneeScope = !!assigneeDeptFilter || !!assigneeSearch.trim();

    const filteredAssignees = !hasAssigneeScope ? [] : assignees.filter(a =>
        (!assigneeDeptFilter || a.department_id === assigneeDeptFilter) &&
        (!assigneeUnitFilter || a.department_unit_id === assigneeUnitFilter) &&
        (!assigneeSearch.trim() || a.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
    );

    useEffect(() => {
        if (letter) {
            setSelectedDeptAccountIds(letter.department_account_ids || []);
            setSelectedAssigneeIds(letter.assignee_ids || []);
            setSubjectText(letter.subject || "");
            const matchedOrg = organizations.find(o => o.name === letter.organization);
            setSelectedOrganizationId(matchedOrg?.id || 0);

            setSelectedPendingCandidateId(letter.initials_by_pending?.id || 0);
            if (canManageInitialsBy) {
                setIsLoadingInitialsBy(true);
                api.get('/v1/system_user/by-permission/letter.initials_by')
                    .then(r => setInitialsByCandidates(r.data.success ? r.data.data : []))
                    .catch(() => setInitialsByCandidates([]))
                    .finally(() => setIsLoadingInitialsBy(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [letter, organizations]);

    const toggleDeptAccount = (id: number) =>
        setSelectedDeptAccountIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

    // CHANGED — ticking an assignee also adds that assignee's own section
    // (the backend does the same, this just keeps the dialog in sync)
    const toggleAssignee = (id: number) => {
        const isAdding = !selectedAssigneeIds.includes(id);
        setSelectedAssigneeIds(prev => isAdding ? [...prev, id] : prev.filter(a => a !== id));
        if (isAdding) {
            const assignee = assignees.find(a => a.id === id);
            if (assignee?.department_id) {
                const match = departmentAccounts.find(da =>
                    da.department_id === assignee.department_id &&
                    (da.department_unit_id ?? null) === (assignee.department_unit_id ?? null));
                if (match && !selectedDeptAccountIds.includes(match.id)) {
                    setSelectedDeptAccountIds(prev => [...prev, match.id]);
                }
            }
        }
    };

    const handleAssignInitialsBy = async () => {
        if (!letter) return;
        try {
            setIsAssigningInitialsBy(true);
            await api.put(`/v1/letter/${letter.id}/initials-by/assign`, {
                initials_by_pending_user_id: selectedPendingCandidateId || null,
            });
            toast.success(selectedPendingCandidateId ? "Initials By request sent" : "Initials By request cancelled");
            onSaved();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send Initials By request");
        } finally {
            setIsAssigningInitialsBy(false);
        }
    };

    const handleSave = async () => {
        if (!letter) return;
        try {
            setIsSaving(true);
            await api.put(`/v1/letter/assignment/${letter.id}`, {
                department_ids: selectedDeptAccountIds,
                assignee_ids: selectedAssigneeIds,
                organization_id: selectedOrganizationId || undefined,
                subject: subjectText,
            });
            toast.success(`Letter ${letter.code} updated`);
            onSaved();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={!!letter} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                    <DialogTitle>Quick Edit — {letter?.code}</DialogTitle>
                    <DialogDescription>
                        Update the organization, subject, departments, or assignees for this letter without leaving the list.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-2 overflow-y-auto flex-1 min-h-0">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Sender/Organization</label>
                        <Select
                            value={selectedOrganizationId ? selectedOrganizationId.toString() : ""}
                            onValueChange={(v) => setSelectedOrganizationId(parseInt(v) || 0)}
                            disabled={!canUpdateDetails}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a Sender/Organization"/>
                            </SelectTrigger>
                            <SelectContent>
                                {organizations.map(o => (
                                    <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Subject/Content of the Letter</label>
                        <Textarea
                            placeholder="Subject/Content of the Letter"
                            value={subjectText}
                            onChange={(e) => setSubjectText(e.target.value)}
                            disabled={!canUpdateDetails}
                            className="w-full min-h-[140px] resize-y"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Sections</label>
                        {selectedDeptAccountIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {selectedDeptAccountIds.map(accId => {
                                    const da = departmentAccounts.find(x => x.id === accId);
                                    return da ? (
                                        <Badge key={accId} variant="secondary" className="text-xs gap-1">
                                            {da.department_unit_name || da.department_name}
                                            {canChangeDepartment && (
                                                <button type="button" onClick={() => toggleDeptAccount(accId)} className="ml-0.5 hover:text-destructive">
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            )}
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                        <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                            {departmentAccounts.length === 0 ? (
                                <p className="text-sm text-muted-foreground col-span-2">No section accounts have been created yet</p>
                            ) : departmentAccounts.map(da => (
                                <div key={da.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`qe-dept-${da.id}`}
                                        checked={selectedDeptAccountIds.includes(da.id)}
                                        onCheckedChange={() => toggleDeptAccount(da.id)}
                                        disabled={!canChangeDepartment}
                                    />
                                    <label htmlFor={`qe-dept-${da.id}`} className="text-sm cursor-pointer">
                                        {da.department_unit_name || da.department_name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Assignees</label>
                        {selectedAssigneeIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {selectedAssigneeIds.map(id => {
                                    const a = assignees.find(x => x.id === id);
                                    return a ? (
                                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                                            {a.name}
                                            {canAssign && (
                                                <button type="button" onClick={() => toggleAssignee(id)} className="ml-0.5 hover:text-destructive">
                                                    <X className="h-3 w-3"/>
                                                </button>
                                            )}
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                        <div className="space-y-2 border rounded-md p-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    value={assigneeDeptFilter ? assigneeDeptFilter.toString() : "0"}
                                    onValueChange={(v) => setAssigneeDeptFilter(parseInt(v) || 0)}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select a section"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Select a section</SelectItem>
                                        {Array.from(
                                            new Map(departmentAccounts.map(da => [da.department_id, da.department_name])).entries()
                                        ).map(([id, name]) => (
                                            <SelectItem key={id} value={id.toString()}>{name}</SelectItem>
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
                            <Input
                                placeholder="Search assignees by name..."
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                {!hasAssigneeScope ? (
                                    <p className="text-sm text-muted-foreground col-span-2">
                                        Select a section (and sub-unit) to see its assignees, or search by name.
                                    </p>
                                ) : filteredAssignees.length === 0 ? (
                                    <p className="text-sm text-muted-foreground col-span-2">No assignees match this filter</p>
                                ) : filteredAssignees.map(a => (
                                    <div key={a.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`qe-assignee-${a.id}`}
                                            checked={selectedAssigneeIds.includes(a.id)}
                                            onCheckedChange={() => toggleAssignee(a.id)}
                                            disabled={!canAssign}
                                        />
                                        <label htmlFor={`qe-assignee-${a.id}`} className="text-sm cursor-pointer">{a.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {canManageInitialsBy && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Initials By — send for confirmation to</label>
                            {isLoadingInitialsBy ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading candidates...
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedPendingCandidateId ? selectedPendingCandidateId.toString() : ""}
                                        onValueChange={(v) => setSelectedPendingCandidateId(parseInt(v) || 0)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select who should confirm this"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialsByCandidates.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name}{c.is_default ? ' (default)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        className="h-9 px-3 text-xs shrink-0"
                                        onClick={handleAssignInitialsBy}
                                        disabled={isAssigningInitialsBy || selectedPendingCandidateId === (letter?.initials_by_pending?.id || 0)}
                                    >
                                        {isAssigningInitialsBy ? <Loader2 className="h-3 w-3 animate-spin"/> : "Send"}
                                    </Button>
                                </div>
                            )}
                            {letter?.initials_by_pending && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Awaiting confirmation from {letter.initials_by_pending.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4"/>Save Changes</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Quick Order By Dialog ──────────────────────────────────────────────────
function QuickOrderByDialog({
    letter,
    onClose,
    onSaved,
}: {
    letter: Letter | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [orderByRoleOptions, setOrderByRoleOptions] = useState<OrderByOptionItem[]>([]);
    const [orderByActionOptions, setOrderByActionOptions] = useState<OrderByOptionItem[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
    const [selectedActionId, setSelectedActionId] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [isAddingRole, setIsAddingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [isSavingRole, setIsSavingRole] = useState(false);
    const [isAddingAction, setIsAddingAction] = useState(false);
    const [newActionName, setNewActionName] = useState("");
    const [isSavingAction, setIsSavingAction] = useState(false);

    useEffect(() => {
        if (!letter) return;
        setSelectedRoleId(letter.order_by_role?.id || 0);
        setSelectedActionId(letter.order_by_action?.id || 0);
        setIsAddingRole(false);
        setNewRoleName("");
        setIsAddingAction(false);
        setNewActionName("");
        setIsLoading(true);
        api.get('/v1/order-by-option/list')
            .then(r => {
                const all: OrderByOptionItem[] = r.data.success ? r.data.data : [];
                setOrderByRoleOptions(all.filter(o => o.category === 'role'));
                setOrderByActionOptions(all.filter(o => o.category === 'action'));
            })
            .catch(() => toast.error('Failed to load Order By options'))
            .finally(() => setIsLoading(false));
    }, [letter]);

    const handleAddRole = async () => {
        if (!newRoleName.trim()) {
            toast.error("Enter a name for the new role");
            return;
        }
        try {
            setIsSavingRole(true);
            const res = await api.post('/v1/order-by-option/quick-add', {name: newRoleName.trim(), category: 'role'});
            const created = res.data.data;
            setOrderByRoleOptions(prev => [...prev, {id: created.id, name: created.name, category: 'role'}]);
            setSelectedRoleId(created.id);
            setNewRoleName("");
            setIsAddingRole(false);
            toast.success("Role added");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add role");
        } finally {
            setIsSavingRole(false);
        }
    };

    const handleAddAction = async () => {
        if (!newActionName.trim()) {
            toast.error("Enter a name for the new action");
            return;
        }
        try {
            setIsSavingAction(true);
            const res = await api.post('/v1/order-by-option/quick-add', {name: newActionName.trim(), category: 'action'});
            const created = res.data.data;
            setOrderByActionOptions(prev => [...prev, {id: created.id, name: created.name, category: 'action'}]);
            setSelectedActionId(created.id);
            setNewActionName("");
            setIsAddingAction(false);
            toast.success("Action added");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add action");
        } finally {
            setIsSavingAction(false);
        }
    };

    const handleSave = async () => {
        if (!letter) return;
        try {
            setIsSaving(true);
            // Only the two Order By fields are sent — with the updated
            // backend, everything else (sections, assignees, ...) is untouched.
            await api.put(`/v1/letter/assignment/${letter.id}`, {
                order_by_role_id: selectedRoleId || null,
                order_by_action_id: selectedActionId || null,
            });
            toast.success(`Order By updated for ${letter.code}`);
            onSaved();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save Order By');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={!!letter} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Order By — {letter?.code}</DialogTitle>
                    <DialogDescription>
                        Set the Role and Action for this letter&apos;s Order By seal, without leaving the list.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Role</label>
                            <Select
                                value={selectedRoleId ? selectedRoleId.toString() : ""}
                                onValueChange={(v) => setSelectedRoleId(parseInt(v) || 0)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role (නි.කො / ස.කො)"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {orderByRoleOptions.map(o => (
                                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {isAddingRole ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="e.g. නි.කො"
                                        className="h-8 text-xs"
                                    />
                                    <Button size="sm" className="h-8 px-2 text-xs" onClick={handleAddRole} disabled={isSavingRole}>
                                        {isSavingRole ? <Loader2 className="h-3 w-3 animate-spin"/> : "Add"}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => { setIsAddingRole(false); setNewRoleName(""); }} disabled={isSavingRole}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAddingRole(true)}>
                                    + Add a missing role
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Action</label>
                            <Select
                                value={selectedActionId ? selectedActionId.toString() : ""}
                                onValueChange={(v) => setSelectedActionId(parseInt(v) || 0)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select action (කරු. ...)"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {orderByActionOptions.map(o => (
                                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {isAddingAction ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={newActionName}
                                        onChange={(e) => setNewActionName(e.target.value)}
                                        placeholder="e.g. කරු. ඉදිරි කටයුතු සඳහා"
                                        className="h-8 text-xs"
                                    />
                                    <Button size="sm" className="h-8 px-2 text-xs" onClick={handleAddAction} disabled={isSavingAction}>
                                        {isSavingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : "Add"}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => { setIsAddingAction(false); setNewActionName(""); }} disabled={isSavingAction}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAddingAction(true)}>
                                    + Add a missing action
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4"/>Save</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function LetterDashboard() {
    const router = useRouter();
    const [showExportModal, setShowExportModal] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [inputFilters, setInputFilters] = useState<LetterFilters>(initialFilters);
    const debouncedFilters = useDebounce(inputFilters, 500);
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(initialColumnVisibility);
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [letterStats, setLetterStats] = useState<LetterStat[]>([]);
    // NEW — counts for the two "not selected" cards
    const [gapCounts, setGapCounts] = useState<GapCounts>({section_not_selected: 0, assignee_not_selected: 0});
    // NEW — only the LATEST request is allowed to update the screen. A filter
    // change also resets the page to 1, which fires a second request; if the
    // older one finished last it used to overwrite the filtered result.
    const requestIdRef = useRef(0);
    const {hasPermission, user} = useAuthStore();

    const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [letterToQuickEdit, setLetterToQuickEdit] = useState<Letter | null>(null);
    const [letterToQuickOrderBy, setLetterToQuickOrderBy] = useState<Letter | null>(null);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkConfirming, setIsBulkConfirming] = useState(false);
    const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
    const [bulkConfirmNotes, setBulkConfirmNotes] = useState("");

    const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
    const [assigneeFilterSearch, setAssigneeFilterSearch] = useState("");

    const [departmentAccounts, setDepartmentAccounts] = useState<DepartmentAccount[]>([]);

    useEffect(() => {
        const fetchDropdownData = async (): Promise<void> => {
            try {
                const [deptResponse, statusResponse, assigneeResponse, orgResponse, deptAccountsResponse] = await Promise.all([
                    api.get('/v1/department/list'),
                    api.get('/v1/status/list'),
                    api.get('/v1/system_user/names'),
                    api.get('/v1/organization/list'),
                    api.get('/v1/system_user/department-accounts'),
                ]);

                const [deptData, statusData, assigneeData, orgData, deptAccountsData] = await Promise.all([
                    deptResponse.data,
                    statusResponse.data,
                    assigneeResponse.data,
                    orgResponse.data,
                    deptAccountsResponse.data,
                ]);

                if (deptData.success) setDepartments(deptData.data);
                if (statusData.success) setStatuses(statusData.data);
                if (assigneeData.success) setAssignees(assigneeData.data);
                if (orgData.success) setOrganizations(orgData.data);
                if (deptAccountsData.success) setDepartmentAccounts(deptAccountsData.data);

            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        fetchDropdownData().catch((err) =>
            console.error("Unhandled error in fetchDropdownData", err)
        );
    }, []);

    const fetchLetterStats = useCallback(async () => {
        const response = await api.get('/v1/letter/stats/');
        return await response.data;
    }, []);

    // NEW — "Section Not Selected" / "Assignee Not Selected" counts.
    // Wrapped so a failure here never blocks the letters list from loading.
    const fetchGapCounts = useCallback(async (): Promise<GapCounts> => {
        try {
            const response = await api.get('/v1/letter/assignment-gaps/');
            return response.data?.data ?? {section_not_selected: 0, assignee_not_selected: 0};
        } catch {
            return {section_not_selected: 0, assignee_not_selected: 0};
        }
    }, []);

    const fetchLettersFromApi = useCallback(
        async (
            page: number,
            pageSize: number,
            filters: Partial<LetterFilters>
        ): Promise<ApiResponse<Letter[]>> => {
            const response = await api.post(
                `/v1/letter/list?page=${page}&page_size=${pageSize}`, filters
            );
            return await response.data;
        }, []);

    const loadLetters = useCallback(async (): Promise<void> => {
        const filters: Partial<LetterFilters> = {
            id: 0,
            code: (debouncedFilters.code || "").trim(),
            subject: (debouncedFilters.subject || "").trim(),
            organization_id: debouncedFilters.organization_id || 0,
            department_id: debouncedFilters.department_id || 0,
            assignee_id: debouncedFilters.assignee_id || 0,
            status_id: debouncedFilters.status_id || 0,
            assignee_status_id: debouncedFilters.assignee_status_id || 0,
            create_date_start: debouncedFilters.create_date_start || null,
            create_date_end: debouncedFilters.create_date_end || null,
            other: debouncedFilters.other || "",
            has_cheque: debouncedFilters.has_cheque || false,
            pending_only: debouncedFilters.pending_only || false,
            pending_days_min: debouncedFilters.pending_days_min ?? null,
            pending_days_max: debouncedFilters.pending_days_max ?? null,
            is_public_complaint: debouncedFilters.is_public_complaint,
            no_section: debouncedFilters.no_section || false,       // NEW
            no_assignee: debouncedFilters.no_assignee || false,     // NEW
        };

        const myRequestId = ++requestIdRef.current;

        try {
            setIsLoading(true);

            const [lettersResponse, statsResponse, gaps] = await Promise.all([
                fetchLettersFromApi(currentPage, pageSize, filters),
                fetchLetterStats(),
                fetchGapCounts(),
            ]);

            // a newer request has started meanwhile — drop this stale answer
            if (myRequestId !== requestIdRef.current) return;

            // CHANGED — NO client-side re-sorting any more. The backend now
            // orders by letter CODE (newest first) across ALL pages, so a
            // newly inserted letter appears exactly at its code's position.
            setLetters(lettersResponse.data || []);
            setTotalPages(lettersResponse.total_pages || 0);
            setTotalRows(lettersResponse.total || 0);
            setLetterStats(statsResponse.data);
            setGapCounts(gaps);
            setSelectedIds([]);

            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching letters", error);
            if (myRequestId === requestIdRef.current) setIsLoading(false);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [currentPage, debouncedFilters, pageSize, fetchLettersFromApi, fetchLetterStats, fetchGapCounts]);

    useEffect(() => {
        loadLetters().catch((err) =>
            console.error("Unhandled error in loadLetters", err)
        );
    }, [loadLetters, refreshTrigger]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilters]);

    const selectedPendingForMeCount = letters.filter(
        l => selectedIds.includes(l.id) && l.initials_by_pending?.id === user?.id
    ).length;

    const handleBulkConfirmInitialsBy = async () => {
        try {
            setIsBulkConfirming(true);
            const res = await api.put('/v1/letter/initials-by/bulk-confirm', {
                letter_ids: selectedIds,
                notes: bulkConfirmNotes.trim() || null,
            });
            toast.success(res.data.message);
            setShowBulkConfirmDialog(false);
            setBulkConfirmNotes("");
            handleRefresh();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to confirm");
        } finally {
            setIsBulkConfirming(false);
        }
    };

    const handleRefresh = (): void => {
        setCurrentPage(1);
        setRefreshTrigger(prev => !prev);
    };

    // NEW — clicking the "Section Not Selected" / "Assignee Not Selected" card
    // filters the table; clicking the same card again clears that filter.
    const handleGapClick = (key: 'no_section' | 'no_assignee'): void => {
        !showFilters && setShowFilters(true);
        setInputFilters(prev => ({
            ...prev,
            no_section: key === 'no_section' ? !prev.no_section : false,
            no_assignee: key === 'no_assignee' ? !prev.no_assignee : false,
        }));
    };

    const generatePageNumbers = (): number[] => {
        const pageNumbers: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return pageNumbers;
    };

    const clearFilter = (filterName: keyof LetterFilters): void => {
        setInputFilters(prev => ({
            ...prev,
            [filterName]: filterName.includes('date')
                ? null
                : (typeof prev[filterName] === 'string' ? '' : (typeof prev[filterName] === 'boolean' ? false : 0))
        }));
    };

    const handleFilters = (): void => {
        if (showFilters) {
            setInputFilters(initialFilters);
        }
        setShowFilters(!showFilters);
    };

    const getStatusClassName = (status: string): string => {
        if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
        if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
        if (status === 'Forwarded') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
        if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
        if (status === 'Not Relevant') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
        if (status === null) return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
    };

    const getStatCount = (statusName: string): number => {
        const stat = letterStats.find(
            (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
        );
        return stat?.count ?? 0;
    };

    // Clicking a stat card filters the table by that status (click again to clear)
    const handleStatsClick = (statusName: string): void => {
        const stat = letterStats.find(
            (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
        );
        const fallback = statuses.find(
            (s) => s.name?.toLowerCase() === statusName.toLowerCase()
        );
        const statusId = stat?.status_id ?? fallback?.id;
        if (!statusId) return;

        !showFilters && setShowFilters(true);
        setInputFilters((prev) => ({
            ...prev,
            status_id: prev.status_id === statusId ? 0 : statusId,
        }));
    };

    const handleDeleteClick = (letter: Letter): void => {
        setLetterToDelete(letter);
    };

    const handleDeleteDialogClose = (): void => {
        if (isDeleting) return;
        setLetterToDelete(null);
    };

    const handleDeleteConfirm = async (): Promise<void> => {
        if (!letterToDelete) return;

        try {
            setIsDeleting(true);
            await api.delete(`/v1/letter/${letterToDelete.id}`);
            toast.success(`Letter ${letterToDelete.code} deleted successfully`);
            setLetterToDelete(null);

            if (letters.length === 1 && currentPage > 1) {
                setCurrentPage((prev) => prev - 1);
            } else {
                handleRefresh();
            }
        } catch (error) {
            console.error("Error deleting letter", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsDeleting(false);
        }
    };

    const allOnPageSelected = letters.length > 0 && letters.every(l => selectedIds.includes(l.id));
    const toggleSelectAllOnPage = (checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, ...letters.map(l => l.id)])));
        } else {
            const pageIds = new Set(letters.map(l => l.id));
            setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
        }
    };
    const toggleSelectRow = (id: number, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    };

    const visibleColumnCount =
        1 + // selection checkbox column
        Object.values(columnVisibility).filter(Boolean).length +
        1; // Actions column

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Letter Management</h1>
                    <p className="text-muted-foreground">
                        Define and track all incoming and outgoing correspondence. Easily manage the flow of letters
                        across departments and organizations
                    </p>
                </div>
                <InsertLetterModal
                    organizations={organizations}
                    onOrganizationAdded={(newOrg) => setOrganizations(prev => [...prev, newOrg])}
                    onSuccess={handleRefresh}
                />
            </div>

            {/* Stats Cards: New | Section Not Selected | Assignee Not Selected | Not Relevant */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className={cn("cursor-pointer hover:shadow-md transition-shadow duration-200",
                        inputFilters.status_id !== 0 && inputFilters.status_id === letterStats.find(s => s.status_name?.toLowerCase() === "new")?.status_id && "ring-2 ring-primary")}
                    onClick={() => handleStatsClick("New")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New</CardTitle>
                        <MailPlus className="h-4 w-4 text-blue-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("New")}</div>
                                <p className="text-xs text-muted-foreground">Newly Created</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* NEW — replaces the old "Assigned/Forwarded" card */}
                <Card className={cn("cursor-pointer hover:shadow-md transition-shadow duration-200",
                        inputFilters.no_section && "ring-2 ring-primary")}
                    onClick={() => handleGapClick('no_section')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Section Not Selected</CardTitle>
                        <MailCheck className="h-4 w-4 text-amber-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{gapCounts.section_not_selected}</div>
                                <p className="text-xs text-muted-foreground">Letters without a section</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* NEW — replaces the old "In Progress" card */}
                <Card className={cn("cursor-pointer hover:shadow-md transition-shadow duration-200",
                        inputFilters.no_assignee && "ring-2 ring-primary")}
                    onClick={() => handleGapClick('no_assignee')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assignee Not Selected</CardTitle>
                        <UserX className="h-4 w-4 text-green-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{gapCounts.assignee_not_selected}</div>
                                <p className="text-xs text-muted-foreground">Letters without an assignee</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${
                        getStatCount("Not Relevant") > 0
                            ? "bg-rose-300 dark:bg-rose-800 animate-pulse border-red-200"
                            : ""
                    }`}
                    onClick={() => handleStatsClick("Not Relevant")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Not Relevant</CardTitle>
                        <CircleAlert className="h-4 w-4 text-red-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("Not Relevant")}</div>
                                <p className="text-xs text-muted-foreground">Marked Not Relevant</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Letters List</CardTitle>
                        <CardDescription>A comprehensive list of all letters in the system</CardDescription>
                    </div>
                    {!isLoading && (
                        <div className="flex space-x-2">
                            {selectedIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowExportModal(true)}
                                    disabled={!hasPermission('letter.xdownload')}
                                >
                                    <Download className="mr-2 h-4 w-4"/>Export Selected ({selectedIds.length})
                                </Button>
                            )}
                            {selectedPendingForMeCount > 0 && (
                                <Button variant="outline" onClick={() => setShowBulkConfirmDialog(true)}>
                                    <PenLine className="mr-2 h-4 w-4"/>Confirm Initials By ({selectedPendingForMeCount})
                                </Button>
                            )}
                            <Button size="icon" variant="outline" onClick={handleRefresh} aria-label="Refresh">
                                <RotateCw className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleFilters}
                                className={showFilters ? "bg-gray-100 dark:bg-gray-900" : ""}
                                aria-label="Filter"
                            >
                                <Filter className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowExportModal(true)}
                                aria-label="Export"
                                disabled={!hasPermission('letter.xdownload')}
                            >
                                <Download className="h-4 w-4"/>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" aria-label="Column Settings">
                                        <Settings2 className="h-4 w-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {Object.entries({
                                        id: "ID",
                                        code: "Code",
                                        title: "Subject/Content of the Letter",
                                        organization: "Sender/Organization of the letter",
                                        department: "Section",
                                        assignee: "Assignee",
                                        assigneeStatus: "Assignee Status",
                                        date: "Received Date",
                                        other: "Cheque No / Money Order No",
                                        chequeStatus: "Cheque Deposit Status",
                                        fileName: "File Number",
                                    }).map(([key, label]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={columnVisibility[key as keyof ColumnVisibility]}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={(checked) =>
                                                setColumnVisibility((prev) => ({...prev, [key]: checked}))
                                            }
                                        >
                                            {label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            {(inputFilters.no_section || inputFilters.no_assignee || inputFilters.status_id !== 0) && (
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="text-xs text-muted-foreground">Active card filter:</span>
                                    {inputFilters.no_section && (
                                        <Badge variant="secondary" className="gap-1">
                                            Section not selected
                                            <button type="button" onClick={() => clearFilter('no_section')} aria-label="Clear"><X className="h-3 w-3"/></button>
                                        </Badge>
                                    )}
                                    {inputFilters.no_assignee && (
                                        <Badge variant="secondary" className="gap-1">
                                            Assignee not selected
                                            <button type="button" onClick={() => clearFilter('no_assignee')} aria-label="Clear"><X className="h-3 w-3"/></button>
                                        </Badge>
                                    )}
                                    {inputFilters.status_id !== 0 && (
                                        <Badge variant="secondary" className="gap-1">
                                            Status: {statuses.find(st => st.id === inputFilters.status_id)?.name}
                                            <button type="button" onClick={() => clearFilter('status_id')} aria-label="Clear"><X className="h-3 w-3"/></button>
                                        </Badge>
                                    )}
                                </div>
                            )}

                            {showFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                                    {columnVisibility.code && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Code..."
                                                value={inputFilters.code}
                                                onChange={(e) => setInputFilters(prev => ({...prev, code: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Code"
                                            />
                                            {inputFilters.code && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('code')} aria-label="Clear Code filter">
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.title && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Subject/Content of the Letter..."
                                                value={inputFilters.subject}
                                                onChange={(e) => setInputFilters(prev => ({...prev, subject: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Subject/Content of the Letter"
                                            />
                                            {inputFilters.subject && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('subject')} aria-label="Clear  Subject/Content of the Letter filter">
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.organization && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.organization_id !== 0 ? inputFilters.organization_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    organization_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a Sender/Organization"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {organizations.map((org) => (
                                                        <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.organization_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('organization_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {/* Search by Department (Section) */}
                                    <div className="relative">
                                        <Select
                                            value={inputFilters.department_id !== 0 ? inputFilters.department_id.toString() : ""}
                                            onValueChange={(value) => setInputFilters((prev) => ({
                                                ...prev,
                                                department_id: parseInt(value) || 0,
                                            }))}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Search by Department"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {inputFilters.department_id !== 0 && (
                                            <Button variant="ghost" size="icon"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                onClick={() => clearFilter('department_id')}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                    {/* Search by Assignee (searchable combobox) */}
                                    <div className="relative">
                                        <Popover open={assigneeFilterOpen} onOpenChange={setAssigneeFilterOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between font-normal",
                                                        !inputFilters.assignee_id && "text-muted-foreground"
                                                    )}
                                                >
                                                    <span className="truncate text-start">
                                                        {inputFilters.assignee_id
                                                            ? assignees.find(a => a.id === inputFilters.assignee_id)?.name
                                                            : "Search by Assignee"}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command filter={() => 1}>
                                                    <CommandInput
                                                        placeholder="Search assignee..."
                                                        value={assigneeFilterSearch}
                                                        onValueChange={setAssigneeFilterSearch}
                                                    />
                                                    <CommandList className="max-h-[260px] overflow-y-auto">
                                                        <CommandEmpty>No assignee found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {inputFilters.assignee_id !== 0 && (
                                                                <CommandItem onSelect={() => {
                                                                    setInputFilters(prev => ({...prev, assignee_id: 0}));
                                                                    setAssigneeFilterOpen(false);
                                                                    setAssigneeFilterSearch("");
                                                                }} className="text-muted-foreground">
                                                                    Clear selection
                                                                </CommandItem>
                                                            )}
                                                            {assignees
                                                                .filter(a => !assigneeFilterSearch || a.name.toLowerCase().includes(assigneeFilterSearch.toLowerCase()))
                                                                .map(a => (
                                                                    <CommandItem key={a.id} value={a.id.toString()} onSelect={() => {
                                                                        setInputFilters(prev => ({...prev, assignee_id: a.id}));
                                                                        setAssigneeFilterOpen(false);
                                                                        setAssigneeFilterSearch("");
                                                                    }}>
                                                                        <Check className={cn("mr-2 h-4 w-4", inputFilters.assignee_id === a.id ? "opacity-100" : "opacity-0")}/>
                                                                        {a.name}
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {inputFilters.assignee_id !== 0 && (
                                            <Button variant="ghost" size="icon"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                onClick={() => clearFilter('assignee_id')}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                    {columnVisibility.date && (
                                        <div>
                                            {/* CHANGED — the END date is now set to 23:59:59.999 of that day
                                                (and the start to 00:00:00). Before, the end was local midnight,
                                                so letters received ON the last picked day were cut off, and a
                                                same-day pick matched nothing. */}
                                            <DatePickerWithRange
                                                date={{
                                                    from: inputFilters.create_date_start ? new Date(inputFilters.create_date_start) : undefined,
                                                    to: inputFilters.create_date_end ? new Date(inputFilters.create_date_end) : undefined,
                                                }}
                                                onChange={(range) => setInputFilters((prev) => {
                                                    const from = range?.from ? new Date(range.from) : null;
                                                    const to = range?.to ? new Date(range.to) : (from ? new Date(from) : null);
                                                    from?.setHours(0, 0, 0, 0);
                                                    to?.setHours(23, 59, 59, 999);
                                                    return {
                                                        ...prev,
                                                        create_date_start: from ? from.toISOString() : null,
                                                        create_date_end: to ? to.toISOString() : null,
                                                    };
                                                })}
                                            />
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Select
                                            value={inputFilters.assignee_status_id !== 0 ? inputFilters.assignee_status_id.toString() : ""}
                                            onValueChange={(value) => setInputFilters((prev) => ({
                                                ...prev,
                                                assignee_status_id: parseInt(value) || 0,
                                            }))}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Filter by assignee status"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statuses.map((s) => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {inputFilters.assignee_status_id !== 0 && (
                                            <Button variant="ghost" size="icon"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                onClick={() => clearFilter('assignee_status_id')}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                    {columnVisibility.other && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Cheque no /Money Order No..."
                                                value={inputFilters.other}
                                                onChange={(e) => setInputFilters(prev => ({...prev, other: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Other"
                                            />
                                            {inputFilters.other && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('other')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2 border rounded-md px-3 h-10">
                                        <Checkbox
                                            id="filter-has-cheque"
                                            checked={inputFilters.has_cheque}
                                            onCheckedChange={(checked) =>
                                                setInputFilters(prev => ({...prev, has_cheque: !!checked}))
                                            }
                                        />
                                        <label htmlFor="filter-has-cheque" className="text-sm cursor-pointer whitespace-nowrap">
                                            Has Cheque / Money Order
                                        </label>
                                    </div>

                                    {/* NEW — Section / Assignee not selected filters (also toggled by the cards) */}
                                    <div className="flex items-center space-x-2 border rounded-md px-3 h-10">
                                        <Checkbox
                                            id="f-no-section"
                                            checked={inputFilters.no_section}
                                            onCheckedChange={(c) => setInputFilters(p => ({...p, no_section: !!c}))}
                                        />
                                        <label htmlFor="f-no-section" className="text-sm cursor-pointer whitespace-nowrap">
                                            Section not selected
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2 border rounded-md px-3 h-10">
                                        <Checkbox
                                            id="f-no-assignee"
                                            checked={inputFilters.no_assignee}
                                            onCheckedChange={(c) => setInputFilters(p => ({...p, no_assignee: !!c}))}
                                        />
                                        <label htmlFor="f-no-assignee" className="text-sm cursor-pointer whitespace-nowrap">
                                            Assignee not selected
                                        </label>
                                    </div>

                                    {/* Public Complaint filter */}
                                    <div className="relative">
                                        <Select
                                            value={inputFilters.is_public_complaint === null ? "all" : inputFilters.is_public_complaint ? "yes" : "no"}
                                            onValueChange={(value) => setInputFilters(prev => ({
                                                ...prev,
                                                is_public_complaint: value === "all" ? null : value === "yes",
                                            }))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Public Complaint"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Letters</SelectItem>
                                                <SelectItem value="yes">Public Complaints Only</SelectItem>
                                                <SelectItem value="no">Not Public Complaints</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Pending days range */}
                                    <div className="relative">
                                        <Select
                                            value={
                                                !inputFilters.pending_only ? "none" :
                                                inputFilters.pending_days_min == null && inputFilters.pending_days_max == null ? "any" :
                                                inputFilters.pending_days_min === 1 && inputFilters.pending_days_max === 5 ? "1-5" :
                                                inputFilters.pending_days_min === 6 && inputFilters.pending_days_max === 10 ? "6-10" :
                                                inputFilters.pending_days_min === 11 && inputFilters.pending_days_max === 20 ? "11-20" :
                                                inputFilters.pending_days_min === 21 && inputFilters.pending_days_max === 30 ? "21-30" :
                                                inputFilters.pending_days_min === 31 && inputFilters.pending_days_max == null ? "30+" :
                                                "any"
                                            }
                                            onValueChange={(value) => {
                                                const ranges: Record<string, [number | null, number | null] | null> = {
                                                    none: null,
                                                    any: [null, null],
                                                    "1-5": [1, 5],
                                                    "6-10": [6, 10],
                                                    "11-20": [11, 20],
                                                    "21-30": [21, 30],
                                                    "30+": [31, null],
                                                };
                                                const picked = ranges[value];
                                                setInputFilters(prev => ({
                                                    ...prev,
                                                    pending_only: value !== "none",
                                                    pending_days_min: picked ? picked[0] : null,
                                                    pending_days_max: picked ? picked[1] : null,
                                                }));
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Pending days"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">All letters</SelectItem>
                                                <SelectItem value="any">Pending (any days)</SelectItem>
                                                <SelectItem value="1-5">Pending 1-5 days</SelectItem>
                                                <SelectItem value="6-10">Pending 6-10 days</SelectItem>
                                                <SelectItem value="11-20">Pending 11-20 days</SelectItem>
                                                <SelectItem value="21-30">Pending 21-30 days</SelectItem>
                                                <SelectItem value="30+">Pending 30+ days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-md border">
                                <Table
                                    containerClassName="max-h-[65vh] overflow-y-auto overflow-x-hidden relative"
                                    className="table-fixed w-full mb-0"
                                >
                                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[4%] text-center">
                                                <Checkbox
                                                    checked={allOnPageSelected}
                                                    onCheckedChange={(checked) => toggleSelectAllOnPage(!!checked)}
                                                    aria-label="Select all letters on this page"
                                                    disabled={letters.length === 0}
                                                    className="border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:border-primary"
                                                />
                                            </TableHead>
                                            {columnVisibility.id && <TableHead className="w-[3%] text-center">ID</TableHead>}
                                            {columnVisibility.code && <TableHead className="w-[9%]">Code</TableHead>}
                                            {columnVisibility.organization && <TableHead className="w-[10%]">Sender/Organization of the letter</TableHead>}
                                            {columnVisibility.title && <TableHead className="w-[14%]">Subject/Content of the Letter</TableHead>}
                                            {columnVisibility.department && <TableHead className="w-[9%]">Section</TableHead>}
                                            {columnVisibility.assignee && <TableHead className="w-[9%]">Assignee</TableHead>}
                                            {columnVisibility.assigneeStatus && <TableHead className="w-[12%]">Assignee Status</TableHead>}
                                            {columnVisibility.date && <TableHead className="w-[8%]">Received Date</TableHead>}
                                            {columnVisibility.other && <TableHead className="w-[8%]">Cheque no /Money Order No</TableHead>}
                                            {columnVisibility.chequeStatus && <TableHead className="w-[8%] text-center">Cheque Status</TableHead>}
                                            {columnVisibility.fileName && <TableHead className="w-[8%]">File Number</TableHead>}
                                            <TableHead className="w-[8%] text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {isLoading ? (
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={visibleColumnCount} className="h-80 text-center p-0">
                                                    <div className="w-full flex flex-col items-center justify-center py-8">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-4">Loading letter data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    ) : letters.length > 0 ? (
                                        <TableBody>
                                            {letters.map((item, index) => (
                                                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <TableCell className="text-center w-[4%] align-top">
                                                        <Checkbox
                                                            checked={selectedIds.includes(item.id)}
                                                            onCheckedChange={(checked) => toggleSelectRow(item.id, !!checked)}
                                                            aria-label={`Select letter ${item.code}`}
                                                            className="border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:border-primary"
                                                        />
                                                    </TableCell>
                                                    {columnVisibility.id && (
                                                        <TableCell className="text-center w-[3%] align-top">
                                                            {totalRows - ((currentPage - 1) * pageSize + index)}
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.code && (
                                                        <TableCell className="w-[9%] align-top">
                                                            <div className="whitespace-nowrap">{item.code}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.organization && (
                                                        <TableCell className="w-[10%] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item.organization || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.title && (
                                                        <TableCell className="w-[14%] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item.subject}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.department && (
                                                        <TableCell className="w-[9%] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item?.department || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.assignee && (
                                                        <TableCell className="w-[8%] align-top">
                                                            {item.assignee ? (
                                                                <div className="space-y-0.5">
                                                                    {item.assignee.split(',').map((name, i) => (
                                                                        <div key={i} className="break-words">{name.trim()}</div>
                                                                    ))}
                                                                </div>
                                                            ) : "—"}
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.assigneeStatus && (
                                                        <TableCell className="w-[12%] align-top">
                                                            {item.assignee_statuses && item.assignee_statuses.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {item.assignee_statuses.map((s, i) => (
                                                                        <div key={i}>
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(s.status_name)}`}>
                                                                                {s.assignee_name}: {s.status_name}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                    {(() => {
                                                        const isFullyCompleted = item.assignee_statuses && item.assignee_statuses.length > 0
                                                            ? item.assignee_statuses.every(s => s.status_name === 'Completed')
                                                            : item.status === 'Completed';
                                                        return columnVisibility.date && (
                                                            <TableCell className="w-[8%] align-top">
                                                                <div className="break-words">{formatDate(item.received_datetime || item.create_datetime)}</div>
                                                                {typeof item.days_pending === 'number' && (
                                                                    <div
                                                                        className={`text-xs mt-0.5 ${
                                                                            isFullyCompleted
                                                                                ? 'text-muted-foreground'
                                                                                : 'text-amber-600 dark:text-amber-400'
                                                                        }`}
                                                                        title={isFullyCompleted ? 'Days it took to complete' : 'Days pending so far'}
                                                                    >
                                                                        {isFullyCompleted ? '✓ ' : ''}{item.days_pending}d {isFullyCompleted ? 'to complete' : 'pending'}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })()}
                                                    {columnVisibility.other && (
                                                        <TableCell className="w-[8%] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item.other || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.chequeStatus && (
                                                        <TableCell className="text-center w-[8%] align-top">
                                                            {item.other ? (
                                                                <span
                                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        item.cheque_deposited
                                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    }`}
                                                                    title={
                                                                        item.cheque_deposited
                                                                            ? `Deposited ${item.cheque_deposit_date ? formatDate(item.cheque_deposit_date) : ''}${item.cheque_bank ? ` · ${item.cheque_bank}` : ''}${item.cheque_branch ? ` (${item.cheque_branch})` : ''}${item.cheque_account_no ? ` · A/C ${item.cheque_account_no}` : ''}`
                                                                            : 'Not yet deposited'
                                                                    }
                                                                >
                                                                    {item.cheque_deposited ? 'Deposited' : 'Not Deposited'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.fileName && (
                                                        <TableCell className="w-[8%] align-top">
                                                            {item.assignee_statuses && item.assignee_statuses.some(s => s.file_name) ? (
                                                                <div className="space-y-0.5">
                                                                    {item.assignee_statuses.filter(s => s.file_name).map((s, i) => (
                                                                        <div key={i} className="break-words">
                                                                            <span className="text-muted-foreground">{s.assignee_name}:</span> {s.file_name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                    {/* Actions cell */}
                                                    <TableCell className="text-center w-[8%] align-top">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <div className="relative">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => router.push(`/letters/${item.id}`)}
                                                                    aria-label={`View letter ${item.code}`}
                                                                >
                                                                    <Eye className="h-4 w-4"/>
                                                                </Button>
                                                                {!!item.remarks_count && item.remarks_count > 0 && (
                                                                    <span
                                                                        className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold leading-none animate-pulse"
                                                                        title={`${item.remarks_count} remark${item.remarks_count !== 1 ? 's' : ''}`}
                                                                    >
                                                                        {item.remarks_count}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.initials_by_pending?.id === user?.id && (
                                                                <div className="relative">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                                                        onClick={() => router.push(`/letters/${item.id}`)}
                                                                        aria-label={`Initials confirmation pending for letter ${item.code}`}
                                                                        title="Waiting for your initials confirmation"
                                                                    >
                                                                        <PenLine className="h-4 w-4"/>
                                                                    </Button>
                                                                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"/>
                                                                </div>
                                                            )}

                                                            {hasPermission('letter.order_by') && (!item.order_by_role || !item.order_by_action) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-purple-600 hover:text-purple-700"
                                                                    onClick={() => setLetterToQuickOrderBy(item)}
                                                                    aria-label={`Order By incomplete for letter ${item.code}`}
                                                                    title="Order By not yet set — click to set it"
                                                                >
                                                                    <Stamp className="h-4 w-4"/>
                                                                </Button>
                                                            )}
                                                            {(hasPermission('letter.change_department') || hasPermission('letter.assign')) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setLetterToQuickEdit(item)}
                                                                    aria-label={`Quick edit letter ${item.code}`}
                                                                    title="Quick edit"
                                                                >
                                                                    <Pencil className="h-4 w-4"/>
                                                                </Button>
                                                            )}
                                                            {hasPermission('letter.delete') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => handleDeleteClick(item)}
                                                                    aria-label={`Delete letter ${item.code}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    ) : (
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={visibleColumnCount} className="h-90 text-center">
                                                    <div className="flex flex-col items-center justify-center py-6">
                                                        <MailSearch className="h-10 w-10 text-muted-foreground/40 mb-2"/>
                                                        <p className="text-sm text-muted-foreground">No letters found</p>
                                                        {showFilters && (
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() => {
                                                                    setInputFilters(initialFilters);
                                                                    setCurrentPage(1);
                                                                }}
                                                            >
                                                                Clear all filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    )}
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">Total {totalRows}</span>
                                <span className="text-sm text-muted-foreground">Entries Per Page</span>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={(value) => {
                                        setPageSize(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder={pageSize}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pageSizeOptions.map((size) => (
                                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                    <ChevronsLeft className="h-4 w-4"/>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4"/>
                                </Button>
                                {generatePageNumbers().map((pageNumber) => (
                                    <Button
                                        key={pageNumber}
                                        variant={currentPage === pageNumber ? "default" : "outline"}
                                        size="icon"
                                        onClick={() => setCurrentPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </Button>
                                ))}
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4"/>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                    <ChevronsRight className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ExportModal
                isOpen={showExportModal}
                onCloseAction={() => setShowExportModal(false)}
                departments={departments.map((d) => d.name)}
                assignees={assignees.map((a) => a.name)}
                statuses={statuses.map((s) => s.name)}
                selectedIds={selectedIds}
            />

            <DeleteLetterAlert
                isOpen={!!letterToDelete}
                onClose={handleDeleteDialogClose}
                onConfirm={handleDeleteConfirm}
                letterCode={letterToDelete?.code || ""}
                isDeleting={isDeleting}
            />

            <QuickEditLetterDialog
                letter={letterToQuickEdit}
                departmentAccounts={departmentAccounts}
                assignees={assignees}
                organizations={organizations}
                onClose={() => setLetterToQuickEdit(null)}
                onSaved={handleRefresh}
            />

            <QuickOrderByDialog
                letter={letterToQuickOrderBy}
                onClose={() => setLetterToQuickOrderBy(null)}
                onSaved={handleRefresh}
            />

            <Dialog open={showBulkConfirmDialog} onOpenChange={(open) => { if (!open && !isBulkConfirming) setShowBulkConfirmDialog(false); }}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Initials By</DialogTitle>
                        <DialogDescription>
                            Confirms your initials on {selectedPendingForMeCount} letter{selectedPendingForMeCount !== 1 ? 's' : ''} that are pending your confirmation. The same notes will be applied to all of them.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={bulkConfirmNotes}
                        onChange={(e) => setBulkConfirmNotes(e.target.value)}
                        rows={3}
                        placeholder="Notes (optional, applies to all selected letters)"
                        className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                        disabled={isBulkConfirming}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkConfirmDialog(false)} disabled={isBulkConfirming}>Cancel</Button>
                        <Button onClick={handleBulkConfirmInitialsBy} disabled={isBulkConfirming}>
                            {isBulkConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Confirming...</> : "Confirm All"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}