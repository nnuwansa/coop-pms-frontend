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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
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
    sender: z.string()
        .max(150, "Sender cannot exceed 150 characters")
        .optional(),
    organization: z.number().optional(),
    subject: z.string()
        .min(1, "Subject is required")
        .max(150, "Subject cannot exceed 150 characters"),
    content: z.string()
        .min(1, "Content is required")
        .max(4000, "Content cannot exceed 4000 characters")
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

// interface InsertLetterModalProps {
//     organizations: { id: number; name: string }[];
//     onSuccess?: () => void;
// }

interface InsertLetterModalProps {
    organizations: { id: number; name: string }[];
    onOrganizationAdded?: (org: { id: number; name: string }) => void;
    onSuccess?: () => void;
}

export function InsertLetterModal({organizations, onSuccess, onOrganizationAdded}: InsertLetterModalProps)  {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [orgSearch, setOrgSearch] = useState("");
    const [sourceSearch, setSourceSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {hasPermission} = useAuthStore();
    const [isAddingOrg, setIsAddingOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    

    const form = useForm<RemarkFormValues>({
        resolver: zodResolver(remarkFormSchema),
        defaultValues: {
            receivedDate: new Date(),
            code: "",
            source: undefined,
            sender: "",
            organization: undefined,
            subject: "",
            content: "",
            email: "",
            telephone: "",
            other: "",
            attachments: [],
        },
    });

    const {control, handleSubmit, setValue, watch, reset} = form;
    const attachments = watch("attachments");

    const fetchLetterCode = useCallback(async (receivedDate: Date) => {
        try {
            const formattedDate = receivedDate.toISOString();
            const response = await api.get(
                `/v1/letter/code/${encodeURIComponent(formattedDate)}`
            );

            const data = await response.data;
            setValue('code', data.data);
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [setValue]);

    // Load data only when the modal is opened
    useEffect(() => {
        if (isOpen && !isLoading) {
            const fetchData = async () => {
                try {
                    // Fetch sources
                    const sourcesRes = await api.get('/v1/source/list');
                    const sourcesData = await sourcesRes.data;
                    setSources(sourcesData.data || []);

                    await fetchLetterCode(new Date());
                    setIsLoading(true);
                } catch (error) {
                    toast.error(error.response?.data.message || 'Something went wrong. Please try again');
                }
            };

            fetchData().catch(
                (error) => {
                    console.error("Error fetching data:", error);
                }
            )
        }
    }, [isOpen, isLoading, fetchLetterCode]);

    // Reset the form and dataLoaded state when modal is closed
    const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
        reset();
        setIsLoading(false);
        setOrgSearch(""); 
        setSourceSearch(""); 
    }
};




const handleAddOrganization = async () => {
    if (!newOrgName.trim()) return;
    try {
        const res = await api.post('/v1/organization/', {name: newOrgName.trim()});
        const data = res.data;
        const newOrg = data.data;
        
        onOrganizationAdded?.(newOrg);  
        
        setValue('organization', newOrg.id);
        setNewOrgName("");
        setIsAddingOrg(false);
        toast.success("Organization added successfully");
    } catch (error) {
        toast.error(error.response?.data.message || 'Failed to add organization');
    }
};

    async function onSubmit(data: RemarkFormValues) {
        setIsSubmitting(true);
        try {
            const letterPayload = {
                code: data.code,
                received_datetime: data.receivedDate.toISOString(),
                subject: data.subject,
                other: data.other,
                content: data.content,
                sender: data.sender,
                email: data.email || null,
                telephone: data.telephone || null,
                organization_id: data.organization || null,
                source_id: data.source
            };

            const letterRes = await api.post('/v1/letter/', letterPayload);

            const letter = await letterRes.data;
            const letterId = letter.data.id;

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
                        {type: attachment.file.type}
                    );

                    formData.append('attachments', fileWithCustomName);
                });

                await api.post(`${CORE_API_URL}/v1/letter/${letterId}/attachments`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
            }

            toast.success("Letter Inserted", {
                description: `Letter ${letter.data.code} has been successfully inserted.`,
            });

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
        fileInputRef.current!.value = "";
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
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    className="w-full sm:w-auto"
                    disabled={!hasPermission('letter.create')}
                >
                    <Plus className="mr-2 h-4 w-4"/>
                    New Letter
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
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        ) : (
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
                                                            onSelect={(date) => {
                                                                field.onChange(date);
                                                                if (date) {
                                                                    fetchLetterCode(date).catch(
                                                                        (error) => {
                                                                            console.error("Error fetching letter code:", error);
                                                                            toast.error("Failed to generate letter code");
                                                                        }
                                                                    )
                                                                }
                                                            }}
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

                                    <div className="flex flex-col lg:flex-row justify-between gap-5">
                                        <div className="w-full lg:w-1/2">
                                            <FormField
    control={control}
    name="source"
    render={({field}) => (
        <FormItem className="w-full">
            <FormLabel htmlFor={field.name}>Source</FormLabel>
            <Popover>
                <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                            variant="outline"
                            role="combobox"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                        >
                            <span className="truncate text-start">
                                {field.value
                                    ? sources.find((src) => src.id === field.value)?.name
                                    : "Select source"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                        </Button>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                        filter={() => 1}
                    >
                        <CommandInput
                            placeholder="Search source..."
                            value={sourceSearch}
                            onValueChange={setSourceSearch}
                        />
                        <CommandList>
                            <CommandEmpty>No source found.</CommandEmpty>
                            <CommandGroup>
                                {field.value && (
                                    <CommandItem
                                        onSelect={() => field.onChange(undefined)}
                                        className="text-muted-foreground"
                                    >
                                        Clear selection
                                    </CommandItem>
                                )}
                                {sources
                                    .filter(src =>
                                        !sourceSearch || src.name.toLowerCase().includes(sourceSearch.toLowerCase())
                                    )
                                    .map((src) => (
                                        <CommandItem
                                            key={src.id}
                                            value={src.id.toString()}
                                            onSelect={() => field.onChange(src.id)}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", field.value === src.id ? "opacity-100" : "opacity-0")}/>
                                            {src.name}
                                        </CommandItem>
                                    ))
                                }
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <FormMessage/>
        </FormItem>
    )}
/>
                                        </div>
                                        <div className="w-full lg:w-1/2">
                                            
                                            <FormField
                                                control={control}
                                                name="organization"
                                                render={({field}) => (
                                                    <FormItem className="w-full">
                                                        <FormLabel htmlFor={field.name}>Organization</FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        disabled={isSubmitting}
                                                                        className={cn(
                                                                            "w-full justify-between font-normal",
                                                                            !field.value && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        <span className="truncate text-start">
                                                                            {field.value
                                                                                ? organizations.find((org) => org.id === field.value)?.name
                                                                                : "Select organization"}
                                                                        </span>
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    {/* <Command>
                        <CommandInput placeholder="Search organization..."/>
                        <CommandList>
                            <CommandEmpty>No organization found.</CommandEmpty>
                            <CommandGroup>
                                {field.value && (
                                    <CommandItem
                                        onSelect={() => field.onChange(undefined)}
                                        className="text-muted-foreground"
                                    >
                                        Clear selection
                                    </CommandItem>
                                )}
                                {organizations.map((org) => (
                                    <CommandItem
                                        key={org.id}
                                        value={org.name}
                                        onSelect={() => field.onChange(org.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === org.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {org.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command> */}

                                                        <Command
                                        filter={(value, search) => {
                                            if (!search) return 1;
                                            return 1;
                                        }}
                                    >
                                        <CommandInput 
                                            placeholder="Search organization..."
                                            value={orgSearch}
                                            onValueChange={setOrgSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No organization found.</CommandEmpty>
                                            <CommandGroup>
                                                {field.value && (
                                                    <CommandItem onSelect={() => field.onChange(undefined)} className="text-muted-foreground">
                                                        Clear selection
                                                    </CommandItem>
                                                )}
                                                {organizations
                                                    .filter(org => !orgSearch || org.name.toLowerCase().includes(orgSearch.toLowerCase()))
                                                    .map((org) => (
                                                        <CommandItem
                                                            key={org.id}
                                                            value={org.id.toString()}
                                                            onSelect={() => field.onChange(org.id)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", field.value === org.id ? "opacity-100" : "opacity-0")}/>
                                                            {org.name}
                                                        </CommandItem>
                                                    ))
                                                }
                                            </CommandGroup>
                                        </CommandList>

                                        <div className="border-t p-2">
                                            {isAddingOrg ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Organization name..."
                                                        value={newOrgName}
                                                        onChange={(e) => setNewOrgName(e.target.value)}
                                                        className="h-8 text-sm"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddOrganization();
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setIsAddingOrg(false);
                                                                setNewOrgName("");
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button type="button" size="sm" className="h-8" onClick={handleAddOrganization}>
                                                        Add
                                                    </Button>
                                                    <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => {
                                                        setIsAddingOrg(false);
                                                        setNewOrgName("");
                                                    }}>
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="w-full h-8 text-sm justify-start text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsAddingOrg(true)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4"/>
                                                    Add new organization
                                                </Button>
                                            )}
                                        </div>
                                    </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                        </div>
                                    </div>

                                    {/* Rest of the form fields */}
                                    <FormField
                                        control={control}
                                        name="sender"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel htmlFor={field.name}>Sender</FormLabel>
                                                <FormControl>
                                                    <Input id={field.name} {...field} disabled={isSubmitting}
                                                           placeholder="Enter sender's name or identification"/>
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
                                                <FormLabel htmlFor={field.name}>Subject</FormLabel>
                                                <FormControl>
                                                    <Input id={field.name} {...field} disabled={isSubmitting}
                                                           placeholder="Enter subject of the letter"/>
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
                                                    <Input id={field.name} {...field}
                                                           placeholder="Enter sender's email"
                                                           disabled={isSubmitting}/>
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
                                                    <Input id={field.name} {...field}
                                                           placeholder="Telephone Number or Fax Number"
                                                           disabled={isSubmitting}/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="other"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel htmlFor={field.name}>Other</FormLabel>
                                                <FormControl>
                                                    <Textarea id={field.name} {...field} disabled={isSubmitting}
                                                              placeholder="CH- Cheque Number, RP- Registered Post"/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="content"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel htmlFor={field.name}>Content</FormLabel>
                                                <FormControl>
                                                    <Textarea id={field.name} {...field} className="min-h-[100px]"
                                                              placeholder="Add summary or content here"
                                                              disabled={isSubmitting}/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

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
                                                            disabled={isSubmitting}
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
                                                    {attachments?.map((attachment, index) => (
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
                                                                            <div
                                                                                className="flex gap-2 items-center relative">
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
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    Inserting...
                                                </>
                                            ) : (
                                                'Insert'
                                            )}
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