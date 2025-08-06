import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, Scale, Users, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Right {
  id: string;
  title: string;
  description: string;
  category: string;
  details: string;
  articles: string[];
}

const rightsData: Right[] = [
  {
    id: '1',
    title: 'Right to Vote',
    description: 'Every citizen has the fundamental right to vote in elections',
    category: 'Democratic Rights',
    details: 'The right to vote is enshrined in the Constitution of India. Every citizen above 18 years of age has the right to vote in elections to choose their representatives.',
    articles: ['Article 326', 'Representation of the People Act, 1951']
  },
  {
    id: '2',
    title: 'Right to Information',
    description: 'Access to information held by public authorities',
    category: 'Transparency Rights',
    details: 'The RTI Act 2005 empowers citizens to seek information from public authorities, promoting transparency and accountability in governance.',
    articles: ['RTI Act 2005', 'Article 19(1)(a)']
  },
  {
    id: '3',
    title: 'Right to Education',
    description: 'Free and compulsory education for children',
    category: 'Social Rights',
    details: 'Article 21A guarantees free and compulsory education to all children aged 6-14 years as a fundamental right.',
    articles: ['Article 21A', 'RTE Act 2009']
  },
  {
    id: '4',
    title: 'Right to Work',
    description: 'Right to employment and livelihood',
    category: 'Economic Rights',
    details: 'MGNREGA guarantees 100 days of wage employment to rural households. Every adult member can demand work.',
    articles: ['MGNREGA 2005', 'Article 41']
  },
  {
    id: '5',
    title: 'Right to Food',
    description: 'Access to adequate food and nutrition',
    category: 'Social Rights',
    details: 'The Food Security Act ensures subsidized food grains to eligible households through the Public Distribution System.',
    articles: ['Food Security Act 2013', 'Article 21']
  },
  {
    id: '6',
    title: 'Right to Health',
    description: 'Access to healthcare services',
    category: 'Social Rights',
    details: 'While not explicitly mentioned, the right to health is derived from Article 21 (Right to Life) and various health schemes provide healthcare access.',
    articles: ['Article 21', 'Ayushman Bharat Scheme']
  }
];

const categories = ['All', 'Democratic Rights', 'Transparency Rights', 'Social Rights', 'Economic Rights'];

const Rights = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedRight, setExpandedRight] = useState<string | null>(null);

  const filteredRights = selectedCategory === 'All' 
    ? rightsData 
    : rightsData.filter(right => right.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Democratic Rights':
        return <Users className="w-4 h-4" />;
      case 'Transparency Rights':
        return <FileText className="w-4 h-4" />;
      case 'Social Rights':
        return <Shield className="w-4 h-4" />;
      case 'Economic Rights':
        return <Scale className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Democratic Rights':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Transparency Rights':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'Social Rights':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Economic Rights':
        return 'bg-golden/10 text-golden border-golden/20';
      default:
        return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Know Your <span className="text-primary">Rights</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Understanding your rights as a citizen empowers you to participate effectively in democracy and hold authorities accountable.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="text-sm"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Rights List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredRights.map((right) => (
            <Card key={right.id} className="hover:shadow-lg transition-shadow">
              <Collapsible
                open={expandedRight === right.id}
                onOpenChange={(isOpen) => setExpandedRight(isOpen ? right.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">
                          {getCategoryIcon(right.category)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 text-left">{right.title}</CardTitle>
                          <CardDescription className="text-left">
                            {right.description}
                          </CardDescription>
                          <div className="mt-3">
                            <Badge className={getCategoryColor(right.category)}>
                              {right.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {expandedRight === right.id ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Details</h4>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {right.details}
                      </p>
                      
                      <h4 className="font-semibold mb-3">Legal Foundation</h4>
                      <div className="flex flex-wrap gap-2">
                        {right.articles.map((article, index) => (
                          <Badge key={index} variant="outline">
                            {article}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Exercise Your Rights</h3>
              <p className="text-muted-foreground mb-6">
                Knowledge of your rights is the first step towards active citizenship. 
                Use this information to hold your representatives accountable and participate 
                meaningfully in democratic processes.
              </p>
              <div className="flex justify-center">
                <Button
                  variant="default"
                  className="w-full sm:w-auto px-8 py-6 text-lg"
                  onClick={() => window.open('https://rtionline.gov.in/', '_blank')}
                >
                  File RTI Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Rights;
