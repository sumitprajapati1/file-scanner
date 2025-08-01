import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, Shield, AlertTriangle, Info } from 'lucide-react';

export default function Upload() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-cyber">
              <UploadIcon className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Secure File Upload</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your files for comprehensive malware scanning and security analysis. 
            Our advanced detection system will analyze your files for potential threats.
          </p>
        </div>

        {/* Security Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Files are encrypted during upload and stored securely
            </AlertDescription>
          </Alert>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Scanning typically completes within 2-5 seconds
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Infected files are quarantined automatically
            </AlertDescription>
          </Alert>
        </div>

        {/* Upload Component */}
        <FileUpload onUploadComplete={handleUploadComplete} />

        {/* Supported Formats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supported File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Documents</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• PDF files (.pdf)</li>
                  <li>• Word documents (.docx)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Images</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• JPEG images (.jpg, .jpeg)</li>
                  <li>• PNG images (.png)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning">
                <strong>Maximum file size:</strong> 5MB per file
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Uploads</h2>
          <FileList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </Layout>
  );
}