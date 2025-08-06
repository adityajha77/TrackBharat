import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, TrendingUp, Users, CheckCircle, Clock, XCircle } from "lucide-react";

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
          
          <p className="text-sm text-muted-foreground mt-4 italic">
            "Transparency starts with a simple search"
          </p>
        </div>

      </div>
    </section>
  );
};

export default SearchPreview;
