import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, DollarSign, ArrowRight, Scissors, Loader2 } from "lucide-react";

export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("price");
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-7xl text-foreground mb-4">
              OUR <span className="text-gradient-primary">SERVICES</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Premium grooming services tailored to your style. Pick your service and book your appointment.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div 
                  key={service.id}
                  className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Scissors className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary font-display text-2xl">
                        <DollarSign className="h-5 w-5" />
                        {Number(service.price).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="font-display text-2xl text-foreground mb-2">{service.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{service.description || "Premium barber service"}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      {service.duration_minutes} mins
                    </div>
                    <Button 
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => navigate(user ? `/book?service=${service.id}` : "/auth?mode=signup")}
                    >
                      Book Now
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-2xl text-foreground mb-2">No Services Yet</h3>
              <p className="text-muted-foreground">Check back soon for our service menu!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center p-12 rounded-2xl bg-card border border-border">
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              READY TO <span className="text-gradient-primary">BOOK</span>?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Choose your service, pick your barber, and secure your spot.
            </p>
            <Button 
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground px-8"
              onClick={() => navigate(user ? "/book" : "/auth?mode=signup")}
            >
              {user ? "Book Now" : "Sign Up to Book"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
