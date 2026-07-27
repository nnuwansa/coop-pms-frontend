
'use client';

import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Check, ChevronsUpDown} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {format} from "date-fns";
import {Calendar} from "@/components/ui/calendar";
import {cn} from "@/lib/utils";
import {CalendarIcon, Loader2, Plus, X} from "lucide-react";
import {toast} from "sonner";
import {ACCEPTED_FILE_TYPES, MAX_FILE_SIZE} from "@/lib/client-config";
import api from "@/lib/api";

// Modified file schema to handle both File objects and existing attachment URLs
const fileSchema = z.custom<File>()
    .refine((file) => file instanceof File, "Must be a file")
    .refine(
        (file) => file.size <= MAX_FILE_SIZE,
        `File size must be less than ${MAX_FILE_SIZE / 1000000}MB`
    )
    .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        `File type must be one of: ${ACCEPTED_FILE_TYPES.join(", ")}`
    );

const remarkFormSchema = z.object({
    receivedDate: z.date({
        required_error: "Received date is required",
    }),
    code: z.string()
        .min(1, "Code is required")
        .max(15, "Code cannot exceed 15 characters"),
    source: z.number().min(1, "Source is required"),
    sourceName: z.string().optional(), // used only to drive the Registered Post field visibility
    sender: z.string()
        .max(150, "Sender cannot exceed 150 characters")
        .optional(),
    organization: z.number().optional(),
    subject: z.string()
        .min(1, "Subject is required")
        .max(150, "Subject cannot exceed 150 characters"),
    content: z.string()
        .max(4000, "Content cannot exceed 4000 characters")
        .optional()
        .or(z.literal("")),
    email: z.string()
        .email("Invalid email format")
        .max(150, "Email cannot exceed 150 characters")
        .optional()
        .or(z.literal("")),
    telephone: z.string()
        .min(10, "Telephone number must be at least 10 digits")
        .max(15, "Telephone number cannot exceed 30 digits")
        .optional()
        .or(z.literal("")),
    other: z.string()
        .max(500, "Content cannot exceed 500 characters")
        .optional(),
    // NEW
    sender_subject_no: z.string()
        .max(50, "Sender's Subject No cannot exceed 50 characters")
        .optional(),
    // NEW — item 16
    registered_post_no: z.string()
        .max(50, "Registered Postal Number cannot exceed 50 characters")
        .optional(),
    attachments: z
        .array(
            z.object({
                file: fileSchema,
                name: z.string()
                    .min(1, "File name is required")
                    .max(50, "File name cannot exceed 50 characters"),
            })
        )
        .max(5, "Maximum 5 files allowed")
        .optional()
        .default([]),
})
    .refine((data) => data.sender || data.organization, {
        message: "Either sender or organization must be provided",
        path: ["sender"],
    });

type RemarkFormValues = z.infer<typeof remarkFormSchema>;
type AttachmentItem = {
    file: File;
    name: string;
};

interface Organization {
    id: number;
    name: string;
    address?: string;
    email?: string;
    telephone?: string;
}

interface UpdateLetterModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    letterData: any;
    onSuccess?: () => void; // NEW — lets parent refresh the letter after a successful edit
}

export function UpdateLetterModal({isOpen, onCloseAction, letterData, onSuccess}: UpdateLetterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    // NEW — system users, so the Organization field can also offer "System Users"
    // as senders, exactly like the Insert Letter modal does.
    const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // NEW — searchable Organization/Person combobox state, mirrors the Insert
    // Letter modal exactly: search box, "Add new organization" inline form,
    // clear-selection option, and a tracked display label since a "person"
    // selection has no id of its own (it just fills the free-text `sender`).
    const [orgSearch, setOrgSearch] = useState("");
    const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
    const [isAddingOrg, setIsAddingOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgAddress, setNewOrgAddress] = useState("");
    const [newOrgEmail, setNewOrgEmail] = useState("");
    const [newOrgTelephone, setNewOrgTelephone] = useState("");
    const [selectedSenderLabel, setSelectedSenderLabel] = useState("");

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
            content: "",
            email: "",
            telephone: "",
            other: "",
            sender_subject_no: "",
            registered_post_no: "",
            attachments: [],
        },
    });

    const {control, handleSubmit, setValue, watch, reset} = form;
    const attachments = watch("attachments");
    const selectedSourceId = watch("source");
    const selectedOrgId = watch("organization");

    useEffect(() => {
        const src = sources.find(s => s.id === selectedSourceId);
        setValue("sourceName", src?.name || "");
    }, [selectedSourceId, sources, setValue]);

    const isRegisteredPost = watch("sourceName") === "Registered Post";

    useEffect(() => {
        // Function to convert a URL to a File object
        const urlToFile = async (url: string, filename: string): Promise<File> => {
            setIsLoadingAttachments(true);
            try {
                // NOTE: the attachments endpoint is authenticated via httpOnly cookies
                // (same as the axios `api` instance's withCredentials: true), so this
                // fetch must include credentials or it fails with 401 Unauthorized.
                const response = await fetch(url, {credentials: 'include'});
                if (!response.ok) {
                    throw new Error(`Failed to fetch file from URL: ${url}`);
                }
                const blob = await response.blob();

                const contentType = response.headers.get('content-type') ||
                    getFileTypeFromUrl(url) ||
                    'application/octet-stream';

                return new File([blob], filename, {type: contentType});
            } catch (error) {
                console.error("Error converting URL to File:", error);
                throw error;
            } finally {
                setIsLoadingAttachments(false);
            }
        };

        const getFileTypeFromUrl = (url: string): string | null => {
            const extension = url.split('.').pop()?.toLowerCase();
            if (!extension) return null;

            const mimeTypes: { [key: string]: string } = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };

            return mimeTypes[extension] || null;
        };
        if (letterData && isOpen) {
            form.reset({
                receivedDate: new Date(letterData.received_datetime),
                code: letterData.code,
                source: letterData.source?.id,
                sourceName: letterData.source?.name || "",
                sender: letterData.sender || "",
                organization: letterData.organization?.id,
                subject: letterData.subject,
                content: letterData.content || "",
                email: letterData.email || "",
                telephone: letterData.telephone || "",
                other: letterData.other || "",
                sender_subject_no: letterData.sender_subject_no || "",
                registered_post_no: letterData.registered_post_no || "",
                attachments: [],
            });
            // NEW — seed the combobox's display label from whatever's already saved
            setSelectedSenderLabel(letterData.organization?.name || letterData.sender || "");

            if (letterData.attachments?.length > 0) {
                const fetchAttachments = async () => {
                    const existingAttachments: AttachmentItem[] = [];

                    for (const attachment of letterData.attachments) {
                        try {
                            const file = await urlToFile(attachment.url, attachment.title);
                            existingAttachments.push({
                                file,
                                name: attachment.title.substring(0, attachment.title.lastIndexOf('.'))
                            });
                        } catch (error) {
                            console.error(`Error fetching attachment ${attachment.title}:`, error);
                        }
                    }

                    setValue("attachments", existingAttachments);
                };

                fetchAttachments().catch((err) =>
                    console.error("Unhandled error in load Attachments", err)
                );
            }
        }
    }, [letterData, isOpen, form, setValue]);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const res = await api.get('/v1/source/list');
                const data = await res.data;
                setSources(data.data || []);
            } catch (error) {
                console.error("Failed to fetch sources:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        const fetchOrganizations = async () => {
            try {
                const res = await api.get('/v1/organization/list');
                const data = await res.data;
                setOrganizations(data.data || []);
            } catch (error) {
                console.error("Failed to fetch organizations:", error);
            }
        };

        // NEW — needed for the "System Users" group in the Organization/Person combobox
        const fetchAssignees = async () => {
            try {
                const res = await api.get('/v1/system_user/names');
                const data = await res.data;
                setAssignees(data.data || []);
            } catch (error) {
                console.error("Failed to fetch system users:", error);
            }
        };

        fetchSources().catch((err) =>
            console.error("Unhandled error in load Sources", err)
        );
        fetchOrganizations().catch((err) =>
            console.error("Unhandled error in load Organization", err)
        );
        fetchAssignees().catch((err) =>
            console.error("Unhandled error in load System Users", err)
        );
    }, []);

    // NEW — mirrors the Insert Letter modal's "Add new organization" behaviour
    // exactly: blocks case-insensitive duplicate names (selecting the existing
    // one instead), otherwise creates the organization and selects it.
    const handleAddOrganization = useCallback(async () => {
        if (!newOrgName.trim()) return;

        const existing = organizations.find(
            o => o.name.trim().toLowerCase() === newOrgName.trim().toLowerCase()
        );
        if (existing) {
            toast.error(`"${existing.name}" already exists — selecting it instead`);
            setValue('organization', existing.id);
            if (existing.address) setValue('sender', existing.address);
            if (existing.email) setValue('email', existing.email);
            if (existing.telephone) setValue('telephone', existing.telephone);
            setSelectedSenderLabel(existing.name);
            setNewOrgName("");
            setNewOrgAddress("");
            setNewOrgEmail("");
            setNewOrgTelephone("");
            setIsAddingOrg(false);
            setOrgPopoverOpen(false);
            setOrgSearch("");
            return;
        }

        try {
            const res = await api.post('/v1/organization/', {
                name: newOrgName.trim(),
                address: newOrgAddress.trim() || null,
                email: newOrgEmail.trim() || null,
                telephone: newOrgTelephone.trim() || null,
            });
            const newOrg = res.data.data;
            setOrganizations(prev => [...prev, newOrg]);
            setValue('organization', newOrg.id);
            if (newOrg.address) setValue('sender', newOrg.address);
            if (newOrg.email) setValue('email', newOrg.email);
            if (newOrg.telephone) setValue('telephone', newOrg.telephone);
            setSelectedSenderLabel(newOrg.name);
            setNewOrgName("");
            setNewOrgAddress("");
            setNewOrgEmail("");
            setNewOrgTelephone("");
            setIsAddingOrg(false);
            setOrgPopoverOpen(false);
            setOrgSearch("");
            toast.success("Organization added successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add organization');
        }
    }, [newOrgName, newOrgAddress, newOrgEmail, newOrgTelephone, organizations, setValue]);

    async function onSubmit(data: RemarkFormValues) {
        setIsSubmitting(true);
        try {
            const letterPayload = {
                code: data.code,
                received_datetime: data.receivedDate.toISOString(),
                subject: data.subject,
                other: data.other || null,
                sender: data.sender || null,
                email: data.email || null,
                telephone: data.telephone || null,
                organization_id: data.organization || null,
                source_id: data.source,
                sender_subject_no: data.sender_subject_no || null,
                registered_post_no: data.registered_post_no || null,
            };

            const response = await api.put(`/v1/letter/${letterData.id}`, letterPayload);
            const responseData = response.data;

            if (data.attachments && data.attachments.length > 0) {
                const formData = new FormData();
                data.attachments.forEach(attachment => {
                    const originalFileName = attachment.file.name;
                    const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'));

                    let customFileName = attachment.name;
                    if (!customFileName.endsWith(fileExtension)) {
                        customFileName = customFileName + fileExtension;
                    }

                    const fileWithCustomName = new File(
                        [attachment.file],
                        customFileName,
                        {type: attachment.file?.type}
                    );

                    formData.append('attachments', fileWithCustomName);
                });

                await api.put(`/v1/letter/${letterData.id}/attachments`, formData, {
                    headers: {'Content-Type': 'multipart/form-data'}
                });
            }

            toast.success("Letter Updated", {
                description: responseData.message,
            });

            reset();
            onCloseAction();
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
            const newFiles = files.map(file => ({
                file,
                name: file.name.substring(0, file.name.lastIndexOf('.')),
            }));

            const updatedAttachments = [...(attachments || []), ...newFiles];
            setValue("attachments", updatedAttachments, {shouldValidate: true});
        } catch (error) {
            console.error("Error handling file change:", error);
        }
    };

    const removeAttachment = (index: number) => {
        setValue(
            "attachments",
            attachments?.filter((_, i) => i !== index) || [],
            {shouldValidate: true}
        );
    };

    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onCloseAction}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Update Letter</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Update the letter information below. All changes will be recorded in the letter's history.
                    </DialogDescription>
                </DialogHeader>
                <hr className="my-2 border-t border-gray-300"/>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={control}
                            name="receivedDate"
                            render={({field}) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel htmlFor={field.name}>Received Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    id={field.name}
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    disabled={isSubmitting}
                                                >
                                                    {field.value ? format(field.value, "PPP") :
                                                        <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="code"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Code</FormLabel>
                                    <FormControl>
                                        <Input id={field.name} {...field} disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-col lg:flex-row gap-5">
                            <div className="w-full">
                                <FormField
                                    control={control}
                                    name="source"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Source</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(Number(value))}
                                                value={field.value?.toString()}
                                                disabled={isSubmitting}
                                            >
                                                <FormControl className="w-full">
                                                    <SelectTrigger id={field.name}>
                                                        <SelectValue placeholder="Select source"/>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {sources.map((src) => (
                                                        <SelectItem key={src.id} value={src.id.toString()}>
                                                            {src.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="w-full">
                                {/*
                                    CHANGED — replaced the plain <Select> dropdown with the same
                                    searchable Organization/Person combobox used on the Insert
                                    Letter modal: type-to-search, an "Organizations" group and a
                                    "System Users" group (picking a person clears `organization`
                                    and just fills the free-text `sender` field instead), a "Clear
                                    selection" entry, and an inline "Add new organization" form.
                                */}
                                <FormField
                                    control={control}
                                    name="organization"
                                    render={({field}) => {
                                        const search = orgSearch.toLowerCase();
                                        const filteredOrgs = organizations.filter(o => !search || o.name.toLowerCase().includes(search));
                                        const filteredUsers = assignees.filter(a => !search || a.name.toLowerCase().includes(search));
                                        const selectedOrgName = field.value ? organizations.find(o => o.id === field.value)?.name : null;
                                        const displayLabel = selectedOrgName || selectedSenderLabel;

                                        return (
                                            <FormItem className="w-full">
                                                <FormLabel htmlFor={field.name}>Sender/Organization of the Letter</FormLabel>
                                                <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                id={field.name}
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                disabled={isSubmitting}
                                                                className={cn("w-full justify-between font-normal", !displayLabel && "text-muted-foreground")}
                                                            >
                                                                <span className="truncate text-start">
                                                                    {displayLabel || "Select organization or person"}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className={cn("p-0", isAddingOrg ? "w-[420px]" : "w-[--radix-popover-trigger-width]")}
                                                        align="start"
                                                    >
                                                        <Command filter={() => 1}>
                                                            {!isAddingOrg && (
                                                                <>
                                                                    <CommandInput
                                                                        placeholder="Search organization or person..."
                                                                        value={orgSearch}
                                                                        onValueChange={setOrgSearch}
                                                                    />
                                                                    <CommandList className="max-h-[320px] overflow-y-auto overscroll-contain">
                                                                        <CommandEmpty>No organization or person found.</CommandEmpty>

                                                                        {field.value && (
                                                                            <CommandGroup>
                                                                                <CommandItem onSelect={() => {
                                                                                    field.onChange(undefined);
                                                                                    setValue('sender', '');
                                                                                    setValue('email', '');
                                                                                    setValue('telephone', '');
                                                                                    setSelectedSenderLabel("");
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
                                                                                            field.onChange(org.id);
                                                                                            if (org.email) setValue('email', org.email);
                                                                                            if (org.telephone) setValue('telephone', org.telephone);
                                                                                            if (org.address) setValue('sender', org.address);
                                                                                            setSelectedSenderLabel(org.name);
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
                                                                                            field.onChange(undefined);
                                                                                            setValue('sender', user.name);
                                                                                            setSelectedSenderLabel(user.name);
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
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        {/* NEW — item 16: Registered Postal Number, shown only when Source = "Registered Post" */}
                        {isRegisteredPost && (
                            <FormField
                                control={control}
                                name="registered_post_no"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel htmlFor={field.name}>Registered Postal Number</FormLabel>
                                        <FormControl>
                                            <Input id={field.name} {...field} disabled={isSubmitting}
                                                placeholder="Enter registered postal number"/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={control}
                            name="sender"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Sender's Address</FormLabel>
                                    <FormControl>
                                        <Input id={field.name} {...field} disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="subject"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Subject/Content of the Letter</FormLabel>
                                    <FormControl>
                                        <Input id={field.name} {...field} disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Email</FormLabel>
                                    <FormControl>
                                        <Input id={field.name} {...field} disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="telephone"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Telephone</FormLabel>
                                    <FormControl>
                                        <Input id={field.name} {...field} type="tel" disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField
                                control={control}
                                name="other"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel htmlFor={field.name}>Cheque No / Money Order No</FormLabel>
                                        <FormControl>
                                            <Textarea id={field.name} {...field} disabled={isSubmitting}/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            {/* NEW */}
                            <FormField
                                control={control}
                                name="sender_subject_no"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel htmlFor={field.name}>Sender's Subject No</FormLabel>
                                        <FormControl>
                                            <Input id={field.name} {...field} disabled={isSubmitting}
                                                placeholder="Enter sender's subject number"/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name="attachments"
                            render={() => (
                                <FormItem>
                                    <FormLabel htmlFor="attachments">
                                        Attachments (Max 5 files, {MAX_FILE_SIZE / 1000000}MB each)
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                id="attachments"
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                accept={ACCEPTED_FILE_TYPES.join(",")}
                                                ref={fileInputRef}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={triggerFileSelect}
                                                disabled={isSubmitting || isLoadingAttachments}
                                                className="cursor-pointer"
                                            >
                                                Choose Files
                                            </Button>
                                            <p className="text-sm text-gray-500">
                                                {attachments?.length > 0
                                                    ? `${attachments.length} file(s) selected`
                                                    : "No files selected"}
                                            </p>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                    <div className="space-y-4">
                                        {isLoadingAttachments && (
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                Loading attachments...
                                            </div>
                                        )}
                                        {attachments?.map((_attachment, index) => (
                                            <div key={index} className="space-y-2">
                                                <FormField
                                                    control={control}
                                                    name={`attachments.${index}.file`}
                                                    render={() => (
                                                        <FormItem>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={control}
                                                    name={`attachments.${index}.name`}
                                                    render={({field}) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div className="flex gap-2 items-center relative">
                                                                    <Input
                                                                        {...field}
                                                                        placeholder="Enter file name"
                                                                        disabled={isSubmitting}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                                        onClick={() => removeAttachment(index)}
                                                                        disabled={isSubmitting}
                                                                    >
                                                                        <X className="h-4 w-4"/>
                                                                    </Button>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="w-full lg:w-3xs"
                                disabled={isSubmitting || isLoadingAttachments}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Updating...
                                    </>
                                ) : (
                                    'Update'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default UpdateLetterModal