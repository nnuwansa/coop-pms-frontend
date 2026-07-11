'use client';

import {useState} from "react";
import {Download, Eye, FileText, Paperclip, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
 import api from "@/lib/api"; 
interface AttachmentPreviewProps {
    attachment: {
        id: number;
        title: string;
        filename?: string;
        url: string;
        file_size?: number | null;
    };
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const PDF_EXTENSIONS = ['pdf'];

const getExtension = (name: string): string => {
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const formatFileSize = (bytes?: number | null): string => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
};

export function AttachmentPreview({attachment}: AttachmentPreviewProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const nameForExt = attachment.filename || attachment.title || attachment.url;
    const ext = getExtension(nameForExt);
    const isImage = IMAGE_EXTENSIONS.includes(ext);
    const isPdf = PDF_EXTENSIONS.includes(ext);
    const isPreviewable = isImage || isPdf;

    // const handleDownload = async (e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     try {
    //         const response = await fetch(attachment.url);
    //         const blob = await response.blob();
    //         const blobUrl = window.URL.createObjectURL(blob);
    //         const link = document.createElement('a');
    //         link.href = blobUrl;
    //         link.download = attachment.title || 'download';
    //         document.body.appendChild(link);
    //         link.click();
    //         link.remove();
    //         window.URL.revokeObjectURL(blobUrl);
    //     } catch {
    //         // fallback: open in new tab if fetch/download fails (e.g. CORS)
    //         window.open(attachment.url, '_blank');
    //     }
    // };
   

const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        const res = await api.get(attachment.url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = attachment.title || 'download';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch {
        window.open(attachment.url, '_blank');
    }
};

    return (
        <>
            <div className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-md border text-sm bg-background hover:bg-muted transition-colors">
                <button
                    type="button"
                    onClick={() => isPreviewable ? setPreviewOpen(true) : window.open(attachment.url, '_blank')}
                    className="flex items-center gap-1.5 min-w-0"
                >
                    {isImage ? <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0"/> :
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>}
                    <span className="truncate max-w-[160px]">{attachment.title}</span>
                    {attachment.file_size !== undefined && attachment.file_size !== null && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ({formatFileSize(attachment.file_size)})
                        </span>
                    )}
                </button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleDownload}
                    aria-label={`Download ${attachment.title}`}
                >
                    <Download className="h-3.5 w-3.5"/>
                </Button>
            </div>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <DialogTitle className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4"/>{attachment.title}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="mt-2">
                        {isImage && (
                            <img src={attachment.url} alt={attachment.title} className="w-full h-auto rounded-md border"/>
                        )}
                        {isPdf && (
                            <iframe src={attachment.url} className="w-full h-[75vh] rounded-md border" title={attachment.title}/>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4"/>Download
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default AttachmentPreview;