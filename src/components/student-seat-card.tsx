"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Ticket, BookOpen, Building, Layers, School, Armchair, Calendar, Clock, Phone, AlertCircle } from "lucide-react";
import { format } from "date-fns";
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

  const handleWhatsAppAlert = () => {
    const examDateTime = new Date(seatDetails.examDateTime);
    // Placeholder for actual WhatsApp API integration
    toast({
      title: "WhatsApp Alert",
      description: `A simulated alert for the exam on ${format(examDateTime, "PPP p")} has been sent to ${seatDetails.contactNumber}.`,
    });
  };
  
  const examDateTime = new Date(seatDetails.examDateTime);

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
        <div className="p-4 rounded-lg border border-dashed border-accent space-y-1">
            <h3 className="text-lg font-semibold text-center mb-2 text-accent flex items-center justify-center gap-2"><AlertCircle className="text-accent"/> Exam Details</h3>
            <InfoRow icon={Calendar} label="Date" value={format(examDateTime, "PPP")} />
            <Separator />
            <InfoRow icon={Clock} label="Time" value={format(examDateTime, "p")} />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleWhatsAppAlert} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          Send WhatsApp Alert
        </Button>
      </CardFooter>
    </Card>
  );
}
