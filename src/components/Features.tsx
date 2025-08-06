import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Vote, MessageSquare, Users, BarChart3, Shield, Bell, TrendingUp } from "lucide-react";
import indiaConnectivity from "@/assets/india-connectivity.jpg";

const Features = () => {
  const features = [
    {
      icon: MapPin,
      title: "Area-Based Search",
      description: "Enter your pincode to view local political parties, promises made vs. done, and real-time development status.",
      quote: "Know Before You Vote."
    },
    {
      icon: Vote,
      title: "Monthly Voting System",
      description: "Vote once a month on top 5 issues in your area. Your voice matters in shaping local priorities.",
      quote: "From Streets to Seats – Make It Count."
    },
    {
      icon: MessageSquare,
      title: "Public Civic Wall",
      description: "Report local issues, upload photos, and track community concerns with upvotes and verified reports.",
      quote: "Voice the Truth. Demand the Right."
    },
    {
      icon: Users,
      title: "Political Party Tracker",
      description: "Track funding, spending, promises, and completion ratios for all major political parties in your region.",
      quote: "Promises Matter. So Do You."
    },
    {
      icon: Shield,
      title: "Know Your Rights",
      description: "Access fundamental rights, RTI information, voting rights, and file grievances directly through our platform.",
      quote: "Empower Yourself with Knowledge."
    },
    {
      icon: BarChart3,
      title: "Live Data & Charts",
      description: "Real-time leaderboards, participation metrics, and improvement tracking with beautiful visualizations.",
      quote: "Data-Driven Democracy."
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Powerful Features for <span className="text-primary">Democratic Change</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive tools to track, participate, and make a real difference in your local democracy.
          </p>
        </div>

        {/* India Connectivity Visual */}
        <div className="mb-16 relative">
          <div className="max-w-4xl mx-auto">
            <div 
              className="rounded-2xl overflow-hidden shadow-card-hover h-64 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${indiaConnectivity})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/60 flex items-center justify-center">
                <div className="text-center text-primary-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 animate-float" />
                  <h3 className="text-2xl font-bold mb-2">Connected Democracy</h3>
                  <p className="text-lg">Real-time data from across India</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-card-hover transition-all duration-300 hover:scale-105 border-l-4 border-l-primary"
            >
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-primary group-hover:animate-pulse-glow">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-l-golden">
                  <p className="text-sm italic text-golden font-semibold">
                    "{feature.quote}"
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;
