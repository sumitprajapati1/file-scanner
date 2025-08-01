import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadComplete?: (file: any) => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadedFile(result.file);
      onUploadComplete?.(result.file);

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded and queued for scanning.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        if (uploadProgress === 100) {
          setUploadProgress(0);
          setUploadedFile(null);
        }
      }, 3000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading,
  });

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer",
            isDragActive && !isDragReject && "dropzone-active",
            isDragReject && "border-destructive bg-destructive/5",
            uploading && "pointer-events-none opacity-50",
            "border-border hover:border-accent hover:bg-accent/5"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="space-y-2 w-full max-w-xs">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="text-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </>
            ) : uploadedFile ? (
              <>
                <CheckCircle className="h-12 w-12 text-success glow-success" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-success">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedFile.filename} is now being scanned
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-2 w-2 bg-pending rounded-full animate-pulse" />
                    <span className="text-xs text-pending">Scan in progress...</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Upload className="h-12 w-12 text-primary" />
                  {isDragActive && (
                    <div className="absolute inset-0 animate-pulse">
                      <Upload className="h-12 w-12 text-accent" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {isDragActive ? 'Drop file here' : 'Upload File for Scanning'}
                  </h3>
                  <p className="text-muted-foreground">
                    Drag & drop or click to select a file
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports: PDF, DOCX, JPG, PNG (Max 5MB)
                  </p>
                </div>

                <Button variant="outline" className="mt-4">
                  <File className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
              </>
            )}

            {isDragReject && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">Invalid file type or size</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};