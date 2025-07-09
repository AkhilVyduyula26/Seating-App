"use client";

import { useState } from "react";
import AdminDashboard from "@/components/admin-dashboard";
import StudentDashboard from "@/components/student-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Bot } from "lucide-react";

type Role = "admin" | "student" | null;

export default function Home() {
  const [role, setRole] = useState<Role>(null);
  const [hallTicketNumber, setHallTicketNumber] = useState("");

  const handleStudentLogin = () => {
    if (hallTicketNumber) {
      setRole("student");
    }
  };
  
  if (role === "admin") {
    return <AdminDashboard onBackToHome={() => setRole(null)} />;
  }
  if (role === "student") {
    return <StudentDashboard hallTicketNumber={hallTicketNumber} onBackToHome={() => {
      setRole(null);
      setHallTicketNumber('');
    }} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <header className="absolute top-8 text-center">
        <div className="flex items-center gap-2 justify-center">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">
            SeatAssign<span className="text-primary">AI</span>
            </h1>
        </div>
        <p className="text-muted-foreground mt-2">
            AI-powered seating arrangement for exams
        </p>
      </header>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Please select your role to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => setRole("admin")}
          >
            <Shield className="mr-2" /> Admin Login
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or
                </span>
            </div>
          </div>
          <div className="space-y-2">
             <Label htmlFor="hall-ticket">Student Hall Ticket Number</Label>
             <Input
              id="hall-ticket"
              type="text"
              placeholder="Enter your hall ticket number"
              value={hallTicketNumber}
              onChange={(e) => setHallTicketNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStudentLogin()}
            />
            <Button
              className="w-full"
              onClick={handleStudentLogin}
              disabled={!hallTicketNumber}
            >
              <User className="mr-2" /> Student Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
