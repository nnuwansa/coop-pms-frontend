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
interface StatusOption {
    id: number;
    name: string;
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
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>([]);
const [assignableDepartments, setAssignableDepartments] = useState<{id: number; name: string}[]>([]);
const [selectedAssignableDeptIds, setSelectedAssignableDeptIds] = useState<number[]>([]);
// NEW — sub-units per department, fetched lazily (same pattern as the
// Assignee field's department → sub-unit drilldown on the Letter View
// page), plus which of those sub-units are selected for this role.
const [assignableDeptUnits, setAssignableDeptUnits] = useState<Record<number, {id: number; name: string}[]>>({});
const [selectedAssignableUnitIds, setSelectedAssignableUnitIds] = useState<number[]>([]);
const [allRoles, setAllRoles] = useState<{id: number; name: string}[]>([]);
const [selectedAssignableRoleIds, setSelectedAssignableRoleIds] = useState<number[]>([]);

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

// Fetch statuses alongside permissions
const fetchStatuses = useCallback(async () => {
    try {
        const response = await api.get('/v1/status/list');
        setStatuses(response.data.data || []);
    } catch (error) {
        console.error('Error fetching statuses:', error);
    }
}, []);

// Update fetchRolePermissions to also read status_ids from the new response shape
const fetchRolePermissions = useCallback(async (roleId: string, currentPermissions: PermissionCategory[]) => {
    setIsLoading(true);
    try {
        const response = await api.get(`/v1/role/${roleId}/permissions`);
        const data = response.data.data; // { permission_ids: number[], status_ids: number[] }

        const newFormData: PermissionFormData = {
            permissionIds: [...(data.permission_ids || [])],
            radioSelections: {},
        };

        currentPermissions.forEach(category => {
            if (category.action === "radio") {
                const selectedRadioPermissions = category.permissions.filter(p =>
                    data.permission_ids.includes(p.id)
                ).sort((a, b) => b.id - a.id);

                if (selectedRadioPermissions.length > 0) {
                    newFormData.radioSelections[category.category] = selectedRadioPermissions[0].id;
                }
            }
        });

        setFormData(newFormData);
        setSelectedStatusIds(data.status_ids || []);
setSelectedAssignableDeptIds(data.assignable_department_ids || []);
setSelectedAssignableRoleIds(data.assignable_role_ids || []);
// NEW — requires the backend to return `assignable_unit_ids` in this
// same response (see note below). Defaults to empty until that's added.
setSelectedAssignableUnitIds(data.assignable_unit_ids || []);
    } catch (error) {
        console.error(`Error fetching permissions for role ${roleId}:`, error);
        toast.error(`Failed to load permissions for ${selectedRole?.name}. Please try again.`);
    } finally {
        setIsLoading(false);
    }
}, [selectedRole?.name]);

// NEW — fetch a department's sub-units on demand (once) the first time
// it's needed: either because the user just checked it, or because it
// came back already-checked when loading this role's saved permissions.
const ensureUnitsLoaded = useCallback((deptId: number) => {
    setAssignableDeptUnits(prev => {
        if (prev[deptId] !== undefined) return prev; // already fetched (or fetch in-flight)
        api.get(`/v1/department/${deptId}/units`)
            .then(r => setAssignableDeptUnits(cur => ({...cur, [deptId]: r.data.data || []})))
            .catch(() => setAssignableDeptUnits(cur => ({...cur, [deptId]: []})));
        return {...prev, [deptId]: []}; // placeholder so we don't double-fetch while the request is in flight
    });
}, []);

// Load sub-units for any department that's already selected once role
// permissions have been fetched (e.g. re-opening this dialog for a role
// that already has departments configured).
useEffect(() => {
    selectedAssignableDeptIds.forEach(deptId => ensureUnitsLoaded(deptId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedAssignableDeptIds]);

const toggleAssignableDept = (id: number) => {
    setSelectedAssignableDeptIds(prev => {
        if (prev.includes(id)) {
            // Unchecking a department also clears any of its sub-units that
            // were selected, so a stale sub-unit can never stay selected
            // under a department the role no longer has access to.
            const deptUnitIds = (assignableDeptUnits[id] || []).map(u => u.id);
            setSelectedAssignableUnitIds(cur => cur.filter(uid => !deptUnitIds.includes(uid)));
            return prev.filter(x => x !== id);
        }
        ensureUnitsLoaded(id);
        return [...prev, id];
    });
};
const toggleAssignableUnit = (id: number) => {
    setSelectedAssignableUnitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
};
const toggleAssignableRole = (id: number) => {
    setSelectedAssignableRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
};

// New toggle handler
const toggleStatus = (statusId: number) => {
    setSelectedStatusIds(prev =>
        prev.includes(statusId) ? prev.filter(id => id !== statusId) : [...prev, statusId]
    );
};

// Update submit to send status_ids
const handlePermissionSubmit = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
        const response = await api.put(`/v1/role/${selectedRole.id}/permissions`, {
            permission_ids: formData.permissionIds,
            status_ids: selectedStatusIds,
            assignable_department_ids: selectedAssignableDeptIds,
            assignable_role_ids: selectedAssignableRoleIds,
            // NEW — requires the backend's role update endpoint/model to
            // accept and persist this field alongside assignable_department_ids.
            assignable_unit_ids: selectedAssignableUnitIds,
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
const fetchAssignableOptions = useCallback(async () => {
    try {
        const [deptRes, roleRes] = await Promise.all([
            api.get('/v1/department/list'),
            api.get('/v1/role/list'),
        ]);
        setAssignableDepartments(deptRes.data.data || []);
        setAllRoles(roleRes.data.data || []);
    } catch (error) {
        console.error('Error fetching assignable options:', error);
    }
}, []);

// Combined loading effect without dependency issues
    useEffect(() => {
    if (isOpen && selectedRole) {
        const loadData = async () => {
            try {
                const loadedPermissions = await fetchPermissions();
                await fetchStatuses();
                await fetchAssignableOptions();   // NEW
                if (loadedPermissions.length > 0) {
                    await fetchRolePermissions(selectedRole.id, loadedPermissions);
                }
            } catch (error) {
                console.error("Error in permission loading sequence:", error);
            }
        };
        loadData().catch((error) => console.error("Error loading permissions:", error));
    }
}, [isOpen, selectedRole, fetchPermissions, fetchRolePermissions, fetchStatuses, fetchAssignableOptions]);

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

    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
    <DialogTitle className="flex items-center gap-2">
        Manage Permissions
        {!isLoading && (
            <span className="text-sm font-normal text-muted-foreground">
                ({formData.permissionIds.length}/{permissions.reduce((sum, cat) => sum + cat.permissions.length, 0)} selected)
            </span>
        )}
    </DialogTitle>
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
                                                    <div key={permission.id} className="space-y-3">
                                                        <div className="flex items-start space-x-4">
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

                                                        {/* per-status checklist, shown only under "Change Letter Status" once it's checked */}
                                                        {permission.code === "letter.change_status" && formData.permissionIds.includes(permission.id) && (
                                                            <div className="ml-8 border rounded-md p-3 space-y-2 bg-muted/30">
                                                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                    Allowed statuses this role can set a letter to:
                                                                </p>
                                                                {statuses.length === 0 ? (
                                                                    <p className="text-sm text-muted-foreground">No statuses available</p>
                                                                ) : statuses.map(status => (
                                                                    <div key={status.id} className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            disabled={isSaving}
                                                                            id={`status-${status.id}`}
                                                                            checked={selectedStatusIds.includes(status.id)}
                                                                            onCheckedChange={() => toggleStatus(status.id)}
                                                                        />
                                                                        <label htmlFor={`status-${status.id}`} className="text-sm cursor-pointer">
                                                                            {status.name}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {permission.code === "letter.assign" && formData.permissionIds.includes(permission.id) && (
                                                            <div className="ml-8 border rounded-md p-3 space-y-3 bg-muted/30">
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                        Sections this role can assign letters to:
                                                                    </p>
                                                                    {assignableDepartments.length === 0 ? (
                                                                        <p className="text-sm text-muted-foreground">No sections available</p>
                                                                    ) : assignableDepartments.map(dept => (
                                                                        <div key={dept.id}>
                                                                            <div className="flex items-center space-x-2">
                                                                                <Checkbox
                                                                                    disabled={isSaving}
                                                                                    id={`assign-dept-${dept.id}`}
                                                                                    checked={selectedAssignableDeptIds.includes(dept.id)}
                                                                                    onCheckedChange={() => toggleAssignableDept(dept.id)}
                                                                                />
                                                                                <label htmlFor={`assign-dept-${dept.id}`} className="text-sm cursor-pointer">
                                                                                    {dept.name}
                                                                                </label>
                                                                            </div>
                                                                            {/* NEW — once a section is checked, show its
                                                                                sub-units underneath (if it has any), same
                                                                                drilldown pattern as the Assignee field on
                                                                                the Letter View page. */}
                                                                            {selectedAssignableDeptIds.includes(dept.id) && (assignableDeptUnits[dept.id]?.length ?? 0) > 0 && (
                                                                                <div className="ml-6 mt-1 space-y-1.5 border-l pl-3">
                                                                                    {assignableDeptUnits[dept.id].map(unit => (
                                                                                        <div key={unit.id} className="flex items-center space-x-2">
                                                                                            <Checkbox
                                                                                                disabled={isSaving}
                                                                                                id={`assign-unit-${unit.id}`}
                                                                                                checked={selectedAssignableUnitIds.includes(unit.id)}
                                                                                                onCheckedChange={() => toggleAssignableUnit(unit.id)}
                                                                                            />
                                                                                            <label htmlFor={`assign-unit-${unit.id}`} className="text-xs cursor-pointer text-muted-foreground">
                                                                                                {unit.name}
                                                                                            </label>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                        Roles this role can assign letters to:
                                                                    </p>
                                                                    {allRoles.length === 0 ? (
                                                                        <p className="text-sm text-muted-foreground">No roles available</p>
                                                                    ) : allRoles.map(role => (
                                                                        <div key={role.id} className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                disabled={isSaving}
                                                                                id={`assign-role-${role.id}`}
                                                                                checked={selectedAssignableRoleIds.includes(role.id)}
                                                                                onCheckedChange={() => toggleAssignableRole(role.id)}
                                                                            />
                                                                            <label htmlFor={`assign-role-${role.id}`} className="text-sm cursor-pointer">
                                                                                {role.name}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

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