'use client';

import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
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
import {CalendarIcon, Loader2, X} from "lucide-react";
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
type AttachmentItem = {
    file: File;
    name: string;
};

interface UpdateLetterModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    letterData: any;
}

export function UpdateLetterModal({isOpen, onCloseAction, letterData}: UpdateLetterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([]);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        // Function to convert a URL to a File object
        const urlToFile = async (url: string, filename: string): Promise<File> => {
            setIsLoadingAttachments(true);
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file from URL: ${url}`);
                }
                const blob = await response.blob();

                // Determine the mime type from the URL or response headers
                const contentType = response.headers.get('content-type') ||
                    getFileTypeFromUrl(url) ||
                    'application/octet-stream';

                // Create a new File object
                return new File([blob], filename, {type: contentType});
            } catch (error) {
                console.error("Error converting URL to File:", error);
                throw error;
            } finally {
                setIsLoadingAttachments(false);
            }
        };

        // Helper to extract file type from URL
        const getFileTypeFromUrl = (url: string): string | null => {
            const extension = url.split('.').pop()?.toLowerCase();
            if (!extension) return null;

            // Map common extensions to MIME types
            const mimeTypes: { [key: string]: string } = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                // Add more as needed
            };

            return mimeTypes[extension] || null;
        };
        if (letterData && isOpen) {
            form.reset({
                receivedDate: new Date(letterData.received_datetime),
                code: letterData.code,
                source: letterData.source?.id,
                sender: letterData.sender || "",
                organization: letterData.organization?.id,
                subject: letterData.subject,
                content: letterData.content || "",
                email: letterData.email || "",
                telephone: letterData.telephone || "",
                other: letterData.other || "",
                attachments: [],  // Start with empty and populate below
            });

            // Handle existing attachments
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

        fetchSources().catch((err) =>
            console.error("Unhandled error in load Sources", err)
        );
        fetchOrganizations().catch((err) =>
            console.error("Unhandled error in load Organization", err)
        );
    }, []);

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

            const response = await api.put(`/v1/letter/${letterData.id}`, letterPayload);
            const responseData = response.data;

            if (data.attachments) {
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

                await api.put(`/v1/letter/${letterData.id}/attachments`, formData);
            }

            toast.success("Letter Updated", {
                description: responseData.message,
            });

            reset();
            onCloseAction();
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
                        Update the letter information below.
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
                                <FormField
                                    control={control}
                                    name="organization"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Organization</FormLabel>
                                            <div className="relative">
                                                <Select
                                                    onValueChange={(value) => field.onChange(Number(value))}
                                                    value={field.value?.toString()}
                                                    disabled={isSubmitting}>
                                                    <FormControl className="w-full">
                                                        <SelectTrigger id={field.name}>
                                                            <SelectValue placeholder="Select organization"/>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {organizations.map((org) => (
                                                            <SelectItem key={org.id} value={org.id.toString()}>
                                                                {org.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {field.value && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                        onClick={() => field.onChange("")}
                                                        disabled={isSubmitting}
                                                    >
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                )}
                                            </div>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={control}
                            name="sender"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Sender</FormLabel>
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
                                    <FormLabel htmlFor={field.name}>Subject</FormLabel>
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

                        <FormField
                            control={control}
                            name="other"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Other</FormLabel>
                                    <FormControl>
                                        <Textarea id={field.name} {...field} disabled={isSubmitting}/>
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