// import React, {useRef, useState} from 'react';
// import {useForm} from "react-hook-form";
// import {zodResolver} from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {Button} from "@/components/ui/button";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogHeader,
//     DialogTitle,
//     DialogTrigger
// } from "@/components/ui/dialog";
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
// import {Input} from "@/components/ui/input";
// import {Textarea} from "@/components/ui/textarea";
// import {Loader2, Plus, X} from "lucide-react";
// import {toast} from "sonner";
// import {ACCEPTED_FILE_TYPES, MAX_FILE_SIZE} from "@/lib/client-config";
// import api from "@/lib/api";
// import {useAuthStore} from "@/store/auth-store";

// const fileSchema = z.custom<File>()
//     .refine((file) => file instanceof File, "Must be a file")
//     .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1000000}MB`)
//     .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), `File type must be one of: ${ACCEPTED_FILE_TYPES.join(", ")}`);

// const remarkFormSchema = z.object({
//     content: z.string().min(1, "Content is required").max(1000, "Content must be less than 1000 characters"),
//     attachments: z.array(z.object({
//         file: fileSchema,
//         name: z.string().min(1, "File name is required").max(50, "File name must be less than 50 characters"),
//     })).max(5, "Maximum 5 files allowed").optional().default([]),
// });

// type RemarkFormValues = z.infer<typeof remarkFormSchema>;

// interface InsertRemarkModalProps {
//     letter_id: string;
//     onSuccess?: () => void;
// }

// export function InsertRemarkModal({letter_id, onSuccess}: InsertRemarkModalProps) {
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [open, setOpen] = useState(false);
//     const {hasPermission} = useAuthStore();
//     const fileInputRef = useRef<HTMLInputElement>(null);

//     const form = useForm<RemarkFormValues>({
//         resolver: zodResolver(remarkFormSchema),
//         defaultValues: {content: "", attachments: []},
//     });

//     const {control, handleSubmit, setValue, watch, reset} = form;
//     const attachments = watch("attachments");

//     const onSubmit = async (data: RemarkFormValues) => {
//         setIsSubmitting(true);
//         try {
//             // Step 1: Create remark with JSON body
//             const res = await api.post(`/v1/letter/${letter_id}/remarks`, {
//                 content: data.content,
//             });
//             const remarkId = res.data.data?.id;

//             // Step 2: Upload attachments if any
//             if (data.attachments && data.attachments.length > 0 && remarkId) {
//                 const formData = new FormData();
//                 data.attachments.forEach(attachment => {
//                     const ext = attachment.file.name.substring(attachment.file.name.lastIndexOf('.'));
//                     let customFileName = attachment.name;
//                     if (!customFileName.endsWith(ext)) customFileName += ext;
//                     formData.append('attachments', new File([attachment.file], customFileName, {type: attachment.file.type}));
//                 });
//                 await api.post(`/v1/letter/${letter_id}/remarks/${remarkId}/attachments`, formData, {
//                     headers: {'Content-Type': 'multipart/form-data'},
//                 });
//             }

//             toast.success("Remark added successfully");
//             reset();
//             setOpen(false);
//             onSuccess?.();
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//         const files = Array.from(event.target.files || []);
//         try {
//             const newFiles = files.map(file => ({
//                 file,
//                 name: file.name.substring(0, file.name.lastIndexOf('.')),
//             }));
//             setValue("attachments", [...(attachments || []), ...newFiles], {shouldValidate: true});
//         } catch (error) {
//             console.error("Error handling file change:", error);
//         }
//     };

//     const removeAttachment = (index: number) => {
//         setValue("attachments", attachments?.filter((_, i) => i !== index) || [], {shouldValidate: true});
//     };

//     return (
//         <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
//             <DialogTrigger asChild>
//                 <Button size="sm" disabled={!hasPermission('remark.create')}>
//                     <Plus className="mr-1.5 h-3.5 w-3.5"/>New Remark
//                 </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                     <DialogTitle>New Remark</DialogTitle>
//                     <DialogDescription className="text-sm text-gray-500">
//                         Add a remark for this letter.
//                     </DialogDescription>
//                 </DialogHeader>
//                 <hr className="border-t border-gray-200"/>
//                 <Form {...form}>
//                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
//                         <FormField control={control} name="content" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Remark</FormLabel>
//                                 <FormControl>
//                                     <Textarea
//                                         {...field}
//                                         className="min-h-[120px]"
//                                         placeholder="Enter remark / Message / Note / Decision"
//                                         disabled={isSubmitting}
//                                     />
//                                 </FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         <FormField control={control} name="attachments" render={() => (
//                             <FormItem>
//                                 <FormLabel>Attachments (Max 5 files, {MAX_FILE_SIZE / 1000000}MB each)</FormLabel>
//                                 <FormControl>
//                                     <div className="flex flex-col gap-2">
//                                         <input
//                                             type="file"
//                                             multiple
//                                             onChange={handleFileChange}
//                                             accept={ACCEPTED_FILE_TYPES.join(",")}
//                                             ref={fileInputRef}
//                                             className="hidden"
//                                         />
//                                         <Button type="button" variant="outline"
//                                             onClick={() => fileInputRef.current?.click()}
//                                             disabled={isSubmitting}>
//                                             Choose Files
//                                         </Button>
//                                         <p className="text-sm text-gray-500">
//                                             {attachments?.length > 0 ? `${attachments.length} file(s) selected` : "No files selected"}
//                                         </p>
//                                     </div>
//                                 </FormControl>
//                                 <FormMessage/>
//                                 <div className="space-y-3 mt-1">
//                                     {attachments?.map((_att, index) => (
//                                         <div key={index} className="space-y-1">
//                                             <FormField control={control} name={`attachments.${index}.file`} render={() => (
//                                                 <FormItem><FormMessage/></FormItem>
//                                             )}/>
//                                             <FormField control={control} name={`attachments.${index}.name`} render={({field}) => (
//                                                 <FormItem>
//                                                     <FormControl>
//                                                         <div className="flex gap-2 items-center relative">
//                                                             <Input {...field} placeholder="Enter file name" disabled={isSubmitting}/>
//                                                             <Button type="button" variant="ghost" size="icon"
//                                                                 className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                                 onClick={() => removeAttachment(index)} disabled={isSubmitting}>
//                                                                 <X className="h-4 w-4"/>
//                                                             </Button>
//                                                         </div>
//                                                     </FormControl>
//                                                     <FormMessage/>
//                                                 </FormItem>
//                                             )}/>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </FormItem>
//                         )}/>

//                         <div className="flex justify-end">
//                             <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
//                                 {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Submit Remark'}
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }

// export default InsertRemarkModal;


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
    .refine((file) => file.size <= MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1000000}MB`)
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), `File type must be one of: ${ACCEPTED_FILE_TYPES.join(", ")}`);

const remarkFormSchema = z.object({
    content: z.string().min(1, "Content is required").max(1000, "Content must be less than 1000 characters"),
    // NEW: Subject Number field for the remark
    subject_no: z.string().max(50, "Subject Number cannot exceed 50 characters").optional(),
    attachments: z.array(z.object({
        file: fileSchema,
        name: z.string().min(1, "File name is required").max(50, "File name must be less than 50 characters"),
    })).max(5, "Maximum 5 files allowed").optional().default([]),
}).superRefine((data, ctx) => {
    // NEW: Subject Number becomes mandatory when at least one attachment is added
    if (data.attachments && data.attachments.length > 0 && !data.subject_no?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["subject_no"],
            message: "Subject Number is required when attaching a file",
        });
    }
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
        defaultValues: {content: "", subject_no: "", attachments: []},
    });

    const {control, handleSubmit, setValue, watch, reset, trigger} = form;
    const attachments = watch("attachments");

    const onSubmit = async (data: RemarkFormValues) => {
        setIsSubmitting(true);
        try {
            // Step 1: Create remark with JSON body
            const res = await api.post(`/v1/letter/${letter_id}/remarks`, {
                content: data.content,
                subject_no: data.subject_no || null,
            });
            const remarkId = res.data.data?.id;

            // Step 2: Upload attachments if any
            if (data.attachments && data.attachments.length > 0 && remarkId) {
                const formData = new FormData();
                data.attachments.forEach(attachment => {
                    const ext = attachment.file.name.substring(attachment.file.name.lastIndexOf('.'));
                    let customFileName = attachment.name;
                    if (!customFileName.endsWith(ext)) customFileName += ext;
                    formData.append('attachments', new File([attachment.file], customFileName, {type: attachment.file.type}));
                });
                await api.post(`/v1/letter/${letter_id}/remarks/${remarkId}/attachments`, formData, {
                    headers: {'Content-Type': 'multipart/form-data'},
                });
            }

            toast.success("Remark added successfully");
            reset();
            setOpen(false);
            onSuccess?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
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
            setValue("attachments", [...(attachments || []), ...newFiles], {shouldValidate: true});
            // Re-validate subject_no now that attachments changed (mandatory-if-attachment rule)
            trigger("subject_no");
        } catch (error) {
            console.error("Error handling file change:", error);
        }
    };

    const removeAttachment = (index: number) => {
        const updated = attachments?.filter((_, i) => i !== index) || [];
        setValue("attachments", updated, {shouldValidate: true});
        trigger("subject_no");
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={!hasPermission('remark.create')}>
                    <Plus className="mr-1.5 h-3.5 w-3.5"/>New Remark
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Remark</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Add a remark for this letter.
                    </DialogDescription>
                </DialogHeader>
                <hr className="border-t border-gray-200"/>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <FormField control={control} name="content" render={({field}) => (
                            <FormItem>
                                <FormLabel>Remark</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        className="min-h-[120px]"
                                        placeholder="Enter remark / Message / Note / Decision"
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* NEW: Subject Number */}
                        <FormField control={control} name="subject_no" render={({field}) => (
                            <FormItem>
                                <FormLabel>
                                    Subject Number
                                    {attachments && attachments.length > 0 && (
                                        <span className="text-destructive"> *</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="Enter subject number"
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <FormField control={control} name="attachments" render={() => (
                            <FormItem>
                                <FormLabel>Attachments (Max 5 files, {MAX_FILE_SIZE / 1000000}MB each)</FormLabel>
                                <FormControl>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            accept={ACCEPTED_FILE_TYPES.join(",")}
                                            ref={fileInputRef}
                                            className="hidden"
                                        />
                                        <Button type="button" variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSubmitting}>
                                            Choose Files
                                        </Button>
                                        <p className="text-sm text-gray-500">
                                            {attachments?.length > 0 ? `${attachments.length} file(s) selected` : "No files selected"}
                                        </p>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                                <div className="space-y-3 mt-1">
                                    {attachments?.map((_att, index) => (
                                        <div key={index} className="space-y-1">
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
                                </div>
                            </FormItem>
                        )}/>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Submit Remark'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default InsertRemarkModal;