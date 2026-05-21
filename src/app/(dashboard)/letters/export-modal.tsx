'use client';

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {format} from "date-fns";
import {Loader2} from "lucide-react";
import {toast} from "sonner";
import api from "@/lib/api";

interface ExportModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    departments: string[];
    assignees: string[];
    statuses: string[];
}

interface Column {
    id: string;
    label: string;
    checked: boolean;
}

export function ExportModal({isOpen, onCloseAction}: ExportModalProps) {
    const [dateRange, setDateRange] = useState({
        create_date_start: null,
        create_date_end: null,
    });

    const [numEntries, setNumEntries] = useState('100');
    const [columns, setColumns] = useState<Column[]>([
        {id: 'id', label: 'ID', checked: true},
        {id: 'code', label: 'Code', checked: true},
        {id: 'subject', label: 'Subject', checked: true},
        {id: 'sender', label: 'Sender', checked: true},
        {id: 'email', label: 'Email', checked: true},
        {id: 'telephone', label: 'Telephone', checked: true},
        {id: 'source.name', label: 'Source', checked: true},
        {id: 'organization.name', label: 'Organization', checked: true},
        {id: 'department.name', label: 'Department', checked: true},
        {id: 'status.name', label: 'Status', checked: true},
        {id: 'assignee', label: 'Assignee', checked: true},
        {id: 'other', label: 'Other', checked: true},
        {id: 'content', label: 'Content', checked: true},
        {id: 'attachments', label: 'Attachments Count', checked: true},
        {id: 'received_datetime', label: 'Received Date', checked: true},
        {id: 'create_datetime', label: 'Create Date', checked: true},
        {id: 'update_datetime', label: 'Update Date', checked: true},
    ]);

    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        try {
            setIsExporting(true);
            // Prepare request data
            const selectedColumns = columns
                .filter(column => column.checked)
                .map(column => column.id);

            // Convert limit to number or 0 for "all"
            const limit = numEntries === 'all' ? 0 : parseInt(numEntries);

            // Format dates as ISO strings if they exist
            const create_date_start = dateRange.create_date_start ?
                dateRange.create_date_start.toISOString() : undefined;
            const create_date_end = dateRange.create_date_end ?
                dateRange.create_date_end.toISOString() : undefined;

            // Prepare request body
            const requestBody = {
                limit,
                columns: selectedColumns,
                ...(create_date_start && {create_date_start}),
                ...(create_date_end && {create_date_end})
            };

            // Make API call
            const response = await api.post('/v1/letter/download-excel/', requestBody, {
                responseType: 'blob', // Important: tells axios to handle the response as a blob
            });

            // Handle successful response - should be a file download
            const blob = new Blob([response.data], {
                type: response.headers['content-type']
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Generate filename with current date
            const today = format(new Date(), 'yyyy-MM-dd');
            a.download = `letters-export-${today}.xlsx`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            onCloseAction();
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onCloseAction}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Export Letters</DialogTitle>
                    <DialogDescription>
                        Configure your export settings below
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div>
                        <Label>Date</Label>
                        <DatePickerWithRange
                            date={{
                                from: dateRange.create_date_start,
                                to: dateRange.create_date_end,
                            }}
                            onChange={(range) =>
                                setDateRange({
                                    create_date_start: range?.from ?? null,
                                    create_date_end: range?.to ?? null,
                                })
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Number of Entries</Label>
                        <Select value={numEntries} onValueChange={setNumEntries}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select number of entries"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 entries</SelectItem>
                                <SelectItem value="25">25 entries</SelectItem>
                                <SelectItem value="50">50 entries</SelectItem>
                                <SelectItem value="100">100 entries</SelectItem>
                                <SelectItem value="all">All entries</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Columns</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {columns.map((column) => (
                                <div key={column.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={column.id}
                                        checked={column.checked}
                                        onCheckedChange={(checked) => {
                                            setColumns(columns.map(col =>
                                                col.id === column.id ? {...col, checked: !!checked} : col
                                            ));
                                        }}
                                    />
                                    <Label htmlFor={column.id}>{column.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCloseAction} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                                <>
                                    <Loader2 className="animate-spin"/>
                                    Exporting...
                                </>) :
                            'Export'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}