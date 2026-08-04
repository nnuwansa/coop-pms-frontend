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
    selectedIds?: number[];   // NEW — when non-empty, export/print is scoped to just these letter IDs
}

interface Column {
    id: string;
    label: string;
    checked: boolean;
}

export function ExportModal({isOpen, onCloseAction, selectedIds = []}: ExportModalProps) {
    const [dateRange, setDateRange] = useState({
        create_date_start: null,
        create_date_end: null,
    });

    const [numEntries, setNumEntries] = useState('100');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    // CHANGED — Sender's Address, Telephone, Status, Attachments Count,
    // Create Date, and Update Date are unchecked by default. These are used
    // less often in exports/prints than the rest, so starting with them off
    // keeps the default output focused without the user having to
    // manually uncheck them every time.
    // NEW — cheque_deposited / deposit details columns, so someone can
    // export/print exactly who has deposited a cheque and the account it
    // went to, without opening each letter individually.
    const [columns, setColumns] = useState<Column[]>([
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
        {id: 'completion_file_name', label: 'File Name', checked: true},   // NEW
        {id: 'other', label: 'Cheque no /Money Order No ', checked: true},
        {id: 'cheque_details', label: 'Cheque Details', checked: false},  // CHANGED — combined single column instead of 5 separate ones (deposited/date/account/bank/branch)
        {id: 'attachments', label: 'Attachments Count', checked: false},
        {id: 'received_datetime', label: 'Received Date', checked: true},
        {id: 'create_datetime', label: 'Create Date', checked: false},
        {id: 'update_datetime', label: 'Update Date', checked: false},
    ]);

    // CHANGED — Print and Export used to share a single `isExporting` flag,
    // so clicking either button made BOTH buttons render their "loading"
    // label/spinner at once (confusing, and made it look like the dialog
    // was stuck). They're now tracked separately.
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const isBusy = isDownloading || isPrinting;

    // NEW — whether we're exporting a user-picked subset of letters rather
    // than everything matching the date range / entry count
    const hasSelection = selectedIds.length > 0;

    const handleExport = async () => {
    try {
        setIsDownloading(true);
        const selectedColumns = columns
            .filter(column => column.checked)
            .map(column => column.id);

        const limit = numEntries === 'all' ? 0 : parseInt(numEntries);

        const requestBody = {
            // NEW — when specific letters were checked in the dashboard table,
            // export exactly those (by id) instead of the top N / date range.
            ...(hasSelection
                ? {ids: selectedIds}
                : {
                    limit,
                    ...(dateRange.create_date_start && {
                        create_date_start: dateRange.create_date_start.toISOString()
                    }),
                    ...(dateRange.create_date_end && {
                        create_date_end: dateRange.create_date_end.toISOString()
                    }),
                }),
            columns: selectedColumns,
        };

        const response = await api.post('/v1/letter/download-excel/', requestBody, {
            responseType: 'blob',
        });

        // Check if response is actually an error JSON
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            const text = await response.data.text();
            const json = JSON.parse(text);
            toast.error(json.message || 'Export failed');
            return;
        }

        const blob = new Blob([response.data], { type: contentType });
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

        // CHANGED — the popup is opened FIRST, before any data is fetched.
        // Once it exists, this Export dialog closes right away — the person
        // doesn't have to sit and watch it while the report loads. The
        // popup shows its own short "Preparing report..." placeholder until
        // the real content replaces it below.
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
            const create_date_start = dateRange.create_date_start?.toISOString();
            const create_date_end = dateRange.create_date_end?.toISOString();

            // NEW — when a selection of letters is active, the print/report
            // view is limited to just those, ignoring the date range / limit.
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
                        create_date_start: create_date_start || null,
                        create_date_end: create_date_end || null,
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

            const letters = [...listResponse.data.data].reverse();   // CHANGED — oldest letter first in the printed report
            const dateRangeText = hasSelection
                ? `${selectedIds.length} Selected Letter${selectedIds.length !== 1 ? 's' : ''}`
                : dateRange.create_date_start && dateRange.create_date_end
                    ? `${format(dateRange.create_date_start, 'yyyy-MM-dd')} to ${format(dateRange.create_date_end, 'yyyy-MM-dd')}`
                    : 'All Dates';

            // CHANGED — document.open() clears the "Preparing report…"
            // placeholder before writing the real report into the same
            // already-open popup window.
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Letters Report</title>
                    <style>
                        /* CHANGED — the previous position:fixed / negative-top
                           trick for repeating the header on every page didn't
                           line up with this @page margin in most browsers: the
                           header rendered at the BOTTOM of a page instead of
                           the top, and could overlap/clip the last row of the
                           table above it. The header is now a normal in-flow
                           block that prints once at the top of the report; the
                           table's own <thead> (column names) repeats on every
                           page instead, via display: table-header-group below,
                           which browsers handle reliably for print. Page
                           margins no longer need to reserve extra space for a
                           floating header.
                        */
                        @page { size: ${orientation}; margin: 12mm 10mm; }
                        * { box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 12px; }

                        /* NEW — table-layout: fixed + break-word gives every column a
                           predictable, wider share of the page and wraps at word
                           boundaries instead of the cramped, oddly-broken lines you'd
                           get from browser auto-sizing with many narrow columns. */
                        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                        /* CHANGED — border lightened from #ddd/solid-black-ish look to a
                           softer, lighter grey line so the grid reads less heavy on print */
                        th {
                            background-color: #f5f5f5; border: 1px solid #e5e5e5;
                            padding: 8px 10px; text-align: left; font-size: 12px;
                            word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
                        }
                        td {
                            border: 1px solid #e5e5e5; padding: 7px 10px; font-size: 12px;
                            word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
                        }
                        /* CHANGED — the # column is now wide enough, and set to
                           not wrap, so two-digit row numbers (10, 11, 12...)
                           print on a single line instead of breaking across two. */
                        .col-index { width: 44px; white-space: nowrap !important; }
                        .col-subject { width: 24%; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        .signature-col { min-height: 32px; }
                        /* Keeps a table row intact across a page break instead of
                           slicing it (part on one page, the rest carried onto the next). */
                        tr { page-break-inside: avoid; break-inside: avoid; }
                        /* CHANGED — the report heading now lives INSIDE the
                           table's <thead> as its own banner row, stacked above
                           the column-header row. Browsers reliably repeat an
                           entire <thead> (display: table-header-group) at the
                           top of every printed page, which is not true of a
                           heading block placed outside/above the table — that
                           only ever prints once. This is the fix for the
                           heading needing to appear on every page. */
                        thead { display: table-header-group; }
                        .header-row th {
                            background: #fff; border: none; padding: 0 0 8px 0;
                            text-align: center;
                        }
                        .header-row h1 { font-size: 16px; margin: 0 0 2px 0; }
                        .header-row .subtitle { color: #666; font-size: 11px; margin: 0 0 2px 0; font-weight: normal; }
                        .header-row .meta { color: #888; font-size: 10px; margin: 0; font-weight: normal; }
                    </style>
                </head>
                <body onload="window.print()">
                    <table>
                        <!-- Explicit column widths via colgroup: with table-layout:fixed,
                             widths are taken from the first row with width hints. Since the
                             heading row above is one merged cell (so it can repeat as part
                             of the thead), it carries no per-column widths — this colgroup
                             gives Subject/Content a clearly larger share than the rest. -->
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
                                        // CHANGED — combined single "Cheque Details" column instead of
                                        // separate deposited/date/account/bank/branch columns.
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
                                        else if (col.id === 'received_datetime' || col.id === 'create_datetime') {
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
            // The Export dialog is already closed at this point (it closed
            // as soon as the popup opened), so the error needs to be visible
            // somewhere the person will actually see it — the popup itself.
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
                    {/* NEW — date range / entry count only make sense when exporting
                        by criteria; hidden while a specific selection is active */}
                    {!hasSelection && (
                        <>
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
                    {/* CHANGED — Cancel is no longer disabled while a print/export
                        is in progress. It previously got stuck disabled whenever
                        isExporting was true, so the dialog could feel un-closable
                        if a request was slow. Closing here doesn't cancel an
                        in-flight download; it just dismisses this dialog. */}
                    <Button variant="outline" onClick={onCloseAction}>
                        Cancel
                    </Button>
                    {/* CHANGED — swapped styling: Print is now the solid/filled
                        button (black background, white text) and Export is now
                        the outline button (white background, black text). */}
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