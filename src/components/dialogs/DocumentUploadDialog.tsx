import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle2,
  Loader2,
  Eye,
  Download,
  Trash2,
} from "lucide-react";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (documents: UploadedDocument[]) => void;
  allowedTypes?: string[];
  maxFiles?: number;
  context?: 'application' | 'lease' | 'tenant' | 'property';
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  uploadedAt: Date;
  preview?: string;
}

const documentCategories = [
  { value: 'id', label: 'Identity Document', icon: '🪪' },
  { value: 'proof_of_income', label: 'Proof of Income', icon: '💰' },
  { value: 'bank_statement', label: 'Bank Statement', icon: '🏦' },
  { value: 'employment_letter', label: 'Employment Letter', icon: '📄' },
  { value: 'reference_letter', label: 'Reference Letter', icon: '✉️' },
  { value: 'lease', label: 'Lease Agreement', icon: '📋' },
  { value: 'inspection_report', label: 'Inspection Report', icon: '🏠' },
  { value: 'photo', label: 'Property Photo', icon: '📷' },
  { value: 'other', label: 'Other', icon: '📎' },
];

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  maxFiles = 5,
  context = 'application',
}: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (files.length + droppedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    // Create uploaded documents
    const newDocs: UploadedDocument[] = files.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      size: file.size,
      category: selectedCategory,
      uploadedAt: new Date(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setUploadedDocs(prev => [...prev, ...newDocs]);
    setFiles([]);
    setUploading(false);
    setUploadProgress(0);

    toast.success(`${newDocs.length} document(s) uploaded successfully`);
  };

  const handleComplete = () => {
    onUploadComplete?.(uploadedDocs);
    onOpenChange(false);
    setFiles([]);
    setUploadedDocs([]);
  };

  const removeUploadedDoc = (id: string) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload and categorize documents for this {context}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Document Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              "hover:border-accent hover:bg-accent/5",
              files.length > 0 ? "border-accent bg-accent/5" : "border-border"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Images, Word documents (max {maxFiles} files)
            </p>
          </div>

          {/* Selected Files Preview */}
          {files.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({files.length})</Label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file)}
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              <Button
                variant="accent"
                className="w-full"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.length} File(s)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Uploaded Documents */}
          {uploadedDocs.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Uploaded Documents ({uploadedDocs.length})
              </Label>
              <div className="grid gap-3">
                {uploadedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-success/20 bg-success/5"
                  >
                    <div className="flex items-center gap-3">
                      {doc.preview ? (
                        <img
                          src={doc.preview}
                          alt={doc.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {documentCategories.find(c => c.value === doc.category)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.preview && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewUrl(doc.preview!)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUploadedDoc(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleComplete}
            disabled={uploadedDocs.length === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Done ({uploadedDocs.length} uploaded)
          </Button>
        </DialogFooter>

        {/* Image Preview Modal */}
        {previewUrl && (
          <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <img
                src={previewUrl}
                alt="Document preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
