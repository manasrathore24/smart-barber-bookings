import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { 
  Calendar, Clock, User, Scissors, 
  X, Loader2, Plus 
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services:service_id (name, price, duration_minutes),
          barbers:barber_id (name)
        `)
        .eq("customer_id", user.id)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success("Booking cancelled successfully");
    },
    onError: () => {
      toast.error("Failed to cancel booking");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-accent/20 text-accent border-accent/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled": return "bg-destructive/20 text-destructive border-destructive/30";
      case "completed": return "bg-muted text-muted-foreground border-muted";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  const canCancel = (booking: { booking_date: string; start_time: string; status: string }) => {
    if (booking.status === "cancelled" || booking.status === "completed") return false;
    const bookingDateTime = parseISO(`${booking.booking_date}T${booking.start_time}`);
    return !isPast(bookingDateTime);
  };

  const upcomingBookings = bookings?.filter(b => {
    const bookingDate = parseISO(b.booking_date);
    return (isToday(bookingDate) || !isPast(bookingDate)) && b.status !== "cancelled";
  }) || [];

  const pastBookings = bookings?.filter(b => {
    const bookingDate = parseISO(b.booking_date);
    return isPast(bookingDate) && !isToday(bookingDate) || b.status === "cancelled";
  }) || [];

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-4xl text-foreground">
              MY <span className="text-gradient-primary">BOOKINGS</span>
            </h1>
            <Button 
              onClick={() => navigate("/book")}
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>

          {/* Upcoming Bookings */}
          <div className="mb-12">
            <h2 className="font-display text-2xl text-foreground mb-4">Upcoming</h2>
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                            <span className="font-display text-xl text-foreground">
                              {booking.services?.name}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 text-primary" />
                              {format(parseISO(booking.booking_date), "MMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 text-primary" />
                              {booking.start_time.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4 text-primary" />
                              {booking.barbers?.name}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Scissors className="h-4 w-4 text-primary" />
                              ${Number(booking.services?.price)}
                            </div>
                          </div>
                        </div>

                        {canCancel(booking) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this appointment? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelBooking.mutate(booking.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Yes, Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button 
                    onClick={() => navigate("/book")}
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-foreground mb-4">Past Bookings</h2>
              <div className="space-y-4 opacity-60">
                {pastBookings.map((booking) => (
                  <Card key={booking.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                            <span className="font-display text-lg text-foreground">
                              {booking.services?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{format(parseISO(booking.booking_date), "MMM d, yyyy")}</span>
                            <span>{booking.start_time.slice(0, 5)}</span>
                            <span>{booking.barbers?.name}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
