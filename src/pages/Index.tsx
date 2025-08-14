import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import SearchPreview from "@/components/SearchPreview";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 dark:from-background dark:to-muted/70">
      <Navigation />
      <Hero />
      <Features />
      <SearchPreview />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
