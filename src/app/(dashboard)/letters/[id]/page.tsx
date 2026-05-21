"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Label} from "@/components/ui/label";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Copy, CopyCheck, Download, Edit, FileDown, FileText, MoreVertical, Trash2} from "lucide-react";
import {InsertRemarkModal} from "@/app/(dashboard)/letters/[id]/insert-remark-modal";
import {DeleteLetterAlert} from "@/app/(dashboard)/letters/[id]/delete-letter-alert";
import {toast} from "sonner";
import UpdateLetterModal from "@/app/(dashboard)/letters/[id]/update-letter-modal";
import {DeleteRemarkAlert} from "@/app/(dashboard)/letters/[id]/delete-remark-alert";
import UpdateRemarkModal from "@/app/(dashboard)/letters/[id]/update-remark-modal";
import {downloadFileAsBlob} from "@/lib/download-file";
import LetterFormat from "@/app/(dashboard)/letters/[id]/letter-format";
import {formatDate, formatDateTime} from "@/lib/utils";
import {ScrollArea} from "@/components/ui/scroll-area";
import api from "@/lib/api";
import {DuplicateLetterAlert} from "@/app/(dashboard)/letters/[id]/duplicate-letter-alert";
import {useAuthStore} from "@/store/auth-store";

export default function LetterPage() {
    const params = useParams();
    const router = useRouter();
    const letterId = params.id;

    const [letterData, setLetterData] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteAlert, setDeleteAlert] = useState({
        isOpen: false,
        letterCode: "",
    });
    const [deleteRemarkAlert, setDeleteRemarkAlert] = useState({
        isOpen: false,
        remarkId: "",
    });
    const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const {hasPermission} = useAuthStore();

    const handlePDFDownload = () => {
        if (!contentRef.current) return;

        // Create a new window for printing
        const printWindow = window.open('letter-preview', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert("Please allow pop-ups for this website to download the PDF.");
            return;
        }

        // Get the content HTML and styles
        const contentClone = contentRef.current.cloneNode(true) as HTMLElement;

        // Create a complete HTML document for the print window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>${letterData.code || 'Document'}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                
                    html, body {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                    }
                
                    .print-container {
                        width: 100%;
                        box-sizing: border-box;
                        font-family: Arial, sans-serif;
                        color: #000;
                    }
                
                    @media print {
                        .print-container {
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    ${contentClone.innerHTML}
                </div>
                <script>
                    // Automatically print and close the window when ready
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            // Close the window after printing (or if print is cancelled)
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);

        printWindow.document.close();
    };

    const fetchLetterData = useCallback(async () => {
        try {
            const response = await api.get(`/v1/letter/${letterId}`);
            const responseData = await response.data;
            setLetterData(responseData.data);

        } catch (error) {
            console.error("Error fetching letter data:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [letterId]);

    useEffect(() => {

        const fetchDropdownData = async () => {
            try {
                // Fetch departments
                const deptResponse = await api.get('/v1/department/list');
                const deptData = await deptResponse.data;
                if (deptData.success) {
                    setDepartments(deptData.data);
                }

                // Fetch statuses
                const statusResponse = await api.get('/v1/status/list');
                const statusData = await statusResponse.data;
                if (statusData.success) {
                    setStatuses(statusData.data);
                }

                // Fetch assignees
                const assigneeResponse = await api.get('/v1/system_user/names');
                const assigneeData = await assigneeResponse.data;
                if (assigneeData.success) {
                    setAssignees(assigneeData.data);
                }
            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        const loadAllData = async () => {
            setLoading(true);
            await Promise.all([fetchLetterData(), fetchDropdownData()]);
            setLoading(false);
        };

        if (letterId) {
            loadAllData().catch((error) => {
                console.error("Unhandled error in loadAllData:", error);
            });
        }
    }, [letterId, fetchLetterData]);

    const handleAttributeChange = async (attribute: string, nextId: number) => {
        try {
            const currentId = letterData[attribute]?.id || null;

            const response = await api.patch(
                `/v1/letter/${letterId}/${attribute}`,
                {
                    current_id: currentId,
                    next_id: nextId
                }
            );

            const data = await response.data;

            toast.success(`Letter ${attribute} updated successfully`);
            // Update local state to reflect the change
            setLetterData((prevData: any) => {
                const updatedData = {...prevData};

                // Update the attribute with the new selection
                const attributeMap = {
                    'department': departments.find(d => d.id === nextId),
                    'status': statuses.find(s => s.id === nextId),
                    'assignee': assignees.find(a => a.id === nextId)
                };

                updatedData[attribute] = attributeMap[attribute];
                return updatedData;
            });
            await fetchLetterData();

        } catch (error) {
            console.error(`Error updating ${attribute}:`, error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    };

    const handleDelete = (letterCode: string) => {
        setDeleteAlert({isOpen: true, letterCode: letterCode});
    };

    const handleDeleteConfirm = async () => {
        try {
            // Call the API to delete the letter
            const response = await api.delete(`/v1/letter/${letterId}`);
            const result = await response.data;

            toast.success(result.message);
            setDeleteAlert({isOpen: false, letterCode: ""});
            router.replace('/letters');

        } catch (error) {
            console.error("Error deleting letter:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            setDeleteAlert({isOpen: false, letterCode: ""});
        }
    };

    const handleRemarkDelete = (remarkId: string) => {
        setDeleteRemarkAlert({isOpen: true, remarkId: remarkId});
    };

    const handleRemarkDeleteConfirm = async () => {
        try {
            // Call the API to delete the letter
            const response = await api.delete(`/v1/letter/remark/${deleteRemarkAlert.remarkId}`);
            const result = await response.data;

            toast.success(result.message);
            setDeleteRemarkAlert({isOpen: false, remarkId: ""});
            await fetchLetterData();
        } catch (error) {
            console.error("Error deleting remark:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            setDeleteAlert({isOpen: false, letterCode: ""});
        }
    };

    const handleDuplicate = () => {
        setIsDuplicateAlertOpen(true);
    };

    const handleDuplicateConfirm = async () => {
        try {
            const response = await api.get(`/v1/letter/${letterId}/duplicate`);
            const result = await response.data;

            toast.success(result.message, {
                description: (
                    <div className="flex items-center gap-2">
                        <span>Letter Code:</span>
                        <button
                            onClick={() => router.push(`/letters/${result.data.id}`)}
                            className="font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                            {result.data.code}
                        </button>
                    </div>
                ),
                icon: <CopyCheck className="h-5 w-5"/>,
                duration: 5000,
            });
        } catch (error) {
            console.error("Error letter duplicating:", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div
                        className="w-8 h-8 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading letter data...</p>
                </div>
            </div>
        );
    }

    if (!letterData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg font-medium">Letter not found</p>
                    <p className="text-sm text-muted-foreground">The requested letter could not be loaded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Letter View</h1>
                    <p className="text-muted-foreground">
                        Review letter details, track history, and forward correspondence to the appropriate department
                        or personnel for further action
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreVertical className="h-5 w-5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={handlePDFDownload}
                                className="flex items-center gap-2 cursor-pointer"
                                disabled={!hasPermission('letter.download')}
                            >
                                <FileDown className="h-4 w-4"/>
                                PDF Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer"
                                              onClick={handleDuplicate}
                                              disabled={!hasPermission('letter.duplicate')}
                            >
                                <Copy className="h-4 w-4"/>
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setIsUpdateModalOpen(true)}
                                className="flex items-center gap-2 cursor-pointer"
                                disabled={!hasPermission('letter.update')}>
                                <Edit className="h-4 w-4"/>
                                Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDelete(letterData.code)}
                                className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                                disabled={!hasPermission('letter.delete')}
                            >
                                <Trash2 className="h-4 w-4"/>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <UpdateLetterModal
                    isOpen={isUpdateModalOpen}
                    onCloseAction={async () => {
                        setIsUpdateModalOpen(false);
                        await fetchLetterData();
                    }}
                    letterData={letterData}
                />
            </div>
            <div>
                <div className="grid grid-cols-3 gap-6">
                    <Card className="w-full col-span-2">
                        <CardContent className="px-6">
                            <div className="grid grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-2">
                                    {Object.entries({
                                        Code: letterData.code,
                                        Subject: letterData.subject,
                                        Source: letterData.source?.name,
                                        "Received Date": formatDate(letterData.received_datetime),
                                        "System Date": formatDate(letterData.create_datetime),
                                    }).map(([label, value]) => (
                                        <div key={label} className="space-y-1">
                                            <Label
                                                className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {label}
                                            </Label>
                                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 break-words">
                                                {value || "N/A"}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Middle Column */}
                                <div className="space-y-2">
                                    {Object.entries({
                                        Sender: letterData.sender,
                                        Organization: letterData.organization?.name,
                                        Email: letterData.email,
                                        Telephone: letterData.telephone,

                                    }).map(([label, value]) => (
                                        <div key={label} className="space-y-1">
                                            <Label
                                                className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {label}
                                            </Label>
                                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 break-words">
                                                {value || "N/A"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/*Right Column*/}
                    <Card className="w-full col-span-1">
                        <CardContent className="space-y-8 flex flex-col justify-center items-center h-full">
                            {/*Right Column*/}
                            <div className="space-y-6">
                                {/* Department Dropdown */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Department
                                    </Label>
                                    <Select
                                        defaultValue={letterData.department?.id?.toString()}
                                        onValueChange={(value) => handleAttributeChange("department", parseInt(value))}
                                        disabled={!hasPermission('letter.change_department')}
                                    >
                                        <SelectTrigger className="w-xs">
                                            <SelectValue placeholder="Select Department">
                                                {letterData.department?.name || "Select Department"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="w-xs">
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status Dropdown */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Status
                                    </Label>
                                    <Select
                                        defaultValue={letterData.status?.id?.toString()}
                                        onValueChange={(value) => handleAttributeChange("status", parseInt(value))}
                                        disabled={!hasPermission('letter.change_status')}
                                    >
                                        <SelectTrigger className="w-xs">
                                            <SelectValue placeholder="Select Status">
                                                {letterData.status?.name || "Select Status"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="w-xs">
                                            {statuses.map((status) => (
                                                <SelectItem key={status.id} value={status.id.toString()}>
                                                    {status.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assignee Dropdown */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Assignee
                                    </Label>
                                    <Select
                                        defaultValue={letterData.assignee?.id?.toString()}
                                        onValueChange={(value) => handleAttributeChange("assignee", parseInt(value))}
                                        disabled={!hasPermission('letter.assign')}
                                    >
                                        <SelectTrigger className="w-xs">
                                            <SelectValue placeholder="Select Assignee">
                                                {letterData.assignee?.name || "Select Assignee"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="w-xs">
                                            {assignees.map((assignee) => (
                                                <SelectItem key={assignee.id} value={assignee.id?.toString()}>
                                                    {assignee.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Card className="w-full mt-6">
                    <CardContent className="space-y-6">
                        {/*Other*/}
                        {letterData.other && (
                            <div>
                                <Label
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Others
                                </Label>
                                <p className="text-gray-800 dark:text-gray-100 break-words whitespace-pre-line text-justify">
                                    {letterData.other}
                                </p>
                            </div>
                        )}
                        {letterData.other && letterData.content && (<hr className="my-4 border-t border-gray-300"/>)}
                        {/*Content*/}
                        {letterData.content && (
                            <div>
                                <Label
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Content
                                </Label>
                                <p className="text-gray-800 dark:text-gray-100 whitespace-pre-line break-words text-justify">
                                    {letterData.content}
                                </p>
                            </div>
                        )}
                        {letterData.content && letterData.attachments && letterData.attachments.length > 0 && (
                            <hr className="my-4 border-t border-gray-300"/>)}
                        {/*  Letter Attachments  */}
                        {letterData.attachments && letterData.attachments.length > 0 && (<div>
                            <Label className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                                Attachments
                            </Label>
                            <div className="flex flex-wrap gap-4">
                                {letterData.attachments && letterData.attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex">
                                        <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            target="_blank"
                                            download
                                            className="flex gap-2 items-center text-sm text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <FileText className="h-4 w-4"/>
                                            <span>{attachment.title}</span>
                                        </a>
                                        <button
                                            onClick={async () => {
                                                await downloadFileAsBlob(attachment.url, attachment.title);
                                            }}
                                            aria-label={`Download ${attachment.title}`}
                                            className="ml-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Download className="h-4 w-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>)}
                    </CardContent>
                </Card>

                {/*Tabs Section*/}
                <Card className="w-full mt-6">
                    <CardContent className="space-y-8">
                        <div className="">
                            <Tabs defaultValue="remarks" className="w-full">
                                <TabsList className="w-100 justify-start border-b dark:border-gray-700">
                                    <TabsTrigger value="remarks" className="flex-1">Remarks</TabsTrigger>
                                    <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                                    {/*<TabsTrigger value="related" className="flex-1">Related</TabsTrigger>*/}
                                </TabsList>

                                <TabsContent value="remarks" className="mt-2">
                                    <div className="relative space-y-4">
                                        <div
                                            className="absolute -top-13 right-0">
                                            <InsertRemarkModal
                                                letter_id={letterData.id}
                                                onSuccess={fetchLetterData}
                                            />
                                        </div>
                                        <ScrollArea
                                            className="space-y-6 border rounded-md"
                                            style={{height: letterData.remarks.length > 4 ? '600px' : 'auto'}}>
                                            {!hasPermission('remark.view') ?
                                                (
                                                    <p className="py-15 text-center text-muted-foreground">Not enough
                                                        permission to show remarks</p>
                                                ) :
                                                letterData.remarks && letterData.remarks.length > 0 ? (
                                                    letterData.remarks.map((remark) => (
                                                        <div
                                                            key={remark.id}
                                                            className="relative m-6 pl-6 border-l-2 border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div
                                                                className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary"></div>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                            ID: {remark.id}
                                                                        </p>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                            {remark.department || "No Department"} | {remark.assignee || "Unassigned"} | {remark.status || "No Status"}
                                                                        </p>
                                                                    </div>
                                                                    <div
                                                                        className="flex items-center gap-2">
                                                                        <div
                                                                            className="text-sm text-gray-500 dark:text-gray-400">
                                                                            {formatDateTime(remark.create_datetime)}
                                                                        </div>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="icon"
                                                                                        className="rounded-full dark:hover:bg-gray-900">
                                                                                    <MoreVertical className="h-5 w-5"/>
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className="w-48">
                                                                                <DropdownMenuItem
                                                                                    onClick={() => setEditingRemarkId(remark.id)}
                                                                                    className="flex items-center gap-2 cursor-pointer"
                                                                                    disabled={!hasPermission('remark.update')}
                                                                                >
                                                                                    <Edit className="h-4 w-4"/>
                                                                                    Update
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => handleRemarkDelete(remark.id)}
                                                                                    className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                                                                                    disabled={!hasPermission('remark.delete')}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4"/>
                                                                                    Delete
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        {editingRemarkId === remark.id && (
                                                                            <UpdateRemarkModal
                                                                                isOpen={true}
                                                                                onCloseAction={async () => {
                                                                                    setEditingRemarkId(null);
                                                                                    await fetchLetterData();
                                                                                }}
                                                                                remarkData={remark}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="text-gray-900 dark:text-gray-100 text-justify">{remark.content}</p>
                                                                <div className="flex flex-wrap gap-4">
                                                                    {remark.attachments && remark.attachments.map((attachment) => (
                                                                        <div key={attachment.id} className="flex">
                                                                            <a
                                                                                key={attachment.id}
                                                                                href={attachment.url}
                                                                                target="_blank"
                                                                                download
                                                                                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                                                            >
                                                                                <FileText className="h-4 w-4"/>
                                                                                <span>{attachment.title}</span>
                                                                            </a>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    await downloadFileAsBlob(attachment.url, attachment.title);
                                                                                }}
                                                                                aria-label={`Download ${attachment.title}`}
                                                                                className="ml-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
                                                                            >
                                                                                <Download className="h-4 w-4"/>
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="py-15 text-center text-muted-foreground">No remarks
                                                        found</p>
                                                )}
                                        </ScrollArea>
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="mt-2">
                                    <ScrollArea
                                        className="border rounded-md"
                                        style={{height: letterData.history.length > 4 ? '600px' : 'auto'}}
                                    >
                                        <div className="space-y-4">
                                            {!hasPermission('letter.history') ?
                                                (
                                                    <p className="py-15 text-center text-muted-foreground">Not enough
                                                        permission to show history</p>
                                                ) :
                                                letterData.history && letterData.history.length > 0 ? (
                                                    letterData.history.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className="relative m-6 pl-6 border-l-2 border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div
                                                                className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary"></div>
                                                            <div className="space-y-1">
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {formatDateTime(item.create_datetime)}
                                                                </p>
                                                                <p className="text-gray-900 dark:text-gray-100">{item.description}</p>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    by {item.username}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-15">
                                                        <p className="text-center text-muted-foreground">No history
                                                            found</p>
                                                    </div>
                                                )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <DeleteLetterAlert
                isOpen={deleteAlert.isOpen}
                onClose={() => setDeleteAlert({isOpen: false, letterCode: ""})}
                onConfirm={handleDeleteConfirm}
                letterCode={deleteAlert.letterCode}
            />
            <DeleteRemarkAlert
                isOpen={deleteRemarkAlert.isOpen}
                onClose={() => setDeleteRemarkAlert({isOpen: false, remarkId: ""})}
                onConfirm={handleRemarkDeleteConfirm}
                remarkId={deleteRemarkAlert.remarkId}
            />
            <DuplicateLetterAlert
                isOpen={isDuplicateAlertOpen}
                onClose={() => setIsDuplicateAlertOpen(false)}
                onConfirm={handleDuplicateConfirm}
                letterCode={letterData.code}
            />
            <div className="hidden">
                <LetterFormat _ref={contentRef} letterData={letterData}/>
            </div>
        </div>
    );
}