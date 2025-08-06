import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Vote, Bell, ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-primary dark:bg-gray-900 text-primary-foreground dark:text-white transition-colors">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto text-center">

      {/* Main CTA */}
      <h2 className="text-4xl md:text-5xl font-bold mb-6">
        Ready to Make Democracy Work for You?
      </h2>
      <p className="text-xl mb-8 text-primary-foreground/90 dark:text-gray-300">
        Join thousands of citizens who are already tracking progress and demanding accountability in their areas.
      </p>
      
      {/* Quote */}
      <div className="bg-primary-foreground/10 dark:bg-white/5 rounded-xl p-6 mb-10 border border-primary-foreground/20 dark:border-white/10">
        <p className="text-2xl italic font-medium text-golden">
          "From Streets to Seats – Make It Count."
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[{
          icon: <UserPlus className="w-12 h-12 mx-auto mb-4 text-golden" />,
          title: "Sign Up Free",
          desc: "Create your account in 30 seconds"
        }, {
          icon: <Vote className="w-12 h-12 mx-auto mb-4 text-golden" />,
          title: "Start Voting",
          desc: "Vote on issues that matter to you"
        }, {
          icon: <Bell className="w-12 h-12 mx-auto mb-4 text-golden" />,
          title: "Get Updates",
          desc: "Stay informed about local progress"
        }].map(({ icon, title, desc }, i) => (
          <Card key={i} className="bg-primary-foreground/10 dark:bg-white/5 border border-primary-foreground/20 dark:border-white/10 hover:bg-primary-foreground/20 dark:hover:bg-white/10 transition-colors">
            <CardContent className="p-6 text-center">
              {icon}
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-primary-foreground/80 dark:text-gray-400 text-sm">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA Buttons (optional) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Add your CTA buttons here */}
      </div>

      {/* Trust Indicators */}
      <div className="mt-12 pt-8 border-t border-primary-foreground/20 dark:border-white/10">
        <p className="text-primary-foreground/80 dark:text-gray-400 mb-4">Trusted by citizens across India</p>
        <div className="flex justify-center items-center gap-8 text-sm">
          {["100% Free", "Secure & Private", "Real Impact"].map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-golden rounded-full"></div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

  );
};

export default CallToAction;
