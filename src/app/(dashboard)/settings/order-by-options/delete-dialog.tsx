'use client';

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {AlertTriangle, ShieldOff} from "lucide-react";

interface DeleteAlertState {
    isOpen: boolean;
    Id: number;
}

interface DeleteDialogProps {
    deleteAlert: DeleteAlertState;
    setDeleteAlert: (state: DeleteAlertState) => void;
    onSuccess: () => void;
}

export function DeleteDialog({deleteAlert, setDeleteAlert, onSuccess}: DeleteDialogProps) {
    const close = () => setDeleteAlert({isOpen: false, Id: 0});

    const confirm = () => {
        onSuccess();
        close();
    };

    return (
        <Dialog open={deleteAlert.isOpen} onOpenChange={(open) => { if (!open) close(); }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
                        </div>
                        <DialogTitle>Deactivate this title?</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        This title will no longer appear as a choice in the Order By picker on letters.
                        Letters that already have it selected keep showing it — this only hides it from
                        future selections. You can reactivate it anytime from this list.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirm}>
                        <ShieldOff className="mr-2 h-4 w-4"/>
                        Deactivate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}