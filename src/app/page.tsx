"use client";

import { useState } from "react";
import type {
  GenerateSeatingArrangementInput,
  GenerateSeatingArrangementOutput,
} from "@/ai/flows/generate-seating-arrangement";
import AdminDashboard from "@/components/admin-dashboard";
import StudentView from "@/components/student-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, User, Users } from "lucide-react";

// Combined type for easy access across components
export type SeatingPlan = GenerateSeatingArrangementOutput["seatingAssignments"][0] & {
  name: string;
  branch: string;
  contactNumber: string;
};

export default function Home() {
  const [seatingPlan, setSeatingPlan] = useState<SeatingPlan[]>([]);

  const handleSeatingPlanGenerated = (
    plan: GenerateSeatingArrangementOutput,
    students: GenerateSeatingArrangementInput["students"]
  ) => {
    // Combine the generated plan with original student data for richer display
    const combinedPlan = plan.seatingAssignments.map((assignment) => {
      const student = students.find(
        (s) => s.hallTicketNumber === assignment.hallTicketNumber
      );
      return {
        ...assignment,
        name: student?.name || "N/A",
        branch: student?.branch || "N/A",
        contactNumber: student?.contactNumber || "N/A",
      };
    });
    setSeatingPlan(combinedPlan);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-6xl mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">
            SeatAssign<span className="text-primary">AI</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Automated Seating Allocation for Examinations
        </p>
      </header>

      <main className="w-full max-w-6xl">
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="admin">
              <Users className="mr-2 h-4 w-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="student">
              <User className="mr-2 h-4 w-4" />
              Student
            </TabsTrigger>
          </TabsList>
          <TabsContent value="admin">
            <AdminDashboard onSeatingPlanGenerated={handleSeatingPlanGenerated} />
          </TabsContent>
          <TabsContent value="student">
            <StudentView seatingPlan={seatingPlan} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
