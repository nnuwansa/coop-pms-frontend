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
import {cn} from "@/lib/utils";
import {CalendarIcon, Loader2, Plus, X} from "lucide-react";
import {toast} from "sonner";
import {ACCEPTED_FILE_TYPES, CORE_API_URL, MAX_FILE_SIZE} from "@/lib/client-config";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";
import {Checkbox} from "@/components/ui/checkbox";
import {formatFileSize} from "@/app/(dashboard)/letters/[id]/attachment-preview";

const fileSchema = z.custom<File>()
    .refine((file) => file instanceof File, "Must be a file")
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1000000}MB`)
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), `File type must be one of: ${ACCEPTED_FILE_TYPES.join(", ")}`);

const remarkFormSchema = z.object({
    receivedDate: z.date({required_error: "Received date is required"}),
    code: z.string().min(1, "Code is required").max(15, "Code cannot exceed 15 characters"),
    source: z.number().min(1, "Source is required"),
    sourceName: z.string().optional(), // NEW — tracks selected source name to drive Registered Post field visibility
    sourceCode: z.string().optional(),
    sender: z.string().max(150, "Sender's Address cannot exceed 150 characters").optional(),
    organization: z.number().optional(),
    subject: z.string().min(1, "Subject is required").max(1000, "Subject/Content cannot exceed 1000 characters"),
    email: z.string().email("Invalid email format").max(150).optional().or(z.literal("")),
    telephone: z.string().min(10, "Telephone number must be at least 10 digits").max(15).optional().or(z.literal("")),
    other: z.string().max(500).optional(),
    sender_subject_no: z.string().max(50, "Sender's Subject No cannot exceed 50 characters").optional(),
    // NEW: Registered Postal Number field
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
    // NEW: Registered Postal Number becomes mandatory when Source = "Registered Post"
    // .refine((data) => data.sourceName !== "Registered Post" || !!data.registered_post_no?.trim(), {
    //     message: "Registered Postal Number is required when Source is Registered Post",
    //     path: ["registered_post_no"],
    // });

.refine((data) => data.sourceCode !== "REGISTERED_POST" || !!data.registered_post_no?.trim(), {
    message: "Registered Postal Number is required when Source is Registered Post",
    path: ["registered_post_no"],
});

type RemarkFormValues = z.infer<typeof remarkFormSchema>;

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
    // const [sources, setSources] = useState<{id: number; name: string}[]>([]);
    const [departments, setDepartments] = useState<{id: number; name: string}[]>([]);
    const [assignees, setAssignees] = useState<{id: number; name: string}[]>([]);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgAddress, setNewOrgAddress] = useState("");
    const [newOrgEmail, setNewOrgEmail] = useState("");
    const [newOrgTelephone, setNewOrgTelephone] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [orgSearch, setOrgSearch] = useState("");
    const [sourceSearch, setSourceSearch] = useState("");
    const [isAddingOrg, setIsAddingOrg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {hasPermission} = useAuthStore();
    const [sources, setSources] = useState<{id: number; name: string; code?: string}[]>([]);

    const form = useForm<RemarkFormValues>({
        resolver: zodResolver(remarkFormSchema),
        defaultValues: {
            receivedDate: new Date(),
            code: "",
            source: undefined,
            sourceName: "",
            sender: "",
            organization: undefined,
            subject: "",
            email: "",
            telephone: "",
            other: "",
            sender_subject_no: "",
            registered_post_no: "",
            assignee_ids: [],
            department_ids: [],
            attachments: [],
        },
    });

    const {control, handleSubmit, setValue, watch, reset} = form;
    const attachments = watch("attachments");
    const selectedDepartmentIds = watch("department_ids") || [];
    const selectedAssigneeIds = watch("assignee_ids") || [];

    // NEW: derive whether the "Registered Postal Number" field should show
    const isRegisteredPost = watch("sourceCode") === "REGISTERED_POST";

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
                    const [sourcesRes, deptRes, assigneeRes] = await Promise.all([
                        api.get('/v1/source/list'),
                        api.get('/v1/department/list'),
                        api.get('/v1/system_user/names'),
                    ]);
                    setSources(sourcesRes.data.data || []);
                    setDepartments(deptRes.data.data || []);
                    setAssignees(assigneeRes.data.data || []);
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
        if (!open) {
            reset();
            setIsLoading(false);
            setOrgSearch("");
            setSourceSearch("");
            setIsAddingOrg(false);
            setNewOrgName("");
            setNewOrgAddress("");
            setNewOrgEmail("");
            setNewOrgTelephone("");
        }
    };

    const handleAddOrganization = async () => {
        if (!newOrgName.trim()) return;
        try {
            const res = await api.post('/v1/organization/', {
                name: newOrgName.trim(),
                address: newOrgAddress.trim() || null,
                email: newOrgEmail.trim() || null,
                telephone: newOrgTelephone.trim() || null,
            });
            const newOrg = res.data.data;
            onOrganizationAdded?.(newOrg);
            setValue('organization', newOrg.id);
            // auto-fill the main form's sender fields too, same as selecting an existing org
            if (newOrg.address) setValue('sender', newOrg.address);
            if (newOrg.email) setValue('email', newOrg.email);
            if (newOrg.telephone) setValue('telephone', newOrg.telephone);
            setNewOrgName("");
            setNewOrgAddress("");
            setNewOrgEmail("");
            setNewOrgTelephone("");
            setIsAddingOrg(false);
            toast.success("Organization added successfully");
        } catch (error) {
            toast.error(error.response?.data.message || 'Failed to add organization');
        }
    };

    const toggleDepartment = (id: number) => {
        const current = selectedDepartmentIds;
        const updated = current.includes(id) ? current.filter(d => d !== id) : [...current, id];
        setValue('department_ids', updated);
    };

    const toggleAssignee = (id: number) => {
        const current = selectedAssigneeIds;
        const updated = current.includes(id) ? current.filter(a => a !== id) : [...current, id];
        setValue('assignee_ids', updated);
    };

    async function onSubmit(data: RemarkFormValues) {
        setIsSubmitting(true);
        try {
            const letterPayload = {
                code: data.code,
                received_datetime: data.receivedDate.toISOString(),
                subject: data.subject,
                other: data.other || null,
                sender_subject_no: data.sender_subject_no || null,
                registered_post_no: data.registered_post_no || null, // NEW
                sender: data.sender || null,
                email: data.email || null,
                telephone: data.telephone || null,
                organization_id: data.organization || null,
                source_id: data.source,
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
            reset();
            setIsLoading(false);
            setIsOpen(false);
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
        fileInputRef.current!.value = "";
        setValue("attachments", attachments?.filter((_, i) => i !== index) || [], {shouldValidate: true});
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={!hasPermission('letter.create')}>
                    <Plus className="mr-2 h-4 w-4"/>New Letter
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[830px] max-h-[90vh] overflow-y-auto">
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
                                            <Popover>
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
                                                            field.onChange(date);
                                                            if (date) fetchLetterCode(date).catch(console.error);
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

                                    {/* Source | Sender/Organization */}
                                    <div className="flex flex-col lg:flex-row justify-between gap-5">
                                        {/* Source */}
                                        <div className="w-full lg:w-1/2">
                                            <FormField control={control} name="source" render={({field}) => (
                                                <FormItem className="w-full">
                                                    <FormLabel>Source</FormLabel>
                                                    <Popover>
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
                                                                <CommandList>
                                                                    <CommandEmpty>No source found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {field.value && (
                                                                            <CommandItem onSelect={() => {
                                                                                field.onChange(undefined);
                                                                                setValue('sourceName', ''); // NEW
                                                                                setValue('sourceCode', ''); // NEW
                                                                                setValue('registered_post_no', ''); // NEW
                                                                            }} className="text-muted-foreground">
                                                                                Clear selection
                                                                            </CommandItem>
                                                                        )}
                                                                        {sources.filter(s => !sourceSearch || s.name.toLowerCase().includes(sourceSearch.toLowerCase())).map(src => (
                                                                            <CommandItem key={src.id} value={src.id.toString()}
                                                                                onSelect={() => {
                                                                                    field.onChange(src.id);
                                                                                    setValue('sourceName', src.name); // NEW
                                                                                    setValue('sourceCode', src.code); // NEW
                                                                                    if (src.code !== "REGISTERED_POST") {
                                                                                        setValue('registered_post_no', ''); // NEW — clear stale value if source changed away
                                                                                    }
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
                                        </div>

                                        {/* Sender/Organization of the Letter */}
                                        <div className="w-full lg:w-1/2">
                                            <FormField control={control} name="organization" render={({field}) => (
                                                <FormItem className="w-full">
                                                    <FormLabel>Sender/Organization of the Letter</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" disabled={isSubmitting}
                                                                    className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                                                    <span className="truncate text-start">
                                                                        {field.value ? organizations.find(o => o.id === field.value)?.name : "Select organization"}
                                                                    </span>
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                            <Command filter={() => 1}>
                                                                <CommandInput placeholder="Search organization..." value={orgSearch} onValueChange={setOrgSearch}/>
                                                                <CommandList>
                                                                    <CommandEmpty>No organization found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {field.value && (
                                                                            <CommandItem onSelect={() => {
                                                                                field.onChange(undefined);
                                                                                setValue('sender', '');
                                                                                setValue('email', '');
                                                                                setValue('telephone', '');
                                                                            }} className="text-muted-foreground">
                                                                                Clear selection
                                                                            </CommandItem>
                                                                        )}
                                                                        {organizations.filter(o => !orgSearch || o.name.toLowerCase().includes(orgSearch.toLowerCase())).map(org => (
                                                                            <CommandItem key={org.id} value={org.id.toString()}
                                                                                onSelect={() => {
                                                                                    field.onChange(org.id);
                                                                                    const o = organizations.find(x => x.id === org.id);
                                                                                    if (o?.email) setValue('email', o.email);
                                                                                    if (o?.telephone) setValue('telephone', o.telephone);
                                                                                    if (o?.address) setValue('sender', o.address);
                                                                                }}>
                                                                                <Check className={cn("mr-2 h-4 w-4", field.value === org.id ? "opacity-100" : "opacity-0")}/>
                                                                                {org.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                                <div className="border-t p-2">
                                                                    {isAddingOrg ? (
                                                                    <div className="flex flex-col gap-2 p-1">
                                                                        <Input
                                                                            placeholder="Organization name..."
                                                                            value={newOrgName}
                                                                            onChange={(e) => setNewOrgName(e.target.value)}
                                                                            className="h-8 text-sm"
                                                                            autoFocus
                                                                        />
                                                                        <Input
                                                                            placeholder="Address "
                                                                            value={newOrgAddress}
                                                                            onChange={(e) => setNewOrgAddress(e.target.value)}
                                                                            className="h-8 text-sm"
                                                                        />
                                                                        <Input
                                                                            placeholder="Email "
                                                                            value={newOrgEmail}
                                                                            onChange={(e) => setNewOrgEmail(e.target.value)}
                                                                            className="h-8 text-sm"
                                                                        />
                                                                        <Input
                                                                            placeholder="Telephone "
                                                                            value={newOrgTelephone}
                                                                            onChange={(e) => setNewOrgTelephone(e.target.value)}
                                                                            className="h-8 text-sm"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') { e.preventDefault(); handleAddOrganization(); }
                                                                                if (e.key === 'Escape') {
                                                                                    setIsAddingOrg(false);
                                                                                    setNewOrgName("");
                                                                                    setNewOrgAddress("");
                                                                                    setNewOrgEmail("");
                                                                                    setNewOrgTelephone("");
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div className="flex gap-2 justify-end mt-1">
                                                                            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => {
                                                                                setIsAddingOrg(false);
                                                                                setNewOrgName("");
                                                                                setNewOrgAddress("");
                                                                                setNewOrgEmail("");
                                                                                setNewOrgTelephone("");
                                                                            }}>
                                                                                <X className="h-4 w-4"/>
                                                                            </Button>
                                                                            <Button type="button" size="sm" className="h-8" onClick={handleAddOrganization} disabled={!newOrgName.trim()}>
                                                                                Add
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Button type="button" variant="ghost" className="w-full h-8 text-sm justify-start text-muted-foreground hover:text-foreground"
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
                                            )}/>
                                        </div>
                                    </div>

                                    {/* NEW: Registered Postal Number — shown only when Source = "Registered Post" */}
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
                                            <FormLabel>Sender's Address</FormLabel>
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
                                                    <FormLabel>Sender's Subject No</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} disabled={isSubmitting} placeholder="Enter sender's subject number"/>
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}/>
                                        </div>

                                    {/* Subject/Content of the Letter  */}
                                    <FormField control={control} name="subject" render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Subject/Content of the Letter</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} disabled={isSubmitting}
                                                    placeholder="Enter subject or content of the letter"
                                                    className="min-h-[160px]"/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                                    {/* Departments Multi-select */}
                                    <FormField control={control} name="department_ids" render={() => (
                                        <FormItem>
                                            <FormLabel>Departments</FormLabel>
                                            <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                {departments.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground col-span-2">No departments available</p>
                                                ) : departments.map(dept => (
                                                    <div key={dept.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`dept-${dept.id}`}
                                                            checked={selectedDepartmentIds.includes(dept.id)}
                                                            onCheckedChange={() => toggleDepartment(dept.id)}
                                                            disabled={isSubmitting}
                                                        />
                                                        <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">{dept.name}</label>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage/>
                                        </FormItem>
                                    )}/>

                          {/* Assignees Multi-select */}
                                     <FormField control={control} name="assignee_ids" render={() => (
                                        <FormItem>
                                            <FormLabel>Assignees</FormLabel>
                                            <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                {assignees.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground col-span-2">No assignees available</p>
                                                ) : assignees.map(a => (
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
                                            {/* <div className="space-y-4">
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
                                                    </div>
                                                ))}
                                            </div> */}

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
            {/* NEW: file size display */}
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