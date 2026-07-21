// 'use client';

// import {useCallback, useEffect, useState} from "react";
// import {useRouter} from "next/navigation";
// import {toast} from "sonner";
// import {
//     ChevronLeft,
//     ChevronRight,
//     ChevronsLeft,
//     ChevronsRight,
//     CircleAlert,
//     Clock,
//     Download,
//     Eye,
//     Filter,
//     MailCheck,
//     MailPlus,
//     MailSearch,
//     RotateCw,
//     Settings2,
//     X,
// } from "lucide-react";

// import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
// import {Button} from "@/components/ui/button";
// import {
//     DropdownMenu,
//     DropdownMenuCheckboxItem,
//     DropdownMenuContent,
//     DropdownMenuTrigger
// } from "@/components/ui/dropdown-menu";
// import {Input} from "@/components/ui/input";
// import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
// import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
// import {DatePickerWithRange} from "@/components/date-picker-with-range";
// import {InsertLetterModal} from "@/app/(dashboard)/letters/insert-letter-modal";
// import {ExportModal} from "@/app/(dashboard)/letters/export-modal";
// import {useDebounce} from "@/hook/debounce";
// import {formatDate} from "@/lib/utils";
// import api from "@/lib/api";
// import {useAuthStore} from "@/store/auth-store";

// // Interfaces
// interface Department {
//     id: number;
//     name: string;
// }

// interface Status {
//     id: number;
//     name: string;
// }

// interface Assignee {
//     id: number;
//     name: string;
// }

// interface Organization {
//     id: number;
//     name: string;
// }

// interface Letter {
//     id: number;
//     code: string;
//     subject: string;
//     organization: string;
//     department: string;
//     assignee: string;
//     create_datetime: string;
//     status: string;
//     status_days?: number | null;   // NEW
//     other?: string;
// }

// interface LetterFilters {
//     id: number;
//     code: string;
//     subject: string;
//     department_id: number;
//     assignee_id: number;
//     status_id: number;
//     organization_id: number;
//     create_date_start: string | null;
//     create_date_end: string | null;
//     other: string;
// }

// interface ColumnVisibility {
//     id: boolean;
//     code: boolean;
//     title: boolean;
//     organization: boolean;
//     department: boolean;
//     assignee: boolean;
//     date: boolean;
//     status: boolean;
//     other: boolean;
// }

// interface ApiResponse<T> {
//     success: boolean;
//     data: T;
//     total?: number;
//     total_pages?: number;
// }

// // NOTE: `status_id` is still returned by the API for filtering purposes,
// // but we now match cards by `status` (the human-readable name) instead of
// // assuming a fixed id -> meaning mapping (that assumption was wrong: id 2
// // is "Forwarded" in this system, not "Assigned").
// interface LetterStat {
//     status_id: number;
//     count: number;
//     status_name: string;
// }

// const pageSizeOptions = [5, 10, 20, 50];

// const initialFilters: LetterFilters = {
//     id: 0,
//     code: "",
//     subject: "",
//     department_id: 0,
//     assignee_id: 0,
//     status_id: 0,
//     organization_id: 0,
//     create_date_start: null,
//     create_date_end: null,
//     other: "",
// };

// const initialColumnVisibility: ColumnVisibility = {
//     id: true,
//     code: true,
//     title: true,
//     organization: true,
//     department: false,
//     assignee: false,
//     date: true,
//     status: true,
//     other: false,
// };

// export default function LetterDashboard() {
//     const router = useRouter();
//     const [showExportModal, setShowExportModal] = useState<boolean>(false);
//     const [currentPage, setCurrentPage] = useState<number>(1);
//     const [pageSize, setPageSize] = useState<number>(10);
//     const [showFilters, setShowFilters] = useState<boolean>(false);
//     const [letters, setLetters] = useState<Letter[]>([]);
//     const [totalPages, setTotalPages] = useState<number>(0);
//     const [totalRows, setTotalRows] = useState<number>(0);
//     const [departments, setDepartments] = useState<Department[]>([]);
//     const [statuses, setStatuses] = useState<Status[]>([]);
//     const [assignees, setAssignees] = useState<Assignee[]>([]);
//     const [organizations, setOrganizations] = useState<Organization[]>([]);
//     const [inputFilters, setInputFilters] = useState<LetterFilters>(initialFilters);
//     const debouncedFilters = useDebounce(inputFilters, 500);
//     const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(initialColumnVisibility);
//     const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [letterStats, setLetterStats] = useState<LetterStat[]>([]);
//     const {hasPermission} = useAuthStore();

//     useEffect(() => {
//         const fetchDropdownData = async (): Promise<void> => {
//             try {
//                 const [deptResponse, statusResponse, assigneeResponse, orgResponse] = await Promise.all([
//                     api.get('/v1/department/list'),
//                     api.get('/v1/status/list'),
//                     api.get('/v1/system_user/names'),
//                     api.get('/v1/organization/list')
//                 ]);

//                 const [deptData, statusData, assigneeData, orgData] = await Promise.all([
//                     deptResponse.data,
//                     statusResponse.data,
//                     assigneeResponse.data,
//                     orgResponse.data
//                 ]);

//                 if (deptData.success) setDepartments(deptData.data);
//                 if (statusData.success) setStatuses(statusData.data);
//                 if (assigneeData.success) setAssignees(assigneeData.data);
//                 if (orgData.success) setOrganizations(orgData.data);

//             } catch (error) {
//                 console.error("Error fetching dropdown data:", error);
//                 toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//             }
//         };

//         fetchDropdownData().catch((err) =>
//             console.error("Unhandled error in fetchDropdownData", err)
//         );
//     }, []);

//     const fetchLetterStats = useCallback(async () => {
//         const response = await api.get('/v1/letter/stats/');
//         return await response.data;
//     }, []);

//     const fetchLettersFromApi = useCallback(
//         async (
//             page: number,
//             pageSize: number,
//             filters: Partial<LetterFilters>
//         ): Promise<ApiResponse<Letter[]>> => {
//             const response = await api.post(
//                 `/v1/letter/list?page=${page}&page_size=${pageSize}`, filters
//             );
//             return await response.data;
//         }, []);

//     const loadLetters = useCallback(async (): Promise<void> => {
//         const filters: Partial<LetterFilters> = {
//             id: debouncedFilters.id || 0,
//             code: debouncedFilters.code || "",
//             subject: debouncedFilters.subject || "",
//             organization_id: debouncedFilters.organization_id || 0,
//             department_id: debouncedFilters.department_id || 0,
//             assignee_id: debouncedFilters.assignee_id || 0,
//             status_id: debouncedFilters.status_id || 0,
//             create_date_start: debouncedFilters.create_date_start || null,
//             create_date_end: debouncedFilters.create_date_end || null,
//             other: debouncedFilters.other || "",
//         };

//         try {
//             setIsLoading(true);

//             const [lettersResponse, statsResponse] = await Promise.all([
//                 fetchLettersFromApi(currentPage, pageSize, filters),
//                 fetchLetterStats()
//             ]);

//             setLetters(lettersResponse.data);
//             setTotalPages(lettersResponse.total_pages || 0);
//             setTotalRows(lettersResponse.total || 0);
//             // NOTE: previously this did `.slice(0, 4)`, which silently dropped
//             // any status beyond the first 4 returned by the API and made the
//             // cards depend on array order rather than status name. We now keep
//             // the full list and look up each card's count by status name below.
//             setLetterStats(statsResponse.data);

//             setIsLoading(false);
//         } catch (error) {
//             console.error("Error fetching letters", error);
//             toast.error(error.response?.data.message || 'Something went wrong. Please try again');
//         }
//     }, [currentPage, debouncedFilters, pageSize, fetchLettersFromApi, fetchLetterStats]);

//     useEffect(() => {
//         loadLetters().catch((err) =>
//             console.error("Unhandled error in loadLetters", err)
//         );
//     }, [loadLetters, refreshTrigger]);

//     useEffect(() => {
//         setCurrentPage(1);
//     }, [debouncedFilters]);

//     const handleRefresh = (): void => {
//         setRefreshTrigger(prev => !prev);
//     };

//     const generatePageNumbers = (): number[] => {
//         const pageNumbers: number[] = [];
//         const maxVisiblePages = 5;
//         let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
//         let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

//         if (endPage - startPage + 1 < maxVisiblePages) {
//             startPage = Math.max(1, endPage - maxVisiblePages + 1);
//         }

//         for (let i = startPage; i <= endPage; i++) {
//             pageNumbers.push(i);
//         }

//         return pageNumbers;
//     };

//     const clearFilter = (filterName: keyof LetterFilters): void => {
//         setInputFilters(prev => ({
//             ...prev,
//             [filterName]: filterName.includes('date')
//                 ? null
//                 : (typeof prev[filterName] === 'string' ? '' : 0)
//         }));
//     };

//     const handleFilters = (): void => {
//         if (showFilters) {
//             setInputFilters(initialFilters);
//         }
//         setShowFilters(!showFilters);
//     };

//     const getStatusClassName = (status: string): string => {
//         if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
//         if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
//         if (status === 'Forwarded') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
//         if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
//         if (status === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
//         if (status === null) return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
//         return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
//     };

//     // Look up a stat card's count by the status's human-readable name rather
//     // than assuming a fixed status_id. This is resilient to status ids being
//     // reordered/renamed in the `status` table.
//     const getStatCount = (statusName: string): number => {
//         const stat = letterStats.find(
//             (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
//         );
//         return stat?.count ?? 0;
//     };

//     // Clicking a stat card filters the table by that status. We resolve the
//     // status_id from the fetched stats (falling back to the `statuses`
//     // dropdown list, in case a status currently has zero letters and so
//     // doesn't appear in letterStats) instead of hardcoding an id.
//     const handleStatsClick = (statusName: string): void => {
//         const stat = letterStats.find(
//             (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
//         );
//         const fallback = statuses.find(
//             (s) => s.name?.toLowerCase() === statusName.toLowerCase()
//         );
//         const statusId = stat?.status_id ?? fallback?.id;
//         if (!statusId) return;

//         !showFilters && setShowFilters(true);
//         setInputFilters((prev) => ({
//             ...prev,
//             status_id: statusId,
//         }));
//     };

//     return (
//         <div className="space-y-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold">Letter Management</h1>
//                     <p className="text-muted-foreground">
//                         Define and track all incoming and outgoing correspondence. Easily manage the flow of letters
//                         across departments and organizations
//                     </p>
//                 </div>
//                 <InsertLetterModal
//                     organizations={organizations}
//                     onOrganizationAdded={(newOrg) => setOrganizations(prev => [...prev, newOrg])}
//                     onSuccess={handleRefresh}
//                 />
//             </div>

//             {/* Stats Cards */}
//             <div className="grid gap-6 md:grid-cols-4">
//                 <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
//                     onClick={() => handleStatsClick("New")}>
//                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                         <CardTitle className="text-sm font-medium">New</CardTitle>
//                         <MailPlus className="h-4 w-4 text-blue-600"/>
//                     </CardHeader>
//                     <CardContent>
//                         {isLoading ? (
//                             <div className="space-y-2">
//                                 <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
//                                 <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="text-2xl font-bold">{getStatCount("New")}</div>
//                                 <p className="text-xs text-muted-foreground">Newly Created</p>
//                             </>
//                         )}
//                     </CardContent>
//                 </Card>
//                 <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
//                     onClick={() => handleStatsClick("Forwarded")}>
//                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                         <CardTitle className="text-sm font-medium">Assigned</CardTitle>
//                         <MailCheck className="h-4 w-4 text-amber-600"/>
//                     </CardHeader>
//                     <CardContent>
//                         {isLoading ? (
//                             <div className="space-y-2">
//                                 <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
//                                 <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="text-2xl font-bold">{getStatCount("Forwarded")}</div>
//                                 <p className="text-xs text-muted-foreground">Forwarded</p>
//                             </>
//                         )}
//                     </CardContent>
//                 </Card>
//                 <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
//                     onClick={() => handleStatsClick("In Progress")}>
//                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                         <CardTitle className="text-sm font-medium">In Progress</CardTitle>
//                         <Clock className="h-4 w-4 text-green-600"/>
//                     </CardHeader>
//                     <CardContent>
//                         {isLoading ? (
//                             <div className="space-y-2">
//                                 <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
//                                 <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="text-2xl font-bold">{getStatCount("In Progress")}</div>
//                                 <p className="text-xs text-muted-foreground">Work Ongoing</p>
//                             </>
//                         )}
//                     </CardContent>
//                 </Card>
//                 <Card
//                     className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${
//                         getStatCount("Rejected") > 0
//                             ? "bg-rose-300 dark:bg-rose-800 animate-pulse border-red-200"
//                             : ""
//                     }`}
//                     onClick={() => handleStatsClick("Rejected")}>
//                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                         <CardTitle className="text-sm font-medium">Rejected</CardTitle>
//                         <CircleAlert className="h-4 w-4 text-red-600"/>
//                     </CardHeader>
//                     <CardContent>
//                         {isLoading ? (
//                             <div className="space-y-2">
//                                 <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
//                                 <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="text-2xl font-bold">{getStatCount("Rejected")}</div>
//                                 <p className="text-xs text-muted-foreground">Request Denied</p>
//                             </>
//                         )}
//                     </CardContent>
//                 </Card>
//             </div>

//             <Card>
//                 <CardHeader className="flex flex-row items-center justify-between">
//                     <div>
//                         <CardTitle>Letters List</CardTitle>
//                         <CardDescription>A comprehensive list of all letters in the system</CardDescription>
//                     </div>
//                     {!isLoading && (
//                         <div className="flex space-x-2">
//                             <Button size="icon" variant="outline" onClick={handleRefresh} aria-label="Refresh">
//                                 <RotateCw className="h-4 w-4"/>
//                             </Button>
//                             <Button
//                                 variant="outline"
//                                 size="icon"
//                                 onClick={handleFilters}
//                                 className={showFilters ? "bg-gray-100 dark:bg-gray-900" : ""}
//                                 aria-label="Filter"
//                             >
//                                 <Filter className="h-4 w-4"/>
//                             </Button>
//                             <Button
//                                 variant="outline"
//                                 onClick={() => setShowExportModal(true)}
//                                 aria-label="Export"
//                                 disabled={!hasPermission('letter.xdownload')}
//                             >
//                                 <Download className="h-4 w-4"/>
//                             </Button>
//                             <DropdownMenu>
//                                 <DropdownMenuTrigger asChild>
//                                     <Button variant="outline" aria-label="Column Settings">
//                                         <Settings2 className="h-4 w-4"/>
//                                     </Button>
//                                 </DropdownMenuTrigger>
//                                 <DropdownMenuContent align="end">
//                                     {Object.entries({
//                                         id: "ID",
//                                         code: "Code",
//                                         title: "Subject/Content of the Letter",
//                                         organization: "Sender/Organization of the letter",
//                                         department: "Department",
//                                         assignee: "Assignee",
//                                         date: "Received Date",
//                                         status: "Status",
//                                         other: "Other",
//                                     }).map(([key, label]) => (
//                                         <DropdownMenuCheckboxItem
//                                             key={key}
//                                             checked={columnVisibility[key as keyof ColumnVisibility]}
//                                             onCheckedChange={(checked) =>
//                                                 setColumnVisibility((prev) => ({...prev, [key]: checked}))
//                                             }
//                                         >
//                                             {label}
//                                         </DropdownMenuCheckboxItem>
//                                     ))}
//                                 </DropdownMenuContent>
//                             </DropdownMenu>
//                         </div>
//                     )}
//                 </CardHeader>
//                 <CardContent>
//                     <div className="space-y-4">
//                         <div>
//                             {showFilters && (
//                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
//                                     {columnVisibility.id && (
//                                         <div className="relative">
//                                             <Input
//                                                 placeholder="Search by ID..."
//                                                 value={inputFilters.id === 0 ? "" : inputFilters.id}
//                                                 onChange={(e) => setInputFilters(prev => ({
//                                                     ...prev,
//                                                     id: parseInt(e.target.value) || 0
//                                                 }))}
//                                                 className="w-full"
//                                                 type="number"
//                                                 aria-label="Search by ID"
//                                             />
//                                             {inputFilters.id !== 0 && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('id')} aria-label="Clear ID filter">
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.code && (
//                                         <div className="relative">
//                                             <Input
//                                                 placeholder="Search by Code..."
//                                                 value={inputFilters.code}
//                                                 onChange={(e) => setInputFilters(prev => ({...prev, code: e.target.value}))}
//                                                 className="w-full"
//                                                 aria-label="Search by Code"
//                                             />
//                                             {inputFilters.code && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('code')} aria-label="Clear Code filter">
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.title && (
//                                         <div className="relative">
//                                             <Input
//                                                 placeholder="Search by Subject/Content of the Letter..."
//                                                 value={inputFilters.subject}
//                                                 onChange={(e) => setInputFilters(prev => ({...prev, subject: e.target.value}))}
//                                                 className="w-full"
//                                                 aria-label="Search by Subject/Content of the Letter"
//                                             />
//                                             {inputFilters.subject && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('subject')} aria-label="Clear  Subject/Content of the Letter filter">
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.organization && (
//                                         <div className="relative">
//                                             <Select
//                                                 value={inputFilters.organization_id !== 0 ? inputFilters.organization_id.toString() : ""}
//                                                 onValueChange={(value) => setInputFilters((prev) => ({
//                                                     ...prev,
//                                                     organization_id: parseInt(value) || 0,
//                                                 }))}>
//                                                 <SelectTrigger className="w-full">
//                                                     <SelectValue placeholder="Select a Sender/Organization"/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {organizations.map((org) => (
//                                                         <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             {inputFilters.organization_id !== 0 && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('organization_id')}>
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.department && (
//                                         <div className="relative">
//                                             <Select
//                                                 value={inputFilters.department_id !== 0 ? inputFilters.department_id.toString() : ""}
//                                                 onValueChange={(value) => setInputFilters((prev) => ({
//                                                     ...prev,
//                                                     department_id: parseInt(value) || 0,
//                                                 }))}>
//                                                 <SelectTrigger className="w-full">
//                                                     <SelectValue placeholder="Select a Department"/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {departments.map((dept) => (
//                                                         <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             {inputFilters.department_id !== 0 && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('department_id')}>
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.assignee && (
//                                         <div className="relative">
//                                             <Select
//                                                 value={inputFilters.assignee_id !== 0 ? inputFilters.assignee_id.toString() : ""}
//                                                 onValueChange={(value) => setInputFilters((prev) => ({
//                                                     ...prev,
//                                                     assignee_id: parseInt(value) || 0,
//                                                 }))}>
//                                                 <SelectTrigger className="w-full">
//                                                     <SelectValue placeholder="Select an Assignee"/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {assignees.map((a) => (
//                                                         <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             {inputFilters.assignee_id !== 0 && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('assignee_id')}>
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.date && (
//                                         <div>
//                                             <DatePickerWithRange
//                                                 date={{
//                                                     from: inputFilters.create_date_start ? new Date(inputFilters.create_date_start) : undefined,
//                                                     to: inputFilters.create_date_end ? new Date(inputFilters.create_date_end) : undefined,
//                                                 }}
//                                                 onChange={(range) => setInputFilters((prev) => ({
//                                                     ...prev,
//                                                     create_date_start: range?.from ? new Date(range.from).toISOString() : null,
//                                                     create_date_end: range?.to ? new Date(range.to).toISOString() : null,
//                                                 }))}
//                                             />
//                                         </div>
//                                     )}
//                                     {columnVisibility.status && (
//                                         <div className="relative">
//                                             <Select
//                                                 value={inputFilters.status_id !== 0 ? inputFilters.status_id.toString() : ""}
//                                                 onValueChange={(value) => setInputFilters((prev) => ({
//                                                     ...prev,
//                                                     status_id: parseInt(value) || 0,
//                                                 }))}>
//                                                 <SelectTrigger className="w-full">
//                                                     <SelectValue placeholder="Select a Status"/>
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     {statuses.map((s) => (
//                                                         <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             {inputFilters.status_id !== 0 && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('status_id')}>
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                     {columnVisibility.other && (
//                                         <div className="relative">
//                                             <Input
//                                                 placeholder="Search by Cheque no /Money Order No..."
//                                                 value={inputFilters.other}
//                                                 onChange={(e) => setInputFilters(prev => ({...prev, other: e.target.value}))}
//                                                 className="w-full"
//                                                 aria-label="Search by Other"
//                                             />
//                                             {inputFilters.other && (
//                                                 <Button variant="ghost" size="icon"
//                                                     className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
//                                                     onClick={() => clearFilter('other')}>
//                                                     <X className="h-4 w-4"/>
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     )}
//                                 </div>
//                             )}

//                             <div className="rounded-md border">
//                                 <Table className="overflow-x-auto min-w-max w-full mb-2">
//                                     <TableHeader>
//                                         <TableRow>
//                                             {columnVisibility.id && <TableHead className="w-[50px] text-center">ID</TableHead>}
//                                             {columnVisibility.code && <TableHead className="w-[150px]">Code</TableHead>}
//                                             {columnVisibility.title && <TableHead className="w-[250px]">Subject/Content of the Letter</TableHead>}
//                                             {columnVisibility.organization && <TableHead className="w-[250px]">Sender/Organization of the letter</TableHead>}
//                                             {columnVisibility.department && <TableHead className="w-[250px]">Department</TableHead>}
//                                             {columnVisibility.assignee && <TableHead className="w-[150px]">Assignee</TableHead>}
//                                             {columnVisibility.date && <TableHead className="w-[150px]">Received Date</TableHead>}
//                                             {columnVisibility.status && <TableHead className="w-[150px] text-center">Status</TableHead>}
//                                             {columnVisibility.other && <TableHead className="w-[250px]">Cheque no /Money Order No</TableHead>}
//                                             {/* Actions column — always visible */}
//                                             <TableHead className="w-[80px] text-center">Actions</TableHead>
//                                         </TableRow>
//                                     </TableHeader>
//                                     {isLoading ? (
//                                         <TableBody>
//                                             <TableRow>
//                                                 <TableCell colSpan={10} className="h-80 text-center p-0">
//                                                     <div className="w-full flex flex-col items-center justify-center py-8">
//                                                         <div className="flex items-center justify-center space-x-2">
//                                                             <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//                                                             <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//                                                             <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
//                                                         </div>
//                                                         <p className="text-sm text-muted-foreground mt-4">Loading letter data...</p>
//                                                     </div>
//                                                 </TableCell>
//                                             </TableRow>
//                                         </TableBody>
//                                     ) : letters.length > 0 ? (
//                                         <TableBody>
//                                             {letters.map((item, index) => (
//                                                 <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
//                                                     {columnVisibility.id && (
//                                                         <TableCell className="text-center w-[50px]">
//                                                             {(currentPage - 1) * pageSize + index + 1}
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.code && (
//                                                         <TableCell className="w-[150px]">
//                                                             <div className="truncate max-w-[150px]">{item.code}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.title && (
//                                                         <TableCell className="w-[250px]">
//                                                             <div className="truncate max-w-[250px]">{item.subject}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.organization && (
//                                                         <TableCell className="w-[250px]">
//                                                             <div className="truncate max-w-[250px]">{item.organization || "—"}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.department && (
//                                                         <TableCell className="w-[250px]">
//                                                             <div className="truncate max-w-[250px]">{item?.department || "—"}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.assignee && (
//                                                         <TableCell className="w-[150px]">
//                                                             <div className="truncate max-w-[150px]">{item?.assignee || "—"}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.date && (
//                                                         <TableCell className="w-[150px]">
//                                                             <div className="truncate max-w-[150px]">{formatDate(item.create_datetime)}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.status && (
//                                                         <TableCell className="text-center w-[150px]">
//                                                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(item.status)}`}>
//                                                                 {item?.status || "No Status"}
//                                                                 {typeof item.status_days === 'number' && (
//                                                                     <span className="ml-1 opacity-75">· {item.status_days}d</span>
//                                                                 )}
//                                                             </span>
//                                                         </TableCell>
//                                                     )}
//                                                     {columnVisibility.other && (
//                                                         <TableCell className="w-[250px]">
//                                                             <div className="truncate max-w-[250px]">{item.other || "—"}</div>
//                                                         </TableCell>
//                                                     )}
//                                                     {/* Actions cell */}
//                                                     <TableCell className="text-center w-[80px]">
//                                                         <Button
//                                                             variant="ghost"
//                                                             size="icon"
//                                                             className="h-8 w-8 text-muted-foreground hover:text-foreground"
//                                                             onClick={() => router.push(`/letters/${item.id}`)}
//                                                             aria-label={`View letter ${item.code}`}
//                                                         >
//                                                             <Eye className="h-4 w-4"/>
//                                                         </Button>
//                                                     </TableCell>
//                                                 </TableRow>
//                                             ))}
//                                         </TableBody>
//                                     ) : (
//                                         <TableBody>
//                                             <TableRow>
//                                                 <TableCell colSpan={10} className="h-90 text-center">
//                                                     <div className="flex flex-col items-center justify-center py-6">
//                                                         <MailSearch className="h-10 w-10 text-muted-foreground/40 mb-2"/>
//                                                         <p className="text-sm text-muted-foreground">No letters found</p>
//                                                         {showFilters && (
//                                                             <Button
//                                                                 variant="link"
//                                                                 size="sm"
//                                                                 className="mt-2"
//                                                                 onClick={() => {
//                                                                     setInputFilters(initialFilters);
//                                                                     setCurrentPage(1);
//                                                                 }}
//                                                             >
//                                                                 Clear all filters
//                                                             </Button>
//                                                         )}
//                                                     </div>
//                                                 </TableCell>
//                                             </TableRow>
//                                         </TableBody>
//                                     )}
//                                 </Table>
//                             </div>
//                         </div>

//                         {/* Pagination */}
//                         <div className="flex items-center justify-between">
//                             <div className="flex items-center space-x-2">
//                                 <span className="text-sm text-muted-foreground">Total {totalRows}</span>
//                                 <span className="text-sm text-muted-foreground">Entries Per Page</span>
//                                 <Select
//                                     value={pageSize.toString()}
//                                     onValueChange={(value) => {
//                                         setPageSize(Number(value));
//                                         setCurrentPage(1);
//                                     }}
//                                 >
//                                     <SelectTrigger className="h-8 w-[70px]">
//                                         <SelectValue placeholder={pageSize}/>
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                         {pageSizeOptions.map((size) => (
//                                             <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                                 <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
//                             </div>
//                             <div className="flex items-center space-x-2">
//                                 <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
//                                     <ChevronsLeft className="h-4 w-4"/>
//                                 </Button>
//                                 <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
//                                     <ChevronLeft className="h-4 w-4"/>
//                                 </Button>
//                                 {generatePageNumbers().map((pageNumber) => (
//                                     <Button
//                                         key={pageNumber}
//                                         variant={currentPage === pageNumber ? "default" : "outline"}
//                                         size="icon"
//                                         onClick={() => setCurrentPage(pageNumber)}
//                                     >
//                                         {pageNumber}
//                                     </Button>
//                                 ))}
//                                 <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
//                                     <ChevronRight className="h-4 w-4"/>
//                                 </Button>
//                                 <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
//                                     <ChevronsRight className="h-4 w-4"/>
//                                 </Button>
//                             </div>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             <ExportModal
//                 isOpen={showExportModal}
//                 onCloseAction={() => setShowExportModal(false)}
//                 departments={departments.map((d) => d.name)}
//                 assignees={assignees.map((a) => a.name)}
//                 statuses={statuses.map((s) => s.name)}
//             />
//         </div>
//     );
// }



'use client';

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleAlert,
    Clock,
    Download,
    Eye,
    Filter,
    MailCheck,
    MailPlus,
    MailSearch,
    RotateCw,
    Settings2,
    Trash2,
    X,
} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {DatePickerWithRange} from "@/components/date-picker-with-range";
import {InsertLetterModal} from "@/app/(dashboard)/letters/insert-letter-modal";
import {ExportModal} from "@/app/(dashboard)/letters/export-modal";
import {DeleteLetterAlert} from "@/app/(dashboard)/letters/delete-letter-alert";
import {useDebounce} from "@/hook/debounce";
import {formatDate} from "@/lib/utils";
import api from "@/lib/api";
import {useAuthStore} from "@/store/auth-store";

// Interfaces
interface Department {
    id: number;
    name: string;
}

interface Status {
    id: number;
    name: string;
}

interface Assignee {
    id: number;
    name: string;
}

interface Organization {
    id: number;
    name: string;
}

interface Letter {
    id: number;
    code: string;
    subject: string;
    organization: string;
    department: string;
    assignee: string;
    create_datetime: string;
    status: string;
    status_days?: number | null;   // NEW
    other?: string;
}

interface LetterFilters {
    id: number;
    code: string;
    subject: string;
    department_id: number;
    assignee_id: number;
    status_id: number;
    organization_id: number;
    create_date_start: string | null;
    create_date_end: string | null;
    other: string;
}

interface ColumnVisibility {
    id: boolean;
    code: boolean;
    title: boolean;
    organization: boolean;
    department: boolean;
    assignee: boolean;
    date: boolean;
    status: boolean;
    other: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    total?: number;
    total_pages?: number;
}

// NOTE: `status_id` is still returned by the API for filtering purposes,
// but we now match cards by `status` (the human-readable name) instead of
// assuming a fixed id -> meaning mapping (that assumption was wrong: id 2
// is "Forwarded" in this system, not "Assigned").
interface LetterStat {
    status_id: number;
    count: number;
    status_name: string;
}

const pageSizeOptions = [5, 10, 20, 50];

const initialFilters: LetterFilters = {
    id: 0,
    code: "",
    subject: "",
    department_id: 0,
    assignee_id: 0,
    status_id: 0,
    organization_id: 0,
    create_date_start: null,
    create_date_end: null,
    other: "",
};

const initialColumnVisibility: ColumnVisibility = {
    id: true,
    code: true,
    title: true,
    organization: true,
    department: false,
    assignee: false,
    date: true,
    status: true,
    other: false,
};

export default function LetterDashboard() {
    const router = useRouter();
    const [showExportModal, setShowExportModal] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [inputFilters, setInputFilters] = useState<LetterFilters>(initialFilters);
    const debouncedFilters = useDebounce(inputFilters, 500);
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(initialColumnVisibility);
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [letterStats, setLetterStats] = useState<LetterStat[]>([]);
    const {hasPermission} = useAuthStore();

    // Delete dialog state
    const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    useEffect(() => {
        const fetchDropdownData = async (): Promise<void> => {
            try {
                const [deptResponse, statusResponse, assigneeResponse, orgResponse] = await Promise.all([
                    api.get('/v1/department/list'),
                    api.get('/v1/status/list'),
                    api.get('/v1/system_user/names'),
                    api.get('/v1/organization/list')
                ]);

                const [deptData, statusData, assigneeData, orgData] = await Promise.all([
                    deptResponse.data,
                    statusResponse.data,
                    assigneeResponse.data,
                    orgResponse.data
                ]);

                if (deptData.success) setDepartments(deptData.data);
                if (statusData.success) setStatuses(statusData.data);
                if (assigneeData.success) setAssignees(assigneeData.data);
                if (orgData.success) setOrganizations(orgData.data);

            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                toast.error(error.response?.data.message || 'Something went wrong. Please try again');
            }
        };

        fetchDropdownData().catch((err) =>
            console.error("Unhandled error in fetchDropdownData", err)
        );
    }, []);

    const fetchLetterStats = useCallback(async () => {
        const response = await api.get('/v1/letter/stats/');
        return await response.data;
    }, []);

    const fetchLettersFromApi = useCallback(
        async (
            page: number,
            pageSize: number,
            filters: Partial<LetterFilters>
        ): Promise<ApiResponse<Letter[]>> => {
            const response = await api.post(
                `/v1/letter/list?page=${page}&page_size=${pageSize}`, filters
            );
            return await response.data;
        }, []);

    const loadLetters = useCallback(async (): Promise<void> => {
        const filters: Partial<LetterFilters> = {
            id: debouncedFilters.id || 0,
            code: debouncedFilters.code || "",
            subject: debouncedFilters.subject || "",
            organization_id: debouncedFilters.organization_id || 0,
            department_id: debouncedFilters.department_id || 0,
            assignee_id: debouncedFilters.assignee_id || 0,
            status_id: debouncedFilters.status_id || 0,
            create_date_start: debouncedFilters.create_date_start || null,
            create_date_end: debouncedFilters.create_date_end || null,
            other: debouncedFilters.other || "",
        };

        try {
            setIsLoading(true);

            const [lettersResponse, statsResponse] = await Promise.all([
                fetchLettersFromApi(currentPage, pageSize, filters),
                fetchLetterStats()
            ]);

            setLetters(lettersResponse.data);
            setTotalPages(lettersResponse.total_pages || 0);
            setTotalRows(lettersResponse.total || 0);
            // NOTE: previously this did `.slice(0, 4)`, which silently dropped
            // any status beyond the first 4 returned by the API and made the
            // cards depend on array order rather than status name. We now keep
            // the full list and look up each card's count by status name below.
            setLetterStats(statsResponse.data);

            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching letters", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        }
    }, [currentPage, debouncedFilters, pageSize, fetchLettersFromApi, fetchLetterStats]);

    useEffect(() => {
        loadLetters().catch((err) =>
            console.error("Unhandled error in loadLetters", err)
        );
    }, [loadLetters, refreshTrigger]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilters]);

    const handleRefresh = (): void => {
        setRefreshTrigger(prev => !prev);
    };

    const generatePageNumbers = (): number[] => {
        const pageNumbers: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return pageNumbers;
    };

    const clearFilter = (filterName: keyof LetterFilters): void => {
        setInputFilters(prev => ({
            ...prev,
            [filterName]: filterName.includes('date')
                ? null
                : (typeof prev[filterName] === 'string' ? '' : 0)
        }));
    };

    const handleFilters = (): void => {
        if (showFilters) {
            setInputFilters(initialFilters);
        }
        setShowFilters(!showFilters);
    };

    const getStatusClassName = (status: string): string => {
        if (status === 'New') return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200';
        if (status === 'Assigned') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
        if (status === 'Forwarded') return 'bg-orange-100 text-yellow-800 dark:bg-orange-800 dark:text-yellow-200';
        if (status === 'In Progress') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
        if (status === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
        if (status === null) return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
    };

    // Look up a stat card's count by the status's human-readable name rather
    // than assuming a fixed status_id. This is resilient to status ids being
    // reordered/renamed in the `status` table.
    const getStatCount = (statusName: string): number => {
        const stat = letterStats.find(
            (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
        );
        return stat?.count ?? 0;
    };

    // Clicking a stat card filters the table by that status. We resolve the
    // status_id from the fetched stats (falling back to the `statuses`
    // dropdown list, in case a status currently has zero letters and so
    // doesn't appear in letterStats) instead of hardcoding an id.
    const handleStatsClick = (statusName: string): void => {
        const stat = letterStats.find(
            (s) => s.status_name?.toLowerCase() === statusName.toLowerCase()
        );
        const fallback = statuses.find(
            (s) => s.name?.toLowerCase() === statusName.toLowerCase()
        );
        const statusId = stat?.status_id ?? fallback?.id;
        if (!statusId) return;

        !showFilters && setShowFilters(true);
        setInputFilters((prev) => ({
            ...prev,
            status_id: statusId,
        }));
    };

    // Open the confirmation dialog for a specific letter
    const handleDeleteClick = (letter: Letter): void => {
        setLetterToDelete(letter);
    };

    // Close the confirmation dialog (unless a delete is in progress)
    const handleDeleteDialogClose = (): void => {
        if (isDeleting) return;
        setLetterToDelete(null);
    };

    // Confirm deletion: call the API, then refresh the list
    const handleDeleteConfirm = async (): Promise<void> => {
        if (!letterToDelete) return;

        try {
            setIsDeleting(true);
            await api.delete(`/v1/letter/${letterToDelete.id}`);
            toast.success(`Letter ${letterToDelete.code} deleted successfully`);
            setLetterToDelete(null);

            // If we just deleted the last row on this page, step back a page
            if (letters.length === 1 && currentPage > 1) {
                setCurrentPage((prev) => prev - 1);
            } else {
                handleRefresh();
            }
        } catch (error) {
            console.error("Error deleting letter", error);
            toast.error(error.response?.data.message || 'Something went wrong. Please try again');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Letter Management</h1>
                    <p className="text-muted-foreground">
                        Define and track all incoming and outgoing correspondence. Easily manage the flow of letters
                        across departments and organizations
                    </p>
                </div>
                <InsertLetterModal
                    organizations={organizations}
                    onOrganizationAdded={(newOrg) => setOrganizations(prev => [...prev, newOrg])}
                    onSuccess={handleRefresh}
                />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleStatsClick("New")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New</CardTitle>
                        <MailPlus className="h-4 w-4 text-blue-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("New")}</div>
                                <p className="text-xs text-muted-foreground">Newly Created</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleStatsClick("Forwarded")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                        <MailCheck className="h-4 w-4 text-amber-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("Forwarded")}</div>
                                <p className="text-xs text-muted-foreground">Forwarded</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => handleStatsClick("In Progress")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-green-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("In Progress")}</div>
                                <p className="text-xs text-muted-foreground">Work Ongoing</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${
                        getStatCount("Rejected") > 0
                            ? "bg-rose-300 dark:bg-rose-800 animate-pulse border-red-200"
                            : ""
                    }`}
                    onClick={() => handleStatsClick("Rejected")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <CircleAlert className="h-4 w-4 text-red-600"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse"></div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{getStatCount("Rejected")}</div>
                                <p className="text-xs text-muted-foreground">Request Denied</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Letters List</CardTitle>
                        <CardDescription>A comprehensive list of all letters in the system</CardDescription>
                    </div>
                    {!isLoading && (
                        <div className="flex space-x-2">
                            <Button size="icon" variant="outline" onClick={handleRefresh} aria-label="Refresh">
                                <RotateCw className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleFilters}
                                className={showFilters ? "bg-gray-100 dark:bg-gray-900" : ""}
                                aria-label="Filter"
                            >
                                <Filter className="h-4 w-4"/>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowExportModal(true)}
                                aria-label="Export"
                                disabled={!hasPermission('letter.xdownload')}
                            >
                                <Download className="h-4 w-4"/>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" aria-label="Column Settings">
                                        <Settings2 className="h-4 w-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {Object.entries({
                                        id: "ID",
                                        code: "Code",
                                        title: "Subject/Content of the Letter",
                                        organization: "Sender/Organization of the letter",
                                        department: "Department",
                                        assignee: "Assignee",
                                        date: "Received Date",
                                        status: "Status",
                                        other: "Other",
                                    }).map(([key, label]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={columnVisibility[key as keyof ColumnVisibility]}
                                            onCheckedChange={(checked) =>
                                                setColumnVisibility((prev) => ({...prev, [key]: checked}))
                                            }
                                        >
                                            {label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            {showFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                                    {columnVisibility.id && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by ID..."
                                                value={inputFilters.id === 0 ? "" : inputFilters.id}
                                                onChange={(e) => setInputFilters(prev => ({
                                                    ...prev,
                                                    id: parseInt(e.target.value) || 0
                                                }))}
                                                className="w-full"
                                                type="number"
                                                aria-label="Search by ID"
                                            />
                                            {inputFilters.id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('id')} aria-label="Clear ID filter">
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.code && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Code..."
                                                value={inputFilters.code}
                                                onChange={(e) => setInputFilters(prev => ({...prev, code: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Code"
                                            />
                                            {inputFilters.code && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('code')} aria-label="Clear Code filter">
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.title && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Subject/Content of the Letter..."
                                                value={inputFilters.subject}
                                                onChange={(e) => setInputFilters(prev => ({...prev, subject: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Subject/Content of the Letter"
                                            />
                                            {inputFilters.subject && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('subject')} aria-label="Clear  Subject/Content of the Letter filter">
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.organization && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.organization_id !== 0 ? inputFilters.organization_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    organization_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a Sender/Organization"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {organizations.map((org) => (
                                                        <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.organization_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('organization_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.department && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.department_id !== 0 ? inputFilters.department_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    department_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a Department"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((dept) => (
                                                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.department_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('department_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.assignee && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.assignee_id !== 0 ? inputFilters.assignee_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    assignee_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select an Assignee"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {assignees.map((a) => (
                                                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.assignee_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('assignee_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.date && (
                                        <div>
                                            <DatePickerWithRange
                                                date={{
                                                    from: inputFilters.create_date_start ? new Date(inputFilters.create_date_start) : undefined,
                                                    to: inputFilters.create_date_end ? new Date(inputFilters.create_date_end) : undefined,
                                                }}
                                                onChange={(range) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    create_date_start: range?.from ? new Date(range.from).toISOString() : null,
                                                    create_date_end: range?.to ? new Date(range.to).toISOString() : null,
                                                }))}
                                            />
                                        </div>
                                    )}
                                    {columnVisibility.status && (
                                        <div className="relative">
                                            <Select
                                                value={inputFilters.status_id !== 0 ? inputFilters.status_id.toString() : ""}
                                                onValueChange={(value) => setInputFilters((prev) => ({
                                                    ...prev,
                                                    status_id: parseInt(value) || 0,
                                                }))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a Status"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {inputFilters.status_id !== 0 && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('status_id')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {columnVisibility.other && (
                                        <div className="relative">
                                            <Input
                                                placeholder="Search by Cheque no /Money Order No..."
                                                value={inputFilters.other}
                                                onChange={(e) => setInputFilters(prev => ({...prev, other: e.target.value}))}
                                                className="w-full"
                                                aria-label="Search by Other"
                                            />
                                            {inputFilters.other && (
                                                <Button variant="ghost" size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                                    onClick={() => clearFilter('other')}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="rounded-md border">
                                <Table className="overflow-x-auto min-w-max w-full mb-2">
                                    <TableHeader>
                                        <TableRow>
                                            {columnVisibility.id && <TableHead className="w-[50px] text-center">ID</TableHead>}
                                            {columnVisibility.code && <TableHead className="w-[150px]">Code</TableHead>}
                                             {columnVisibility.organization && <TableHead className="w-[250px]">Sender/Organization of the letter</TableHead>}
                                            {columnVisibility.title && <TableHead className="w-[250px]">Subject/Content of the Letter</TableHead>}
                                            {columnVisibility.department && <TableHead className="w-[250px]">Department</TableHead>}
                                            {columnVisibility.assignee && <TableHead className="w-[150px]">Assignee</TableHead>}
                                            {columnVisibility.date && <TableHead className="w-[150px]">Received Date</TableHead>}
                                            {columnVisibility.status && <TableHead className="w-[150px] text-center">Status</TableHead>}
                                            {columnVisibility.other && <TableHead className="w-[250px]">Cheque no /Money Order No</TableHead>}
                                            {/* Actions column — always visible */}
                                            <TableHead className="w-[100px] text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {isLoading ? (
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-80 text-center p-0">
                                                    <div className="w-full flex flex-col items-center justify-center py-8">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                            <div className="h-4 w-4 bg-primary/60 rounded-full animate-bounce"></div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-4">Loading letter data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    ) : letters.length > 0 ? (
                                        <TableBody>
                                            {letters.map((item, index) => (
                                                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    {columnVisibility.id && (
                                                        <TableCell className="text-center w-[50px]">
                                                            {(currentPage - 1) * pageSize + index + 1}
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.code && (
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{item.code}</div>
                                                        </TableCell>
                                                    )}
                                                    
                                                    {columnVisibility.organization && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item.organization || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.title && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item.subject}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.department && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item?.department || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.assignee && (
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{item?.assignee || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.date && (
                                                        <TableCell className="w-[150px]">
                                                            <div className="truncate max-w-[150px]">{formatDate(item.create_datetime)}</div>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.status && (
                                                        <TableCell className="text-center w-[150px]">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClassName(item.status)}`}>
                                                                {item?.status || "No Status"}
                                                                {typeof item.status_days === 'number' && (
                                                                    <span className="ml-1 opacity-75">· {item.status_days}d</span>
                                                                )}
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    {columnVisibility.other && (
                                                        <TableCell className="w-[250px]">
                                                            <div className="truncate max-w-[250px]">{item.other || "—"}</div>
                                                        </TableCell>
                                                    )}
                                                    {/* Actions cell */}
                                                    <TableCell className="text-center w-[100px]">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => router.push(`/letters/${item.id}`)}
                                                                aria-label={`View letter ${item.code}`}
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
                                                            {hasPermission('letter.delete') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => handleDeleteClick(item)}
                                                                    aria-label={`Delete letter ${item.code}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    ) : (
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-90 text-center">
                                                    <div className="flex flex-col items-center justify-center py-6">
                                                        <MailSearch className="h-10 w-10 text-muted-foreground/40 mb-2"/>
                                                        <p className="text-sm text-muted-foreground">No letters found</p>
                                                        {showFilters && (
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() => {
                                                                    setInputFilters(initialFilters);
                                                                    setCurrentPage(1);
                                                                }}
                                                            >
                                                                Clear all filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    )}
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">Total {totalRows}</span>
                                <span className="text-sm text-muted-foreground">Entries Per Page</span>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={(value) => {
                                        setPageSize(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder={pageSize}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pageSizeOptions.map((size) => (
                                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                    <ChevronsLeft className="h-4 w-4"/>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4"/>
                                </Button>
                                {generatePageNumbers().map((pageNumber) => (
                                    <Button
                                        key={pageNumber}
                                        variant={currentPage === pageNumber ? "default" : "outline"}
                                        size="icon"
                                        onClick={() => setCurrentPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </Button>
                                ))}
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4"/>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                    <ChevronsRight className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ExportModal
                isOpen={showExportModal}
                onCloseAction={() => setShowExportModal(false)}
                departments={departments.map((d) => d.name)}
                assignees={assignees.map((a) => a.name)}
                statuses={statuses.map((s) => s.name)}
            />

            <DeleteLetterAlert
                isOpen={!!letterToDelete}
                onClose={handleDeleteDialogClose}
                onConfirm={handleDeleteConfirm}
                letterCode={letterToDelete?.code || ""}
                isDeleting={isDeleting}
            />
        </div>
    );
}