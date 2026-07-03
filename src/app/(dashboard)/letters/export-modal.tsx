// 'use client';

// import {useState} from "react";
// import {Button} from "@/components/ui/button";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import {Loader2, Printer} from "lucide-react";
// import {Checkbox} from "@/components/ui/checkbox";
// import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
// import {Label} from "@/components/ui/label";
// import {DatePickerWithRange} from "@/components/date-picker-with-range";
// import {format} from "date-fns";
// import {toast} from "sonner";
// import api from "@/lib/api";

// interface ExportModalProps {
//     isOpen: boolean;
//     onCloseAction: () => void;
//     departments: string[];
//     assignees: string[];
//     statuses: string[];
// }

// interface Column {
//     id: string;
//     label: string;
//     checked: boolean;
// }

// export function ExportModal({isOpen, onCloseAction}: ExportModalProps) {
//     const [dateRange, setDateRange] = useState({
//         create_date_start: null,
//         create_date_end: null,
//     });

//     const [numEntries, setNumEntries] = useState('100');
//     const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
//     const [columns, setColumns] = useState<Column[]>([
//         {id: 'id', label: 'ID', checked: true},
//         {id: 'code', label: 'Code', checked: true},
//         {id: 'subject', label: 'Subject/Content of the letter ', checked: true},
//         {id: 'sender', label: "Sender's Address", checked: true},
//         {id: 'email', label: 'Email', checked: true},
//         {id: 'telephone', label: 'Telephone', checked: true},
//         {id: 'source.name', label: 'Source', checked: true},
//         {id: 'organization.name', label: 'Sender/Organization of the letter', checked: true},
//         {id: 'department.name', label: 'Department', checked: true},
//         {id: 'status.name', label: 'Status', checked: true},
//         {id: 'assignee', label: 'Assignee', checked: true},
//         {id: 'other', label: 'Cheque no /Money Order No ', checked: true},
//         {id: 'attachments', label: 'Attachments Count', checked: true},
//         {id: 'received_datetime', label: 'Received Date', checked: true},
//         {id: 'create_datetime', label: 'Create Date', checked: true},
//         {id: 'update_datetime', label: 'Update Date', checked: true},
//     ]);

//     const [isExporting, setIsExporting] = useState(false);

   

//     const handleExport = async () => {
//     try {
//         setIsExporting(true);
//         const selectedColumns = columns
//             .filter(column => column.checked)
//             .map(column => column.id);

//         const limit = numEntries === 'all' ? 0 : parseInt(numEntries);

//         const requestBody = {
//             limit,
//             columns: selectedColumns,
//             ...(dateRange.create_date_start && { 
//                 create_date_start: dateRange.create_date_start.toISOString() 
//             }),
//             ...(dateRange.create_date_end && { 
//                 create_date_end: dateRange.create_date_end.toISOString() 
//             })
//         };

//         const response = await api.post('/v1/letter/download-excel/', requestBody, {
//             responseType: 'blob',
//         });

//         // Check if response is actually an error JSON
//         const contentType = response.headers['content-type'] || '';
//         if (contentType.includes('application/json')) {
//             const text = await response.data.text();
//             const json = JSON.parse(text);
//             toast.error(json.message || 'Export failed');
//             return;
//         }

//         const blob = new Blob([response.data], { type: contentType });
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `letters-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
//         document.body.appendChild(a);
//         a.click();
//         window.URL.revokeObjectURL(url);
//         document.body.removeChild(a);
//         onCloseAction();

//     } catch (error) {
//         console.error('Export error full:', error);
        
//         if (error.code === 'ERR_NETWORK') {
//             toast.error('Network error - Backend server ekata connect wenaddi. Server running da check karanna.');
//         } else {
//             toast.error(error.response?.data?.message || 'Something went wrong');
//         }
//     } finally {
//         setIsExporting(false);
//     }
// };

//     const handlePrint = async () => {
//         try {
//             setIsExporting(true);
//             const selectedColumns = columns.filter(c => c.checked && c.id !== 'id');
//             const limit = numEntries === 'all' ? 0 : parseInt(numEntries);
//             const create_date_start = dateRange.create_date_start?.toISOString();
//             const create_date_end = dateRange.create_date_end?.toISOString();

//             const listResponse = await api.post(
//                 `/v1/letter/list?page=1&page_size=${limit || 9999}`,
//                 {
//                     create_date_start: create_date_start || null,
//                     create_date_end: create_date_end || null,
//                     id: 0,
//                     code: "",
//                     subject: "",
//                     department_id: 0,
//                     assignee_id: 0,
//                     status_id: 0,
//                     organization_id: 0,
//                     other: "",
//                 }
//             );

//             const letters = listResponse.data.data;
//             const dateRangeText = dateRange.create_date_start && dateRange.create_date_end
//                 ? `${format(dateRange.create_date_start, 'yyyy-MM-dd')} to ${format(dateRange.create_date_end, 'yyyy-MM-dd')}`
//                 : 'All Dates';

//             const printWindow = window.open('', '_blank', 'width=900,height=700');
//             if (!printWindow) {
//                 toast.error('Popup blocked! Please allow popups for this site.');
//                 setIsExporting(false);
//                 return;
//             }

//             printWindow.document.write(`
//                 <!DOCTYPE html>
//                 <html>
//                 <head>
//                     <title>Letters Report</title>
//                     <style>
//                         @page { size: ${orientation}; margin: 10mm; }
//                         body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
//                         h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
//                         .subtitle { text-align: center; color: #666; margin-bottom: 15px; font-size: 12px; }
//                         table { width: 100%; border-collapse: collapse; }
//                         th { background-color: #f0f0f0; border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
//                         td { border: 1px solid #ddd; padding: 5px 8px; font-size: 11px; }
//                         tr:nth-child(even) { background-color: #f9f9f9; }
//                     </style>
//                 </head>
//                 <body onload="window.print()">
//                     <h1>COOP PMS - Letters Report</h1>
//                     <div class="subtitle">Date Range: ${dateRangeText} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
//                     <table>
//                         <thead>
//                             <tr>
//                                 <th>#</th>
//                                 ${selectedColumns.map(c => `<th>${c.label}</th>`).join('')}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${letters.map((letter, index) => `
//                                 <tr>
//                                     <td>${index + 1}</td>
//                                     ${selectedColumns.map(col => {
//                                         let val = '';
//                                         if (col.id === 'source.name') val = letter.source || '';
//                                         else if (col.id === 'organization.name') val = letter.organization || '';
//                                         else if (col.id === 'department.name') val = letter.department || '';
//                                         else if (col.id === 'status.name') val = letter.status || '';
//                                         else if (col.id === 'received_datetime' || col.id === 'create_datetime') {
//                                             val = letter.create_datetime ? format(new Date(letter.create_datetime), 'yyyy-MM-dd') : '';
//                                         }
//                                         else val = letter[col.id] || '';
//                                         return `<td>${val}</td>`;
//                                     }).join('')}
//                                 </tr>
//                             `).join('')}
//                         </tbody>
//                     </table>
//                 </body>
//                 </html>
//             `);
//             printWindow.document.close();
//             onCloseAction();
//         } catch (error) {
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         } finally {
//             setIsExporting(false);
//         }
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onCloseAction}>
//             <DialogContent className="sm:max-w-[600px]">
//                 <DialogHeader>
//                     <DialogTitle>Export Letters</DialogTitle>
//                     <DialogDescription>
//                         Configure your export settings below
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="grid gap-4 py-4">
//                     <div>
//                         <Label>Date</Label>
//                         <DatePickerWithRange
//                             date={{
//                                 from: dateRange.create_date_start,
//                                 to: dateRange.create_date_end,
//                             }}
//                             onChange={(range) =>
//                                 setDateRange({
//                                     create_date_start: range?.from ?? null,
//                                     create_date_end: range?.to ?? null,
//                                 })
//                             }
//                         />
//                     </div>

//                     <div className="space-y-2">
//                         <Label>Page Orientation</Label>
//                         <Select value={orientation} onValueChange={(v: 'landscape' | 'portrait') => setOrientation(v)}>
//                             <SelectTrigger className="w-full">
//                                 <SelectValue/>
//                             </SelectTrigger>
//                             <SelectContent>
//                                 <SelectItem value="landscape">Landscape</SelectItem>
//                                 <SelectItem value="portrait">Portrait</SelectItem>
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     <div className="space-y-2">
//                         <Label>Number of Entries</Label>
//                         <Select value={numEntries} onValueChange={setNumEntries}>
//                             <SelectTrigger className="w-full">
//                                 <SelectValue placeholder="Select number of entries"/>
//                             </SelectTrigger>
//                             <SelectContent>
//                                 <SelectItem value="10">10 entries</SelectItem>
//                                 <SelectItem value="25">25 entries</SelectItem>
//                                 <SelectItem value="50">50 entries</SelectItem>
//                                 <SelectItem value="100">100 entries</SelectItem>
//                                 <SelectItem value="all">All entries</SelectItem>
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     <div className="space-y-2">
//                         <Label>Select Columns</Label>
//                         <div className="grid grid-cols-2 gap-4">
//                             {columns.map((column) => (
//                                 <div key={column.id} className="flex items-center space-x-2">
//                                     <Checkbox
//                                         id={column.id}
//                                         checked={column.checked}
//                                         onCheckedChange={(checked) => {
//                                             setColumns(columns.map(col =>
//                                                 col.id === column.id ? {...col, checked: !!checked} : col
//                                             ));
//                                         }}
//                                     />
//                                     <Label htmlFor={column.id}>{column.label}</Label>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>

//                 <DialogFooter>
//                     <Button variant="outline" onClick={onCloseAction} disabled={isExporting}>
//                         Cancel
//                     </Button>
//                     <Button variant="outline" onClick={handlePrint} disabled={isExporting}>
//                         {isExporting ? (
//                             <><Loader2 className="animate-spin mr-2"/>Loading...</>
//                         ) : (
//                             <><Printer className="mr-2 h-4 w-4"/>Print Preview</>
//                         )}
//                     </Button>
//                     <Button onClick={handleExport} disabled={isExporting}>
//                         {isExporting ? (
//                             <><Loader2 className="animate-spin"/>Exporting...</>
//                         ) : 'Export'}
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// }



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
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [columns, setColumns] = useState<Column[]>([
        {id: 'id', label: 'ID', checked: true},
        {id: 'code', label: 'Code', checked: true},
        {id: 'subject', label: 'Subject/Content of the letter ', checked: true},
        {id: 'sender', label: "Sender's Address", checked: true},
        {id: 'email', label: 'Email', checked: true},
        {id: 'telephone', label: 'Telephone', checked: true},
        {id: 'source.name', label: 'Source', checked: true},
        {id: 'organization.name', label: 'Sender/Organization of the letter', checked: true},
        {id: 'department.name', label: 'Department', checked: true},
        {id: 'status.name', label: 'Status', checked: true},
        {id: 'assignee', label: 'Assignee', checked: true},
        {id: 'other', label: 'Cheque no /Money Order No ', checked: true},
        {id: 'sender_subject_no', label: "Sender's Subject No", checked: true},
        {id: 'attachments', label: 'Attachments Count', checked: true},
        {id: 'received_datetime', label: 'Received Date', checked: true},
        {id: 'create_datetime', label: 'Create Date', checked: true},
        {id: 'update_datetime', label: 'Update Date', checked: true},
    ]);

    const [isExporting, setIsExporting] = useState(false);

   

    const handleExport = async () => {
    try {
        setIsExporting(true);
        const selectedColumns = columns
            .filter(column => column.checked)
            .map(column => column.id);

        const limit = numEntries === 'all' ? 0 : parseInt(numEntries);

        const requestBody = {
            limit,
            columns: selectedColumns,
            ...(dateRange.create_date_start && { 
                create_date_start: dateRange.create_date_start.toISOString() 
            }),
            ...(dateRange.create_date_end && { 
                create_date_end: dateRange.create_date_end.toISOString() 
            })
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
        setIsExporting(false);
    }
};

    const handlePrint = async () => {
        try {
            setIsExporting(true);
            const selectedColumns = columns.filter(c => c.checked && c.id !== 'id');
            const limit = numEntries === 'all' ? 0 : parseInt(numEntries);
            const create_date_start = dateRange.create_date_start?.toISOString();
            const create_date_end = dateRange.create_date_end?.toISOString();

            const listResponse = await api.post(
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

            const letters = listResponse.data.data;
            const dateRangeText = dateRange.create_date_start && dateRange.create_date_end
                ? `${format(dateRange.create_date_start, 'yyyy-MM-dd')} to ${format(dateRange.create_date_end, 'yyyy-MM-dd')}`
                : 'All Dates';

            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) {
                toast.error('Popup blocked! Please allow popups for this site.');
                setIsExporting(false);
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Letters Report</title>
                    <style>
                        @page { size: ${orientation}; margin: 10mm; }
                        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                        h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
                        .subtitle { text-align: center; color: #666; margin-bottom: 15px; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f0f0f0; border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
                        td { border: 1px solid #ddd; padding: 5px 8px; font-size: 11px; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                    </style>
                </head>
                <body onload="window.print()">
                    <h1>COOP PMS - Letters Report</h1>
                    <div class="subtitle">Date Range: ${dateRangeText} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                ${selectedColumns.map(c => `<th>${c.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${letters.map((letter, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    ${selectedColumns.map(col => {
                                        let val = '';
                                        if (col.id === 'source.name') val = letter.source || '';
                                        else if (col.id === 'organization.name') val = letter.organization || '';
                                        else if (col.id === 'department.name') val = letter.department || '';
                                        else if (col.id === 'status.name') val = letter.status || '';
                                        else if (col.id === 'received_datetime' || col.id === 'create_datetime') {
                                            val = letter.create_datetime ? format(new Date(letter.create_datetime), 'yyyy-MM-dd') : '';
                                        }
                                        else val = letter[col.id] || '';
                                        return `<td>${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `);
            printWindow.document.close();
            onCloseAction();
        } catch (error) {
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
                    <Button variant="outline" onClick={handlePrint} disabled={isExporting}>
                        {isExporting ? (
                            <><Loader2 className="animate-spin mr-2"/>Loading...</>
                        ) : (
                            <><Printer className="mr-2 h-4 w-4"/>Print</>
                        )}
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <><Loader2 className="animate-spin"/>Exporting...</>
                        ) : 'Export'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}