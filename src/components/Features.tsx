import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Vote, MessageSquare, Users, BarChart3, Shield } from "lucide-react";

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
    <section
      className="py-20 bg-gradient-to-br 
                 from-[#ffdfb3] via-[#fefefe] to-[#b4e0c3] 
                 dark:from-[#2d2418] dark:via-[#1a1a1a] dark:to-[#183127] 
                 transition-colors"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-fade-in">
            Powerful Features for{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
              Democratic Change
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in delay-100">
            Comprehensive tools to track, participate, and make a real difference in your local democracy.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-card-hover transition-all duration-300 hover:scale-105 border-l-4 border-l-primary dark:border-l-primary animate-fade-in"
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-primary group-hover:animate-pulse-glow">
                    <feature.icon className="w-6 h-6 text-primary-foreground dark:text-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-l-golden dark:bg-card/50">
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
