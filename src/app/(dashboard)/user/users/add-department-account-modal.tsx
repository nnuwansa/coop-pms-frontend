// // New file: app/(dashboard)/user/users/add-department-account-modal.tsx
// 'use client';
// import {useState} from "react";
// import {useForm} from "react-hook-form";
// import {zodResolver} from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {toast} from "sonner";
// import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
// import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
// import {Input} from "@/components/ui/input";
// import {Button} from "@/components/ui/button";
// import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
// import {Loader2} from "lucide-react";
// import api from "@/lib/api";

// const schema = z.object({
//     departmentId: z.string().min(1, "Department is required"),
//     email: z.string().min(1, "Email is required").email("Invalid email address"),
//     password: z.string().min(8, "Password must be at least 8 characters"),
//     confirmPassword: z.string().min(1, "Please confirm the password"),
// }).refine(d => d.password === d.confirmPassword, {
//     message: "Passwords do not match", path: ["confirmPassword"],
// });

// export function AddDepartmentAccountModal({isOpen, onClose, departments, onSuccess}) {
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const form = useForm({
//         resolver: zodResolver(schema),
//         defaultValues: {departmentId: "", email: "", password: "", confirmPassword: ""},
//     });

//     const onSubmit = async (data) => {
//         try {
//             setIsSubmitting(true);
//             await api.post('/v1/system_user/department-account', {
//                 department_id: parseInt(data.departmentId),
//                 email: data.email,
//                 password: data.password,
//             });
//             toast.success("Section account created successfully");
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
//             <DialogContent className="max-w-[440px]">
//                 <DialogHeader>
//                     <DialogTitle>Add Section Account</DialogTitle>
//                     <DialogDescription>Create a login for a section to receive and act on letters.</DialogDescription>
//                 </DialogHeader>
//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//                         <FormField control={form.control} name="departmentId" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Section</FormLabel>
//                                 <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
//                                     <FormControl>   
//                                         <SelectTrigger className="w-full"><SelectValue placeholder="Select section"/></SelectTrigger>
//                                     </FormControl>
//                                     <SelectContent>
//                                         {departments.map((d) => (
//                                             <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>
//                         <FormField control={form.control} name="email" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Email</FormLabel>
//                                 <FormControl><Input {...field} disabled={isSubmitting}/></FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>
//                         <FormField control={form.control} name="password" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Password</FormLabel>
//                                 <FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>
//                         <FormField control={form.control} name="confirmPassword" render={({field}) => (
//                             <FormItem>
//                                 <FormLabel>Confirm Password</FormLabel>
//                                 <FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl>
//                                 <FormMessage/>
//                             </FormItem>
//                         )}/>
//                         <DialogFooter>
//                             <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
//                             <Button type="submit" disabled={isSubmitting}>
//                                 {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : "Create Account"}
//                             </Button>
//                         </DialogFooter>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }


'use client';
import {useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {toast} from "sonner";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Loader2} from "lucide-react";
import api from "@/lib/api";

// CHANGED — accountType drives which target field (departmentId vs unitId)
// is required. Both target fields are optional at the schema level; the
// refine() rules below enforce "exactly the right one for the active tab".
const schema = z.object({
    accountType: z.enum(["section", "unit"]),
    departmentId: z.string().optional(),
    unitId: z.string().optional(),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
})
    .refine(d => d.password === d.confirmPassword, {
        message: "Passwords do not match", path: ["confirmPassword"],
    })
    .refine(d => d.accountType !== "section" || !!d.departmentId, {
        message: "Section is required", path: ["departmentId"],
    })
    .refine(d => d.accountType !== "unit" || !!d.unitId, {
        message: "Sub-unit is required", path: ["unitId"],
    });

export function AddDepartmentAccountModal({isOpen, onClose, departments, onSuccess}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // NEW — separate "which section narrows the sub-unit list" selector for
    // the Unit tab. Kept outside the form schema since it's just a filter,
    // not something submitted to the API (the API only needs unit_id).
    const [unitSectionId, setUnitSectionId] = useState("");
    const [units, setUnits] = useState<{id: number; name: string}[]>([]);
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            accountType: "section",
            departmentId: "",
            unitId: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const accountType = form.watch("accountType");

    // NEW — fetch sub-units whenever the section picked on the Unit tab changes
    useEffect(() => {
        if (!unitSectionId) { setUnits([]); return; }
        setIsLoadingUnits(true);
        api.get(`/v1/department/${unitSectionId}/units`)
            .then(res => setUnits(res.data.data || []))
            .catch(() => setUnits([]))
            .finally(() => setIsLoadingUnits(false));
    }, [unitSectionId]);

    const resetAll = () => {
        form.reset();
        setUnitSectionId("");
        setUnits([]);
    };

    const handleClose = () => {
        resetAll();
        onClose();
    };

    const handleTabChange = (value: string) => {
        form.setValue("accountType", value as "section" | "unit");
        // clear the other tab's selection so a stale id never gets submitted
        form.setValue("departmentId", "");
        form.setValue("unitId", "");
        setUnitSectionId("");
        setUnits([]);
    };

    const onSubmit = async (data: z.infer<typeof schema>) => {
        try {
            setIsSubmitting(true);

            // CHANGED — payload now sends either department_id OR
            // department_unit_id, matching the updated DepartmentAccountIn
            // backend model.
            const payload =
                data.accountType === "section"
                    ? {department_id: parseInt(data.departmentId as string), email: data.email, password: data.password}
                    : {department_unit_id: parseInt(data.unitId as string), email: data.email, password: data.password};

            await api.post('/v1/system_user/department-account', payload);
            toast.success(
                data.accountType === "section"
                    ? "Section account created successfully"
                    : "Sub-unit account created successfully"
            );
            resetAll();
            onClose();
            onSuccess?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Add Account</DialogTitle>
                    <DialogDescription>
                        Create a login for a section or a sub-unit to receive and act on letters.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* NEW — Section / Sub-Unit tabs */}
                        <Tabs value={accountType} onValueChange={handleTabChange}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="section">Section</TabsTrigger>
                                <TabsTrigger value="unit">Sub-Unit</TabsTrigger>
                            </TabsList>

                            <TabsContent value="section" className="pt-4">
                                <FormField control={form.control} name="departmentId" render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Section</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="Select section"/></SelectTrigger>
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
                            </TabsContent>

                            <TabsContent value="unit" className="pt-4 space-y-4">
                                {/* Picking a section here only narrows the sub-unit list below —
                                    it's not itself submitted, only unit_id is. */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Section</label>
                                    <Select
                                        value={unitSectionId}
                                        onValueChange={(v) => {
                                            setUnitSectionId(v);
                                            form.setValue("unitId", "");
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select section"/></SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <FormField control={form.control} name="unitId" render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Sub-Unit</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isSubmitting || !unitSectionId || isLoadingUnits}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={
                                                        !unitSectionId ? "Select a section first"
                                                            : isLoadingUnits ? "Loading..."
                                                            : units.length === 0 ? "No sub-units in this section"
                                                            : "Select sub-unit"
                                                    }/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {units.map((u) => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                            </TabsContent>
                        </Tabs>

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
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
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