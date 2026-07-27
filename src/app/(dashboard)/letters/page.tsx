'use client';

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
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
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {InsertLetterModal} from "@/app/(dashboard)/letters/insert-letter-modal";
import {ExportModal} from "@/app/(dashboard)/letters/export-modal";
import {DeleteLetterAlert} from "@/app/(dashboard)/letters/delete-letter-alert";
import {useDebounce} from "@/hook/debounce";
import {formatDate} from "@/lib/utils";
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

interface Letter {
    id: number;
    code: string;
    subject: string;
    organization: string;
    department: string;
    department_ids?: number[];   // NEW — used to preselect the quick-edit dialog
    assignee: string;
    assignee_ids?: number[];     // NEW — used to preselect the quick-edit dialog
    status_id?: number;          // NEW — used to preselect the quick-edit dialog
    create_datetime: string;
    status: string;
    status_days?: number | null;   // NEW
    other?: string;
}

interface LetterFilters {
    id: number;
    code: string;
    subject: string;
    department_id: number;
    assignee_id: number;
    status_id: number;
    organization_id: number;
    create_date_start: string | null;
    create_date_end: string | null;
    other: string;
}

interface ColumnVisibility {
    id: boolean;
    code: boolean;
    title: boolean;
    organization: boolean;
    department: boolean;
    assignee: boolean;
    date: boolean;
    status: boolean;
    other: boolean;
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

const pageSizeOptions = [5, 10, 20, 50];

// CHANGED — `id` search filter removed from the UI (kept in the shape only
// so the payload sent to the API stays backward compatible; it is always 0).
const initialFilters: LetterFilters = {
    id: 0,
    code: "",
    subject: "",
    department_id: 0,
    assignee_id: 0,
    status_id: 0,
    organization_id: 0,
    create_date_start: null,
    create_date_end: null,
    other: "",
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
    status: true,
    other: false,
};

// ─── Quick Edit Dialog ──────────────────────────────────────────────────────
// Lets a user change a letter's Departments / Assignees / Organization /
// Subject directly from the dashboard table (via the pencil icon in the
// Actions column), without navigating into the full Letter View page first.
// CHANGED — Status has been removed from this dialog (status changes now
// happen only from the full Letter View). Organization and
// Subject/Content of the Letter were added in its place.
function QuickEditLetterDialog({
    letter,
    departments,
    assignees,
    organizations,
    onClose,
    onSaved,
}: {
    letter: Letter | null;
    departments: Department[];
    assignees: Assignee[];
    organizations: Organization[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
    // NEW — replaces the old status field
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<number>(0);
    const [subjectText, setSubjectText] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    // NEW — narrows the Assignees checklist by Department, then Sub-Unit, plus search
    const [assigneeDeptFilter, setAssigneeDeptFilter] = useState<number>(0);
    const [assigneeUnitFilter, setAssigneeUnitFilter] = useState<number>(0);
    const [assigneeUnits, setAssigneeUnits] = useState<{id: number; name: string}[]>([]);
    const [assigneeSearch, setAssigneeSearch] = useState("");

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

    useEffect(() => {
        if (letter) {
            setSelectedDeptIds(letter.department_ids || []);
            setSelectedAssigneeIds(letter.assignee_ids || []);
            setSubjectText(letter.subject || "");
            // The dashboard list endpoint only carries the organization's
            // name (not its id), so we resolve the id by matching the name
            // against the organizations dropdown list. If no match is found
            // (e.g. name changed elsewhere) it falls back to unselected.
            const matchedOrg = organizations.find(o => o.name === letter.organization);
            setSelectedOrganizationId(matchedOrg?.id || 0);
        }
    }, [letter, organizations]);

    const toggleDept = (id: number) =>
        setSelectedDeptIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

    const toggleAssignee = (id: number) =>
        setSelectedAssigneeIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    const handleSave = async () => {
        if (!letter) return;
        try {
            setIsSaving(true);
            await api.put(`/v1/letter/assignment/${letter.id}`, {
                department_ids: selectedDeptIds,
                assignee_ids: selectedAssigneeIds,
                organization_id: selectedOrganizationId || undefined,   // NEW
                subject: subjectText,   // NEW
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
            {/* CHANGED — the dialog is now capped to the viewport height with
                a fixed header and footer; only the middle section (the form
                fields) scrolls internally. This keeps the title and the
                Save/Cancel buttons always visible instead of the whole
                dialog growing taller than the screen and scrolling the page
                behind it. */}
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                    <DialogTitle>Quick Edit — {letter?.code}</DialogTitle>
                    <DialogDescription>
                        Update the organization, subject, departments, or assignees for this letter without leaving the list.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-2 overflow-y-auto flex-1 min-h-0">
                    {/* NEW — Organization */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Sender/Organization</label>
                        <Select
                            value={selectedOrganizationId ? selectedOrganizationId.toString() : ""}
                            onValueChange={(v) => setSelectedOrganizationId(parseInt(v) || 0)}
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

                    {/* NEW — Subject/Content of the Letter.
                        CHANGED — uses a taller Textarea (instead of a single-line
                        Input) so the full subject/content is visible while editing,
                        rather than being scrolled/cut off inside a short box. */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Subject/Content of the Letter</label>
                        <Textarea
                            placeholder="Subject/Content of the Letter"
                            value={subjectText}
                            onChange={(e) => setSubjectText(e.target.value)}
                            className="w-full min-h-[140px] resize-y"
                        />
                    </div>

                    {/* Departments */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Departments</label>
                        {selectedDeptIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {selectedDeptIds.map(id => {
                                    const d = departments.find(x => x.id === id);
                                    return d ? (
                                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                                            {d.name}
                                            <button type="button" onClick={() => toggleDept(id)} className="ml-0.5 hover:text-destructive">
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                        <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                            {departments.length === 0 ? (
                                <p className="text-sm text-muted-foreground col-span-2">No departments available</p>
                            ) : departments.map(d => (
                                <div key={d.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`qe-dept-${d.id}`}
                                        checked={selectedDeptIds.includes(d.id)}
                                        onCheckedChange={() => toggleDept(d.id)}
                                    />
                                    <label htmlFor={`qe-dept-${d.id}`} className="text-sm cursor-pointer">{d.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assignees */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Assignees</label>
                        {selectedAssigneeIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {selectedAssigneeIds.map(id => {
                                    const a = assignees.find(x => x.id === id);
                                    return a ? (
                                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                                            {a.name}
                                            <button type="button" onClick={() => toggleAssignee(id)} className="ml-0.5 hover:text-destructive">
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                        <div className="space-y-2 border rounded-md p-3">
                            {/* NEW — narrow by Department, then Sub-Unit, plus free-text search */}
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    value={assigneeDeptFilter ? assigneeDeptFilter.toString() : "0"}
                                    onValueChange={(v) => setAssigneeDeptFilter(parseInt(v) || 0)}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Filter by department"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">All sections</SelectItem>
                                        {departments.map(d => (
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
                                        />
                                        <label htmlFor={`qe-assignee-${a.id}`} className="text-sm cursor-pointer">{a.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
    const {hasPermission} = useAuthStore();

    // Delete dialog state
    const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // NEW — quick-edit dialog state (assignee/department/organization/subject shortcut from the table)
    const [letterToQuickEdit, setLetterToQuickEdit] = useState<Letter | null>(null);

    // NEW — row selection for bulk export of only the chosen letters
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        const fetchDropdownData = async (): Promise<void> => {
            try {
                const [deptResponse, statusResponse, assigneeResponse, orgResponse] = await Promise.all([
                    api.get('/v1/department/list'),
                    api.get('/v1/status/list'),
                    api.get('/v1/system_user/names'),
                    api.get('/v1/organization/list')
                ]);

                const [deptData, statusData, assigneeData, orgData] = await Promise.all([
                    deptResponse.data,
                    statusResponse.data,
                    assigneeResponse.data,
                    orgResponse.data
                ]);

                if (deptData.success) setDepartments(deptData.data);
                if (statusData.success) setStatuses(statusData.data);
                if (assigneeData.success) setAssignees(assigneeData.data);
                if (orgData.success) setOrganizations(orgData.data);

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
            create_date_start: debouncedFilters.create_date_start || null,
            create_date_end: debouncedFilters.create_date_end || null,
            other: debouncedFilters.other || "",
        };

        try {
            setIsLoading(true);

            const [lettersResponse, statsResponse] = await Promise.all([
                fetchLettersFromApi(currentPage, pageSize, filters),
                fetchLetterStats()
            ]);

            setLetters(lettersResponse.data);
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
                : (typeof prev[filterName] === 'string' ? '' : 0)
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
                                        department: "Department",
                                        assignee: "Assignee",
                                        date: "Received Date",
                                        status: "Status",
                                        other: "Other",
                                    }).map(([key, label]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={columnVisibility[key as keyof ColumnVisibility]}
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
                                    {/* NEW — Search by Assignee, always available regardless of
                                        whether the Assignee column itself is toggled on */}
                                    <div className="relative">
                                        <Select
                                            value={inputFilters.assignee_id !== 0 ? inputFilters.assignee_id.toString() : ""}
                                            onValueChange={(value) => setInputFilters((prev) => ({
                                                ...prev,
                                                assignee_id: parseInt(value) || 0,
                                            }))}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Search by Assignee"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assignees.map((a) => (
                                                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                    {columnVisibility.status && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.status_id !== 0 ? inputFilters.status_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    status_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a Status"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.status_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('status_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
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
                                </div>
                            )}

                            <div className="rounded-md border">
                                <Table className="overflow-x-auto min-w-max w-full mb-2">
                                    <TableHeader>
                                        <TableRow>
                                            {/* NEW — select-all checkbox for the current page */}
                                            <TableHead className="w-[40px] text-center">
                                                <Checkbox
                                                    checked={allOnPageSelected}
                                                    onCheckedChange={(checked) => toggleSelectAllOnPage(!!checked)}
                                                    aria-label="Select all letters on this page"
                                                    disabled={letters.length === 0}
                                                />
                                            </TableHead>
                                            {columnVisibility.id && <TableHead className="w-[50px] text-center">ID</TableHead>}
                                            {columnVisibility.code && <TableHead className="w-[150px]">Code</TableHead>}
                                            {columnVisibility.organization && <TableHead className="w-[250px]">Sender/Organization of the letter</TableHead>}
                                            {/* CHANGED — no longer width-constrained, since the cell below now shows the full, unwrapped-limit content */}
                                            {columnVisibility.title && <TableHead className="min-w-[320px]">Subject/Content of the Letter</TableHead>}
                                            {columnVisibility.department && <TableHead className="w-[250px]">Department</TableHead>}
                                            {columnVisibility.assignee && <TableHead className="w-[150px]">Assignee</TableHead>}
                                            {columnVisibility.date && <TableHead className="w-[150px]">Received Date</TableHead>}
                                            {columnVisibility.status && <TableHead className="w-[150px] text-center">Status</TableHead>}
                                            {columnVisibility.other && <TableHead className="w-[250px]">Cheque no /Money Order No</TableHead>}
                                            {/* Actions column — always visible */}
                                            <TableHead className="w-[120px] text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {isLoading ? (
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={11} className="h-80 text-center p-0">
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
                                                    <TableCell className="text-center w-[40px]">
                                                        <Checkbox
                                                            checked={selectedIds.includes(item.id)}
                                                            onCheckedChange={(checked) => toggleSelectRow(item.id, !!checked)}
                                                            aria-label={`Select letter ${item.code}`}
                                                        />
                                                    </TableCell>
                                                    {columnVisibility.id && (
                                                        <TableCell className="text-center w-[50px]">
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
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{item.code}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.organization && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item.organization || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {/* CHANGED — full Subject/Content is now shown in the table
                                                        instead of being truncated to one line; text wraps within
                                                        the cell so the whole letter content is readable at a glance. */}
                                                    {columnVisibility.title && (
                                                        <TableCell className="min-w-[320px] align-top">
                                                            <div className="whitespace-pre-wrap break-words">{item.subject}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.department && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item?.department || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.assignee && (
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{item?.assignee || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.date && (
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{formatDate(item.create_datetime)}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.status && (
                                                        <TableCell className="text-center w-[150px]">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(item.status)}`}>
                                                                {item?.status || "No Status"}
                                                                {typeof item.status_days === 'number' && (
                                                                    <span className="ml-1 opacity-75">· {item.status_days}d</span>
                                                                )}
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.other && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item.other || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {/* Actions cell */}
                                                    <TableCell className="text-center w-[120px]">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => router.push(`/letters/${item.id}`)}
                                                                aria-label={`View letter ${item.code}`}
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
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
                                                <TableCell colSpan={11} className="h-90 text-center">
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
                Organization + Subject/Content of the Letter. */}
            <QuickEditLetterDialog
                letter={letterToQuickEdit}
                departments={departments}
                assignees={assignees}
                organizations={organizations}
                onClose={() => setLetterToQuickEdit(null)}
                onSaved={handleRefresh}
            />
        </div>
    );
}