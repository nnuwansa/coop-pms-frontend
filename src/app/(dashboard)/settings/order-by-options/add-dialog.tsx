'use client';

import {useState} from "react";
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
    category: string;
    is_active: boolean;
    create_datetime: string;
}

interface AddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingOptions: OrderByOption[];
}

export function AddDialog({isOpen, onClose, onSuccess, existingOptions}: AddDialogProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState<'role' | 'action'>('action');
    const [isSaving, setIsSaving] = useState(false);

    const resetAndClose = () => {
        if (isSaving) return;
        setName("");
        setCategory('action');
        onClose();
    };

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("Enter a title");
            return;
        }

        // client-side duplicate check, mirrors the server-side one so the
        // person gets instant feedback instead of waiting for the API round-trip
        const duplicate = existingOptions.some(
            o => o.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
            toast.error("This title already exists");
            return;
        }

        try {
            setIsSaving(true);
             const response = await api.post('/v1/order-by-option/', {name: trimmed, category});
            const data = await response.data;

            toast.success("Order By option added", {description: data.message});
            setName("");
            setCategory('action');
            onClose();
            onSuccess();
        } catch (error) {
            toast.error("Failed to add option", {
                description: error.response?.data?.message || 'Something went wrong. Please try again'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Add Order By Title</DialogTitle>
                    <DialogDescription>
                        e.g. &quot;Commissioner of Cooperative Development &amp; Registrar of Societies&quot;
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="new-order-by-name">Title</Label>
                    <Input
                        id="new-order-by-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Designation / seal title"
                        disabled={isSaving}
                        autoFocus
                    />
                    <Label htmlFor="new-order-by-category">Category</Label>
                    <Select
                        id="new-order-by-category"
                        value={category}
                        onValueChange={(value) => setCategory(value as 'role' | 'action')}
                        disabled={isSaving}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="action">Action</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={resetAndClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "Adding..." : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}