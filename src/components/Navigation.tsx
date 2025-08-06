import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Vote, MapPin, Users, BarChart3, Shield, User, LogOut, Home, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navigationItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Vote", href: "/vote", icon: Vote },
    { name: "Your Rights", href: "/rights", icon: Shield },
    { name: "Contact", href: "/contact", icon: Users },
  ];

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Vote className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              TRACK<span className="text-primary">BHARAT</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </button>
            ))}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.email?.split('@')[0]}
                </span>
                <Button variant="ghost" size="sm" onClick={handleAuthAction}>
                  <LogOut className="mr-2 w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleAuthAction}>
                  <User className="mr-2 w-4 h-4" />
                  Login
                </Button>
                <Button variant="default" size="sm" onClick={handleAuthAction}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-6 mt-8">
                {navigationItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 text-lg text-muted-foreground hover:text-primary transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </button>
                ))}
                
                <div className="border-t pt-6 mt-6 space-y-4">
                  {user ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground px-3">
                        Welcome, {user.email?.split('@')[0]}
                      </div>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleAuthAction}>
                        <LogOut className="mr-2 w-4 h-4" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-start" onClick={handleAuthAction}>
                        <User className="mr-2 w-4 h-4" />
                        Login
                      </Button>
                      <Button variant="default" className="w-full" onClick={handleAuthAction}>
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
