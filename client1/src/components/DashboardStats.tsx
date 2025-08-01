import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Activity,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  refreshTrigger?: number;
}

interface StatsData {
  summary: {
    total: number;
    pending: number;
    scanning: number;
    clean: number;
    infected: number;
    scanned: number;
  };
  queue: {
    messageCount: number;
    consumerCount: number;
  };
  recentActivity: Array<{
    id: string;
    filename: string;
    status: string;
    result?: string;
    uploadedAt: string;
    scannedAt?: string;
  }>;
}

export const DashboardStats = ({ refreshTrigger }: DashboardStatsProps) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Files',
      value: stats.summary.total,
      icon: FileText,
      className: 'text-foreground',
      bgClassName: 'bg-card',
    },
    {
      title: 'Clean Files',
      value: stats.summary.clean,
      icon: Shield,
      className: 'text-success',
      bgClassName: 'bg-success/10',
    },
    {
      title: 'Threats Detected',
      value: stats.summary.infected,
      icon: AlertTriangle,
      className: 'text-destructive',
      bgClassName: 'bg-destructive/10',
    },
    {
      title: 'Pending Scans',
      value: stats.summary.pending + stats.summary.scanning,
      icon: Clock,
      className: 'text-pending',
      bgClassName: 'bg-pending/10',
    },
  ];

  const scanProgress = stats.summary.total > 0 
    ? (stats.summary.scanned / stats.summary.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={cn("transition-all hover:glow-primary", stat.bgClassName)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className={cn("text-3xl font-bold", stat.className)}>
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", stat.bgClassName)}>
                  <stat.icon className={cn("h-6 w-6", stat.className)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scan Progress & Queue Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Scan Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{scanProgress.toFixed(1)}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Scanned</p>
                  <p className="font-semibold text-foreground">{stats.summary.scanned}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold text-foreground">
                    {stats.summary.pending + stats.summary.scanning}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-2xl font-bold text-success">{stats.summary.clean}</p>
                  <p className="text-sm text-success">Clean</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-2xl font-bold text-destructive">{stats.summary.infected}</p>
                  <p className="text-sm text-destructive">Threats</p>
                </div>
              </div>
              
              {stats.summary.scanning > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Loader2 className="h-4 w-4 text-warning animate-spin" />
                  <span className="text-sm text-warning">
                    {stats.summary.scanning} file(s) currently scanning
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};