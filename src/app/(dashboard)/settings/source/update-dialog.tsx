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
import {Loader2} from "lucide-react";
import api from "@/lib/api";

// Define schema for form validation
const formSchema = z.object({
    name: z.string()
        .min(1, "Source name is required")
        .max(40, "Source name must be less than 40 characters"),
});

// Infer TypeScript type from the schema
type FormValues = z.infer<typeof formSchema>;

interface Source {
    id: string;
    name: string;
}

interface UpdateDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: Source;
    onSuccess?: () => void;
}

export function UpdateDialog({
                                 isOpen,
                                 onOpenChange,
                                 initialData,
                                 onSuccess,
                             }: UpdateDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
        },
    });

    // handle initialData change
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
            });
        }
    }, [form, initialData]);

    const handleSubmit = async (values: FormValues) => {
        try {
            setIsSubmitting(true);

            const response = await api.put(`/v1/source/${initialData.id}`, {
                name: values.name,
            });
            const result = await response.data;

            toast.success(result.message || "Source updated successfully");
            onOpenChange(false);
            form.reset();
            onSuccess?.();
        } catch (error) {
            console.error("Error updating source:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Source</DialogTitle>
                    <DialogDescription>
                        Make changes to the source details
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Source Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isSubmitting}
                                            placeholder="Enter source name" {...field} />
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
