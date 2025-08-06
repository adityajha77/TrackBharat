import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Issue {
  id: string;
  title: string;
  is_resolved: boolean;
}

const Admin = () => {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('id, title, is_resolved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast({
        title: "Error",
        description: "Failed to load issues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResolved = async (issueId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ is_resolved: !currentStatus })
        .eq('id', issueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue status updated successfully",
      });
      fetchIssues(); // Refresh the list
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast({
        title: "Error",
        description: "Failed to update issue status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center">Loading issues...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-24">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel - Manage Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{issue.title}</span>
                  <div className="flex items-center gap-4">
                    <span>{issue.is_resolved ? 'Resolved' : 'Active'}</span>
                    <Switch
                      checked={issue.is_resolved}
                      onCheckedChange={() => handleToggleResolved(issue.id, issue.is_resolved)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
