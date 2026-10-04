import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Check, ChevronsUpDown} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {format} from "date-fns";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {cn} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {CalendarIcon, GripHorizontal, Loader2, Plus, X} from "lucide-react";
import {toast} from "sonner";
import {ACCEPTED_FILE_TYPES, CORE_API_URL, MAX_FILE_SIZE} from "@/lib/client-config";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";
import {Checkbox} from "@/components/ui/checkbox";
import {formatFileSize} from "@/app/(dashboard)/letters/[id]/attachment-preview";

// Subject/Content limit (characters)
const SUBJECT_MAX_LENGTH = 3000;

const fileSchema = z.custom<File>()
    .refine((file) => file instanceof File, "Must be a file")
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1000000}MB`)
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), `File type must be one of: ${ACCEPTED_FILE_TYPES.join(", ")}`);

const remarkFormSchema = z.object({
    receivedDate: z.date({required_error: "Received date is required"}),
    code: z.string().min(1, "Code is required").max(15, "Code cannot exceed 15 characters"),
    source: z.number().min(1, "Source is required"),
    sourceName: z.string().optional(),
    sourceCode: z.string().optional(),
    sender: z.string().max(150, "Sender's Address cannot exceed 150 characters").optional(),
    organization: z.number().optional(),
    subject: z.string().min(1, "Subject is required").max(SUBJECT_MAX_LENGTH, `Subject/Content cannot exceed ${SUBJECT_MAX_LENGTH} characters`),
    email: z.string().email("Invalid email format").max(150).optional().or(z.literal("")),
    telephone: z.string().min(10, "Telephone number must be at least 10 digits").max(15).optional().or(z.literal("")),
    other: z.string().max(500).optional(),
    sender_subject_no: z.string().max(50, "Sender's Subject No cannot exceed 50 characters").optional(),
    is_public_complaint: z.boolean().default(false),
    registered_post_no: z.string().max(50, "Registered Postal Number cannot exceed 50 characters").optional(),
    assignee_ids: z.array(z.number()).optional().default([]),
    department_ids: z.array(z.number()).optional().default([]),
    attachments: z.array(z.object({
        file: fileSchema,
        name: z.string().min(1, "File name is required").max(50),
    })).max(5, "Maximum 5 files allowed").optional().default([]),
})
    .refine((data) => data.sender || data.organization, {
        message: "Either Sender's Address or Sender/Organization of the letter must be provided",
        path: ["sender"],
    })
    .refine((data) => data.sourceCode !== "REGISTERED_POST" || !!data.registered_post_no?.trim(), {
        message: "Registered Postal Number is required when Source is Registered Post",
        path: ["registered_post_no"],
    });

type RemarkFormValues = z.infer<typeof remarkFormSchema>;

// One place for a completely blank form — used for defaultValues AND for every
// reset(), so nothing from the previous letter (sender, email, address, source,
// assignees ...) can survive into the next one.
const getEmptyValues = (): RemarkFormValues => ({
    receivedDate: new Date(),
    code: "",
    source: undefined as unknown as number,
    sourceName: "",
    sourceCode: "",
    sender: "",
    organization: undefined,
    subject: "",
    email: "",
    telephone: "",
    other: "",
    sender_subject_no: "",
    registered_post_no: "",
    is_public_complaint: false,
    assignee_ids: [],
    department_ids: [],
    attachments: [],
});

interface Organization {
    id: number;
    name: string;
    address?: string;
    email?: string;
    telephone?: string;
}

interface InsertLetterModalProps {
    organizations: Organization[];
    onOrganizationAdded?: (org: Organization) => void;
    onSuccess?: () => void;
}

export function InsertLetterModal({organizations, onSuccess, onOrganizationAdded}: InsertLetterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [departments, setDepartments] = useState<{id: number; name: string}[]>([]);
    const [assignees, setAssignees] = useState<{id: number; name: string; department_id?: number | null; department_unit_id?: number | null}[]>([]);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgAddress, setNewOrgAddress] = useState("");
    const [newOrgEmail, setNewOrgEmail] = useState("");
    const [newOrgTelephone, setNewOrgTelephone] = useState("");
    const [newOrgFax, setNewOrgFax] = useState("");
    const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [orgSearch, setOrgSearch] = useState("");
    const [sourceSearch, setSourceSearch] = useState("");
    const [isAddingOrg, setIsAddingOrg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const orgListRef = useRef<HTMLDivElement>(null);
    const sourceListRef = useRef<HTMLDivElement>(null);
    const {hasPermission} = useAuthStore();
    const [sources, setSources] = useState<{id: number; name: string; code?: string}[]>([]);
    const [initialsByCandidates, setInitialsByCandidates] = useState<{id: number; name: string; is_default: boolean}[]>([]);
    const [selectedInitialsByUserId, setSelectedInitialsByUserId] = useState<number>(0);
    const [isEditingDepts, setIsEditingDepts] = useState(false);
    const [isEditingAssignees, setIsEditingAssignees] = useState(false);
    const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);
    const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
    const [departmentAccounts, setDepartmentAccounts] = useState<{
        id: number;
        department_id: number;
        department_name: string;
        department_unit_id?: number | null;
        department_unit_name?: string | null;
        email: string;
    }[]>([]);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [selectedSenderLabel, setSelectedSenderLabel] = useState<string>("");

    // Assignee filters: pick a Section, then a Sub-Unit (if it has any), and/or search by name
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

    // --- Draggable dialog -----------------------------------------------
    const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
    const dragStateRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!dragStateRef.current) return;
        const {startX, startY, offsetX, offsetY} = dragStateRef.current;
        setDragOffset({x: offsetX + (e.clientX - startX), y: offsetY + (e.clientY - startY)});
    }, []);

    const handleDragEnd = useCallback(() => {
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
    }, [handleDragMove]);

    const handleDragStart = (e: React.MouseEvent) => {
        dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            offsetX: dragOffset.x,
            offsetY: dragOffset.y,
        };
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [handleDragMove, handleDragEnd]);
    // ----------------------------------------------------------------------

    const form = useForm<RemarkFormValues>({
        resolver: zodResolver(remarkFormSchema),
        defaultValues: getEmptyValues(),
    });

    const {control, handleSubmit, setValue, watch, reset} = form;
    const attachments = watch("attachments");
    const selectedDepartmentIds = watch("department_ids") || [];
    const selectedAssigneeIds = watch("assignee_ids") || [];
    const subjectValue = watch("subject") || "";
    const otherValue = watch("other") || "";

    const isRegisteredPost = watch("sourceCode") === "REGISTERED_POST";

    // CHANGED — Assignees are NOT all dumped into the list any more.
    // They only appear once a Section is ticked in "Sections", or a section /
    // sub-unit is picked in the filter below, or a name is typed in the search.
    const selectedSectionPairs = selectedDepartmentIds
        .map(id => departmentAccounts.find(d => d.id === id))
        .filter((d): d is NonNullable<typeof d> => !!d)
        .map(d => ({dept: d.department_id, unit: d.department_unit_id ?? null}));

    const hasAssigneeScope =
        selectedSectionPairs.length > 0 || !!assigneeDeptFilter || !!assigneeSearch.trim();

    const filteredAssignees = !hasAssigneeScope ? [] : assignees.filter(a =>
        (assigneeDeptFilter
            ? true   // the filter dropdown overrides the ticked sections
            : selectedSectionPairs.length === 0 ||
              selectedSectionPairs.some(p =>
                  a.department_id === p.dept &&
                  (p.unit === null || (a.department_unit_id ?? null) === p.unit))) &&
        (!assigneeDeptFilter || a.department_id === assigneeDeptFilter) &&
        (!assigneeUnitFilter || a.department_unit_id === assigneeUnitFilter) &&
        (!assigneeSearch.trim() || a.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
    );

    const fetchLetterCode = useCallback(async (receivedDate: Date) => {
        try {
            const formattedDate = receivedDate.toISOString();
            const response = await api.get(`/v1/letter/code/${encodeURIComponent(formattedDate)}`);
            setValue('code', response.data.data);
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [setValue]);

    useEffect(() => {
        if (isOpen && !isLoading) {
            const fetchData = async () => {
                try {
                    const [sourcesRes, deptRes, assigneeRes, deptAccountsRes, initialsByRes] = await Promise.all([
                        api.get('/v1/source/list'),
                        api.get('/v1/department/list'),
                        api.get('/v1/system_user/names'),
                        api.get('/v1/system_user/department-accounts'),
                        api.get('/v1/system_user/by-permission/letter.initials_by'),
                    ]);
                    setSources(sourcesRes.data.data || []);
                    setDepartments(deptRes.data.data || []);
                    setAssignees(assigneeRes.data.data || []);
                    setDepartmentAccounts(deptAccountsRes.data.data || []);
                    const candidates = initialsByRes.data.success ? initialsByRes.data.data : [];
                    setInitialsByCandidates(candidates);
                    // pre-select the default candidate as a convenience only
                    const defaultCandidate = candidates.find(c => c.is_default);
                    setSelectedInitialsByUserId(defaultCandidate?.id || 0);
                    await fetchLetterCode(new Date());
                    setIsLoading(true);
                } catch (error) {
                    toast.error(error.response?.data.message || 'Something went wrong. Please try again');
                }
            };
            fetchData().catch(console.error);
        }
    }, [isOpen, isLoading, fetchLetterCode]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        // the Received Date must be the real "now" of when the dialog opens,
        // not the time the dashboard page was first mounted
        if (open) {
            setValue('receivedDate', new Date());
        }
        if (!open) {
            reset(getEmptyValues());
            setIsLoading(false);
            setOrgSearch("");
            setSourceSearch("");
            setIsAddingOrg(false);
            setNewOrgName("");
            setNewOrgAddress("");
            setNewOrgEmail("");
            setNewOrgTelephone("");
            setNewOrgFax("");
            setIsEditingDepts(false);
            setIsEditingAssignees(false);
            setDatePopoverOpen(false);
            setSelectedSenderLabel("");
            setDragOffset({x: 0, y: 0});
            setAssigneeDeptFilter(0);
            setAssigneeUnitFilter(0);
            setAssigneeSearch("");
            setSelectedInitialsByUserId(0);
        }
    };

    // The ONLY place the sender fields are written. EVERY field is always
    // overwritten (empty string when the sender has no value), so nothing from
    // the previously selected sender can stay behind.
    const applySender = (v: {organization?: number; sender: string; email: string; telephone: string; label: string}) => {
        const opts = {shouldDirty: true, shouldValidate: true};
        setValue('organization', v.organization, opts);
        setValue('sender', v.sender, opts);
        setValue('email', v.email, opts);
        setValue('telephone', v.telephone, opts);
        setSelectedSenderLabel(v.label);
    };

    const resetNewOrgForm = () => {
        setNewOrgName("");
        setNewOrgAddress("");
        setNewOrgEmail("");
        setNewOrgTelephone("");
        setNewOrgFax("");
        setIsAddingOrg(false);
        setOrgPopoverOpen(false);
        setOrgSearch("");
    };

    const handleAddOrganization = async () => {
        if (!newOrgName.trim() || isSubmittingOrg) return;

        // block duplicate organization names (case-insensitive)
        const existing = organizations.find(
            o => o.name.trim().toLowerCase() === newOrgName.trim().toLowerCase()
        );
        if (existing) {
            toast.error(`"${existing.name}" already exists — selecting it instead`);
            applySender({
                organization: existing.id,
                sender: existing.address || '',
                email: existing.email || '',
                telephone: existing.telephone || '',
                label: existing.name,
            });
            resetNewOrgForm();
            return;
        }

        setIsSubmittingOrg(true);
        try {
            const res = await api.post('/v1/organization/', {
                name: newOrgName.trim(),
                address: newOrgAddress.trim() || null,
                email: newOrgEmail.trim() || null,
                telephone: newOrgTelephone.trim() || null,
                fax_no: newOrgFax.trim() || null,
            });
            const newOrg = res.data.data;
            onOrganizationAdded?.(newOrg);
            // CHANGED — before, `if (newOrg.email) setValue(...)` meant a new
            // organization WITHOUT an email/address kept the PREVIOUS sender's values
            applySender({
                organization: newOrg.id,
                sender: newOrg.address || '',
                email: newOrg.email || '',
                telephone: newOrg.telephone || '',
                label: newOrg.name,
            });
            resetNewOrgForm();
            toast.success("Organization added successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add organization');
        } finally {
            setIsSubmittingOrg(false);
        }
    };

    const toggleDepartment = (id: number) => {
        const updated = selectedDepartmentIds.includes(id)
            ? selectedDepartmentIds.filter(d => d !== id)
            : [...selectedDepartmentIds, id];
        setValue('department_ids', updated);
    };

    // CHANGED — an assignee's own section is ALWAYS added to "Sections"
    // (not only when no section had been picked yet). The backend routes it too.
    const toggleAssignee = (id: number) => {
        const isAdding = !selectedAssigneeIds.includes(id);
        setValue('assignee_ids',
            isAdding ? [...selectedAssigneeIds, id] : selectedAssigneeIds.filter(a => a !== id));

        if (isAdding) {
            const assignee = assignees.find(a => a.id === id);
            if (assignee?.department_id) {
                const match = departmentAccounts.find(da =>
                    da.department_id === assignee.department_id &&
                    (da.department_unit_id ?? null) === (assignee.department_unit_id ?? null));
                if (match && !selectedDepartmentIds.includes(match.id)) {
                    setValue('department_ids', [...selectedDepartmentIds, match.id]);
                }
            }
        }
    };

    async function onSubmit(data: RemarkFormValues) {
        setIsSubmitting(true);
        try {
            // the Cheque No / Money Order No is also saved inside Subject/Content,
            // on its own line (`other` is still stored separately for its own filter)
            const finalSubject = data.other?.trim()
                ? `${data.subject}\n(Cheque No / Money Order No: ${data.other.trim()})`
                : data.subject;

            const letterPayload = {
                code: data.code,
                received_datetime: data.receivedDate.toISOString(),
                subject: finalSubject,
                other: data.other || null,
                sender_subject_no: data.sender_subject_no || null,
                registered_post_no: data.registered_post_no || null,
                sender: data.sender || null,
                email: data.email || null,
                telephone: data.telephone || null,
                organization_id: data.organization || null,
                source_id: data.source,
                is_public_complaint: data.is_public_complaint,
                initials_by_pending_user_id: selectedInitialsByUserId || null,
                assignee_ids: data.assignee_ids || [],
                department_ids: data.department_ids || [],
            };

            const letterRes = await api.post('/v1/letter/', letterPayload);
            const letter = letterRes.data;
            const letterId = letter.data.id;

            if (data.attachments && data.attachments.length > 0) {
                const formData = new FormData();
                data.attachments.forEach(attachment => {
                    const ext = attachment.file.name.substring(attachment.file.name.lastIndexOf('.'));
                    let customFileName = attachment.name;
                    if (!customFileName.endsWith(ext)) customFileName += ext;
                    formData.append('attachments', new File([attachment.file], customFileName, {type: attachment.file.type}));
                });
                await api.post(`${CORE_API_URL}/v1/letter/${letterId}/attachments`, formData, {
                    headers: {'Content-Type': 'multipart/form-data'}
                });
            }

            toast.success("Letter Inserted", {description: `Letter ${letter.data.code} has been successfully inserted.`});

            // Keep the dialog open so several letters can be added back-to-back.
            // Everything — form values AND local UI state — goes back to blank.
            reset(getEmptyValues());
            setSelectedSenderLabel("");
            setIsEditingDepts(false);
            setIsEditingAssignees(false);
            setAssigneeDeptFilter(0);
            setAssigneeUnitFilter(0);
            setAssigneeSearch("");
            setOrgSearch("");
            setSourceSearch("");
            setSelectedInitialsByUserId(initialsByCandidates.find(c => c.is_default)?.id || 0);
            if (fileInputRef.current) fileInputRef.current.value = "";
            await fetchLetterCode(new Date());
            onSuccess?.();

        } catch (error) {
            console.error(error.message);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        try {
            const newFiles = files.map(file => ({file, name: file.name.substring(0, file.name.lastIndexOf('.'))}));
            setValue("attachments", [...(attachments || []), ...newFiles], {shouldValidate: true});
        } catch (error) {
            console.error("Error handling file change:", error);
        }
    };

    const removeAttachment = (index: number) => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setValue("attachments", attachments?.filter((_, i) => i !== index) || [], {shouldValidate: true});
    };

    const subjectRemaining = SUBJECT_MAX_LENGTH - subjectValue.length;
    const subjectNearLimit = subjectRemaining <= 100;
    const subjectExceeded = subjectRemaining < 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={!hasPermission('letter.create')}>
                    <Plus className="mr-2 h-4 w-4"/>New Letter
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[830px] max-h-[90vh] overflow-y-auto"
                style={{
                    marginLeft: dragOffset.x,
                    marginTop: dragOffset.y,
                }}
            >
                {/* Drag handle -- grab the header to move the dialog out of the way */}
                <div
                    onMouseDown={handleDragStart}
                    className="flex items-center justify-center -mt-2 -mx-6 mb-1 cursor-grab active:cursor-grabbing select-none"
                    title="Drag to move this window"
                >
                    <GripHorizontal className="h-4 w-4 text-muted-foreground/50"/>
                </div>
                <DialogHeader>
                    <DialogTitle>Insert Letter</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Fill in the details below to add a new letter.
                    </DialogDescription>
                </DialogHeader>
                <hr className="my-2 border-t border-gray-300"/>
                {isOpen && (
                    <>
                        {!isLoading ? (
                            <div className="flex items-center justify-center h-[400px]">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <Form {...form}>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                    {/* Received Date */}
                                    <FormField control={control} name="receivedDate" render={({field}) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Received Date</FormLabel>
                                            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const normalizedDate = new Date(Date.UTC(
                                                                    date.getFullYear(),
                                                                    date.getMonth(),
                                                                    date.getDate(),
                                                                    12, 0, 0     // "noon UTC" so the day never shifts with timezone
                                                                ));
                                                                field.onChange(normalizedDate);
                                                                fetchLetterCode(normalizedDate).catch(console.error);
                                                            }
                                                            setDatePopoverOpen(false);
                                                        }}
                                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                        initialFocus/>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Code */}
                                    <FormField control={control} name="code" render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={isSubmitting}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Source | Public Complaint (side by side) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField control={control} name="source" render={({field}) => (
                                            <FormItem className="w-full">
                                                <FormLabel>Source</FormLabel>
                                                <Popover open={sourcePopoverOpen} onOpenChange={setSourcePopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" disabled={isSubmitting}
                                                                className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                                                <span className="truncate text-start">
                                                                    {field.value ? sources.find(s => s.id === field.value)?.name : "Select source"}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command filter={() => 1}>
                                                            <CommandInput placeholder="Search source..." value={sourceSearch} onValueChange={setSourceSearch}/>
                                                            <CommandList
                                                                ref={sourceListRef}
                                                                onWheel={(e) => {
                                                                    if (sourceListRef.current) {
                                                                        sourceListRef.current.scrollTop += e.deltaY;
                                                                    }
                                                                }}
                                                            >
                                                                <CommandEmpty>No source found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {field.value && (
                                                                        <CommandItem onSelect={() => {
                                                                            field.onChange(undefined);
                                                                            setValue('sourceName', '');
                                                                            setValue('sourceCode', '');
                                                                            setValue('registered_post_no', '');
                                                                            setSourcePopoverOpen(false);
                                                                        }} className="text-muted-foreground">
                                                                            Clear selection
                                                                        </CommandItem>
                                                                    )}
                                                                    {sources.filter(s => !sourceSearch || s.name.toLowerCase().includes(sourceSearch.toLowerCase())).map(src => (
                                                                        <CommandItem key={src.id} value={src.id.toString()}
                                                                            onSelect={() => {
                                                                                field.onChange(src.id);
                                                                                setValue('sourceName', src.name);
                                                                                setValue('sourceCode', src.code);
                                                                                if (src.code !== "REGISTERED_POST") {
                                                                                    setValue('registered_post_no', '');
                                                                                }
                                                                                setSourcePopoverOpen(false);
                                                                                setSourceSearch("");
                                                                            }}>
                                                                            <Check className={cn("mr-2 h-4 w-4", field.value === src.id ? "opacity-100" : "opacity-0")}/>
                                                                            {src.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={control} name="is_public_complaint" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Is this a Public Complaint? (මහජන පැමිණිල්ලක්ද?)</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Button type="button" variant={field.value ? "default" : "outline"} className="flex-1"
                                                            disabled={isSubmitting} onClick={() => field.onChange(true)}>Yes</Button>
                                                        <Button type="button" variant={!field.value ? "default" : "outline"} className="flex-1"
                                                            disabled={isSubmitting} onClick={() => field.onChange(false)}>No</Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>

                                    {/* Sender/Organization of the Letter */}
                                    <FormField control={control} name="organization" render={({field}) => {
                                        const search = orgSearch.toLowerCase();
                                        const filteredOrgs = organizations.filter(o => !search || o.name.toLowerCase().includes(search));
                                        const filteredUsers = assignees.filter(a => !search || a.name.toLowerCase().includes(search));
                                        const selectedOrgName = field.value ? organizations.find(o => o.id === field.value)?.name : null;
                                        // falls back to the tracked label (covers the "person" case)
                                        const displayLabel = selectedOrgName || selectedSenderLabel;

                                        return (
                                            <FormItem className="w-full">
                                                <FormLabel>Sender/Organization of the Letter</FormLabel>
                                                <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" disabled={isSubmitting}
                                                                className={cn("w-full justify-between font-normal", !displayLabel && "text-muted-foreground")}>
                                                                <span className="truncate text-start">
                                                                    {displayLabel || "Select organization or person"}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className={cn("p-0", isAddingOrg ? "w-[420px]" : "w-[--radix-popover-trigger-width]")} align="start">
                                                        <Command filter={() => 1}>
                                                            {!isAddingOrg && (
                                                                <>
                                                                    <CommandInput placeholder="Search organization or person..." value={orgSearch} onValueChange={setOrgSearch}/>
                                                                    <CommandList ref={orgListRef} className="max-h-[320px] overflow-y-auto overscroll-contain"
                                                                        onWheel={(e) => { if (orgListRef.current) orgListRef.current.scrollTop += e.deltaY; }}>
                                                                        <CommandEmpty>No organization or person found.</CommandEmpty>

                                                                        {(field.value || selectedSenderLabel) && (
                                                                            <CommandGroup>
                                                                                <CommandItem onSelect={() => {
                                                                                    applySender({organization: undefined, sender: '', email: '', telephone: '', label: ''});
                                                                                    setOrgPopoverOpen(false);
                                                                                }} className="text-muted-foreground">
                                                                                    Clear selection
                                                                                </CommandItem>
                                                                            </CommandGroup>
                                                                        )}

                                                                        {filteredOrgs.length > 0 && (
                                                                            <CommandGroup heading="Organizations">
                                                                                {filteredOrgs.map(org => (
                                                                                    <CommandItem key={`org-${org.id}`} value={`org-${org.id}`}
                                                                                        onSelect={() => {
                                                                                            applySender({
                                                                                                organization: org.id,
                                                                                                sender: org.address || '',
                                                                                                email: org.email || '',
                                                                                                telephone: org.telephone || '',
                                                                                                label: org.name,
                                                                                            });
                                                                                            setOrgPopoverOpen(false);
                                                                                            setOrgSearch("");
                                                                                        }}>
                                                                                        <Check className={cn("mr-2 h-4 w-4", field.value === org.id ? "opacity-100" : "opacity-0")}/>
                                                                                        {org.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        )}

                                                                        {filteredUsers.length > 0 && (
                                                                            <CommandGroup heading="System Users">
                                                                                {filteredUsers.map(user => (
                                                                                    <CommandItem key={`user-${user.id}`} value={`user-${user.id}`}
                                                                                        onSelect={() => {
                                                                                            applySender({organization: undefined, sender: user.name, email: '', telephone: '', label: user.name});
                                                                                            setOrgPopoverOpen(false);
                                                                                            setOrgSearch("");
                                                                                        }}>
                                                                                        <Check className="mr-2 h-4 w-4 opacity-0"/>
                                                                                        {user.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        )}
                                                                    </CommandList>
                                                                </>
                                                            )}

                                                            {/* the "Add new organization" footer */}
                                                            <div className={cn("p-2", !isAddingOrg && "border-t")}>
                                                                {isAddingOrg ? (
                                                                    <div className="flex flex-col gap-2 p-1">
                                                                        <Input placeholder="Organization name..." value={newOrgName}
                                                                            onChange={(e) => setNewOrgName(e.target.value)} className="h-8 text-sm" autoFocus/>
                                                                        <Input placeholder="Address " value={newOrgAddress}
                                                                            onChange={(e) => setNewOrgAddress(e.target.value)} className="h-8 text-sm"/>
                                                                        <Input placeholder="Email " value={newOrgEmail}
                                                                            onChange={(e) => setNewOrgEmail(e.target.value)} className="h-8 text-sm"/>
                                                                        <Input placeholder="Telephone " value={newOrgTelephone}
                                                                            onChange={(e) => setNewOrgTelephone(e.target.value)} className="h-8 text-sm"/>
                                                                        <Input placeholder="Fax No " value={newOrgFax}
                                                                            onChange={(e) => setNewOrgFax(e.target.value)} className="h-8 text-sm"
                                                                            disabled={isSubmittingOrg}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') { e.preventDefault(); handleAddOrganization(); }
                                                                                if (e.key === 'Escape') {
                                                                                    setIsAddingOrg(false);
                                                                                    setNewOrgName(""); setNewOrgAddress(""); setNewOrgEmail("");
                                                                                    setNewOrgTelephone(""); setNewOrgFax("");
                                                                                }
                                                                            }}/>
                                                                        <div className="flex gap-2 justify-end mt-1">
                                                                            <Button type="button" size="sm" variant="ghost" className="h-8" disabled={isSubmittingOrg}
                                                                                onClick={() => {
                                                                                    setIsAddingOrg(false);
                                                                                    setNewOrgName(""); setNewOrgAddress(""); setNewOrgEmail("");
                                                                                    setNewOrgTelephone(""); setNewOrgFax("");
                                                                                }}>
                                                                                <X className="h-4 w-4"/>
                                                                            </Button>
                                                                            <Button type="button" size="sm" className="h-8" onClick={handleAddOrganization}
                                                                                disabled={!newOrgName.trim() || isSubmittingOrg}>
                                                                                {isSubmittingOrg ? <Loader2 className="h-4 w-4 animate-spin"/> : "Add"}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Button type="button" variant="ghost"
                                                                        className="w-full h-8 text-sm justify-start text-muted-foreground hover:text-foreground"
                                                                        onClick={() => setIsAddingOrg(true)}>
                                                                        <Plus className="mr-2 h-4 w-4"/>Add new organization
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage/>
                                            </FormItem>
                                        );
                                    }}/>

                                    {/* Registered Postal Number — shown only when Source = "Registered Post" */}
                                    {isRegisteredPost && (
                                        <FormField control={control} name="registered_post_no" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Registered Postal Number <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} disabled={isSubmitting} placeholder="Enter registered postal number"/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    )}

                                    {/* Sender's Address */}
                                    <FormField control={control} name="sender" render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Sender&apos;s Address</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={isSubmitting} placeholder="Enter sender's address"/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Email | Telephone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField control={control} name="email" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Enter sender's email" disabled={isSubmitting}/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={control} name="telephone" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Telephone</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Telephone Number or Fax Number" disabled={isSubmitting}/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>

                                    {/* Cheque No / Money Order No | Sender's Subject No */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField control={control} name="other" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Cheque No / Money Order No</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} disabled={isSubmitting} placeholder="CH- Cheque Number, MO- Money Order Number" className="min-h-[38px] h-[38px] resize-none"/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={control} name="sender_subject_no" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Sender&apos;s Subject No</FormLabel>
                                                <FormControl>
                                                    <Input {...field} disabled={isSubmitting} placeholder="Enter sender's subject number"/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>

                                    {/* Subject/Content of the Letter */}
                                    <FormField control={control} name="subject" render={({field}) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Subject/Content of the Letter</FormLabel>
                                                <span className={cn(
                                                    "text-xs",
                                                    subjectExceeded ? "text-destructive font-medium" : subjectNearLimit ? "text-amber-600" : "text-muted-foreground"
                                                )}>
                                                    {subjectValue.length}/{SUBJECT_MAX_LENGTH}
                                                </span>
                                            </div>
                                            <FormControl>
                                                <Textarea {...field} disabled={isSubmitting}
                                                    placeholder="Enter subject or content of the letter"
                                                    className="min-h-[160px]"/>
                                            </FormControl>

                                            {otherValue.trim() && (
                                                <div className="rounded-md border bg-muted/30 p-2.5 text-sm">
                                                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                                                        This will be saved as (Cheque No / Money Order No appended on its own line)
                                                    </span>
                                                    <p className="whitespace-pre-wrap">
                                                        {field.value}
                                                        {"\n"}
                                                        <span className="font-medium">(Cheque No / Money Order No: {otherValue.trim()})</span>
                                                    </p>
                                                </div>
                                            )}
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Optional: send an Initials By confirmation request right away.
                                        Pre-selected to the default candidate for convenience. */}
                                    <div className="space-y-2">
                                        <FormLabel>Send for Initials Confirmation (optional)</FormLabel>
                                        <Select
                                            value={selectedInitialsByUserId ? selectedInitialsByUserId.toString() : "none"}
                                            onValueChange={(v) => setSelectedInitialsByUserId(v === "none" ? 0 : parseInt(v))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Don't send yet"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Don&apos;t send yet</SelectItem>
                                                {initialsByCandidates.map(c => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name}{c.is_default ? ' (default)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedInitialsByUserId
                                                ? "A confirmation request will be sent to this person as soon as the letter is created."
                                                : "No request will be sent now — you can send one later from the letter's page."}
                                        </p>
                                    </div>

                                    {/* Sections multi-select */}
                                    <FormField control={control} name="department_ids" render={() => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Sections</FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => setIsEditingDepts(prev => !prev)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isEditingDepts ? 'Done' : 'Edit'}
                                                </Button>
                                            </div>

                                            {selectedDepartmentIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedDepartmentIds.map(accId => {
                                                        const da = departmentAccounts.find(d => d.id === accId);
                                                        return da ? (
                                                            <Badge key={accId} variant="secondary" className="text-xs gap-1">
                                                                {da.department_unit_name || da.department_name}
                                                                {isEditingDepts && (
                                                                    <button type="button" onClick={() => toggleDepartment(accId)} className="ml-0.5 hover:text-destructive">
                                                                        <X className="h-3 w-3"/>
                                                                    </button>
                                                                )}
                                                            </Badge>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No sections selected</p>
                                            )}

                                            {isEditingDepts && (
                                                <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                    {departmentAccounts.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground col-span-2">No section accounts have been created yet</p>
                                                    ) : departmentAccounts.map(da => (
                                                        <div key={da.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`dept-${da.id}`}
                                                                checked={selectedDepartmentIds.includes(da.id)}
                                                                onCheckedChange={() => toggleDepartment(da.id)}
                                                                disabled={isSubmitting}
                                                            />
                                                            <label htmlFor={`dept-${da.id}`} className="text-sm cursor-pointer">
                                                                {da.department_unit_name || da.department_name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Assignees multi-select */}
                                    <FormField control={control} name="assignee_ids" render={() => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Assignees</FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => setIsEditingAssignees(prev => !prev)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isEditingAssignees ? 'Done' : 'Edit'}
                                                </Button>
                                            </div>

                                            {selectedAssigneeIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedAssigneeIds.map(assigneeId => {
                                                        const a = assignees.find(x => x.id === assigneeId);
                                                        return a ? (
                                                            <Badge key={assigneeId} variant="secondary" className="text-xs gap-1">
                                                                {a.name}
                                                                {isEditingAssignees && (
                                                                    <button type="button" onClick={() => toggleAssignee(assigneeId)} className="ml-0.5 hover:text-destructive">
                                                                        <X className="h-3 w-3"/>
                                                                    </button>
                                                                )}
                                                            </Badge>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No assignees selected</p>
                                            )}

                                            {isEditingAssignees && (
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
                                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                        {!hasAssigneeScope ? (
                                                            <p className="text-sm text-muted-foreground col-span-2">
                                                                Select a section (and sub-unit) to see its assignees, or search by name.
                                                            </p>
                                                        ) : filteredAssignees.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground col-span-2">No assignees match this filter</p>
                                                        ) : filteredAssignees.map(a => (
                                                            <div key={a.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`assignee-${a.id}`}
                                                                    checked={selectedAssigneeIds.includes(a.id)}
                                                                    onCheckedChange={() => toggleAssignee(a.id)}
                                                                    disabled={isSubmitting}
                                                                />
                                                                <label htmlFor={`assignee-${a.id}`} className="text-sm cursor-pointer">{a.name}</label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Attachments */}
                                    <FormField control={control} name="attachments" render={() => (
                                        <FormItem>
                                            <FormLabel>Attachments (Max 5 files, {MAX_FILE_SIZE / 1000000}MB each)</FormLabel>
                                            <FormControl>
                                                <div className="flex flex-col gap-2">
                                                    <Input id="attachments" type="file" multiple onChange={handleFileChange}
                                                        accept={ACCEPTED_FILE_TYPES.join(",")} ref={fileInputRef} className="hidden"/>
                                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                                                        disabled={isSubmitting} className="cursor-pointer">
                                                        Choose Files
                                                    </Button>
                                                    <p className="text-sm text-gray-500">
                                                        {attachments?.length > 0 ? `${attachments.length} file(s) selected` : "No files selected"}
                                                    </p>
                                                </div>
                                            </FormControl>
                                            <FormMessage/>

                                            <div className="space-y-4">
                                                {attachments?.map((attachment, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <FormField control={control} name={`attachments.${index}.file`} render={() => (
                                                            <FormItem><FormMessage/></FormItem>
                                                        )}/>
                                                        <FormField control={control} name={`attachments.${index}.name`} render={({field}) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <div className="flex gap-2 items-center relative">
                                                                        <Input {...field} placeholder="Enter file name" disabled={isSubmitting}/>
                                                                        <Button type="button" variant="ghost" size="icon"
                                                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                                            onClick={() => removeAttachment(index)} disabled={isSubmitting}>
                                                                            <X className="h-4 w-4"/>
                                                                        </Button>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage/>
                                                            </FormItem>
                                                        )}/>
                                                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                                                            <span className="truncate">{attachment.file.name}</span>
                                                            <span>{formatFileSize(attachment.file.size)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </FormItem>
                                    )}/>

                                    <div className="flex justify-end">
                                        <Button type="submit" className="w-full lg:w-3xs" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Inserting...</>
                                            ) : 'Insert'}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default InsertLetterModal