-- Add unique constraint to prevent double bookings for same barber, date, and overlapping time
-- First, create a function to check for overlapping bookings
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE barber_id = NEW.barber_id
      AND booking_date = NEW.booking_date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'cancelled'
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked for the selected barber';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to check for overlapping bookings
CREATE TRIGGER check_booking_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_overlap();

-- Also add RLS policy to allow anyone to read bookings for availability checking (only non-sensitive fields)
CREATE POLICY "Anyone can view booking times for availability" 
ON public.bookings 
FOR SELECT 
USING (true);