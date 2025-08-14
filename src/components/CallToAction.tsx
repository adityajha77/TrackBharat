import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Vote, Bell, ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-teal-200/40 via-blue-200/40 to-purple-200/40 dark:from-teal-900/30 dark:via-blue-900/30 dark:to-purple-900/30 text-foreground transition-colors">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in">
            Ready to Make Democracy Work for You?{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">
              Join TrackBharat!
            </span>
          </h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-3xl mx-auto animate-fade-in delay-100">
            Join thousands of citizens who are already tracking progress and demanding accountability in their areas. Your voice, amplified.
          </p>

          {/* Quote */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-xl p-6 mb-10 border border-primary/30 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow duration-300 animate-fade-in delay-200">
            <p className="text-2xl italic font-medium text-primary">
              "From Streets to Seats – Make It Count."
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: <UserPlus className="w-12 h-12 mx-auto mb-4 text-primary" />,
                title: "Sign Up Free",
                desc: "Create your account in 30 seconds",
              },
              {
                icon: <Vote className="w-12 h-12 mx-auto mb-4 text-primary" />,
                title: "Start Voting",
                desc: "Vote on issues that matter to you",
              },
              {
                icon: <Bell className="w-12 h-12 mx-auto mb-4 text-primary" />,
                title: "Get Updates",
                desc: "Stay informed about local progress",
              },
            ].map(({ icon, title, desc }, i) => (
              <Card
                key={i}
                className="bg-background/70 dark:bg-background/60 border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${300 + i * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  {icon}
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary-glow text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-bounce-in delay-600"
            >
              Join Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-border animate-fade-in delay-700">
            <p className="text-muted-foreground mb-4">
              Trusted by citizens across India
            </p>
            <div className="flex justify-center items-center gap-8 text-sm flex-wrap">
              {["100% Free", "Secure & Private", "Real Impact"].map(
                (text, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span>{text}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
