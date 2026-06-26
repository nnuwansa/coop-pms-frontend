// import {useState} from "react";
// import {useForm} from "react-hook-form";
// import {zodResolver} from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {toast} from "sonner";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
// import {Input} from "@/components/ui/input";
// import {Button} from "@/components/ui/button";
// import {Loader2} from "lucide-react";
// import api from "@/lib/api";

// // Define the form schema with Zod
// const formSchema = z.object({
//     name: z.string()
//         .min(1, "Organization name is required")
//         .max(75, "Organization name must be less than 75 characters"),
// });

// // Define type for form values
// type FormValues = z.infer<typeof formSchema>;

// // Define props interface
// interface AddDialogProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onSuccess?: () => void;
// }

// export function AddDialog({isOpen, onClose, onSuccess}: AddDialogProps) {
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // Initialize the form
//     const form = useForm<FormValues>({
//         resolver: zodResolver(formSchema),
//         defaultValues: {
//             name: "",
//         },
//     });

//     const handleSubmit = async (values: FormValues) => {
//         setIsSubmitting(true);

//         try {
//             const response = await api.post('/v1/organization/',
//                 {
//                     name: values.name,
//                 });

//             const responseData = await response.data;
//             toast.success(responseData.message);
//             form.reset();
//             onClose();
//             onSuccess?.();

//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent>
//                 <DialogHeader>
//                     <DialogTitle>Add Organization</DialogTitle>
//                     <DialogDescription>
//                         Create a new organization
//                     </DialogDescription>
//                 </DialogHeader>

//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
//                         <FormField
//                             control={form.control}
//                             name="name"
//                             render={({field}) => (
//                                 <FormItem>
//                                     <FormLabel>Organization Name</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             disabled={isSubmitting}
//                                             placeholder="Enter organization name"
//                                             {...field} />
//                                     </FormControl>
//                                     <FormMessage/>
//                                 </FormItem>
//                             )}
//                         />

//                         <DialogFooter>
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 onClick={onClose}
//                                 disabled={isSubmitting}
//                             >
//                                 Cancel
//                             </Button>
//                             <Button
//                                 type="submit"
//                                 disabled={isSubmitting}
//                             >
//                                 {isSubmitting ? (
//                                     <>
//                                         <Loader2 className="animate-spin"/>
//                                         Creating...
//                                     </>
//                                 ) : "Create Organization"}
//                             </Button>
//                         </DialogFooter>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }



'use client';

import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {toast} from "sonner";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

const formSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(75),
    address: z.string().max(500).optional().or(z.literal("")),
    email: z.string().email("Invalid email").max(150).optional().or(z.literal("")),
    telephone: z.string().max(15).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddDialog({isOpen, onClose, onSuccess}: AddDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {name: "", address: "", email: "", telephone: ""},
    });

    const handleSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        try {
            const response = await api.post('/v1/organization/', {
                name: values.name,
                address: values.address || null,
                email: values.email || null,
                telephone: values.telephone || null,
            });
            toast.success(response.data.message);
            form.reset();
            onClose();
            onSuccess?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Organization</DialogTitle>
                    <DialogDescription>Create a new organization</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({field}) => (
                            <FormItem>
                                <FormLabel>Organization Name *</FormLabel>
                                <FormControl>
                                    <Input disabled={isSubmitting} placeholder="Enter organization name" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="address" render={({field}) => (
                            <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                    <Input disabled={isSubmitting} placeholder="Enter address" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input disabled={isSubmitting} placeholder="Enter email" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="telephone" render={({field}) => (
                            <FormItem>
                                <FormLabel>Telephone</FormLabel>
                                <FormControl>
                                    <Input disabled={isSubmitting} placeholder="Enter telephone" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="animate-spin mr-2"/>Creating...</> : "Create Organization"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}