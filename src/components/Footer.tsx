import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Vote, MapPin, Users, BarChart3, Shield, Heart, ExternalLink } from "lucide-react";

const Footer = () => {
  const features = [
    { name: "Area Search", icon: MapPin },
    { name: "Monthly Voting", icon: Vote },
    { name: "Civic Wall", icon: Users },
    { name: "Analytics", icon: BarChart3 },
    { name: "Know Rights", icon: Shield },
  ];

  const legalLinks = [
    "Privacy Policy",
    "Terms of Service", 
    "Cookie Policy",
    "Data Protection"
  ];

  const quotes = [
    "Voice the Truth. Demand the Right.",
    "Know Before You Vote.",
    "Promises Matter. So Do You."
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Vote className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">
                TRACK<span className="text-primary-glow">BHARAT</span>
              </span>
            </div>
            
            <p className="text-background/80 text-lg mb-6 leading-relaxed">
              Making democracy transparent and people-powered. Empowering every Indian citizen 
              to track political promises, vote on local issues, and hold representatives accountable.
            </p>
            
            <div className="bg-background/10 rounded-lg p-4 border border-background/20">
              <p className="text-golden italic font-medium">
                {quotes[Math.floor(Math.random() * quotes.length)]}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-background">Features</h3>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature.name}>
                  <a href="#" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                    <feature.icon className="w-4 h-4" />
                    {feature.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-background">Support</h3>
            <ul className="space-y-3 mb-6">
              <li>
                <a href="#" className="text-background/70 hover:text-background transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-background/70 hover:text-background transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-background/70 hover:text-background transition-colors">
                  Report Issue
                </a>
              </li>
              <li>
                <a href="#" className="text-background/70 hover:text-background transition-colors">
                  Feedback
                </a>
              </li>
            </ul>

            <Button variant="secondary" size="sm" className="w-full">
              <ExternalLink className="mr-2 w-4 h-4" />
              Community Forum
            </Button>
          </div>
        </div>

        <Separator className="bg-background/20 mb-8" />

        {/* Impact Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-center">
          <div>
            <div className="text-2xl font-bold text-golden mb-1">500+</div>
            <div className="text-background/70 text-sm">Cities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-golden mb-1">10K+</div>
            <div className="text-background/70 text-sm">Citizens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-golden mb-1">25K+</div>
            <div className="text-background/70 text-sm">Issues</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-golden mb-1">85%</div>
            <div className="text-background/70 text-sm">Resolved</div>
          </div>
        </div>

        <Separator className="bg-background/20 mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-background/70 text-sm">
            <div className="flex items-center gap-2 mb-2">
              Made with <Heart className="w-4 h-4 text-red-500" /> for Indian Democracy
            </div>
            <div>
              © 2024 TRACKBHARAT. Empowering citizens, strengthening democracy.
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            {legalLinks.map((link) => (
              <a 
                key={link} 
                href="#" 
                className="text-background/70 hover:text-background transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;