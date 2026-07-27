import {useEffect, useState} from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {toast} from "sonner";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

const formSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(75, "Organization name must be less than 75 characters"),
    address: z.string().max(500).optional().or(z.literal("")),
    email: z.string().email("Invalid email").max(150).optional().or(z.literal("")),
    telephone: z.string().max(15).optional().or(z.literal("")),
    faxNo: z.string().max(20).optional().or(z.literal("")),   // NEW
});

type FormValues = z.infer<typeof formSchema>;

interface Organization {
    id: string;
    name: string;
    address?: string;
    email?: string;
    telephone?: string;
    fax_no?: string;   // NEW
}

interface UpdateDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: Organization;
    onSuccess?: () => void;
}

export function UpdateDialog({isOpen, onOpenChange, initialData, onSuccess}: UpdateDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {name: "", address: "", email: "", telephone: ""},
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                address: initialData.address || "",
                email: initialData.email || "",
                telephone: initialData.telephone || "",
                faxNo: initialData.fax_no || "",   // NEW
            });
        }
    }, [form, initialData]);

    const handleSubmit = async (values: FormValues) => {
        try {
            setIsSubmitting(true);
            const response = await api.put(`/v1/organization/${initialData.id}`, {
                name: values.name,
                address: values.address || null,
                email: values.email || null,
                telephone: values.telephone || null,
                fax_no: values.faxNo || null,   // NEW
            });
            toast.success(response.data.message || "Organization updated successfully");
            onOpenChange(false);
            form.reset();
            onSuccess?.();
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Organization</DialogTitle>
                    <DialogDescription>Make changes to the organization details</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
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
                        <FormField control={form.control} name="faxNo" render={({field}) => (
                            <FormItem>
                                <FormLabel>Fax No</FormLabel>
                                <FormControl>
                                    <Input disabled={isSubmitting} placeholder="Enter fax number" {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="animate-spin mr-2"/>Saving...</> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}