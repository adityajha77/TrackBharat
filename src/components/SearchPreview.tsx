import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SearchPreview = () => {
  const [pincode, setPincode] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (pincode) {
      navigate(`/search/${pincode}`);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-teal-200/40 via-blue-200/40 to-purple-200/40 dark:from-teal-900/30 dark:via-blue-900/30 dark:to-purple-900/30 transition-colors">
      <div className="container mx-auto px-4">
        {/* Search Interface */}
        <div className="text-center mb-16" id="search">
          {/* Flag-style small light version */}
          

          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 flex items-center justify-center gap-3 animate-fade-in">
            <Search className="w-10 h-10 text-primary animate-bounce-in" /> Try It Now -{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-blue-700 text-transparent bg-clip-text">
              Search Your Area
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in delay-100">
            Enter your pincode to see how TRACKBHARAT works for your local area
          </p>

          {/* Search Card */}
          <Card className="max-w-lg mx-auto border border-border/50 bg-background/70 dark:bg-background/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in delay-200">
            <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-center">
              <Input
                placeholder="Enter your pincode (e.g., 560034)"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="text-center text-lg py-6 border-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              />
              <Button onClick={handleSearch} size="lg" className="px-8">
                <Search className="mr-2" />
                Search
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm text-primary mt-4 italic animate-fade-in delay-300">
            "Transparency starts with a simple search"
          </p>
        </div>
      </div>
    </section>
  );
};

export default SearchPreview;
