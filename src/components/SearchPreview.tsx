import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, TrendingUp, Users, CheckCircle, Clock, XCircle } from "lucide-react";

const SearchPreview = () => {
  const [pincode, setPincode] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const handleSearch = () => {
    setShowDemo(true);
  };

  const demoData = {
    area: "Koramangala, Bangalore - 560034",
    parties: [
      { name: "BJP", promises: 25, completed: 18, pending: 5, failed: 2, color: "secondary" },
      { name: "Congress", promises: 22, completed: 15, pending: 4, failed: 3, color: "primary" },
      { name: "AAP", promises: 18, completed: 12, pending: 4, failed: 2, color: "accent" }
    ],
    topIssues: [
      { issue: "Road maintenance and pothole repairs", votes: 342, trend: "up" },
      { issue: "Improved public transportation", votes: 298, trend: "up" },
      { issue: "Better waste management", votes: 245, trend: "down" },
      { issue: "Street lighting improvements", votes: 189, trend: "up" }
    ]
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Search Interface */}
        <div className="text-center mb-16" id="search">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Try It Now - <span className="text-primary">Search Your Area</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Enter your pincode to see how TRACKBHARAT works for your local area
          </p>
          
          <div className="max-w-md mx-auto flex gap-4">
            <Input
              placeholder="Enter your pincode (e.g., 560034)"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="text-center text-lg"
            />
            <Button onClick={handleSearch} size="lg" className="px-8">
              <Search className="mr-2" />
              Search
            </Button>
          </div>
          
          {!showDemo && (
            <p className="text-sm text-muted-foreground mt-4 italic">
              "Transparency starts with a simple search"
            </p>
          )}
        </div>

        {/* Demo Results */}
        {showDemo && (
          <div className="max-w-6xl mx-auto animate-slide-up">
            {/* Area Header */}
            <Card className="mb-8 border-l-4 border-l-primary shadow-card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <MapPin className="w-8 h-8 text-primary" />
                    <div>
                      <CardTitle className="text-2xl">{demoData.area}</CardTitle>
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

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Political Parties Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Political Parties Performance
                  </CardTitle>
                  <CardDescription>Promise tracking and completion rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {demoData.parties.map((party, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{party.name}</h4>
                        <Badge variant={party.color as any}>
                          {Math.round((party.completed / party.promises) * 100)}% Complete
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            {party.completed}
                          </div>
                          <div className="text-xs text-muted-foreground">Done</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-yellow-600">
                            <Clock className="w-4 h-4" />
                            {party.pending}
                          </div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            {party.failed}
                          </div>
                          <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{party.promises}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Voted Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Top Voted Issues This Month
                  </CardTitle>
                  <CardDescription>Community priorities and voting trends</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {demoData.topIssues.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{item.issue}</p>
                        <p className="text-sm text-muted-foreground">{item.votes} votes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className={`w-4 h-4 ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <Button variant="accent" className="w-full" onClick={() => window.location.href = '/vote'}>
                      Vote on These Issues
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quote */}
            <div className="text-center mt-12 p-6 bg-muted rounded-xl">
              <p className="text-lg italic text-foreground font-medium">
                "Promises Matter. So Do You."
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This is just a preview - Sign up to access full data for your area
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchPreview;