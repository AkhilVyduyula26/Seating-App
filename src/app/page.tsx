"use client";

import { useState } from "react";
import type { GenerateSeatingArrangementOutput, Student } from "@/ai/flows/generate-seating-arrangement";
import AdminDashboard from "@/components/admin-dashboard";
import StudentView from "@/components/student-view";
import { Bot, LogIn, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Combined type for easy access across components
export type SeatingPlan = GenerateSeatingArrangementOutput["seatingAssignments"][0] & {
  name: string;
  branch: string;
  contactNumber: string;
};

// Mock authentication state
type User = {
  role: "admin" | "student" | null;
};

export default function Home() {
  const [seatingPlan, setSeatingPlan] = useState<SeatingPlan[]>([]);
  const [user, setUser] = useState<User>({ role: null });
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student' | ''>('');

  const handleSeatingPlanGenerated = (
    plan: {seatingAssignments: GenerateSeatingArrangementOutput["seatingAssignments"]},
    students: Student[]
  ) => {
    // Combine the generated plan with parsed student data for richer display
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
  
  const handleLogin = () => {
      if (selectedRole) {
          setUser({ role: selectedRole });
      }
  };

  const handleLogout = () => {
    setUser({ role: null });
    setSeatingPlan([]);
    setSelectedRole('');
  }

  const renderContent = () => {
    if (user.role === 'admin') {
      return <AdminDashboard onSeatingPlanGenerated={handleSeatingPlanGenerated} />;
    }
    if (user.role === 'student') {
      return <StudentView seatingPlan={seatingPlan} />;
    }
    // Login View
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Select your role to proceed. (This is a mock login for demonstration).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select value={selectedRole} onValueChange={(value: 'admin' | 'student' | '') => setSelectedRole(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleLogin} className="w-full" disabled={!selectedRole}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                </Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">
                SeatAssign<span className="text-primary">AI</span>
              </h1>
            </div>
            {user.role && (
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  Logout
                </Button>
            )}
        </div>
        {!user.role && (
          <p className="text-muted-foreground text-center mt-2">
            Automated Seating Allocation for Examinations
          </p>
        )}
      </header>

      <main className="w-full max-w-4xl flex justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
