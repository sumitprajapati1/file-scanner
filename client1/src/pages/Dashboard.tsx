import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { DashboardStats } from '@/components/DashboardStats';
import { FileList } from '@/components/FileList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Filter } from 'lucide-react';
import cyberHeroBg from '@/assets/cyber-hero-bg.jpg';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div 
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{
          backgroundImage: `url(${cyberHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/40" />
        <div className="relative p-8 lg:p-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              CyberXplore Security Dashboard
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Advanced malware detection and file security scanning system. 
              Monitor, analyze, and protect your digital assets in real-time.
            </p>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleRefresh}
                className="bg-gradient-cyber hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <DashboardStats refreshTrigger={refreshTrigger} />

      {/* File List Section */}
      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Recent Files</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scanning">Scanning</SelectItem>
                  <SelectItem value="clean">Clean</SelectItem>
                  <SelectItem value="infected">Infected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <FileList refreshTrigger={refreshTrigger} statusFilter={statusFilter} />
      </div>
    </Layout>
  );
}