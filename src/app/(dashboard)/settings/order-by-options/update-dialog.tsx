'use client';

import {useEffect, useState} from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {toast} from "sonner";
import api from "@/lib/api";

interface OrderByOption {
    id: number;
    name: string;
    category: string;   // FIXED — was missing, needed for the picker below
    is_active: boolean;
    create_datetime: string;
}

interface UpdateDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: OrderByOption | null;
    onSuccess: () => void;
}

export function UpdateDialog({isOpen, onOpenChange, initialData, onSuccess}: UpdateDialogProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState<'role' | 'action'>('action');   // NEW
    const [isSaving, setIsSaving] = useState(false);

    // repopulate the fields whenever a different row is opened for editing
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setCategory((initialData.category as 'role' | 'action') || 'action');   // NEW
        }
    }, [initialData]);

    const handleClose = (open: boolean) => {
        if (!open && isSaving) return;
        onOpenChange(open);
    };

    const handleSubmit = async () => {
        if (!initialData) return;

        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("Title cannot be empty");
            return;
        }

        try {
            setIsSaving(true);
            const response = await api.put(`/v1/order-by-option/${initialData.id}`, {
                name: trimmed,
                category,   // NEW — now sent alongside name
            });
            const data = await response.data;

            toast.success("Order By option updated", {description: data.message});
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            toast.error("Failed to update option", {
                description: error.response?.data?.message || 'Something went wrong. Please try again'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Update Order By Title</DialogTitle>
                    <DialogDescription>
                        Changing this title updates it everywhere it&apos;s already been selected on letters.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-order-by-name">Title</Label>
                        <Input
                            id="edit-order-by-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSaving}
                            autoFocus
                        />
                    </div>
                    {/* NEW — category picker, same options as the Add dialog */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as 'role' | 'action')}>
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="role">Role (නි.කො / ස.කො)</SelectItem>
                                <SelectItem value="action">Action (කරු. ඉදිරි කටයුතු සඳහා...)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}