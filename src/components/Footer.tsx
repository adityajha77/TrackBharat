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
    <footer className="bg-gradient-to-br from-primary/10 to-background dark:from-background dark:to-primary/10 text-foreground">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-md animate-pulse-glow">
              <Vote className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              TRACK<span className="text-primary">BHARAT</span>
            </span>
            </div>
            
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed dark:text-muted-foreground/80">
              Making democracy transparent and people-powered. Empowering every Indian citizen 
              to track political promises, vote on local issues, and hold representatives accountable.
            </p>
            
            <div className="bg-gradient-to-r from-golden/10 to-transparent rounded-lg p-4 border border-golden/30 shadow-sm">
              <p className="text-golden italic font-medium">
                {quotes[Math.floor(Math.random() * quotes.length)]}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-foreground dark:text-foreground">Features</h3>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature.name}>
                  <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <feature.icon className="w-4 h-4 text-primary" />
                    {feature.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-foreground dark:text-foreground">Support</h3>
            <ul className="space-y-3 mb-6">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Report Issue
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Feedback
                </a>
              </li>
            </ul>

            <Button variant="secondary" size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary-glow">
              <ExternalLink className="mr-2 w-4 h-4" />
              Community Forum
            </Button>
          </div>
        </div>

        <Separator className="bg-border dark:bg-border/50 mb-8" />

        {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm dark:text-muted-foreground/80">
              <div className="flex items-center gap-2 mb-2">
                Made with <Heart className="w-4 h-4 text-red-500 animate-pulse" /> for Indian Democracy
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
                  className="text-muted-foreground hover:text-primary transition-colors hover:underline"
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
