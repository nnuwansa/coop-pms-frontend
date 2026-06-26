// 'use client';

// import {useEffect, useState} from "react";
// import {Separator} from "@/components/ui/separator";
// import {
//     Building2, Calendar, Clock, FileText, Mail, MapPin,
//     Paperclip, Phone, Tag, User, Users, X
// } from "lucide-react";
// import {formatDate} from "@/lib/utils";
// import api from "@/lib/api";
// import {CORE_API_URL} from "@/lib/client-config";

// interface LetterDetail {
//     id: number;
//     code: string;
//     subject: string;
//     sender: string;
//     email: string;
//     telephone: string;
//     other: string;
//     received_datetime: string;
//     create_datetime: string;
//     source: {id: number; name: string} | null;
//     organization: {id: number; name: string} | null;
//     status: {id: number; name: string} | null;
//     attachments: {id: number; title: string; file_name: string; url: string}[];
//     remarks: {id: number; content: string; create_datetime: string; department: string; assignee: string}[];
//     assignees?: {id: number; name: string}[];
//     departments?: {id: number; name: string}[];
// }

// interface LetterDetailSheetProps {
//     letterId: number | null;
//     isOpen: boolean;
//     onClose: () => void;
//     getStatusClassName: (status: string) => string;
// }

// export function LetterDetailSheet({letterId, isOpen, onClose, getStatusClassName}: LetterDetailSheetProps) {
//     const [letter, setLetter] = useState<LetterDetail | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     useEffect(() => {
//         if (!letterId || !isOpen) return;

//         const fetchDetail = async () => {
//             setIsLoading(true);
//             try {
//                 const res = await api.get(`/v1/letter/${letterId}`);
//                 setLetter(res.data.data);
//             } catch (error) {
//                 console.error("Letter detail fetch error:", error);
//                 setLetter(null);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchDetail();
//     }, [letterId, isOpen]);

//     if (!isOpen) return null;

//     const Field = ({icon: Icon, label, value}: {
//         icon: React.ElementType;
//         label: string;
//         value: string | null | undefined
//     }) => {
//         if (!value) return null;
//         return (
//             <div className="flex gap-3">
//                 <div className="mt-0.5 flex-shrink-0">
//                     <Icon className="h-4 w-4 text-muted-foreground"/>
//                 </div>
//                 <div className="min-w-0">
//                     <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
//                     <p className="text-sm text-foreground break-words">{value}</p>
//                 </div>
//             </div>
//         );
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex justify-end">
//             <div className="fixed inset-0 bg-black/50" onClick={onClose}/>
//             <div className="relative z-50 h-full w-full max-w-lg bg-background border-l shadow-xl overflow-y-auto p-6">
//                 <button
//                     onClick={onClose}
//                     className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
//                 >
//                     <X className="h-4 w-4"/>
//                 </button>

//                 {isLoading ? (
//                     <div className="flex items-center justify-center h-full">
//                         <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"/>
//                     </div>
//                 ) : !letter ? (
//                     <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
//                         Failed to load letter details.
//                     </div>
//                 ) : (
//                     <div className="space-y-6 pt-2">

//                         {/* Header */}
//                         <div>
//                             <div className="flex items-center gap-2 mb-2 flex-wrap">
//                                 <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
//                                     {letter.code}
//                                 </span>
//                                 {letter.status && (
//                                     <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusClassName(letter.status.name)}`}>
//                                         {letter.status.name}
//                                     </span>
//                                 )}
//                             </div>
//                             <h2 className="text-base font-medium leading-snug">{letter.subject}</h2>
//                         </div>

//                         <Separator/>

//                         {/* Sender */}
//                         <div className="space-y-3">
//                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sender</p>
//                             <div className="space-y-3">
//                                 <Field icon={Building2} label="Organization" value={letter.organization?.name}/>
//                                 <Field icon={MapPin} label="Address" value={letter.sender}/>
//                                 <Field icon={Mail} label="Email" value={letter.email}/>
//                                 <Field icon={Phone} label="Telephone" value={letter.telephone}/>
//                             </div>
//                         </div>

//                         <Separator/>

//                         {/* Details */}
//                         <div className="space-y-3">
//                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
//                             <div className="space-y-3">
//                                 <Field icon={Tag} label="Source" value={letter.source?.name}/>
//                                 <Field icon={FileText} label="Other / Reference" value={letter.other}/>
//                                 <Field icon={Calendar} label="Received date"
//                                        value={letter.received_datetime ? formatDate(letter.received_datetime) : null}/>
//                                 <Field icon={Clock} label="Created"
//                                        value={letter.create_datetime ? formatDate(letter.create_datetime) : null}/>
//                             </div>
//                         </div>

//                         {/* Departments */}
//                         {letter.departments && letter.departments.length > 0 && (
//                             <div className="space-y-3">
//                                 <Separator/>
//                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departments</p>
//                                 <div className="flex flex-wrap gap-2">
//                                     {letter.departments.map((d) => (
//                                         <span
//                                             key={d.id}
//                                             className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
//                                         >
//                                             <Users className="h-3 w-3"/>
//                                             {d.name}
//                                         </span>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Assignees */}
//                         {letter.assignees && letter.assignees.length > 0 && (
//                             <div className="space-y-3">
//                                 <Separator/>
//                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignees</p>
//                                 <div className="flex flex-wrap gap-2">
//                                     {letter.assignees.map((a) => (
//                                         <span
//                                             key={a.id}
//                                             className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
//                                         >
//                                             <User className="h-3 w-3"/>
//                                             {a.name}
//                                         </span>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Attachments */}
//                         {letter.attachments && letter.attachments.length > 0 && (
//                             <div className="space-y-3">
//                                 <Separator/>
//                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
//                                     Attachments ({letter.attachments.length})
//                                 </p>
//                                 <div className="space-y-2">
//                                     {letter.attachments.map((attachment) => (
//                                         <a
//                                             key={attachment.id}
//                                             href={CORE_API_URL + attachment.url}
//                                             target="_blank"
//                                             rel="noreferrer"
//                                             className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted transition-colors text-sm"
//                                         >
//                                             <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
//                                             <span className="truncate">{attachment.title || attachment.file_name}</span>
//                                         </a>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Remarks */}
//                         {letter.remarks && letter.remarks.length > 0 && (
//                             <div className="space-y-3">
//                                 <Separator/>
//                                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
//                                     Remarks ({letter.remarks.length})
//                                 </p>
//                                 <div className="space-y-3">
//                                     {letter.remarks.map((remark) => (
//                                         <div key={remark.id}
//                                              className="p-3 rounded-md bg-muted/50 border space-y-1.5">
//                                             <p className="text-sm leading-relaxed">{remark.content}</p>
//                                             <div
//                                                 className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
//                                                 {remark.assignee && (
//                                                     <span className="flex items-center gap-1">
//                                                         <User className="h-3 w-3"/>{remark.assignee}
//                                                     </span>
//                                                 )}
//                                                 {remark.department && (
//                                                     <span className="flex items-center gap-1">
//                                                         <Users className="h-3 w-3"/>{remark.department}
//                                                     </span>
//                                                 )}
//                                                 <span>{formatDate(remark.create_datetime)}</span>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }
