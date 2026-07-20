// New file: app/(dashboard)/user/users/add-department-account-modal.tsx
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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

const schema = z.object({
    departmentId: z.string().min(1, "Department is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
}).refine(d => d.password === d.confirmPassword, {
    message: "Passwords do not match", path: ["confirmPassword"],
});

export function AddDepartmentAccountModal({isOpen, onClose, departments, onSuccess}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {departmentId: "", email: "", password: "", confirmPassword: ""},
    });

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            await api.post('/v1/system_user/department-account', {
                department_id: parseInt(data.departmentId),
                email: data.email,
                password: data.password,
            });
            toast.success("Department account created successfully");
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
            <DialogContent className="max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Add Department Account</DialogTitle>
                    <DialogDescription>Create a login for a department to receive and act on letters.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="departmentId" render={({field}) => (
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select department"/></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="password" render={({field}) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({field}) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : "Create Account"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}