"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { User, Ticket, BookOpen, Building, Layers, School, Armchair, Calendar, Clock, Phone, AlertCircle, MessageCircle } from "lucide-react";
import { eachDayOfInterval, format } from "date-fns";
import type { StudentSeatDetails } from "@/lib/types";

interface StudentSeatCardProps {
  seatDetails: StudentSeatDetails;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default function StudentSeatCard({ seatDetails }: StudentSeatCardProps) {
  const { toast } = useToast();
  const { examConfig } = seatDetails;

  const handleWhatsAppAlert = () => {
    // This simulates subscribing the user to automated reminders.
    // In a real application, this might call a backend endpoint to register the user's number for scheduled messages via Twilio or Gupshup.
    toast({
      title: "Subscribed to WhatsApp Alerts",
      description: `You will receive a reminder at ${seatDetails.contactNumber} 1 hour before each exam. The message will be: "Your exam is in 1 hour. Please log in to the seating app to check your seat. All the best!"`,
    });
  };

  const getExamDates = () => {
    try {
      const dates = eachDayOfInterval({
        start: new Date(examConfig.startDate),
        end: new Date(examConfig.endDate),
      });
      return dates;
    } catch (e) {
      console.error("Invalid date range:", e);
      // Fallback to just the start date in case of an error with the date range
      return [new Date(examConfig.startDate)];
    }
  };

  const examDates = getExamDates();
  const startTime = `${examConfig.startTime.hour}:${examConfig.startTime.minute}`;
  const endTime = `${examConfig.endTime.hour}:${examConfig.endTime.minute}`;


  return (
    <Card className="bg-card border-primary/20 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Examination Seating Information</CardTitle>
        <CardDescription>
          Please find your allocated seat details below. All the best!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-secondary/50 space-y-1">
            <InfoRow icon={User} label="Name" value={seatDetails.name} />
            <Separator />
            <InfoRow icon={Ticket} label="Hall Ticket No." value={seatDetails.hallTicketNumber} />
            <Separator />
            <InfoRow icon={BookOpen} label="Branch" value={seatDetails.branch} />
            <Separator />
            <InfoRow icon={Phone} label="Contact" value={seatDetails.contactNumber} />
        </div>
        <div className="p-4 rounded-lg bg-secondary/50 space-y-1">
            <h3 className="text-lg font-semibold text-center mb-2 text-primary">Seating Arrangement</h3>
            <InfoRow icon={Building} label="Block" value={seatDetails.block} />
            <Separator />
            <InfoRow icon={Layers} label="Floor" value={seatDetails.floor} />
            <Separator />
            <InfoRow icon={School} label="Classroom" value={seatDetails.classroom} />
            <Separator />
            <InfoRow icon={Armchair} label="Bench Number" value={seatDetails.benchNumber} />
        </div>
        
        <div className="p-4 rounded-lg border border-dashed border-accent space-y-2">
            <h3 className="text-lg font-semibold text-center mb-2 text-accent flex items-center justify-center gap-2"><AlertCircle className="text-accent"/> Exam Schedule</h3>
            <InfoRow icon={Clock} label="Daily Time" value={`${startTime} - ${endTime}`} />
            <Separator />
            <div>
              <div className="flex items-center gap-3 py-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Exam Dates</p>
              </div>
              <ScrollArea className="h-24 rounded-md border p-2 bg-background">
                  <ul className="space-y-1">
                      {examDates.map((date, index) => (
                          <li key={index} className="text-sm font-semibold text-foreground text-center">
                              {format(date, "EEEE, PPP")}
                          </li>
                      ))}
                  </ul>
              </ScrollArea>
              {seatDetails.examConfig.useSamePlan && (
                <p className="text-xs text-muted-foreground text-center mt-2">Your seating location is the same for all exam dates.</p>
              )}
            </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleWhatsAppAlert} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <MessageCircle className="mr-2" /> Get WhatsApp Reminders
        </Button>
      </CardFooter>
    </Card>
  );
}
