import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Scissors, Users, Calendar, DollarSign, 
  Plus, Edit, Trash2, Loader2, Clock 
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Services
  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Barbers
  const { data: barbers } = useQuery({
    queryKey: ["admin-barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*, barber_schedules(*)")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Bookings
  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services:service_id (name),
          barbers:barber_id (name),
          profiles:customer_id (full_name)
        `)
        .order("booking_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const todayBookings = bookings?.filter(
    b => b.booking_date === format(new Date(), "yyyy-MM-dd") && b.status !== "cancelled"
  ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <h1 className="font-display text-4xl text-foreground mb-8">
            ADMIN <span className="text-gradient-primary">PANEL</span>
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Bookings</p>
                    <p className="font-display text-2xl text-foreground">{todayBookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Scissors className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Services</p>
                    <p className="font-display text-2xl text-foreground">{services?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Barbers</p>
                    <p className="font-display text-2xl text-foreground">{barbers?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="font-display text-2xl text-foreground">{bookings?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="services" className="space-y-6">
            <TabsList>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="barbers">Barbers</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <ServiceManager services={services || []} />
            </TabsContent>

            <TabsContent value="barbers">
              <BarberManager barbers={barbers || []} />
            </TabsContent>

            <TabsContent value="bookings">
              <BookingsList bookings={bookings || []} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

// Service Manager Component
function ServiceManager({ services }: { services: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "30",
  });
  const queryClient = useQueryClient();

  const saveService = useMutation({
    mutationFn: async () => {
      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(data)
          .eq("id", editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success(editingService ? "Service updated" : "Service created");
      setIsOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save service");
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Service removed");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", duration_minutes: "30" });
    setEditingService(null);
  };

  const openEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
    });
    setIsOpen(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-xl">Manage Services</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Haircut"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Classic haircut with styling"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div>
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={() => saveService.mutate()}
                disabled={saveService.isPending}
              >
                {saveService.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.filter(s => s.is_active).map((service) => (
            <div 
              key={service.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-semibold text-foreground">{service.name}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>${Number(service.price)}</span>
                  <span>{service.duration_minutes} mins</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={() => deleteService.mutate(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {services.filter(s => s.is_active).length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No services yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Barber Manager Component
function BarberManager({ barbers }: { barbers: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    specialties: "",
  });
  const queryClient = useQueryClient();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const getDefaultSchedule = () =>
    Object.fromEntries(days.map((_, index) => [index, { start: "09:00", end: "22:00" }]));
  const [schedule, setSchedule] = useState<{ [key: number]: { start: string; end: string } }>(
    getDefaultSchedule()
  );

  const saveBarber = useMutation({
    mutationFn: async () => {
      const data = {
        name: formData.name,
        bio: formData.bio,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
      };

      let barberId: string;

      if (editingBarber) {
        const { error } = await supabase
          .from("barbers")
          .update(data)
          .eq("id", editingBarber.id);
        if (error) throw error;
        barberId = editingBarber.id;

        // Delete existing schedules
        await supabase.from("barber_schedules").delete().eq("barber_id", barberId);
      } else {
        const { data: newBarber, error } = await supabase
          .from("barbers")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        barberId = newBarber.id;
      }

      // Insert schedules
      const scheduleData = Object.entries(schedule)
        .filter(([_, times]) => times.start && times.end)
        .map(([day, times]) => ({
          barber_id: barberId,
          day_of_week: parseInt(day),
          start_time: times.start,
          end_time: times.end,
        }));

      if (scheduleData.length > 0) {
        const { error } = await supabase.from("barber_schedules").insert(scheduleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-barbers"] });
      toast.success(editingBarber ? "Barber updated" : "Barber added");
      setIsOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save barber");
    },
  });

  const deleteBarber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("barbers")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-barbers"] });
      toast.success("Barber removed");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", bio: "", specialties: "" });
    setSchedule(getDefaultSchedule());
    setEditingBarber(null);
  };

  const openEdit = (barber: any) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      bio: barber.bio || "",
      specialties: barber.specialties?.join(", ") || "",
    });
    const existingSchedule: { [key: number]: { start: string; end: string } } = {};
    barber.barber_schedules?.forEach((s: any) => {
      existingSchedule[s.day_of_week] = {
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
      };
    });
    setSchedule(existingSchedule);
    setIsOpen(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-xl">Manage Barbers</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Barber
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBarber ? "Edit Barber" : "Add Barber"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Input
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="10 years experience..."
                />
              </div>
              <div>
                <Label>Specialties (comma separated)</Label>
                <Input
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Fades, Beard Trims"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" />
                  Weekly Schedule
                </Label>
                <div className="space-y-2">
                  {days.map((day, index) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-muted-foreground">{day}</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={schedule[index]?.start || ""}
                        onChange={(e) => setSchedule({
                          ...schedule,
                          [index]: { ...schedule[index], start: e.target.value }
                        })}
                        placeholder="09:00"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={schedule[index]?.end || ""}
                        onChange={(e) => setSchedule({
                          ...schedule,
                          [index]: { ...schedule[index], end: e.target.value }
                        })}
                        placeholder="18:00"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={() => saveBarber.mutate()}
                disabled={saveBarber.isPending}
              >
                {saveBarber.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {barbers.filter(b => b.is_active).map((barber) => (
            <div 
              key={barber.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-semibold text-foreground">{barber.name}</p>
                <p className="text-sm text-muted-foreground">
                  {barber.specialties?.join(", ") || "No specialties"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(barber)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={() => deleteBarber.mutate(barber.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {barbers.filter(b => b.is_active).length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No barbers yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Bookings List Component
function BookingsList({ bookings }: { bookings: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-accent/20 text-accent";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "cancelled": return "bg-destructive/20 text-destructive";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-xl">Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div 
              key={booking.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {booking.services?.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{format(parseISO(booking.booking_date), "MMM d, yyyy")}</span>
                  <span>{booking.start_time.slice(0, 5)}</span>
                  <span>{booking.barbers?.name}</span>
                  <span>{booking.profiles?.full_name || "Customer"}</span>
                </div>
              </div>
            </div>
          ))}
          {bookings.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No bookings yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
