import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  Clock, 
  Loader2, 
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileData {
  id: string;
  filename: string;
  size: number;
  mimetype: string;
  status: 'pending' | 'scanning' | 'scanned';
  result?: 'clean' | 'infected';
  uploadedAt: string;
  scannedAt?: string;
}

interface FileListProps {
  refreshTrigger?: number;
  statusFilter?: string;
}

export const FileList = ({ refreshTrigger, statusFilter }: FileListProps) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'clean' || statusFilter === 'infected') {
          params.append('result', statusFilter);
        } else {
          params.append('status', statusFilter);
        }
      }

      const response = await fetch(`http://localhost:3000/api/files?${params}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      
      const data = await response.json();
      console.log('Received files data:', data.files);
      setFiles(data.files);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  const getStatusIcon = (status: string, result?: string) => {
    if (status === 'scanned' && result === 'clean') {
      return <Shield className="h-4 w-4 text-success" />;
    }
    if (status === 'scanned' && result === 'infected') {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (status === 'scanning') {
      return <Loader2 className="h-4 w-4 text-warning animate-spin" />;
    }
    return <Clock className="h-4 w-4 text-pending" />;
  };

  const getStatusBadge = (status: string, result?: string) => {
    if (status === 'scanned' && result === 'clean') {
      return <Badge className="status-clean">Clean</Badge>;
    }
    if (status === 'scanned' && result === 'infected') {
      return <Badge className="status-infected">Infected</Badge>;
    }
    if (status === 'scanning') {
      return <Badge className="status-scanning">Scanning</Badge>;
    }
    return <Badge className="status-pending">Pending</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = async (fileId: string, filename: string) => {
    console.log(`Delete request for file: ${filename}, ID: "${fileId}" (type: ${typeof fileId})`);
    
    // Validate fileId before making the request
    if (!fileId || fileId === 'undefined' || fileId === 'null') {
      console.error(`Invalid file ID detected: "${fileId}"`);
      toast({
        title: "Error",
        description: "Invalid file ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      
      setFiles(files.filter(file => file.id !== fileId));
      toast({
        title: "File Deleted",
        description: `${filename} has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Files Found</h3>
          <p className="text-muted-foreground">
            {statusFilter && statusFilter !== 'all' 
              ? `No files with status "${statusFilter}" found.`
              : 'Upload your first file to get started with security scanning.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Uploaded Files
          <Badge variant="outline">{pagination?.totalFiles || files.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {files.map((file, index) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors",
                index < files.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getStatusIcon(file.status, file.result)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground truncate">
                      {file.filename}
                    </h4>
                    {getStatusBadge(file.status, file.result)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>
                      Uploaded {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
                    </span>
                    {file.scannedAt && (
                      <>
                        <span>•</span>
                        <span>
                          Scanned {formatDistanceToNow(new Date(file.scannedAt), { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>

                  {file.status === 'scanning' && (
                    <div className="mt-2 relative h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="scan-line" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file.id, file.filename)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};