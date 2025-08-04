import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Vote as VoteIcon, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Issue {
  id: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  vote_count?: number;
  user_voted?: boolean;
}

const Vote = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('votes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes'
        },
        () => {
          fetchIssues(); // Refresh issues when new votes come in
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchIssues = async () => {
    try {
      // Get issues with vote counts using raw SQL to avoid type issues
      const { data: issuesData, error: issuesError } = await (supabase as any)
        .from('issues')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      // Get vote counts for each issue
      const issuesWithCounts = await Promise.all(
        (issuesData || []).map(async (issue: any) => {
          const { count } = await (supabase as any)
            .from('votes')
            .select('*', { count: 'exact' })
            .eq('issue_id', issue.id);

          const userVoted = user ? await (supabase as any)
            .from('votes')
            .select('id')
            .eq('user_id', user.id)
            .eq('issue_id', issue.id)
            .single() : null;

          return {
            ...issue,
            vote_count: count || 0,
            user_voted: !!userVoted?.data
          };
        })
      );

      setIssues(issuesWithCounts);
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

  const handleVote = async (issueId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to vote",
        variant: "destructive",
      });
      return;
    }

    setVoting(issueId);
    
    try {
      const { error } = await (supabase as any)
        .from('votes')
        .insert([{
          user_id: user.id,
          issue_id: issueId
        }]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already voted",
            description: "You have already voted on this issue",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Vote recorded!",
          description: "Your vote has been successfully recorded",
        });
        fetchIssues(); // Refresh to show updated counts
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive",
      });
    } finally {
      setVoting(null);
    }
  };

  const totalVotes = issues.reduce((sum, issue) => sum + (issue.vote_count || 0), 0);
  const resolvedIssues = issues.filter(issue => issue.is_resolved).length;

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
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Vote on <span className="text-primary">Community Issues</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your voice matters. Vote on the issues that affect your community the most.
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <VoteIcon className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{totalVotes}</div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{issues.length}</div>
              <div className="text-sm text-muted-foreground">Active Issues</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{resolvedIssues}</div>
              <div className="text-sm text-muted-foreground">Resolved Issues</div>
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        <div className="max-w-4xl mx-auto space-y-6">
          {issues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{issue.title}</CardTitle>
                    {issue.description && (
                      <CardDescription className="text-base">
                        {issue.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={issue.is_resolved ? "default" : "secondary"}>
                      {issue.is_resolved ? "Resolved" : "Active"}
                    </Badge>
                    {issue.user_voted && (
                      <Badge variant="outline" className="text-primary border-primary">
                        Voted
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{issue.vote_count || 0} votes</span>
                    </div>
                    
                    {totalVotes > 0 && (
                      <div className="flex-1 max-w-xs">
                        <Progress 
                          value={((issue.vote_count || 0) / totalVotes) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleVote(issue.id)}
                    disabled={!user || issue.user_voted || voting === issue.id || issue.is_resolved}
                    variant={issue.user_voted ? "outline" : "default"}
                    className="ml-4"
                  >
                    {voting === issue.id ? (
                      "Voting..."
                    ) : issue.user_voted ? (
                      "Voted"
                    ) : !user ? (
                      "Login to Vote"
                    ) : issue.is_resolved ? (
                      "Resolved"
                    ) : (
                      "Vote"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {issues.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <VoteIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No issues found</h3>
                <p className="text-muted-foreground">
                  No community issues are currently available for voting.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {!user && (
          <div className="text-center mt-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Want to vote?</h3>
                <p className="text-muted-foreground mb-4">
                  Sign up to participate in community voting and make your voice heard.
                </p>
                <Button variant="accent" className="w-full">
                  Sign Up to Vote
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Vote;