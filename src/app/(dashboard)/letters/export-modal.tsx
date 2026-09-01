'use client';

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Loader2, Printer} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {format} from "date-fns";
import {toast} from "sonner";
import api from "@/lib/api";

interface ExportModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    departments: string[];
    assignees: string[];
    statuses: string[];
    selectedIds?: number[];   // when non-empty, export/print is scoped to just these letter IDs
}

interface Column {
    id: string;
    label: string;
    checked: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
    {id: 'id', label: 'ID', checked: true},
    {id: 'code', label: 'Code', checked: true},
    {id: 'organization.name', label: 'Sender/Organization of the letter', checked: true},
    {id: 'subject', label: 'Subject/Content of the letter ', checked: true},
    {id: 'sender_subject_no', label: "Sender's Subject No", checked: true},
    {id: 'sender', label: "Sender's Address", checked: false},
    {id: 'department.name', label: 'Section', checked: true},
    {id: 'assignee', label: 'Assignee', checked: true},
    {id: 'email', label: 'Email', checked: true},
    {id: 'telephone', label: 'Telephone', checked: false},
    {id: 'source.name', label: 'Source', checked: true},
    {id: 'status.name', label: 'Status', checked: false},
    {id: 'completion_file_name', label: 'File Name', checked: true},
    {id: 'other', label: 'Cheque no /Money Order No ', checked: true},
    {id: 'cheque_details', label: 'Cheque Details', checked: false},
    {id: 'attachments', label: 'Attachments Count', checked: false},
    {id: 'received_datetime', label: 'Received Date', checked: true},
    {id: 'create_datetime', label: 'Create Date', checked: false},
    {id: 'update_datetime', label: 'Update Date', checked: false},
];

// Snaps a date to the start/end of its LOCAL calendar day before converting
// to an ISO string. Without this, .toISOString() converts local midnight
// straight to UTC (e.g. Sri Lanka +5:30 → the previous day at 18:30 UTC),
// which silently shifted the whole date range back by several hours.
const toLocalStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const toLocalEndOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

export function ExportModal({isOpen, onCloseAction, selectedIds = []}: ExportModalProps) {
    const [dateRange, setDateRange] = useState<{ create_date_start: Date | null; create_date_end: Date | null }>({
        create_date_start: null,
        create_date_end: null,
    });

    const [numEntries, setNumEntries] = useState('100');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [publicComplaintFilter, setPublicComplaintFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);

    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const isBusy = isDownloading || isPrinting;

    const hasSelection = selectedIds.length > 0;

    // NEW — reset every filter/column back to its default state each time
    // the dialog is freshly opened. Without this, closing the dialog and
    // reopening it (e.g. to do a plain export right after a date-filtered
    // one) kept the PREVIOUS date range / column selections in state,
    // which is what made exports look like they were "ignoring" the dates
    // the user thought they'd just picked — they were actually seeing a
    // stale selection from an earlier open of the same modal instance.
    useEffect(() => {
        if (isOpen) {
            setDateRange({create_date_start: null, create_date_end: null});
            setNumEntries('100');
            setOrientation('landscape');
            setPublicComplaintFilter('all');
            setColumns(DEFAULT_COLUMNS);
        }
    }, [isOpen]);

    // NEW — computes the effective (start, end) pair ONCE, in one place,
    // used identically by both handleExport and handlePrint so the two
    // can never drift out of sync with each other. Also defends against
    // a range picked backwards (end before start) by swapping them.
    const getDateFilter = (): { start: string | undefined; end: string | undefined } => {
        if (!dateRange.create_date_start) {
            return {start: undefined, end: undefined};
        }
        let start = dateRange.create_date_start;
        let end = dateRange.create_date_end || dateRange.create_date_start;
        // Defensive swap — a range picked with end before start should
        // still filter correctly rather than silently returning zero rows
        // (start > end make most SQL BETWEEN-style filters match nothing).
        if (end < start) {
            [start, end] = [end, start];
        }
        return {
            start: toLocalStartOfDay(start).toISOString(),
            end: toLocalEndOfDay(end).toISOString(),
        };
    };

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const selectedColumns = columns
                .filter(column => column.checked)
                .map(column => column.id);

            const limit = numEntries === 'all' ? 0 : parseInt(numEntries);
            const {start, end} = getDateFilter();

            const requestBody = hasSelection
                ? {
                    ids: selectedIds,
                    columns: selectedColumns,
                }
                : {
                    limit,
                    ...(start && {create_date_start: start}),
                    ...(end && {create_date_end: end}),
                    ...(publicComplaintFilter !== 'all' && {is_public_complaint: publicComplaintFilter === 'yes'}),
                    columns: selectedColumns,
                };

            // NEW — surfaces exactly what's being sent, so if a future export
            // still looks wrong, the actual request body is one console
            // check away instead of a guessing game.
            console.debug('[ExportModal] export request body:', requestBody);

            const response = await api.post('/v1/letter/download-excel/', requestBody, {
                responseType: 'blob',
            });

            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const text = await response.data.text();
                const json = JSON.parse(text);
                toast.error(json.message || 'Export failed');
                return;
            }

            const blob = new Blob([response.data], {type: contentType});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `letters-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            onCloseAction();
        } catch (error) {
            console.error('Export error full:', error);
            if (error.code === 'ERR_NETWORK') {
                toast.error('Network error - Backend server ekata connect wenaddi. Server running da check karanna.');
            } else {
                toast.error(error.response?.data?.message || 'Something went wrong');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = async () => {
        setIsPrinting(true);

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            toast.error('Popup blocked! Please allow popups for this site.');
            setIsPrinting(false);
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Letters Report</title></head>
            <body style="font-family:Arial, sans-serif; padding:60px; text-align:center; color:#666;">
                Preparing report…
            </body>
            </html>
        `);
        onCloseAction();

        try {
            const selectedColumns = columns.filter(c => c.checked && c.id !== 'id');
            const limit = numEntries === 'all' ? 0 : parseInt(numEntries);
            const {start, end} = getDateFilter();

            const listResponse = hasSelection
                ? await api.post(`/v1/letter/list?page=1&page_size=${selectedIds.length}`, {
                    ids: selectedIds,
                    create_date_start: null,
                    create_date_end: null,
                    id: 0,
                    code: "",
                    subject: "",
                    department_id: 0,
                    assignee_id: 0,
                    status_id: 0,
                    organization_id: 0,
                    other: "",
                })
                : await api.post(
                    `/v1/letter/list?page=1&page_size=${limit || 9999}`,
                    {
                        create_date_start: start || null,
                        create_date_end: end || null,
                        id: 0,
                        code: "",
                        subject: "",
                        department_id: 0,
                        assignee_id: 0,
                        status_id: 0,
                        organization_id: 0,
                        other: "",
                    }
                );

            console.debug('[ExportModal] print list request dates:', {start, end});

            // Explicit chronological sort by Received Date (oldest first)
            // instead of a blind .reverse() of whatever order the API
            // happened to return.
            const letters = [...listResponse.data.data].sort((a, b) => {
                const dateA = new Date(a.received_datetime || a.create_datetime);
                const dateB = new Date(b.received_datetime || b.create_datetime);
                return dateA - dateB;
            });

            const dateRangeText = hasSelection
                ? `${selectedIds.length} Selected Letter${selectedIds.length !== 1 ? 's' : ''}`
                : dateRange.create_date_start
                    ? `${format(dateRange.create_date_start, 'yyyy-MM-dd')} to ${format(dateRange.create_date_end || dateRange.create_date_start, 'yyyy-MM-dd')}`
                    : 'All Dates';

            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Letters Report</title>
                    <style>
                        @page { size: ${orientation}; margin: 25mm 10mm 12mm 10mm; }
                        * { box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }

                        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 0; }
                        h1, h2, .print-title {margin: 0 0 8px 0; padding: 0;  line-height: 1.2; }
                        th {
                            background-color: #f5f5f5; border: none; border-bottom: 1.5px solid #333;
                            border-right: 0.5px solid #393838;
                            padding: 8px 10px; text-align: left; font-size: 12px;
                            word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
                        }
                        td {
                            border: none; border-bottom: 0.5px solid #3f3c3c;
                            border-right: 0.5px solid #5e5b5b;
                            padding: 7px 10px; font-size: 12px;
                            word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
                        }
                        th:last-child, td:last-child {
                            border-right: none;
                        }
                        .col-index { width: 44px; white-space: nowrap !important; }
                        .col-subject { width: 24%; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        .signature-col { min-height: 32px; }
                        tr { page-break-inside: avoid; break-inside: avoid; }
                        thead { display: table-header-group; }
                        .header-row th {
                            background: #fff; border: none; padding: 6px 0 6px 0;
                            text-align: center;
                        }
                        .header-row h1 { font-size: 16px; margin: 0 0 3px 0; }
                        .header-row .subtitle { color: #444; font-size: 16px; margin: 0 0 3px 0; font-weight: 600; }
                        .header-row .meta { color: #888; font-size: 10px; margin: 0; font-weight: normal; }
                    </style>
                </head>
                <body onload="window.print()">
                    <table>
                        <colgroup>
                            <col style="width:44px" />
                            ${selectedColumns.map(c => `<col${c.id === 'subject' ? ' style="width:24%"' : ''} />`).join('')}
                            <col style="width:70px" />
                        </colgroup>
                        <thead>
                            <tr class="header-row">
                                <th colspan="${selectedColumns.length + 2}" style="border-bottom: 2px solid #333;">
                                    <h1>Department of Cooperative Development</h1>
                                    <div class="subtitle">COOP PMS - Letters Report</div>
                                    <div class="meta">Date Range: ${dateRangeText} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
                                </th>
                            </tr>
                            <tr>
                                <th class="col-index">#</th>
                                ${selectedColumns.map(c => `<th${c.id === 'subject' ? ' class="col-subject"' : ''}>${c.label}</th>`).join('')}
                                <th>Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${letters.map((letter, index) => `
                                <tr>
                                    <td class="col-index">${index + 1}</td>
                                    ${selectedColumns.map(col => {
                                        let val = '';
                                        if (col.id === 'source.name') val = letter.source || '';
                                        else if (col.id === 'organization.name') val = letter.organization || '';
                                        else if (col.id === 'department.name') val = letter.department || '';
                                        else if (col.id === 'status.name') val = letter.status || '';
                                        else if (col.id === 'cheque_details') {
                                            if (!letter.other) {
                                                val = '';
                                            } else if (!letter.cheque_deposited) {
                                                val = 'Not deposited';
                                            } else {
                                                const parts = ['Deposited'];
                                                if (letter.cheque_deposit_date) parts.push(format(new Date(letter.cheque_deposit_date), 'yyyy-MM-dd'));
                                                if (letter.cheque_bank) parts.push(letter.cheque_branch ? `${letter.cheque_bank} (${letter.cheque_branch})` : letter.cheque_bank);
                                                if (letter.cheque_account_no) parts.push(`A/C ${letter.cheque_account_no}`);
                                                val = parts.join(' · ');
                                            }
                                        }
                                        else if (col.id === 'received_datetime') {
                                            val = letter.received_datetime
                                                ? format(new Date(letter.received_datetime), 'yyyy-MM-dd')
                                                : (letter.create_datetime ? format(new Date(letter.create_datetime), 'yyyy-MM-dd') : '');
                                        }
                                        else if (col.id === 'create_datetime') {
                                            val = letter.create_datetime ? format(new Date(letter.create_datetime), 'yyyy-MM-dd') : '';
                                        }
                                        else val = letter[col.id] || '';
                                        return `<td>${val}</td>`;
                                    }).join('')}
                                    <td class="signature-col"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>Letters Report</title></head>
                <body style="font-family:Arial, sans-serif; padding:60px; text-align:center; color:#b91c1c;">
                    Failed to load the report. Please close this window and try again.
                </body>
                </html>
            `);
            printWindow.document.close();
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onCloseAction}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Export Letters</DialogTitle>
                    <DialogDescription>
                        {hasSelection
                            ? `Exporting ${selectedIds.length} selected letter${selectedIds.length !== 1 ? 's' : ''}.`
                            : 'Configure your export settings below'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!hasSelection && (
                        <>
                            <div>
                                <Label>Date (filters by Received Date)</Label>
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
                                <Label>Public Complaint</Label>
                                <Select value={publicComplaintFilter} onValueChange={(v: 'all' | 'yes' | 'no') => setPublicComplaintFilter(v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Letters</SelectItem>
                                        <SelectItem value="yes">Public Complaints Only</SelectItem>
                                        <SelectItem value="no">Not Public Complaints</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>Page Orientation</Label>
                        <Select value={orientation} onValueChange={(v: 'landscape' | 'portrait') => setOrientation(v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="landscape">Landscape</SelectItem>
                                <SelectItem value="portrait">Portrait</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Columns</Label>
                        <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1">
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
                    <Button variant="outline" onClick={onCloseAction}>
                        Cancel
                    </Button>
                    <Button onClick={handlePrint} disabled={isBusy}>
                        {isPrinting ? (
                            <><Loader2 className="animate-spin mr-2"/>Opening report...</>
                        ) : (
                            <><Printer className="mr-2 h-4 w-4"/>Print</>
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={isBusy}>
                        {isDownloading ? (
                            <><Loader2 className="animate-spin mr-2"/>Exporting...</>
                        ) : 'Export'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}