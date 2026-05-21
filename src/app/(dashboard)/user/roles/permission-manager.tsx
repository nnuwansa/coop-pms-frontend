import {useCallback, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {ScrollArea} from "@/components/ui/scroll-area";
import {toast} from "sonner";
import api from "@/lib/api";

// TypeScript interfaces
interface Permission {
    id: number;
    name: string;
    code: string;
    description: string;
}

interface PermissionCategory {
    category: string;
    action: "radio" | "check";
    permissions: Permission[];
}

interface PermissionsResponse {
    success: boolean;
    message: string;
    data: PermissionCategory[];
}

interface RolePermissionsResponse {
    success: boolean;
    message: string;
    data: number[];
}

interface Role {
    id: string;
    name: string;
    description: string;
    permission_count: number;
}

interface PermissionFormData {
    permissionIds: number[];
    radioSelections: Record<string, number>;
}

interface PermissionsManagerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRole: Role;
    onSuccess?: () => void;
}

export function PermissionsManager({isOpen, onClose, selectedRole, onSuccess}: PermissionsManagerProps) {
    const [permissions, setPermissions] = useState<PermissionCategory[]>([]);
    const [formData, setFormData] = useState<PermissionFormData>({
        permissionIds: [],
        radioSelections: {},
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

// Move fetchPermissions to useCallback to include in dependency arrays
    const fetchPermissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/v1/permission/list');
            const data: PermissionsResponse = await response.data;
            setPermissions(data.data);
            return data.data; // Return the permissions for immediate use
        } catch (error) {
            console.error('Error fetching permissions:', error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

// Keep fetchRolePermissions with selectedRole dependency only
    const fetchRolePermissions = useCallback(async (roleId: string, currentPermissions: PermissionCategory[]) => {
        setIsLoading(true);
        try {
            const response = await api.get(`/v1/role/${roleId}/permissions`);
            const data: RolePermissionsResponse = await response.data;

            // Initialize form data with selected permissions
            const newFormData: PermissionFormData = {
                permissionIds: [...data.data],
                radioSelections: {},
            };

            // Handle radio button groups
            currentPermissions.forEach(category => {
                if (category.action === "radio") {
                    // Find the highest-level permission in each radio group that is selected
                    const selectedRadioPermissions = category.permissions.filter(p =>
                        data.data.includes(p.id)
                    ).sort((a, b) => b.id - a.id);

                    if (selectedRadioPermissions.length > 0) {
                        newFormData.radioSelections[category.category] = selectedRadioPermissions[0].id;
                    }
                }
            });

            setFormData(newFormData);
        } catch (error) {
            console.error(`Error fetching permissions for role ${roleId}:`, error);
            toast.error(`Failed to load permissions for ${selectedRole?.name}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedRole?.name]);

// Combined loading effect without dependency issues
    useEffect(() => {
        if (isOpen && selectedRole) {
            const loadData = async () => {
                try {
                    // First load the permissions and get the result directly
                    const loadedPermissions = await fetchPermissions();
                    // Then load role permissions with the just-loaded permissions
                    if (loadedPermissions.length > 0) {
                        await fetchRolePermissions(selectedRole.id, loadedPermissions);
                    }
                } catch (error) {
                    console.error("Error in permission loading sequence:", error);
                }
            };

            loadData().catch(
                (error) => {
                    console.error("Error loading permissions:", error);
                }
            )
        }
    }, [isOpen, selectedRole, fetchPermissions, fetchRolePermissions]);

    const handlePermissionChange = (permissionId: number, checked: boolean) => {
        setFormData(prev => {
            const newPermissionIds = checked
                ? [...prev.permissionIds, permissionId]
                : prev.permissionIds.filter(id => id !== permissionId);

            return {
                ...prev,
                permissionIds: newPermissionIds,
            };
        });
    };

    const handleRadioChange = (category: string, permissionId: number) => {
        // When selecting a radio option, we need to:
        // 1. Remove all permissions from this category
        // 2. Add the selected permission
        const categoryPermissions = permissions
            .find(cat => cat.category === category)
            ?.permissions.map(p => p.id) || [];

        setFormData(prev => {
            // Remove all permissions from this category
            const filteredPermissions = prev.permissionIds.filter(
                id => !categoryPermissions.includes(id)
            );

            // Add the selected permission
            return {
                ...prev,
                permissionIds: [...filteredPermissions, permissionId],
                radioSelections: {
                    ...prev.radioSelections,
                    [category]: permissionId,
                },
            };
        });
    };

    const handlePermissionSubmit = async () => {
        if (!selectedRole) return;

        setIsSaving(true);
        try {
            const response = await api.put(`/v1/role/${selectedRole.id}/permissions`, {
                permission_ids: formData.permissionIds,
            });

            toast.success(response?.data.message);
            onClose();
            onSuccess?.();

        } catch (error) {
            console.error('Error updating permissions:', error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Manage Permissions</DialogTitle>
                    <DialogDescription>
                        Configure permissions for {selectedRole?.name}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                            {permissions.map((category) => (
                                <div key={category.category} className="space-y-4">
                                    <h3 className="font-semibold">{category.category}</h3>

                                    {category.action === "radio" ? (
                                        <RadioGroup
                                            value={formData.radioSelections[category.category]?.toString() || ""}
                                            onValueChange={(value) => handleRadioChange(category.category, parseInt(value))}
                                            className="space-y-4"
                                        >
                                            {category.permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-start space-x-4">
                                                    <RadioGroupItem
                                                        disabled={isSaving}
                                                        value={permission.id.toString()}
                                                        id={`radio-${permission.id}`}
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <Label
                                                            htmlFor={`radio-${permission.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            {permission.name}
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            {permission.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    ) : (
                                        <div className="space-y-4">
                                            {category.permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-start space-x-4">
                                                    <Checkbox
                                                        disabled={isSaving}
                                                        id={`check-${permission.id}`}
                                                        checked={formData.permissionIds.includes(permission.id)}
                                                        onCheckedChange={(checked) =>
                                                            handlePermissionChange(permission.id, !!checked)
                                                        }
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <Label
                                                            htmlFor={`check-${permission.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            {permission.name}
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            {permission.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handlePermissionSubmit} disabled={isLoading || isSaving}>
                        {isSaving ? (
                            <>
                                <span
                                    className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></span>
                                Saving...
                            </>
                        ) : "Save Permissions"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}