import { Button } from "@/components/ui/button";
import { Search, Vote, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-democracy.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVoteAction = () => {
    if (user) {
      navigate('/vote');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent dark:from-background/95 dark:via-background/80 dark:to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto animate-slide-up">
          {/* Badge */}

          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground dark:text-foreground mb-6 leading-tight">
            TRACK<span className="text-golden">BHARAT</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-primary-foreground/90 dark:text-foreground/90 mb-4 font-medium">
            Your Area, Your Vote, Your Rights
          </p>
          
          {/* Inspiring Quote */}
          <div className="text-lg md:text-xl text-primary-foreground/80 dark:text-foreground/80 mb-8 italic">
            "Vote with Facts, Not Faces."
          </div>
          
          {/* Description */}
          <p className="text-lg text-primary-foreground/70 dark:text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Making democracy transparent and people-powered. Track political promises, vote on local issues, and hold representatives accountable in your area.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="hero" size="lg" onClick={handleVoteAction}>
              <Vote className="mr-2" />
              Start Your First Vote
            </Button>
            <Button variant="accent" size="lg" onClick={() => navigate('/auth')}>
              <Users className="mr-2" />
              Sign Up
            </Button>
          </div>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-foreground/10 rounded-full border border-primary-foreground/20 dark:border-foreground/20">
              <Users className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">Community Driven</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-foreground/10 rounded-full border border-primary-foreground/20 dark:border-foreground/20">
              <BarChart3 className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">Data Transparency</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 dark:bg-foreground/10 rounded-full border border-primary-foreground/20 dark:border-foreground/20">
              <Vote className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 dark:text-foreground/90 text-sm">Real Impact</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Elements */}
     
    </section>
  );
};

export default Hero;
