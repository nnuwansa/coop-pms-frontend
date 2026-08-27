'use client';

import {useCallback, useEffect, useState} from "react";
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
    Clock,
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
// NEW — needed for the searchable Assignee filter dropdown
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {InsertLetterModal} from "@/app/(dashboard)/letters/insert-letter-modal";
import {ExportModal} from "@/app/(dashboard)/letters/export-modal";
import {DeleteLetterAlert} from "@/app/(dashboard)/letters/delete-letter-alert";
import {useDebounce} from "@/hook/debounce";
import {cn, formatDate} from "@/lib/utils"; // CHANGED — added cn, needed by the new searchable combobox
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
    department_id?: number | null;          // NEW
    department_unit_id?: number | null;     // NEW
}

interface Organization {
    id: number;
    name: string;
}

// NEW — matches the backend's AssigneeStatusBrief model
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
    department_ids?: number[];   // NEW — used to preselect the quick-edit dialog
    department_account_ids?: number[]; 
    assignee: string;
    assignee_ids?: number[];     // NEW — used to preselect the quick-edit dialog
    status_id?: number;          // NEW — used to preselect the quick-edit dialog
    create_datetime: string;
    // NEW — the letter's actual Received Date (as entered on the letter),
    // distinct from create_datetime (when the record was saved in the
    // system). The "Received Date" column and all date sorting/filtering
    // should be based on THIS field, not create_datetime — using
    // create_datetime was the bug causing letters entered late (for an
    // earlier date) to show up in the wrong place in the list.
    received_datetime?: string;
    status: string;
    status_days?: number | null;   // NEW
    other?: string;
    days_pending?: number | null;          // NEW — days since received; frozen once ALL assignees are "Completed" (or, with no assignees, once the letter's own status is "Completed")
    assignee_statuses?: AssigneeStatusBrief[];   // CHANGED — structured objects instead of flat strings, so each badge can be colored by its own status and carry its own file_name
    cheque_deposited?: boolean;            // NEW
    cheque_deposit_date?: string | null;   // NEW
    cheque_account_no?: string | null;     // NEW
    cheque_bank?: string | null;           // NEW
    cheque_branch?: string | null;         // NEW
    completion_file_name?: string | null;  // NEW
    remarks_count?: number;  // NEW — used for the notify badge in Actions column
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
    status_id: number;   // still used by the stat-card clicks (overall letter status), unrelated to the assignee-status dropdown below
    assignee_status_id: number;   // CHANGED — new: replaces the manual "Select a Status" dropdown filter — filters by an individual assignee's own status instead of the letter's overall status
    organization_id: number;
    create_date_start: string | null;  
    create_date_end: string | null;  
    other: string;
    has_cheque: boolean;     // NEW
    pending_only: boolean;   // NEW
    pending_days_min: number | null;   // NEW — e.g. 1 for "1-5 days"
    pending_days_max: number | null;   // NEW — e.g. 5 for "1-5 days"; null = no upper bound ("30+ days")
     is_public_complaint: boolean | null; 
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
    chequeStatus: boolean;     // NEW
    fileName: boolean;         // NEW
    assigneeStatus: boolean;   
}


interface ApiResponse<T> {
    success: boolean;
    data: T;
    total?: number;
    total_pages?: number;
}

// NOTE: `status_id` is still returned by the API for filtering purposes,
// but we now match cards by `status` (the human-readable name) instead of
// assuming a fixed id -> meaning mapping (that assumption was wrong: id 2
// is "Forwarded" in this system, not "Assigned").
interface LetterStat {
    status_id: number;
    count: number;
    status_name: string;
}

// NEW — Order By option shape shared by both the Letter View page and the
// dashboard's quick Order By dialog
interface OrderByOptionItem {id: number; name: string; category: 'role' | 'action'}

// NEW — matches the backend's Initials By candidate list
interface InitialsByCandidate {id: number; name: string; is_default: boolean}

const pageSizeOptions = [5, 10, 20, 50];

// CHANGED — `id` search filter removed from the UI (kept in the shape only
// so the payload sent to the API stays backward compatible; it is always 0).
// CHANGED — create_date_start/create_date_end renamed to
// received_date_start/received_date_end (see LetterFilters above).
const initialFilters: LetterFilters = {
    id: 0,
    code: "",
    subject: "",
    department_id: 0,
    assignee_id: 0,
    status_id: 0,
    assignee_status_id: 0,   // NEW
    organization_id: 0,
    create_date_start: null,
    create_date_end: null,
    other: "",
    has_cheque: false,    // NEW
    pending_only: false,  // NEW
    pending_days_min: null,   // NEW
    pending_days_max: null,   // NEW
    is_public_complaint: null,

};

// CHANGED — department & assignee columns are now visible by default so the
// list view always shows who/what department a letter is with, without the
// user having to turn the columns on manually.
const initialColumnVisibility: ColumnVisibility = {
    id: true,
    code: true,
    title: true,
    organization: true,
    department: true,
    assignee: true,
    date: true,
    other: false,
    chequeStatus: false,     // NEW
    fileName: false,         // NEW
    assigneeStatus: true,    // CHANGED — this now takes the place of the old Status column, shown by default
};

// ─── Quick Edit Dialog ──────────────────────────────────────────────────────
// Lets a user change a letter's Departments / Assignees / Organization /
// Subject directly from the dashboard table (via the pencil icon in the
// Actions column), without navigating into the full Letter View page first.
// CHANGED — Status has been removed from this dialog (status changes now
// happen only from the full Letter View). Organization and
// Subject/Content of the Letter were added in its place.
// CHANGED — now also includes an "Initials By" section (admin picks who
// should confirm), visible only to users with letter.initials_by_manage,
// so that workflow no longer requires opening the full Letter View page.
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
    departmentAccounts,   // CHANGED — was `departments: Department[]`
    assignees,
    organizations,
    onClose,
    onSaved,
}: {
    letter: Letter | null;
    departmentAccounts: DepartmentAccount[];   // CHANGED
    assignees: Assignee[];
    organizations: Organization[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [selectedDeptAccountIds, setSelectedDeptAccountIds] = useState<number[]>([]);   // CHANGED — was selectedDeptIds
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<number>(0);
    const [subjectText, setSubjectText] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    // NEW — same permission pattern as the Letter View page: fields stay
    // visible for context, but are individually disabled when the current
    // user lacks the specific permission for that field, instead of the
    // whole dialog being all-or-nothing based on just whichever permission
    // let the pencil icon show in the first place.
    const {hasPermission} = useAuthStore();
    const canUpdateDetails = hasPermission('letter.update');       // gates Organization + Subject
    const canChangeDepartment = hasPermission('letter.change_department');  // gates Departments checkboxes
    const canAssign = hasPermission('letter.assign');               // gates Assignees checkboxes
    const canManageInitialsBy = hasPermission('letter.initials_by_manage');  // NEW — gates Initials By section
    const [assigneeDeptFilter, setAssigneeDeptFilter] = useState<number>(0);
    const [assigneeUnitFilter, setAssigneeUnitFilter] = useState<number>(0);
    const [assigneeUnits, setAssigneeUnits] = useState<{id: number; name: string}[]>([]);
    const [assigneeSearch, setAssigneeSearch] = useState("");

    // NEW — Initials By: candidate list + which one is selected/pending
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

    const filteredAssignees = assignees.filter(a =>
        (!assigneeDeptFilter || a.department_id === assigneeDeptFilter) &&
        (!assigneeUnitFilter || a.department_unit_id === assigneeUnitFilter) &&
        (!assigneeSearch.trim() || a.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
    );

    // NOTE: this correctly preselects checkboxes from `letter.department_account_ids`
    // and `letter.assignee_ids` — those just need to actually be present in
    // the `letter` object passed in, which requires the backend's list
    // endpoint (LetterModelOutList) to populate them. See service/letter.py.
    useEffect(() => {
        if (letter) {
            setSelectedDeptAccountIds(letter.department_account_ids || []);   // CHANGED
            setSelectedAssigneeIds(letter.assignee_ids || []);
            setSubjectText(letter.subject || "");
            const matchedOrg = organizations.find(o => o.name === letter.organization);
            setSelectedOrganizationId(matchedOrg?.id || 0);

            // NEW — Initials By: preselect whoever is currently pending on
            // this letter (if any), and load the candidate list if the user
            // is allowed to manage it.
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

    const toggleDeptAccount = (id: number) =>   // CHANGED — was toggleDept
        setSelectedDeptAccountIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

    const toggleAssignee = (id: number) =>
        setSelectedAssigneeIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    // NEW — sends the Initials By confirmation request; separate endpoint
    // from the main Quick Edit save, same as the Letter View page's
    // handleAssignInitialsBy.
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
                department_ids: selectedDeptAccountIds,   // CHANGED — sends department ACCOUNT ids now
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

                    {/* Departments — CHANGED to use department accounts (unit-aware) */}
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

                    {/* Assignees — CHANGED: disabled (not hidden) when the user lacks letter.assign, same pattern as Letter View */}
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
                                        <SelectValue placeholder="Filter by section"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">All sections</SelectItem>
                                        {/* CHANGED — derive unique parent departments from departmentAccounts */}
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
                                {filteredAssignees.length === 0 ? (
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

                    {/* NEW — Initials By: only shown to users who can manage it.
                        Mirrors "Step 1" from the Letter View page — picking a
                        candidate here only SENDS the confirmation request; the
                        actual seal value is only set once that person confirms
                        it themselves (from Letter View or the notify icon). */}
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
// NEW — lets a user set the Role + Action for a letter's Order By seal right
// from the dashboard's Stamp icon, instead of navigating into the full
// Letter View page. Same picker/quick-add logic as Letter View, just scoped
// to a small standalone dialog. Only sends order_by_role_id/order_by_action_id
// in the PUT so it never touches this letter's departments/assignees/status/etc.
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
            // Only the two Order By fields are sent — the backend leaves
            // everything else (departments, assignees, status, etc.)
            // untouched, same as the Quick Edit dialog only sending its own
            // fields.
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
                        {/* Role picker: නි.කො / ස.කො */}
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

                        {/* Action picker: කරු. ඉදිරි කටයුතු සඳහා, etc */}
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
    const {hasPermission, user} = useAuthStore();

    // Delete dialog state
    const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // NEW — quick-edit dialog state (assignee/department/organization/subject shortcut from the table)
    const [letterToQuickEdit, setLetterToQuickEdit] = useState<Letter | null>(null);

    // NEW — quick Order By dialog state (Stamp icon shortcut from the table)
    const [letterToQuickOrderBy, setLetterToQuickOrderBy] = useState<Letter | null>(null);

    // NEW — row selection for bulk export of only the chosen letters
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkConfirming, setIsBulkConfirming] = useState(false);
   const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
   const [bulkConfirmNotes, setBulkConfirmNotes] = useState("");

    // NEW — searchable Assignee filter combobox state
    const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
    const [assigneeFilterSearch, setAssigneeFilterSearch] = useState("");

   const [departmentAccounts, setDepartmentAccounts] = useState<DepartmentAccount[]>([]);   // NEW

useEffect(() => {
    const fetchDropdownData = async (): Promise<void> => {
        try {
            const [deptResponse, statusResponse, assigneeResponse, orgResponse, deptAccountsResponse] = await Promise.all([
                api.get('/v1/department/list'),
                api.get('/v1/status/list'),
                api.get('/v1/system_user/names'),
                api.get('/v1/organization/list'),
                api.get('/v1/system_user/department-accounts'),   // NEW
            ]);

            const [deptData, statusData, assigneeData, orgData, deptAccountsData] = await Promise.all([
                deptResponse.data,
                statusResponse.data,
                assigneeResponse.data,
                orgResponse.data,
                deptAccountsResponse.data,   // NEW
            ]);

            if (deptData.success) setDepartments(deptData.data);
            if (statusData.success) setStatuses(statusData.data);
            if (assigneeData.success) setAssignees(assigneeData.data);
            if (orgData.success) setOrganizations(orgData.data);
            if (deptAccountsData.success) setDepartmentAccounts(deptAccountsData.data);   // NEW

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
            id: 0,   // CHANGED — ID search removed from the UI, always sent as unfiltered
            code: debouncedFilters.code || "",
            subject: debouncedFilters.subject || "",
            organization_id: debouncedFilters.organization_id || 0,
            department_id: debouncedFilters.department_id || 0,
            assignee_id: debouncedFilters.assignee_id || 0,
            status_id: debouncedFilters.status_id || 0,
            assignee_status_id: debouncedFilters.assignee_status_id || 0,   // NEW
            // CHANGED — now filters by the letter's Received Date instead of
            // its create/entry date
            create_date_start: debouncedFilters.create_date_start || null,
            create_date_end: debouncedFilters.create_date_end || null,
            other: debouncedFilters.other || "",
            has_cheque: debouncedFilters.has_cheque || false,     // NEW
            pending_only: debouncedFilters.pending_only || false, // NEW
            pending_days_min: debouncedFilters.pending_days_min ?? null,   // NEW
            pending_days_max: debouncedFilters.pending_days_max ?? null,   // NEW
             is_public_complaint: debouncedFilters.is_public_complaint, 
            
        };

        try {
            setIsLoading(true);

            const [lettersResponse, statsResponse] = await Promise.all([
                fetchLettersFromApi(currentPage, pageSize, filters),
                fetchLetterStats()
            ]);

            // CHANGED — sort by Received Date (falling back to create_datetime
            // if a letter has no received_datetime), newest first, with the
            // letter code as a tie-breaker when two letters share the same
            // Received Date (the code also encodes the date, so it keeps
            // same-day letters in a sensible, stable order). This fixes
            // letters that were entered into the system late for an earlier
            // date showing up in the wrong place in the list. Note: this
            // only re-orders letters within the current page — ideally the
            // backend's /v1/letter/list endpoint sorts by received_datetime
            // directly so ordering is correct across pages too.
            const sortedLetters = [...(lettersResponse.data || [])].sort((a, b) => {
                const aTime = new Date(a.received_datetime || a.create_datetime).getTime();
                const bTime = new Date(b.received_datetime || b.create_datetime).getTime();
                if (bTime !== aTime) return bTime - aTime;
                return (b.code || '').localeCompare(a.code || '');
            });

            setLetters(sortedLetters);
            setTotalPages(lettersResponse.total_pages || 0);
            setTotalRows(lettersResponse.total || 0);
            // NOTE: previously this did `.slice(0, 4)`, which silently dropped
            // any status beyond the first 4 returned by the API and made the
            // cards depend on array order rather than status name. We now keep
            // the full list and look up each card's count by status name below.
            setLetterStats(statsResponse.data);
            setSelectedIds([]);   // NEW — clear selection whenever the page's data changes

            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching letters", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [currentPage, debouncedFilters, pageSize, fetchLettersFromApi, fetchLetterStats]);

    useEffect(() => {
        loadLetters().catch((err) =>
            console.error("Unhandled error in loadLetters", err)
        );
    }, [loadLetters, refreshTrigger]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilters]);

    // NEW — among the currently-selected rows, how many are actually pending
// confirmation FOR the logged-in user (letters selected that belong to
// someone else's pending request are silently skipped by the backend).
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
        setRefreshTrigger(prev => !prev);
    };

    const generatePageNumbers = (): number[] => {
        const pageNumbers: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

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
        if (status === 'Not Relevant') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';   // CHANGED
        if (status === null) return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
    };

    // Look up a stat card's count by the status's human-readable name rather
    // than assuming a fixed status_id. This is resilient to status ids being
    // reordered/renamed in the `status` table.
    const getStatCount = (statusName: string): number => {
        const stat = letterStats.find(
            (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
        );
        return stat?.count ?? 0;
    };

    // Clicking a stat card filters the table by that status. We resolve the
    // status_id from the fetched stats (falling back to the `statuses`
    // dropdown list, in case a status currently has zero letters and so
    // doesn't appear in letterStats) instead of hardcoding an id.
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
            status_id: statusId,
        }));
    };

    // Open the confirmation dialog for a specific letter
    const handleDeleteClick = (letter: Letter): void => {
        setLetterToDelete(letter);
    };

    // Close the confirmation dialog (unless a delete is in progress)
    const handleDeleteDialogClose = (): void => {
        if (isDeleting) return;
        setLetterToDelete(null);
    };

    // Confirm deletion: call the API, then refresh the list
    const handleDeleteConfirm = async (): Promise<void> => {
        if (!letterToDelete) return;

        try {
            setIsDeleting(true);
            await api.delete(`/v1/letter/${letterToDelete.id}`);
            toast.success(`Letter ${letterToDelete.code} deleted successfully`);
            setLetterToDelete(null);

            // If we just deleted the last row on this page, step back a page
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

    // NEW — row selection helpers
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

    // NEW — total number of visible columns, used for dynamic colSpan on the
    // "loading" and "no letters found" rows so they never depend on a
    // hardcoded number that goes stale whenever a column is added/removed.
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

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
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
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleStatsClick("Forwarded")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assigned</CardTitle>
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
                                <div className="text-2xl font-bold">{getStatCount("Forwarded")}</div>
                                <p className="text-xs text-muted-foreground">Forwarded</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleStatsClick("In Progress")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-green-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("In Progress")}</div>
                                <p className="text-xs text-muted-foreground">Work Ongoing</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${
                        getStatCount("Not Relevant") > 0   // CHANGED
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
                            {/* NEW — Export Selected, only shown once at least one row is checked */}
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
                                        assigneeStatus: "Assignee Status",       // CHANGED — moved next to Assignee; replaces the old overall Status column
                                        date: "Received Date",
                                        other: "Cheque No / Money Order No",
                                        chequeStatus: "Cheque Deposit Status",   // NEW
                                        fileName: "File Name",                   // NEW
                                    }).map(([key, label]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={columnVisibility[key as keyof ColumnVisibility]}
                                            // NEW — without this, Radix closes the dropdown after every
                                            // single click, so a user could never tick more than one
                                            // column on/off in a row.
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
                            {showFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                                    {/* REMOVED — "Search by ID" filter. Replaced below with
                                        always-available Assignee & Department search filters,
                                        independent of whether those columns are shown in the table. */}

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
                                    {/* NEW — Search by Department, always available regardless of
                                        whether the Department column itself is toggled on */}
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
                                    {/* CHANGED — Search by Assignee is now a searchable combobox
                                        (type-to-filter) instead of a plain scrollable dropdown,
                                        same pattern used for Organization elsewhere in the app. */}
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
                                            {/* CHANGED — now filters by Received Date */}
                                            <DatePickerWithRange
                                                date={{
                                                    from: inputFilters.create_date_start ? new Date(inputFilters.create_date_start) : undefined,
                                                    to: inputFilters.create_date_end ? new Date(inputFilters.create_date_end) : undefined,
                                                }}
                                                onChange={(range) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    create_date_start: range?.from ? new Date(range.from).toISOString() : null,
                                                    create_date_end: range?.to ? new Date(range.to).toISOString() : null,
                                                }))}
                                            />
                                        </div>
                                    )}
                                    {/* CHANGED — this now filters by an individual ASSIGNEE'S
                                        status instead of the letter's overall status, matching
                                        the dashboard's move to per-assignee statuses everywhere
                                        else (Assignee Status column, days-pending badge, etc). */}
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
                                    {/* NEW — Has Cheque / Money Order filter */}
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
                                    {/* NEW — Public Complaint filter */}
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
                                    {/* CHANGED — was a plain "Pending Only" checkbox. Now a
                                        dropdown of day ranges, so someone can find e.g. only
                                        letters that have been pending 1-5 days, not just "any
                                        pending letter" with no way to narrow by how overdue it is. */}
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

                            {/*
                                CHANGED — table scroll behaviour:
                                - `containerClassName` (added to the shared Table component,
                                  see ui/table.tsx below) caps the table's own wrapper to a
                                  viewport-relative height and scrolls vertically INSIDE it,
                                  so the page itself no longer scrolls while browsing rows.
                                - `overflow-x-hidden` on that same wrapper removes the
                                  left-right scrollbar — combined with `table-fixed` +
                                  percentage column widths below, every column now fits
                                  within the card's width instead of overflowing sideways.
                                - The header row is made `sticky top-0` with an opaque
                                  background so it stays pinned while the body scrolls.
                            */}
                            <div className="rounded-md border">
                                <Table
                                    containerClassName="max-h-[65vh] overflow-y-auto overflow-x-hidden relative"
                                    className="table-fixed w-full mb-0"
                                >
                                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                        <TableRow>
                                            {/* NEW — select-all checkbox for the current page */}
                                            <TableHead className="w-[4%] text-center">
                                                <Checkbox
                                                    checked={allOnPageSelected}
                                                    onCheckedChange={(checked) => toggleSelectAllOnPage(!!checked)}
                                                    aria-label="Select all letters on this page"
                                                    disabled={letters.length === 0}
                                                    // CHANGED — thicker, more visible border so the
                                                    // checkbox doesn't disappear against the header background
                                                    className="border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:border-primary"
                                                />
                                            </TableHead>
                                            {columnVisibility.id && <TableHead className="w-[3%] text-center">ID</TableHead>}
                                            {columnVisibility.code && <TableHead className="w-[9%]">Code</TableHead>}
                                            {columnVisibility.organization && <TableHead className="w-[10%]">Sender/Organization of the letter</TableHead>}
                                            {/* CHANGED — width reduced from an unbounded min-w so the column
                                                no longer forces horizontal scroll; content wraps and grows the
                                                row's height instead (see the body cell below). */}
                                            {columnVisibility.title && <TableHead className="w-[14%]">Subject/Content of the Letter</TableHead>}
                                            {columnVisibility.department && <TableHead className="w-[9%]">Section</TableHead>}
                                            {columnVisibility.assignee && <TableHead className="w-[9%]">Assignee</TableHead>}
                                            {/* CHANGED — Assignee Status now sits right next to Assignee,
                                                replacing the old overall letter-status column entirely. */}
                                            {columnVisibility.assigneeStatus && <TableHead className="w-[12%]">Assignee Status</TableHead>}
                                            {columnVisibility.date && <TableHead className="w-[8%]">Received Date</TableHead>}
                                            {columnVisibility.other && <TableHead className="w-[8%]">Cheque no /Money Order No</TableHead>}
                                            {columnVisibility.chequeStatus && <TableHead className="w-[8%] text-center">Cheque Status</TableHead>}
                                            {columnVisibility.fileName && <TableHead className="w-[8%]">File Name</TableHead>}
                                            {/* Actions column — always visible */}
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
                                                    {/* NEW — row selection checkbox */}
                                                    <TableCell className="text-center w-[4%] align-top">
                                                        <Checkbox
                                                            checked={selectedIds.includes(item.id)}
                                                            onCheckedChange={(checked) => toggleSelectRow(item.id, !!checked)}
                                                            aria-label={`Select letter ${item.code}`}
                                                            // CHANGED — thicker, more visible border, matching the
                                                            // header's select-all checkbox
                                                            className="border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:border-primary"
                                                        />
                                                    </TableCell>
                                                    {columnVisibility.id && (
                                                        <TableCell className="text-center w-[3%] align-top">
                                                            {/*
                                                                The list is sorted newest-first. Instead of a plain
                                                                ascending row index (which would label the newest
                                                                letter "1"), we number it as its actual position in
                                                                the full sequence: the newest letter gets `totalRows`,
                                                                the oldest gets `1` — so the newest-created letter's
                                                                number matches how many letters exist in total.
                                                            */}
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
                                                    {/* CHANGED — full Subject/Content is now shown in the table
                                                        instead of being truncated to one line; text wraps within
                                                        the (now narrower) column, so the row's height grows to fit
                                                        the content instead of the table growing wider. */}
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
                                                            {/* CHANGED — each assignee name on its own line
                                                                instead of one comma-joined line, matching how
                                                                the Assignee Status column lists them below. */}
                                                            {item.assignee ? (
                                                                <div className="space-y-0.5">
                                                                    {item.assignee.split(',').map((name, i) => (
                                                                        <div key={i} className="break-words">{name.trim()}</div>
                                                                    ))}
                                                                </div>
                                                            ) : "—"}
                                                        </TableCell>
                                                    )}
                                                    {/* CHANGED — Assignee Status now sits right next to Assignee
                                                        (matching the header), and each badge is colored by its
                                                        OWN status via getStatusClassName instead of everything
                                                        rendering in one flat purple color. */}
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
                                                    {/* CHANGED — Date column now shows the letter's actual
                                                        Received Date (falls back to create_datetime only if
                                                        received_datetime isn't present on older records), and
                                                        the days-pending badge still counts from Received Date
                                                        and freezes once ALL assignees are "Completed". */}
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
                                                    {/* Status column REMOVED — replaced by the Assignee Status
                                                        column below, which shows each assignee's own status
                                                        (colored per status) instead of one overall letter status. */}
                                                    {columnVisibility.other && (
                                                        <TableCell className="w-[8%] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item.other || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {/* NEW — Cheque deposit status badge, with details on hover */}
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
                                                    {/* CHANGED — File Name is now per-assignee (each assignee's
                                                        own file_name, set when they set a status like "Completed"
                                                        that required one), same pattern as Assignee Status.
                                                        The old single `completion_file_name` field was never
                                                        populated by per-assignee status updates, which is why
                                                        this column used to always show "—" even after a letter
                                                        had a file name recorded in the Letter View page. */}
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
                                                            {/* NEW — View button now carries a small remarks-count
                                                                notify badge (only shown when count > 0), so people
                                                                can tell at a glance which letters have discussion
                                                                without opening each one. Subtle pulse draws the eye
                                                                without being obnoxious across a whole page of rows. */}
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
                                                            {/* NEW — Initials By pending notify: only shows to the person it's actually waiting on */}
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

{/* CHANGED — Order By missing notify: now opens the QuickOrderByDialog
    directly instead of navigating to the full Letter View page, so it can
    be set right from the list. */}
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
                                                            {/* NEW — quick-edit shortcut: change department/assignee/
                                                                organization/subject right from the table, without
                                                                opening the full letter view */}
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

            {/* NEW — quick edit dialog, triggered from the pencil icon in Actions.
                CHANGED — now receives `organizations` instead of `statuses`,
                since Status was removed from this dialog in favor of
                Organization + Subject/Content of the Letter. Now also
                includes the Initials By section internally (see the
                QuickEditLetterDialog component above). */}
            <QuickEditLetterDialog
                letter={letterToQuickEdit}
                departmentAccounts={departmentAccounts} 
                assignees={assignees}
                organizations={organizations}
                onClose={() => setLetterToQuickEdit(null)}
                onSaved={handleRefresh}
            />

            {/* NEW — quick Order By dialog, triggered from the Stamp icon in
                Actions instead of navigating to the full Letter View page. */}
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