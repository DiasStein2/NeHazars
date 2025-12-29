import { useNavigate } from "react-router-dom";
import { FileUploader } from "@/components/FileUploader";
import { apiService } from "@/services/api";
import { toast } from "@/hooks/use-toast";

export default function Upload() {
  const navigate = useNavigate();

  const handleUpload = async (files: File[]) => {
    try {
      const response = await apiService.uploadFile(files);
      
      if (response.success) {
        const fileCount = files.length;
        toast({
          title: "Upload successful",
          description:
            fileCount > 1
              ? `${fileCount} files have been processed.`
              : `${response.fileName} has been processed.`,
        });

        // Navigate to analytics with the file ID
        setTimeout(() => {
          navigate(`/analytics?fileId=${response.fileId}`);
        }, 500);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div className="mb-10 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              Upload Your Telegram Exports
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Drop one or more Telegram HTML exports below to generate chat analytics.
            </p>
          </div>

          <FileUploader
            onUpload={handleUpload}
            acceptedTypes={[".html", ".htm"]}
            className="animate-slide-up"
          />

          <div
            className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">50MB</div>
              <div className="text-sm text-muted-foreground">Max file size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">HTML</div>
              <div className="text-sm text-muted-foreground">Export format</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">Fast</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
