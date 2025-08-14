import { Button } from "@/components/ui/button";
import { Vote, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVoteAction = () => {
    if (user) {
      navigate("/vote");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-secondary via-background to-accent text-foreground transition-colors">
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight drop-shadow-lg animate-fade-in">
            TRACK<span className="text-golden">BHARAT</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-medium animate-fade-in delay-100">
            Your Area, Your Vote, Your Rights
          </p>

          {/* Inspiring Quote */}
          <div className="text-lg md:text-xl text-golden/80 mb-8 italic animate-fade-in delay-200">
            "Vote with Facts, Not Faces."
          </div>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in delay-300">
            Making democracy transparent and people-powered. Track political
            promises, vote on local issues, and hold representatives
            accountable in your area.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in delay-400">
            <Button
              variant="hero"
              size="lg"
              className="bg-primary hover:bg-primary-glow text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleVoteAction}
            >
              <Vote className="mr-2" />
              Start Your First Vote
            </Button>
            <Button
              variant="accent"
              size="lg"
              className="shadow-md hover:shadow-lg transition-all duration-300"
              onClick={() => navigate("/auth")}
            >
              <Users className="mr-2" />
              Sign Up
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in delay-500">
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-card rounded-full border border-primary-foreground/20 dark:border-border hover:shadow-md transition-shadow duration-300">
              <Users className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">
                Community Driven
              </span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-card rounded-full border border-primary-foreground/20 dark:border-border hover:shadow-md transition-shadow duration-300">
              <BarChart3 className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">
                Data Transparency
              </span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-card rounded-full border border-primary-foreground/20 dark:border-border hover:shadow-md transition-shadow duration-300">
              <Vote className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">
                Real Impact
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
