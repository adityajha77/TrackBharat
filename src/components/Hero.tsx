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
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-golden/20 border border-golden/30 text-golden-foreground mb-6">
            <span className="text-sm font-semibold">🇮🇳 Empowering Indian Democracy</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            TRACK<span className="text-golden">BHARAT</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4 font-medium">
            Your Area, Your Vote, Your Rights
          </p>
          
          {/* Inspiring Quote */}
          <div className="text-lg md:text-xl text-primary-foreground/80 mb-8 italic">
            "Vote with Facts, Not Faces."
          </div>
          
          {/* Description */}
          <p className="text-lg text-primary-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Making democracy transparent and people-powered. Track political promises, vote on local issues, and hold representatives accountable in your area.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="hero" size="lg" className="animate-pulse-glow" onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}>
              <Search className="mr-2" />
              Search Your Area
            </Button>
            <Button variant="accent" size="lg" onClick={handleVoteAction}>
              <Vote className="mr-2" />
              {user ? 'Start Voting' : 'Login to Vote'}
            </Button>
          </div>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
              <Users className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 text-sm">Community Driven</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
              <BarChart3 className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 text-sm">Data Transparency</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
              <Vote className="w-4 h-4 mr-2 text-golden" />
              <span className="text-primary-foreground/90 text-sm">Real Impact</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="w-16 h-16 bg-golden/20 rounded-full flex items-center justify-center">
          <Vote className="w-8 h-8 text-golden" />
        </div>
      </div>
      <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: '1s' }}>
        <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-accent" />
        </div>
      </div>
    </section>
  );
};

export default Hero;