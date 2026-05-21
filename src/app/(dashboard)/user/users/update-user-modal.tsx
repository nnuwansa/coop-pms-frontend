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
    DialogTitle
} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useEffect, useState} from "react";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

interface UpdateUserPayload {
    email: string;
    first_name: string;
    last_name: string;
    department_id: number;
    role_id: number;
    is_active: boolean;
    password?: string;
}

// Define the validation schema with Zod
const formSchema = z.object({
    firstName: z.string()
        .min(1, 'First name is required')
        .max(50, 'First name must be at most 50 characters'),
    lastName: z.string()
        .min(1, 'Last name is required')
        .max(50, 'Last name must be at most 50 characters'),
    email: z.string()
        .min(1, 'Email is required')
        .email('Invalid email address')
        .max(150, "Email cannot exceed 150 characters"),
    password: z.string()
        .optional()
        .refine((val) => !val || val.length >= 8, 'Password must be at least 8 characters')
        .refine((val) => !val || /[A-Za-z]/.test(val), 'Password must contain at least one letter')
        .refine((val) => !val || /[0-9]/.test(val), 'Password must contain at least one number')
        .refine((val) => !val || /[^A-Za-z0-9]/.test(val), 'Password must contain at least one symbol'),
    confirmPassword: z.string().optional(),
    role: z.string().min(1, "Role is required"),
    department: z.string().min(1, "Department is required"),
    status: z.string().min(1, "Status is required")
}).refine(data => {
    return !(data.password && data.password !== data.confirmPassword);
}, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

export function UpdateUserModal({
                                    isUpdateModalOpen,
                                    setIsUpdateModalOpen,
                                    userData,
                                    roles,
                                    departments,
                                    statuses
                                }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Helper function to find ID by name
    const findIdByName = (items, name) => {
        const item = items.find(item => item.name === name);
        return item ? item.id.toString() : "";
    };

    // Create a form with react-hook-form
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: userData?.first_name || "",
            lastName: userData?.last_name || "",
            email: userData?.email || "",
            password: "",
            confirmPassword: "",
            // Find IDs based on names
            role: findIdByName(roles, userData?.role),
            department: findIdByName(departments, userData?.department),
            status: findIdByName(statuses, userData?.status)
        }
    });

    // Reset form when selectedUser changes
    useEffect(() => {
        if (userData) {
            form.reset({
                firstName: userData.first_name || "",
                lastName: userData.last_name || "",
                email: userData.email || "",
                password: "",
                confirmPassword: "",
                role: findIdByName(roles, userData.role),
                department: findIdByName(departments, userData.department),
                status: findIdByName(statuses, userData.status)
            });
        }
    }, [userData, form, roles, departments, statuses]);

    // Form submission handler
    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            // Prepare the data according to API requirements
            const payload: UpdateUserPayload = {
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                department_id: parseInt(data.department),
                role_id: parseInt(data.role),
                is_active: data.status === "1" // Assuming status "1" means active
            };

            // Only include password if it was provided
            if (data.password) {
                payload.password = data.password;
            }

            const response = await api.put(`/v1/system_user/${userData.id}`, payload);
            const result = await response.data;

            toast.success(result.message || "User updated successfully");
            setIsUpdateModalOpen(false);

        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Update User</DialogTitle>
                        <DialogDescription>
                            Make changes to the user&#39;s information here
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input {...field}
                                                       placeholder="Enter your first name"
                                                       disabled={isSubmitting}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input {...field}
                                                       placeholder="Enter your last name"
                                                       disabled={isSubmitting}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field}
                                                   placeholder="Enter your email"
                                                   disabled={isSubmitting}/>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                {...field}
                                                disabled={isSubmitting}
                                                placeholder="Leave blank to keep current password"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                {...field}
                                                disabled={isSubmitting}
                                                placeholder="Leave blank to keep current password"
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="role"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <FormControl className="w-full">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role.id} value={role.id.toString()}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="department"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Department</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <FormControl className="w-full">
                                                <SelectTrigger>
                                                    <div
                                                        className="w-[400px] overflow-hidden">
                                                        <SelectValue placeholder="Select department"/>
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <FormControl className="w-full">
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {statuses.map((status) => (
                                                    <SelectItem key={status.id} value={status.id.toString()}>
                                                        {status.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsUpdateModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}