'use client';

import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {Loader2, X} from "lucide-react";
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
    content: z.string()
        .min(1, "Content is required")
        .max(1000, "Content must be less than 1000 characters"),
    attachments: z
        .array(
            z.object({
                file: fileSchema,
                name: z.string()
                    .min(1, "File name is required")
                    .max(50, "File name must be less than 50 characters"),
            })
        )
        .max(5, "Maximum 5 files allowed")
        .optional()
        .default([]),
});

type RemarkFormValues = z.infer<typeof remarkFormSchema>;
type AttachmentItem = {
    file: File;
    name: string;
};

interface UpdateLetterModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    remarkData: any;
}

export function UpdateRemarkModal({isOpen, onCloseAction, remarkData}: UpdateLetterModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<RemarkFormValues>({
        resolver: zodResolver(remarkFormSchema),
        defaultValues: {
            content: "",
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

        if (remarkData && isOpen) {
            form.reset({
                content: remarkData.content || "",
                attachments: [],  // Start with empty and populate below
            });

            // Handle existing attachments
            if (remarkData.attachments?.length > 0) {
                const fetchAttachments = async () => {
                    const existingAttachments: AttachmentItem[] = [];

                    for (const attachment of remarkData.attachments) {
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
    }, [remarkData, isOpen, form, setValue]);

    async function onSubmit(data: RemarkFormValues) {
        setIsSubmitting(true);
        try {

            const formData = new FormData();
            formData.append('content', data.content);

            if (data.attachments) {
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
            }

            const uploadRes = await api.put(`/v1/letter/remark/${remarkData.id}`, formData);
            const result = await uploadRes.data;

            toast.success(result.message);
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
                    <DialogTitle>Update Remark</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Update the remark content and attachments below.
                    </DialogDescription>
                </DialogHeader>
                <hr className="my-2 border-t border-gray-300"/>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

export default UpdateRemarkModal