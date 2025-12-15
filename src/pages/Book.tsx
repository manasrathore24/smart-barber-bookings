import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes, parse, isBefore, isToday } from "date-fns";
import { toast } from "sonner";
import { 
  Scissors, Clock, User, Calendar as CalendarIcon, 
  Check, ArrowLeft, ArrowRight, Loader2 
} from "lucide-react";

type BookingStep = "service" | "date" | "time" | "barber" | "confirm";

export default function Book() {
  const [searchParams] = useSearchParams();
  const preselectedService = searchParams.get("service");
  
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<string | null>(preselectedService);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?mode=signup");
    }
  }, [user, authLoading, navigate]);

  // Fetch services
  const { data: services } = useQuery({
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

  // Fetch barbers with their schedules
  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*, barber_schedules(*)")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing bookings for selected date
  const { data: existingBookings } = useQuery({
    queryKey: ["bookings", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!user || !selectedService || !selectedDate || !selectedTime || !selectedBarber) {
        throw new Error("Missing required booking information");
      }

      const service = services?.find(s => s.id === selectedService);
      if (!service) throw new Error("Service not found");

      const startTime = selectedTime;
      const endTime = format(
        addMinutes(parse(startTime, "HH:mm", new Date()), service.duration_minutes),
        "HH:mm"
      );

      const { error } = await supabase.from("bookings").insert({
        customer_id: user.id,
        service_id: selectedService,
        barber_id: selectedBarber,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking confirmed! We'll see you soon.");
      navigate("/my-bookings");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  // Get available time slots for selected date and barber
  const getAvailableTimeSlots = () => {
    if (!selectedDate || !selectedBarber || !selectedService) return [];
    
    const barber = barbers?.find(b => b.id === selectedBarber);
    const service = services?.find(s => s.id === selectedService);
    if (!barber || !service) return [];

    const dayOfWeek = selectedDate.getDay();
    const schedule = barber.barber_schedules?.find(
      (s: { day_of_week: number }) => s.day_of_week === dayOfWeek
    );
    if (!schedule) return [];

    const slots: string[] = [];
    const startTime = parse(schedule.start_time, "HH:mm:ss", new Date());
    const endTime = parse(schedule.end_time, "HH:mm:ss", new Date());
    const serviceDuration = service.duration_minutes;

    let currentSlot = startTime;
    const now = new Date();

    while (isBefore(addMinutes(currentSlot, serviceDuration), endTime) || 
           format(addMinutes(currentSlot, serviceDuration), "HH:mm") === format(endTime, "HH:mm")) {
      const slotTime = format(currentSlot, "HH:mm");
      
      // Skip past times if booking for today
      if (isToday(selectedDate)) {
        const slotDateTime = parse(slotTime, "HH:mm", selectedDate);
        if (isBefore(slotDateTime, now)) {
          currentSlot = addMinutes(currentSlot, 30);
          continue;
        }
      }

      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings?.some(booking => {
        if (booking.barber_id !== selectedBarber) return false;
        const bookingStart = booking.start_time.slice(0, 5);
        const bookingEnd = booking.end_time.slice(0, 5);
        const slotEnd = format(addMinutes(currentSlot, serviceDuration), "HH:mm");
        return !(slotEnd <= bookingStart || slotTime >= bookingEnd);
      });

      if (!hasConflict) {
        slots.push(slotTime);
      }

      currentSlot = addMinutes(currentSlot, 30);
    }

    return slots;
  };

  // Get available barbers for selected date
  const getAvailableBarbersForDate = () => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    
    return barbers?.filter(barber => 
      barber.barber_schedules?.some(
        (s: { day_of_week: number }) => s.day_of_week === dayOfWeek
      )
    ) || [];
  };

  const selectedServiceData = services?.find(s => s.id === selectedService);
  const selectedBarberData = barbers?.find(b => b.id === selectedBarber);
  const availableTimeSlots = getAvailableTimeSlots();
  const availableBarbers = getAvailableBarbersForDate();

  const steps: { key: BookingStep; label: string }[] = [
    { key: "service", label: "Service" },
    { key: "date", label: "Date" },
    { key: "barber", label: "Barber" },
    { key: "time", label: "Time" },
    { key: "confirm", label: "Confirm" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const canProceed = () => {
    switch (step) {
      case "service": return !!selectedService;
      case "date": return !!selectedDate;
      case "barber": return !!selectedBarber;
      case "time": return !!selectedTime;
      case "confirm": return true;
      default: return false;
    }
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.key === step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1].key);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.key === step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1].key);
    }
  };

  if (authLoading) {
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
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    index <= currentStepIndex 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 md:w-24 h-0.5 mx-2 ${
                    index < currentStepIndex ? "bg-primary" : "bg-border"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {step === "service" && "Choose Your Service"}
                {step === "date" && "Pick a Date"}
                {step === "barber" && "Select Your Barber"}
                {step === "time" && "Choose a Time Slot"}
                {step === "confirm" && "Confirm Your Booking"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Service Selection */}
              {step === "service" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services?.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedService === service.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display text-lg text-foreground">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-primary font-bold">₹{Number(service.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {service.duration_minutes} mins
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Date Selection */}
              {step === "date" && (
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedBarber(null);
                      setSelectedTime(null);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border border-border"
                  />
                </div>
              )}

              {/* Barber Selection */}
              {step === "barber" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableBarbers.length > 0 ? (
                    availableBarbers.map((barber) => (
                      <button
                        key={barber.id}
                        onClick={() => {
                          setSelectedBarber(barber.id);
                          setSelectedTime(null);
                        }}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedBarber === barber.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg text-foreground">{barber.name}</h3>
                            {barber.specialties && barber.specialties.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {barber.specialties.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No barbers available on this date. Please select a different date.
                    </div>
                  )}
                </div>
              )}

              {/* Time Selection */}
              {step === "time" && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          selectedTime === time
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {time}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No available time slots. Please select a different barber or date.
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {step === "confirm" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-lg bg-muted/50 space-y-4">
                    <div className="flex items-center gap-3">
                      <Scissors className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Service</p>
                        <p className="font-semibold text-foreground">{selectedServiceData?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold text-foreground">
                          {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-semibold text-foreground">{selectedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Barber</p>
                        <p className="font-semibold text-foreground">{selectedBarberData?.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-display text-2xl text-primary">
                      ₹{Number(selectedServiceData?.price || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === "service"}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                {step === "confirm" ? (
                  <Button
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                    onClick={() => createBooking.mutate()}
                    disabled={createBooking.isPending}
                  >
                    {createBooking.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
