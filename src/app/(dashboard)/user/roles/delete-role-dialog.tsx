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

interface DeleteRoleDialogProps {
    deleteRoleAlert: {
        isOpen: boolean;
        roleId: number;
    };
    setDeleteRoleAlert: (alert: { isOpen: boolean; roleId: number }) => void;
    onSuccess?: () => void;
}

export function DeleteRoleDialog({deleteRoleAlert, setDeleteRoleAlert, onSuccess}: DeleteRoleDialogProps) {
    return (
        <AlertDialog
            open={deleteRoleAlert.isOpen}
            onOpenChange={() => setDeleteRoleAlert({isOpen: false, roleId: 0})}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this role?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete role <span
                        className="font-semibold">#{deleteRoleAlert.roleId}</span>.
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