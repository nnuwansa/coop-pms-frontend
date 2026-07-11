// import {useForm} from "react-hook-form";
// import {zodResolver} from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {toast} from "sonner";
// import {
//     Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
// } from "@/components/ui/dialog";
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
// import {Input} from "@/components/ui/input";
// import {Button} from "@/components/ui/button";
// import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
// import {useEffect, useState} from "react";
// import {Eye, EyeOff, Loader2, IdCard, FileBadge2, Briefcase} from "lucide-react";
// import api from "@/lib/api";

// interface UpdateUserPayload {
//     email: string;
//     first_name: string;
//     last_name: string;
//     employee_id: string | null;
//     nic: string | null;
//     designation: string | null;
//     department_id: number;
//     role_id: number;
//     is_active: boolean;
//     password?: string;
// }

// const formSchema = z.object({
//     firstName: z.string().min(1, 'First name is required').max(50),
//     lastName: z.string().min(1, 'Last name is required').max(50),
//     email: z.string().min(1, 'Email is required').email('Invalid email address').max(150),
//     employeeId: z.string().max(50).optional().or(z.literal('')),
//     nic: z.string().max(20).optional().or(z.literal('')),
//     designation: z.string().max(255).optional().or(z.literal('')),
//     password: z.string()
//         .optional()
//         .refine((val) => !val || val.length >= 8, 'Password must be at least 8 characters')
//         .refine((val) => !val || /[A-Za-z]/.test(val), 'Password must contain at least one letter')
//         .refine((val) => !val || /[0-9]/.test(val), 'Password must contain at least one number')
//         .refine((val) => !val || /[^A-Za-z0-9]/.test(val), 'Password must contain at least one symbol'),
//     confirmPassword: z.string().optional(),
//     role: z.string().min(1, "Role is required"),
//     department: z.string().min(1, "Department is required"),
//     status: z.string().min(1, "Status is required")
// }).refine(data => !(data.password && data.password !== data.confirmPassword), {
//     message: "Passwords do not match",
//     path: ["confirmPassword"]
// });

// export function UpdateUserModal({isUpdateModalOpen, setIsUpdateModalOpen, userData, roles, departments, statuses}) {
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//     const findIdByName = (items, name) => {
//         const item = items.find(item => item.name === name);
//         return item ? item.id.toString() : "";
//     };

//     const form = useForm({
//         resolver: zodResolver(formSchema),
//         defaultValues: {
//             firstName: userData?.first_name || "",
//             lastName: userData?.last_name || "",
//             email: userData?.email || "",
//             employeeId: userData?.employee_id || "",
//             nic: userData?.nic || "",
//             designation: userData?.designation || "",
//             password: "",
//             confirmPassword: "",
//             role: findIdByName(roles, userData?.role),
//             department: findIdByName(departments, userData?.department),
//             status: findIdByName(statuses, userData?.status)
//         }
//     });

//     useEffect(() => {
//         if (userData) {
//             form.reset({
//                 firstName: userData.first_name || "",
//                 lastName: userData.last_name || "",
//                 email: userData.email || "",
//                 employeeId: userData.employee_id || "",
//                 nic: userData.nic || "",
//                 designation: userData.designation || "",
//                 password: "",
//                 confirmPassword: "",
//                 role: findIdByName(roles, userData.role),
//                 department: findIdByName(departments, userData.department),
//                 status: findIdByName(statuses, userData.status)
//             });
//             setShowPassword(false);
//             setShowConfirmPassword(false);
//         }
//     }, [userData, form, roles, departments, statuses]);

//     const onSubmit = async (data) => {
//         try {
//             setIsSubmitting(true);
//             const payload: UpdateUserPayload = {
//                 email: data.email,
//                 first_name: data.firstName,
//                 last_name: data.lastName,
//                 employee_id: data.employeeId || null,
//                 nic: data.nic || null,
//                 designation: data.designation || null,
//                 department_id: parseInt(data.department),
//                 role_id: parseInt(data.role),
//                 is_active: data.status === "1"
//             };
//             if (data.password) payload.password = data.password;

//             const response = await api.put(`/v1/system_user/${userData.id}`, payload);
//             toast.success(response.data.message || "User updated successfully");
//             setIsUpdateModalOpen(false);
//         } catch (error) {
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     return (
//         <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
//             <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                     <DialogTitle>Update User</DialogTitle>
//                     <DialogDescription>Make changes to the user&#39;s information here</DialogDescription>
//                 </DialogHeader>

//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//                         <div className="grid grid-cols-2 gap-4">
//                             <FormField control={form.control} name="firstName" render={({field}) => (
//                                 <FormItem>
//                                     <FormLabel>First Name</FormLabel>
//                                     <FormControl>
//                                         <Input {...field} placeholder="Enter first name" disabled={isSubmitting}/>
//                                     </FormControl>
//                                     <FormMessage/>
//                                 </FormItem>
//                             )}/>
//                             <FormField control={form.control} name="lastName" render={({field}) => (
//                                 <FormItem>
//                                     <FormLabel>Last Name</FormLabel>
//                                     <FormControl>
//                                         <Input {...field} placeholder="Enter last name" disabled={isSubmitting}/>
//                                     </FormControl>
//                                     <FormMessage/>
//                                 </FormItem>
//                             )}/>
//                         </div>

//                         <FormField control={form.control} name="email" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Email</FormLabel>
//                                 <FormControl>
//                                     <Input {...field} placeholder="Enter email" disabled={isSubmitting}/>
//                                 </FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         {/* Employee ID */}
//                         <FormField control={form.control} name="employeeId" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Employee ID</FormLabel>
//                                 <FormControl>
//                                     <div className="relative">
//                                         <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
//                                         <Input
//                                             {...field}
//                                             placeholder="e.g. EMP0123"
//                                             disabled={isSubmitting}
//                                             className="pl-9"
//                                         />
//                                     </div>
//                                 </FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         {/* NIC & Designation */}
//                         <div className="grid grid-cols-2 gap-4">
//                             <FormField control={form.control} name="nic" render={({field}) => (
//                                 <FormItem>
//                                     <FormLabel>NIC</FormLabel>
//                                     <FormControl>
//                                         <div className="relative">
//                                             <FileBadge2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
//                                             <Input
//                                                 {...field}
//                                                 placeholder="e.g. 200012345678"
//                                                 disabled={isSubmitting}
//                                                 className="pl-9"
//                                             />
//                                         </div>
//                                     </FormControl>
//                                     <FormMessage/>
//                                 </FormItem>
//                             )}/>
//                             <FormField control={form.control} name="designation" render={({field}) => (
//                                 <FormItem>
//                                     <FormLabel>Designation</FormLabel>
//                                     <FormControl>
//                                         <div className="relative">
//                                             <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
//                                             <Input
//                                                 {...field}
//                                                 placeholder="e.g. Accountant"
//                                                 disabled={isSubmitting}
//                                                 className="pl-9"
//                                             />
//                                         </div>
//                                     </FormControl>
//                                     <FormMessage/>
//                                 </FormItem>
//                             )}/>
//                         </div>

//                         {/* Password with show/hide */}
//                         <FormField control={form.control} name="password" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Password</FormLabel>
//                                 <FormControl>
//                                     <div className="relative">
//                                         <Input
//                                             {...field}
//                                             type={showPassword ? "text" : "password"}
//                                             disabled={isSubmitting}
//                                             placeholder="Leave blank to keep current password"
//                                             className="pr-10"
//                                         />
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             size="icon"
//                                             className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
//                                             onClick={() => setShowPassword(prev => !prev)}
//                                             disabled={isSubmitting}
//                                         >
//                                             {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
//                                         </Button>
//                                     </div>
//                                 </FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         {/* Confirm Password with show/hide */}
//                         <FormField control={form.control} name="confirmPassword" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Confirm Password</FormLabel>
//                                 <FormControl>
//                                     <div className="relative">
//                                         <Input
//                                             {...field}
//                                             type={showConfirmPassword ? "text" : "password"}
//                                             disabled={isSubmitting}
//                                             placeholder="Leave blank to keep current password"
//                                             className="pr-10"
//                                         />
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             size="icon"
//                                             className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
//                                             onClick={() => setShowConfirmPassword(prev => !prev)}
//                                             disabled={isSubmitting}
//                                         >
//                                             {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
//                                         </Button>
//                                     </div>
//                                 </FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         <FormField control={form.control} name="role" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Role</FormLabel>
//                                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
//                                     <FormControl className="w-full">
//                                         <SelectTrigger><SelectValue placeholder="Select role"/></SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         {roles.map((role) => (
//                                             <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         <FormField control={form.control} name="department" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Department</FormLabel>
//                                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
//                                     <FormControl className="w-full">
//                                         <SelectTrigger>
//                                             <div className="w-[400px] overflow-hidden">
//                                                 <SelectValue placeholder="Select department"/>
//                                             </div>
//                                         </SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         {departments.map((dept) => (
//                                             <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         <FormField control={form.control} name="status" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Status</FormLabel>
//                                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
//                                     <FormControl className="w-full">
//                                         <SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         {statuses.map((status) => (
//                                             <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>

//                         <DialogFooter>
//                             <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
//                                 Cancel
//                             </Button>
//                             <Button type="submit" disabled={isSubmitting}>
//                                 {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Updating...</> : 'Update'}
//                             </Button>
//                         </DialogFooter>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }


import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {toast} from "sonner";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useEffect, useState} from "react";
import {Eye, EyeOff, Loader2, IdCard, FileBadge2} from "lucide-react";
import api from "@/lib/api";

interface UpdateUserPayload {
    email: string;
    first_name: string;
    last_name: string;
    employee_id: string | null;
    nic: string | null;
    designation_id: number | null;
    department_id: number;
    role_id: number;
    is_active: boolean;
    password?: string;
}

const formSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().min(1, 'Email is required').email('Invalid email address').max(150),
    employeeId: z.string().max(50).optional().or(z.literal('')),
    nic: z.string().max(20).optional().or(z.literal('')),
    designation: z.string().optional().or(z.literal('')),
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
}).refine(data => !(data.password && data.password !== data.confirmPassword), {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

export function UpdateUserModal({isUpdateModalOpen, setIsUpdateModalOpen, userData, roles, departments, designations, statuses}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const findIdByName = (items, name) => {
        const item = items.find(item => item.name === name);
        return item ? item.id.toString() : "";
    };

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: userData?.first_name || "",
            lastName: userData?.last_name || "",
            email: userData?.email || "",
            employeeId: userData?.employee_id || "",
            nic: userData?.nic || "",
            designation: findIdByName(designations || [], userData?.designation),
            password: "",
            confirmPassword: "",
            role: findIdByName(roles, userData?.role),
            department: findIdByName(departments, userData?.department),
            status: findIdByName(statuses, userData?.status)
        }
    });

    useEffect(() => {
        if (userData) {
            form.reset({
                firstName: userData.first_name || "",
                lastName: userData.last_name || "",
                email: userData.email || "",
                employeeId: userData.employee_id || "",
                nic: userData.nic || "",
                designation: findIdByName(designations || [], userData.designation),
                password: "",
                confirmPassword: "",
                role: findIdByName(roles, userData.role),
                department: findIdByName(departments, userData.department),
                status: findIdByName(statuses, userData.status)
            });
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData, form, roles, departments, designations, statuses]);

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            const payload: UpdateUserPayload = {
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                employee_id: data.employeeId || null,
                nic: data.nic || null,
                designation_id: data.designation ? parseInt(data.designation) : null,
                department_id: parseInt(data.department),
                role_id: parseInt(data.role),
                is_active: data.status === "1"
            };
            if (data.password) payload.password = data.password;

            const response = await api.put(`/v1/system_user/${userData.id}`, payload);
            toast.success(response.data.message || "User updated successfully");
            setIsUpdateModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
            <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Update User</DialogTitle>
                    <DialogDescription>Make changes to the user&#39;s information here</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Enter first name" disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            {/* <FormField control={form.control} name="lastName" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Enter last name" disabled={isSubmitting}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/> */}
                        </div>

                        <FormField control={form.control} name="email" render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter email" disabled={isSubmitting}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* Employee ID */}
                        <FormField control={form.control} name="employeeId" render={({field}) => (
                            <FormItem>
                                <FormLabel>Employee ID</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                        <Input
                                            {...field}
                                            placeholder="e.g. EMP0123"
                                            disabled={isSubmitting}
                                            className="pl-9"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* NIC & Designation — designation is now a dropdown, same as the sign-up page */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="nic" render={({field}) => (
                                <FormItem>
                                    <FormLabel>NIC</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <FileBadge2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                            <Input
                                                {...field}
                                                placeholder="e.g. 200012345678"
                                                disabled={isSubmitting}
                                                className="pl-9"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="designation" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Designation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                        <FormControl className="w-full">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select designation"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(designations || []).map((d) => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                        </div>

                        {/* Password with show/hide */}
                        <FormField control={form.control} name="password" render={({field}) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            type={showPassword ? "text" : "password"}
                                            disabled={isSubmitting}
                                            placeholder="Leave blank to keep current password"
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            disabled={isSubmitting}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* Confirm Password with show/hide */}
                        <FormField control={form.control} name="confirmPassword" render={({field}) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            type={showConfirmPassword ? "text" : "password"}
                                            disabled={isSubmitting}
                                            placeholder="Leave blank to keep current password"
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowConfirmPassword(prev => !prev)}
                                            disabled={isSubmitting}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="role" render={({field}) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl className="w-full">
                                        <SelectTrigger><SelectValue placeholder="Select role"/></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="department" render={({field}) => (
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl className="w-full">
                                        <SelectTrigger>
                                            <div className="w-[400px] overflow-hidden">
                                                <SelectValue placeholder="Select department"/>
                                            </div>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="status" render={({field}) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                    <FormControl className="w-full">
                                        <SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Updating...</> : 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}