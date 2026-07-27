import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {toast} from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import api from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";

// Define the form schema with Zod
const formSchema = z.object({
    name: z.string()
        .min(1, "Status name is required")
        .max(40, "Status name must be less than 40 characters"),
    requiresFileName: z.boolean().default(false),   // NEW
});

// Define type for form values
type FormValues = z.infer<typeof formSchema>;

// Define props interface
interface AddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddDialog({isOpen, onClose, onSuccess}: AddDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize the form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            requiresFileName: false,
        },
    });

    const handleSubmit = async (values: FormValues) => {
        setIsSubmitting(true);

        try {
            const response = await api.post('/v1/status/',
                {
                    name: values.name,
                    requires_file_name: values.requiresFileName,   // NEW
                });

            const responseData = await response.data;
            toast.success(responseData.message);
            form.reset();
            onClose();
            onSuccess?.();

        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Status</DialogTitle>
                    <DialogDescription>
                        Create a new status
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Status Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isSubmitting}
                                            placeholder="Enter status name" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        
                            <FormField control={form.control} name="requiresFileName" render={({field}) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormLabel className="!mt-0 cursor-pointer">Require File Name when this status is selected</FormLabel>
                                </FormItem>
                            )}/>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin"/>
                                        Creating...
                                    </>
                                ) : "Create Status"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

