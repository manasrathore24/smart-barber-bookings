import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Clock, Star, Users, ArrowRight, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Quick Booking",
      description: "Book your appointment in under 60 seconds",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Expert Barbers",
      description: "Skilled professionals with years of experience",
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Premium Service",
      description: "Top-tier grooming experience every time",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "No Wait Times",
      description: "Your time is scheduled, we respect it",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-fade-in">
              <Scissors className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Premium Barber Experience</span>
            </div>
            
            <h1 
              className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tight mb-6 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="text-foreground">YOUR</span>{" "}
              <span className="text-gradient-primary">NEXT</span>
              <br />
              <span className="text-foreground">FRESH</span>{" "}
              <span className="text-gradient-secondary">CUT</span>
            </h1>
            
            <p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Book your appointment online. Choose your barber. Get the freshest cut in town.
              No waiting, no hassle.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Button 
                size="lg" 
                className="bg-[rgba(60,67,82,1)] hover:bg-[rgba(60,67,82,0.9)] text-primary-foreground font-semibold px-8 py-6 text-lg glow-primary"
                onClick={() => navigate(user ? "/book" : "/auth?mode=signup")}
              >
                {user ? "Book Now" : "Get Started"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg border-border hover:bg-muted"
                onClick={() => navigate("/services")}
              >
                View Services
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              WHY CHOOSE <span className="text-gradient-primary">NEXT-CUT</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              We're not just a barbershop. We're your grooming destination.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <div className="text-primary">{feature.icon}</div>
                </div>
                <h3 className="font-display text-xl text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-border">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              READY FOR YOUR <span className="text-gradient-primary">FRESH CUT</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of satisfied customers. Book your appointment today and experience the difference.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg animate-pulse-glow"
              onClick={() => navigate(user ? "/book" : "/auth?mode=signup")}
            >
              {user ? "Book Your Appointment" : "Sign Up & Book Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Scissors className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-xl tracking-wider text-foreground">NEXT-CUT</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 Next-Cut. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
