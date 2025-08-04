import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Linkedin, MessageSquare, Send, Heart, Code, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Get in <span className="text-primary">Touch</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions, suggestions, or want to collaborate? I'd love to hear from you!
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Send a Message
              </CardTitle>
              <CardDescription>
                Drop me a message and I'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="What's this about?" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Your message here..."
                  className="min-h-[120px]"
                />
              </div>
              
              <Button className="w-full">
                <Send className="mr-2 w-4 h-4" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Contact Info & Social */}
          <div className="space-y-6">
            {/* Developer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-accent" />
                  About the Developer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Aditya Kumar Jha</h3>
                    <p className="text-muted-foreground">Full Stack Developer</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Passionate about building technology solutions that empower citizens 
                    and promote transparency in governance. TrackBharat is my contribution 
                    to strengthening Indian democracy through technology.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">React</Badge>
                    <Badge variant="secondary">TypeScript</Badge>
                    <Badge variant="secondary">Supabase</Badge>
                    <Badge variant="secondary">Democracy Tech</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Let's Connect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <a 
                  href="https://www.linkedin.com/in/aditya-kumar-jha-72493a319/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full justify-start">
                    <Linkedin className="mr-2 w-4 h-4 text-blue-600" />
                    Connect on LinkedIn
                  </Button>
                </a>
                
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 w-4 h-4 text-red-600" />
                  adityajha@example.com
                </Button>
              </CardContent>
            </Card>

            {/* Mission */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "To create a more transparent, accountable, and participatory democracy 
                  where every citizen has the tools and information they need to make 
                  informed decisions and hold their representatives accountable."
                </p>
                
                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm italic text-primary font-medium">
                    "Democracy is not just about voting; it's about staying informed, 
                    engaged, and holding power accountable every single day."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does voting work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create an account, browse community issues, and vote on the ones that matter to you. 
                  Your votes are counted in real-time and help prioritize community concerns.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! We use industry-standard security practices. Your personal information 
                  is protected and we only collect what's necessary for the platform to function.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I suggest new features?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Absolutely! We're always looking to improve. Send us your ideas through 
                  the contact form or connect with us on LinkedIn.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How can I contribute?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Whether you're a developer, designer, or just passionate about democracy, 
                  there are many ways to contribute. Reach out to discuss collaboration opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Contact;