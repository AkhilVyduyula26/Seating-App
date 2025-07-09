"use client";

import { useEffect, useState, useTransition } from "react";
import { getSeatingDataAction } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, User, Home, MapPin, Building, School, Armchair, AlertCircle, BellRing } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { ExamConfig, SeatingAssignment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";


function getExamDates(startDate: Date, endDate: Date): Date[] {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= new Date(endDate)) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

export default function StudentDashboard({ hallTicketNumber, onBackToHome }: { hallTicketNumber: string, onBackToHome: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [studentData, setStudentData] = useState<SeatingAssignment | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const data = await getSeatingDataAction();
      if (data.error) {
        setError(data.error);
        return;
      }
      if (!data.plan || !data.examConfig) {
        setError("Seating plan has not been generated yet. Please check back later.");
        return;
      }
      const student = data.plan.find(
        (s: SeatingAssignment) => s.hallTicketNumber === hallTicketNumber
      );
      if (student) {
        setStudentData(student);
        setExamConfig({
            ...data.examConfig,
            startDate: new Date(data.examConfig.startDate),
            endDate: new Date(data.examConfig.endDate),
        });
      } else {
        setError("Hall ticket number not found in the seating plan.");
      }
    });
  }, [hallTicketNumber]);

  const handleAlertClick = () => {
    toast({
        title: "WhatsApp Alert Scheduled",
        description: `You will receive a reminder: "Your exam is in 1 hour. Please log in to the seating app to check your seat. All the best!" one hour before each exam.`
    })
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
         <Card className="w-full max-w-md shadow-lg">
             <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Student Login</span>
                     <Button variant="ghost" size="icon" onClick={onBackToHome}>
                        <Home />
                    </Button>
                </CardTitle>
             </CardHeader>
             <CardContent>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </CardContent>
         </Card>
      </div>
    );
  }

  if (!studentData || !examConfig) {
    return null; // Should be handled by error state
  }
  
  const examDates = getExamDates(examConfig.startDate, examConfig.endDate);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <User />
                        Your Exam Seating Details
                    </div>
                    <Button variant="ghost" size="icon" onClick={onBackToHome}>
                        <Home />
                    </Button>
                </CardTitle>
                <CardDescription>
                    Hello, {studentData.name}! Here is your assigned seat for the upcoming exams.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                        <MapPin className="text-primary" />
                        <div>
                            <p className="font-semibold">Block</p>
                            <p>{studentData.block}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                        <Building className="text-primary" />
                        <div>
                            <p className="font-semibold">Floor</p>
                            <p>{studentData.floor}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                        <School className="text-primary" />
                        <div>
                            <p className="font-semibold">Classroom</p>
                            <p>{studentData.classroom}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                        <Armchair className="text-primary" />
                        <div>
                            <p className="font-semibold">Bench</p>
                            <p>{studentData.benchNumber}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-semibold">Exam Schedule:</h4>
                    <div className="flex flex-wrap gap-2">
                        {examDates.map(date => (
                            <Badge key={date.toISOString()} variant="secondary">{format(date, 'EEE, MMM d')}</Badge>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Your seat remains the same for all dates listed above.</p>
                </div>
                 <div className="space-y-2">
                     <h4 className="font-semibold">Exam Timings:</h4>
                     <p className="text-sm">Daily from <strong>{examConfig.startTime.hour}:{examConfig.startTime.minute}</strong> to <strong>{examConfig.endTime.hour}:{examConfig.endTime.minute}</strong></p>
                 </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleAlertClick}>
                    <BellRing className="mr-2" />
                    Set Exam Reminder
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
