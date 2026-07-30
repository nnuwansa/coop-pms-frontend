// 'use client';

// import {useCallback, useEffect, useState} from "react";
// import {Button} from "@/components/ui/button";
// import {Input} from "@/components/ui/input";
// import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
// import {Loader2, Pencil, Plus, Trash2, X, Check} from "lucide-react";
// import {toast} from "sonner";
// import api from "@/lib/api";

// interface Unit {
//     id: number;
//     department_id: number;
//     name: string;
// }

// interface ManageUnitsDialogProps {
//     isOpen: boolean;
//     onClose: () => void;
//     department: {id: string; name: string} | null;
//     onUnitsChanged?: () => void;
// }

// export function ManageUnitsDialog({isOpen, onClose, department, onUnitsChanged}: ManageUnitsDialogProps) {
//     const [units, setUnits] = useState<Unit[]>([]);
//     const [isLoading, setIsLoading] = useState(false);
//     const [newUnitName, setNewUnitName] = useState("");
//     const [isAdding, setIsAdding] = useState(false);
//     const [editingId, setEditingId] = useState<number | null>(null);
//     const [editingName, setEditingName] = useState("");

//     const fetchUnits = useCallback(async () => {
//         if (!department) return;
//         setIsLoading(true);
//         try {
//             const res = await api.get(`/v1/department/${department.id}/units`);
//             setUnits(res.data.data || []);
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to load sub-units');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [department]);

//     useEffect(() => {
//         if (isOpen && department) fetchUnits();
//     }, [isOpen, department, fetchUnits]);

//     const handleAdd = async () => {
//         if (!newUnitName.trim() || !department) return;
//         setIsAdding(true);
//         try {
//             await api.post(`/v1/department/${department.id}/units`, {name: newUnitName.trim()});
//             toast.success("Sub-unit added");
//             setNewUnitName("");
//             fetchUnits();
//             onUnitsChanged?.();
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to add sub-unit');
//         } finally {
//             setIsAdding(false);
//         }
//     };

//     const startEdit = (unit: Unit) => {
//         setEditingId(unit.id);
//         setEditingName(unit.name);
//     };

//     const handleSaveEdit = async (unitId: number) => {
//         if (!editingName.trim()) return;
//         try {
//             await api.put(`/v1/department/units/${unitId}`, {name: editingName.trim()});
//             toast.success("Sub-unit updated");
//             setEditingId(null);
//             fetchUnits();
//             onUnitsChanged?.();
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to update sub-unit');
//         }
//     };

//     const handleDelete = async (unitId: number) => {
//         try {
//             await api.delete(`/v1/department/units/${unitId}`);
//             toast.success("Sub-unit deleted");
//             fetchUnits();
//             onUnitsChanged?.();
//         } catch (error) {
//             toast.error(error.response?.data?.message || 'Failed to delete sub-unit');
//         }
//     };
//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent className="sm:max-w-md">
//                 <DialogHeader>
//                     <DialogTitle>Manage Sub-Units</DialogTitle>
//                     <DialogDescription>
//                         Sub-units under {department?.name}
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="flex gap-2">
//                     <Input
//                         placeholder="New sub-unit name"
//                         value={newUnitName}
//                         onChange={(e) => setNewUnitName(e.target.value)}
//                         onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
//                         disabled={isAdding}
//                     />
//                     <Button onClick={handleAdd} disabled={isAdding || !newUnitName.trim()}>
//                         {isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
//                         Add Unit
//                     </Button>
//                 </div>

//                 <div className="space-y-2 max-h-80 overflow-y-auto">
//                     {isLoading ? (
//                         <div className="flex justify-center py-6">
//                             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
//                         </div>
//                     ) : units.length === 0 ? (
//                         <p className="text-sm text-muted-foreground text-center py-6">No sub-units yet</p>
//                     ) : (
//                         units.map(unit => (
//                             <div key={unit.id} className="flex items-center gap-2 border rounded-md p-2">
//                                 {editingId === unit.id ? (
//                                     <>
//                                         <Input
//                                             value={editingName}
//                                             onChange={(e) => setEditingName(e.target.value)}
//                                             className="h-8 text-sm"
//                                             autoFocus
//                                         />
//                                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(unit.id)}>
//                                             <Check className="h-4 w-4"/>
//                                         </Button>
//                                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
//                                             <X className="h-4 w-4"/>
//                                         </Button>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <span className="flex-1 text-sm">{unit.name}</span>
//                                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(unit)}>
//                                             <Pencil className="h-3.5 w-3.5"/>
//                                         </Button>
//                                         <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(unit.id)}>
//                                             <Trash2 className="h-3.5 w-3.5"/>
//                                         </Button>
//                                     </>
//                                 )}
//                             </div>
//                         ))
//                     )}
//                 </div>
//             </DialogContent>
//         </Dialog>
//     );
// }



'use client';

import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Loader2, Pencil, Plus, Trash2, X, Check} from "lucide-react";
import {toast} from "sonner";
import api from "@/lib/api";

interface Unit {
    id: number;
    department_id: number;
    name: string;
    email?: string | null;   // NEW
}

interface ManageUnitsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    department: {id: string; name: string} | null;
    onUnitsChanged?: () => void;
}

export function ManageUnitsDialog({isOpen, onClose, department, onUnitsChanged}: ManageUnitsDialogProps) {
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newUnitName, setNewUnitName] = useState("");
    const [newUnitEmail, setNewUnitEmail] = useState("");   // NEW
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editingEmail, setEditingEmail] = useState("");   // NEW

    const fetchUnits = useCallback(async () => {
        if (!department) return;
        setIsLoading(true);
        try {
            const res = await api.get(`/v1/department/${department.id}/units`);
            setUnits(res.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load sub-units');
        } finally {
            setIsLoading(false);
        }
    }, [department]);

    useEffect(() => {
        if (isOpen && department) fetchUnits();
    }, [isOpen, department, fetchUnits]);

    const handleAdd = async () => {
        if (!newUnitName.trim() || !department) return;
        setIsAdding(true);
        try {
            await api.post(`/v1/department/${department.id}/units`, {
                name: newUnitName.trim(),
                email: newUnitEmail.trim() || null,   // NEW
            });
            toast.success("Sub-unit added");
            setNewUnitName("");
            setNewUnitEmail("");   // NEW
            fetchUnits();
            onUnitsChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add sub-unit');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (unit: Unit) => {
        setEditingId(unit.id);
        setEditingName(unit.name);
        setEditingEmail(unit.email || "");   // NEW
    };

    const handleSaveEdit = async (unitId: number) => {
        if (!editingName.trim()) return;
        try {
            await api.put(`/v1/department/units/${unitId}`, {
                name: editingName.trim(),
                email: editingEmail.trim() || null,   // NEW
            });
            toast.success("Sub-unit updated");
            setEditingId(null);
            fetchUnits();
            onUnitsChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update sub-unit');
        }
    };

    const handleDelete = async (unitId: number) => {
        try {
            await api.delete(`/v1/department/units/${unitId}`);
            toast.success("Sub-unit deleted");
            fetchUnits();
            onUnitsChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete sub-unit');
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Sub-Units</DialogTitle>
                    <DialogDescription>
                        Sub-units under {department?.name}
                    </DialogDescription>
                </DialogHeader>

                {/* CHANGED — name + email now stack on their own row each,
                    since a single-line layout got cramped once email was added */}
                <div className="space-y-2 border rounded-md p-3">
                    <Input
                        placeholder="New sub-unit name"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        disabled={isAdding}
                    />
                    <Input
                        placeholder="Email (optional)"
                        value={newUnitEmail}
                        onChange={(e) => setNewUnitEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                        disabled={isAdding}
                    />
                    <Button onClick={handleAdd} disabled={isAdding || !newUnitName.trim()} className="w-full">
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                        Add Unit
                    </Button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                        </div>
                    ) : units.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No sub-units yet</p>
                    ) : (
                        units.map(unit => (
                            <div key={unit.id} className="border rounded-md p-2 space-y-1.5">
                                {editingId === unit.id ? (
                                    <>
                                        <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="Name"
                                            autoFocus
                                        />
                                        <Input
                                            value={editingEmail}
                                            onChange={(e) => setEditingEmail(e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="Email (optional)"
                                        />
                                        <div className="flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(unit.id)}>
                                                <Check className="h-4 w-4"/>
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{unit.name}</p>
                                            {/* NEW — shows the unit's login email, if set */}
                                            <p className="text-xs text-muted-foreground truncate">
                                                {unit.email || "No email set"}
                                            </p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(unit)}>
                                            <Pencil className="h-3.5 w-3.5"/>
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(unit.id)}>
                                            <Trash2 className="h-3.5 w-3.5"/>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}