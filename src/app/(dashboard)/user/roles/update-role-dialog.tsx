import {useEffect, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

import {toast} from "sonner";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {CORE_API_URL} from "@/lib/client-config";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

// Define schema for form validation
const roleFormSchema = z.object({
    name: z.string()
        .min(1, "Role name is required")
        .max(50, "Role name must be less than 50 characters"),
    description: z.string()
        .min(1, "Description is required")
        .max(100, "Description must be less than 100 characters"),
});

// Infer TypeScript type from the schema
type RoleFormValues = z.infer<typeof roleFormSchema>;

interface Role {
    id: string;
    name: string;
    description: string;
}

interface UpdateRoleDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: Role;
    onSuccess?: () => void;
}

export function UpdateRoleDialog({
                                     isOpen,
                                     onOpenChange,
                                     initialData,
                                     onSuccess,
                                 }: UpdateRoleDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
        },
    });

    // handle initialData change
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                description: initialData.description,
            });
        }
    }, [form, initialData]);

    const handleSubmit = async (values: RoleFormValues) => {
        try {
            setIsSubmitting(true);

            const response = await api.put(`${CORE_API_URL}/v1/role/${initialData.id}`, {
                name: values.name,
                description: values.description
            });
            const result = await response.data;


            toast.success(result.message || "Role updated successfully");
            onOpenChange(false);
            form.reset();
            onSuccess?.();

        } catch (error) {
            console.error("Error updating role:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Role</DialogTitle>
                    <DialogDescription>
                        Make changes to the role details
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Role Name</FormLabel>
                                    <FormControl>
                                        <Input disabled={isSubmitting} placeholder="Enter role name" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input disabled={isSubmitting}
                                               placeholder="Enter role description" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ?
                                    <>
                                        <Loader2 className="animate-spin"/>
                                        Saving...
                                    </> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}