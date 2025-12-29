import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes?: string[];
  maxSize?: number;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function FileUploader({
  onUpload,
  acceptedTypes = ['.json', '.csv', '.txt'],
  maxSize = 50 * 1024 * 1024, // 50MB default
  className,
}: FileUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (file: File) => {
    setSelectedFile(file);
    setUploadState('uploading');
    setProgress(0);
    setError(null);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await onUpload(file);
      clearInterval(progressInterval);
      setProgress(100);
      setUploadState('success');
    } catch (err) {
      clearInterval(progressInterval);
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      if (type === '.json') acc['application/json'] = ['.json'];
      if (type === '.csv') acc['text/csv'] = ['.csv'];
      if (type === '.txt') acc['text/plain'] = ['.txt'];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: false,
    disabled: uploadState === 'uploading',
  });

  const reset = () => {
    setUploadState('idle');
    setProgress(0);
    setError(null);
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full max-w-xl mx-auto", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          "p-12 text-center",
          isDragActive && "border-primary bg-primary/5 scale-[1.02]",
          uploadState === 'idle' && !isDragActive && "border-border hover:border-primary/50 hover:bg-muted/30",
          uploadState === 'uploading' && "border-primary/30 bg-primary/5 cursor-default",
          uploadState === 'success' && "border-success bg-success/5",
          uploadState === 'error' && "border-destructive bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />

        {uploadState === 'idle' && (
          <div className="animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isDragActive ? 'Drop your file here' : 'Upload your file'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Drag and drop or click to browse
            </p>
            <Button variant="outline" size="sm" className="pointer-events-none">
              Choose File
            </Button>
            <p className="mt-6 text-xs text-muted-foreground">
              Supported: {acceptedTypes.join(', ')} • Max size: {formatFileSize(maxSize)}
            </p>
          </div>
        )}

        {uploadState === 'uploading' && selectedFile && (
          <div className="animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {selectedFile.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {formatFileSize(selectedFile.size)}
            </p>
            <div className="max-w-xs mx-auto">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          </div>
        )}

        {uploadState === 'success' && selectedFile && (
          <div className="animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload Complete!
            </h3>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <File className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload Failed
            </h3>
            <p className="text-sm text-destructive mb-4">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {fileRejections.length > 0 && (
        <p className="mt-3 text-sm text-destructive text-center animate-fade-in">
          {fileRejections[0].errors[0]?.message || 'Invalid file'}
        </p>
      )}
    </div>
  );
}
