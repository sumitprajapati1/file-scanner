import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { FileList } from '@/components/FileList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Search, Filter, RefreshCw } from 'lucide-react';

export default function Files() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, you would pass the search query to the FileList component
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-cyber">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">File Management</h1>
              <p className="text-muted-foreground">
                View, filter, and manage all uploaded files and their scan results
              </p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </form>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Status:
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
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

            {/* Active Filters Display */}
            {(statusFilter !== 'all' || searchQuery) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {statusFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className="h-7"
                  >
                    Status: {statusFilter}
                    <span className="ml-1">×</span>
                  </Button>
                )}
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-7"
                  >
                    Search: {searchQuery}
                    <span className="ml-1">×</span>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File List */}
        <FileList refreshTrigger={refreshTrigger} statusFilter={statusFilter} />

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-pending/10 border border-pending/20">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold text-pending">-</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm text-muted-foreground">Scanning</p>
                <p className="text-lg font-semibold text-warning">-</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm text-muted-foreground">Clean</p>
                <p className="text-lg font-semibold text-success">-</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground">Infected</p>
                <p className="text-lg font-semibold text-destructive">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}