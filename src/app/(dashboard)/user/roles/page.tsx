// 'use client';

// import {useEffect, useState} from "react";
// import {Button} from "@/components/ui/button";
// import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
// import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
// import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
// import {MoreVertical, Pencil, Plus, Shield, Trash2} from "lucide-react";
// import {toast} from "sonner";
// import {PermissionsManager} from "@/app/(dashboard)/user/roles/permission-manager";
// import {UpdateRoleDialog} from "@/app/(dashboard)/user/roles/update-role-dialog";
// import {AddRoleDialog} from "@/app/(dashboard)/user/roles/add-role-dialog";
// import {ScrollArea} from "@/components/ui/scroll-area";
// import {DeleteRoleDialog} from "@/app/(dashboard)/user/roles/delete-role-dialog";
// import api from "@/lib/api";

// interface Role {
//     id: string;
//     name: string;
//     description: string;
//     permission_count: number;
// }

// export default function RolesPage() {
//     const [roles, setRoles] = useState<Role[]>([]);
//     const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
//     const [isAddModalOpen, setIsAddModalOpen] = useState(false);
//     const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
//     const [selectedRole, setSelectedRole] = useState<Role | null>(null);
//     const [deleteRoleAlert, setDeleteRoleAlert] = useState({
//         isOpen: false,
//         roleId: 0
//     });
//     const [isLoading, setIsLoading] = useState(true);
//     const [refreshTrigger, setRefreshTrigger] = useState(false);

//     useEffect(() => {
//         fetchRoles().catch(
//             (error) => {
//                 console.error("Error loading roles", {error});
//             }
//         )
//     }, [refreshTrigger]);

//     const fetchRoles = async () => {
//         setIsLoading(true);
//         try {
//             const response = await api.get('/v1/role/list');

//             const data = await response.data;
//             setRoles(data.data);

//         } catch (error) {
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleDeleteConfirm = async () => {
//         if (!selectedRole) return;

//         try {
//             const response = await api.delete(`/v1/role/${selectedRole.id}`);
//             const data = await response.data;
//             refreshRoles();
//             toast.success("Role Deleted", {description: data.message});

//         } catch (error) {
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         }
//     };

//     const handleDeleteAlert = (roleId: string) => {
//         const role = roles.find(r => r.id === roleId);
//         if (role) {
//             setSelectedRole(role);
//             setDeleteRoleAlert({isOpen: true, roleId: parseInt(roleId)});
//         }
//     };

//     const handleUpdate = (role: Role) => {
//         setSelectedRole(role);
//         setIsUpdateModalOpen(true);
//     };

//     const handlePermissions = (role: Role) => {
//         setSelectedRole(role);
//         setIsPermissionModalOpen(true);
//     };

//     const refreshRoles = () => {
//         setRefreshTrigger(prev => !prev);
//     };

//     return (
//         <div className="space-y-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold">Role Management</h1>
//                     <p className="text-muted-foreground">
//                         Define and manage user roles within the system. Assign specific permissions to control access to
//                         features and functionalities based on each role
//                     </p>
//                 </div>
//                 <Button onClick={() => setIsAddModalOpen(true)}>
//                     <Plus className="mr-2 h-4 w-4"/>
//                     Add Role
//                 </Button>
//             </div>

//             <Card>
//                 <CardHeader>
//                     <CardTitle>System Roles</CardTitle>
//                     <CardDescription>
//                         This section displays all system roles and their associated permissions
//                     </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                     <div className="rounded-md border">
//                         <div className="w-full">
//                             <ScrollArea className="w-full" style={{height: roles.length > 15 ? '550px' : 'auto'}}>
//                                 <Table>
//                                     <TableHeader>
//                                         <TableRow>
//                                             <TableHead className="text-center">ID</TableHead>
//                                             <TableHead>Name</TableHead>
//                                             <TableHead>Description</TableHead>
//                                             <TableHead className="text-center">Permissions Count</TableHead>
//                                             <TableHead className="text-center">Actions</TableHead>
//                                         </TableRow>
//                                     </TableHeader>
//                                     <TableBody>
//                                         {isLoading ? (
//                                             <TableRow>
//                                                 <TableCell colSpan={8} className="h-90 text-center p-0">
//                                                     <div
//                                                         className="w-full flex flex-col items-center justify-center py-8">
//                                                         <div className="flex items-center justify-center space-x-2">
//                                                             <div
//                                                                 className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//                                                             <div
//                                                                 className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//                                                             <div
//                                                                 className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
//                                                         </div>
//                                                         <p className="text-sm text-muted-foreground mt-4">Loading role
//                                                             data...</p>
//                                                     </div>
//                                                 </TableCell>
//                                             </TableRow>
//                                         ) : roles.length === 0 ? (
//                                             <TableRow>
//                                                 <TableCell colSpan={5}
//                                                            className="text-center py-8 text-muted-foreground">
//                                                     No roles found. Create a new role to get started.
//                                                 </TableCell>
//                                             </TableRow>
//                                         ) : (
//                                             roles.map((role, index) => (
//                                                 <TableRow key={role.id}>
//                                                     <TableCell className="text-center">
//                                                         {index + 1}
//                                                     </TableCell>
//                                                     <TableCell
//                                                         className="font-medium truncate max-w-30">{role.name}</TableCell>
//                                                     <TableCell
//                                                         className="truncate max-w-50">{role.description}</TableCell>
//                                                     <TableCell
//                                                         className="text-center">{role.permission_count}</TableCell>
//                                                     <TableCell className="text-center">
//                                                         <div className="flex items-center justify-center h-full">
//                                                             <DropdownMenu>
//                                                                 <DropdownMenuTrigger asChild>
//                                                                     <Button variant="ghost" className="h-5 w-8 p-0">
//                                                                         <MoreVertical className="h-4 w-4"/>
//                                                                     </Button>
//                                                                 </DropdownMenuTrigger>
//                                                                 <DropdownMenuContent align="end">
//                                                                     <DropdownMenuItem
//                                                                         onClick={() => handleUpdate(role)}>
//                                                                         <Pencil className="mr-2 h-4 w-4"/>
//                                                                         Update
//                                                                     </DropdownMenuItem>
//                                                                     <DropdownMenuItem
//                                                                         onClick={() => handlePermissions(role)}>
//                                                                         <Shield className="mr-2 h-4 w-4"/>
//                                                                         Permissions
//                                                                     </DropdownMenuItem>
//                                                                     <DropdownMenuItem
//                                                                         onClick={() => handleDeleteAlert(role.id)}
//                                                                         className="text-red-600 focus:text-red-600"
//                                                                     >
//                                                                         <Trash2 className="mr-2 h-4 w-4"/>
//                                                                         Delete
//                                                                     </DropdownMenuItem>
//                                                                 </DropdownMenuContent>
//                                                             </DropdownMenu>
//                                                         </div>
//                                                     </TableCell>
//                                                 </TableRow>
//                                             ))
//                                         )}
//                                     </TableBody>
//                                 </Table>
//                             </ScrollArea>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             {/* Update Role Modal */}
//             <UpdateRoleDialog
//                 isOpen={isUpdateModalOpen}
//                 onOpenChange={setIsUpdateModalOpen}
//                 initialData={selectedRole}
//                 onSuccess={() => {
//                     refreshRoles();
//                 }}
//             />

//             {/* Add Role Modal */}
//             <AddRoleDialog
//                 isOpen={isAddModalOpen}
//                 onClose={() => setIsAddModalOpen(false)}
//                 onSuccess={() => {
//                     refreshRoles();
//                 }}
//             />

//             {/* Permissions Manager */}
//             <PermissionsManager
//                 isOpen={isPermissionModalOpen}
//                 onClose={() => setIsPermissionModalOpen(false)}
//                 selectedRole={selectedRole}
//                 onSuccess={() => {
//                     refreshRoles();
//                 }}
//             />

//             {/* Delete Role Confirmation Dialog */}
//             <DeleteRoleDialog
//                 deleteRoleAlert={deleteRoleAlert}
//                 setDeleteRoleAlert={setDeleteRoleAlert}
//                 onSuccess={handleDeleteConfirm}
//             />
//         </div>
//     );
// }


'use client';

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {MoreVertical, Pencil, Plus, Shield, Trash2} from "lucide-react";
import {toast} from "sonner";
import {PermissionsManager} from "@/app/(dashboard)/user/roles/permission-manager";
import {PermissionsCrudManager} from "@/app/(dashboard)/user/roles/permissions-crud-manager";
import {UpdateRoleDialog} from "@/app/(dashboard)/user/roles/update-role-dialog";
import {AddRoleDialog} from "@/app/(dashboard)/user/roles/add-role-dialog";
import {ScrollArea} from "@/components/ui/scroll-area";
import {DeleteRoleDialog} from "@/app/(dashboard)/user/roles/delete-role-dialog";
import api from "@/lib/api";

interface Role {
    id: string;
    name: string;
    description: string;
    permission_count: number;
}

// NEW — top-level tab: the roles table (existing behaviour), or a new tab
// for CRUD (create/edit/delete) on the permissions those roles are built from.
type PageTab = 'roles' | 'permissions';

export default function RolesPage() {
    const [activeTab, setActiveTab] = useState<PageTab>('roles');   // NEW
    const [roles, setRoles] = useState<Role[]>([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [deleteRoleAlert, setDeleteRoleAlert] = useState({
        isOpen: false,
        roleId: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(false);

    useEffect(() => {
        fetchRoles().catch(
            (error) => {
                console.error("Error loading roles", {error});
            }
        )
    }, [refreshTrigger]);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/v1/role/list');

            const data = await response.data;
            setRoles(data.data);

        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedRole) return;

        try {
            const response = await api.delete(`/v1/role/${selectedRole.id}`);
            const data = await response.data;
            refreshRoles();
            toast.success("Role Deleted", {description: data.message});

        } catch (error) {
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    };

    const handleDeleteAlert = (roleId: string) => {
        const role = roles.find(r => r.id === roleId);
        if (role) {
            setSelectedRole(role);
            setDeleteRoleAlert({isOpen: true, roleId: parseInt(roleId)});
        }
    };

    const handleUpdate = (role: Role) => {
        setSelectedRole(role);
        setIsUpdateModalOpen(true);
    };

    const handlePermissions = (role: Role) => {
        setSelectedRole(role);
        setIsPermissionModalOpen(true);
    };

    const refreshRoles = () => {
        setRefreshTrigger(prev => !prev);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Role Management</h1>
                    <p className="text-muted-foreground">
                        Define and manage user roles within the system. Assign specific permissions to control access to
                        features and functionalities based on each role
                    </p>
                </div>
                {activeTab === 'roles' && (
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4"/>
                        Add Role
                    </Button>
                )}
            </div>

            {/* NEW — tab switcher: Roles vs. Permissions (CRUD) */}
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'roles'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Roles
                </button>
                <button
                    onClick={() => setActiveTab('permissions')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'permissions'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Permissions
                </button>
            </div>

            {activeTab === 'roles' ? (
            <Card>
                <CardHeader>
                    <CardTitle>System Roles</CardTitle>
                    <CardDescription>
                        This section displays all system roles and their associated permissions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="w-full">
                            <ScrollArea className="w-full" style={{height: roles.length > 15 ? '550px' : 'auto'}}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">ID</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-center">Permissions Count</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-90 text-center p-0">
                                                    <div
                                                        className="w-full flex flex-col items-center justify-center py-8">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                            <div
                                                                className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-4">Loading role
                                                            data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : roles.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}
                                                           className="text-center py-8 text-muted-foreground">
                                                    No roles found. Create a new role to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            roles.map((role, index) => (
                                                <TableRow key={role.id}>
                                                    <TableCell className="text-center">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell
                                                        className="font-medium truncate max-w-30">{role.name}</TableCell>
                                                    <TableCell
                                                        className="truncate max-w-50">{role.description}</TableCell>
                                                    <TableCell
                                                        className="text-center">{role.permission_count}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center h-full">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-5 w-8 p-0">
                                                                        <MoreVertical className="h-4 w-4"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleUpdate(role)}>
                                                                        <Pencil className="mr-2 h-4 w-4"/>
                                                                        Update
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handlePermissions(role)}>
                                                                        <Shield className="mr-2 h-4 w-4"/>
                                                                        Permissions
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteAlert(role.id)}
                                                                        className="text-red-600 focus:text-red-600"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4"/>
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
            ) : (
                /* NEW — Permissions tab: full CRUD on permission definitions */
                <Card>
                    <CardHeader>
                        <CardTitle>Permissions</CardTitle>
                        <CardDescription>
                            Create, edit, or delete the permissions that roles are assembled from
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PermissionsCrudManager/>
                    </CardContent>
                </Card>
            )}

            {/* Update Role Modal */}
            <UpdateRoleDialog
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                initialData={selectedRole}
                onSuccess={() => {
                    refreshRoles();
                }}
            />

            {/* Add Role Modal */}
            <AddRoleDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refreshRoles();
                }}
            />

            {/* Permissions Manager */}
            <PermissionsManager
                isOpen={isPermissionModalOpen}
                onClose={() => setIsPermissionModalOpen(false)}
                selectedRole={selectedRole}
                onSuccess={() => {
                    refreshRoles();
                }}
            />

            {/* Delete Role Confirmation Dialog */}
            <DeleteRoleDialog
                deleteRoleAlert={deleteRoleAlert}
                setDeleteRoleAlert={setDeleteRoleAlert}
                onSuccess={handleDeleteConfirm}
            />
        </div>
    );
}