import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface DeleteDialogProps {
    deleteAlert: {
        isOpen: boolean;
        Id: number;
    };
    setDeleteAlert: (alert: { isOpen: boolean; Id: number }) => void;
    onSuccess?: () => void;
}

export function DeleteDialog({deleteAlert, setDeleteAlert, onSuccess}: DeleteDialogProps) {
    return (
        <AlertDialog
            open={deleteAlert.isOpen}
            onOpenChange={() => setDeleteAlert({isOpen: false, Id: 0})}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this department?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete department <span
                        className="font-semibold">#{deleteAlert.Id}</span>.
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onSuccess}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}