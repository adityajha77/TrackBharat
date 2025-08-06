import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Issue {
  id: string;
  title: string;
  votes_count: number;
}

const SearchResults = () => {
  const { pincode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [topIssues, setTopIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        if (data && data[0] && data[0].PostOffice && data[0].PostOffice.length > 0) {
          setLocation(data[0].PostOffice[0]);
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      } finally {
        setLoading(false);
      }
    };

    if (pincode) {
      fetchLocation();
      fetchTopIssues();
    }
  }, [pincode]);

  const fetchTopIssues = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_top_issues');

      if (error) throw error;
      setTopIssues(data || []);
    } catch (error) {
      console.error('Error fetching top issues:', error);
    }
  };

  const handleVoteClick = () => {
    if (user) {
      navigate('/vote');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-24">
        {loading ? (
          <p>Loading...</p>
        ) : location ? (
          <>
            <Card className="mb-8 border-l-4 border-l-primary shadow-card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <MapPin className="w-8 h-8 text-primary" />
                    <div>
                      <CardTitle className="text-2xl">{location.Name}, {location.District}, {location.State} - {pincode}</CardTitle>
                      <CardDescription className="text-lg">
                        Development Score: 78% • Participation: High
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-accent border-accent">
                    Active Area
                  </Badge>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Top Voted Issues This Month
                </CardTitle>
                <CardDescription>Community priorities and voting trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topIssues.map((issue, index) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{issue.title}</p>
                      <p className="text-sm text-muted-foreground">{issue.votes_count || 0} votes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t text-center">
                  <Button variant="link" onClick={handleVoteClick}>
                    More Issues...
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Sign up/login to vote
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <p>No location data found for pincode: {pincode}</p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SearchResults;
