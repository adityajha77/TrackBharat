import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Vote, Bell, ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Make Democracy Work for You?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Join thousands of citizens who are already tracking progress and demanding accountability in their areas.
          </p>
          
          {/* Quote */}
          <div className="bg-primary-foreground/10 rounded-xl p-6 mb-10 border border-primary-foreground/20">
            <p className="text-2xl italic font-medium text-golden">
              "From Streets to Seats – Make It Count."
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors">
              <CardContent className="p-6 text-center">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-golden" />
                <h3 className="text-lg font-semibold mb-2">Sign Up Free</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Create your account in 30 seconds
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors">
              <CardContent className="p-6 text-center">
                <Vote className="w-12 h-12 mx-auto mb-4 text-golden" />
                <h3 className="text-lg font-semibold mb-2">Start Voting</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Vote on issues that matter to you
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors">
              <CardContent className="p-6 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-golden" />
                <h3 className="text-lg font-semibold mb-2">Get Updates</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Stay informed about local progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-primary-foreground/20">
            <p className="text-primary-foreground/80 mb-4">Trusted by citizens across India</p>
            <div className="flex justify-center items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-golden rounded-full"></div>
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-golden rounded-full"></div>
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-golden rounded-full"></div>
                <span>Real Impact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
