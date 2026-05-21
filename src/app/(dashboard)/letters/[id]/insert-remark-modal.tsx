import React, {useRef, useState} from 'react';
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Loader2, Plus, X} from "lucide-react";
import {toast} from "sonner";
import {ACCEPTED_FILE_TYPES, MAX_FILE_SIZE} from "@/lib/client-config";
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

interface InsertRemarkModalProps {
    letter_id: string;
    onSuccess?: () => void;
}

export function InsertRemarkModal({letter_id, onSuccess}: InsertRemarkModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const {hasPermission} = useAuthStore();
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

    const onSubmit = async (data: RemarkFormValues) => {
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('content', data.content);

            if (data.attachments && data.attachments.length > 0) {
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
            }

            const response = await api.post(`/v1/letter/${letter_id}/remark`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            const responseData = await response.data;

            toast.success(responseData.message);
            reset();
            setOpen(false);
            onSuccess?.();

        } catch (error) {
            console.error("Error submitting remark:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={!hasPermission('remark.create')}
                >
                    <Plus className="mr-2 h-4 w-4"/>
                    New Remark
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Insert Remark</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Fill in the details below to add a new remark.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={control}
                            name="content"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel htmlFor={field.name}>Content</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            id={field.name} {...field} className="min-h-[100px]"
                                            placeholder="Enter remark / Message / Note / Decision"
                                            disabled={isSubmitting}
                                        />
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
                                                disabled={isSubmitting}
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
                                className="w-full lg:w-auto"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Inserting...
                                    </>
                                ) : "Insert"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default InsertRemarkModal;