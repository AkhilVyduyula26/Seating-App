"use client";

import { useState, useTransition } from "react";
import AdminDashboard from "@/components/admin-dashboard";
import StudentDashboard from "@/components/student-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Bot, Loader2, AlertCircle } from "lucide-react";
import { validateFacultyIdAction } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type View = "home" | "adminLogin" | "adminDashboard" | "studentDashboard";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [hallTicketNumber, setHallTicketNumber] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdminLogin = () => {
    setError(null);
    startTransition(async () => {
      const result = await validateFacultyIdAction(facultyId);
      if (result.isValid) {
        setView("adminDashboard");
      } else {
        setError(result.error || "Unauthorized Faculty ID");
      }
    });
  };

  const handleStudentLogin = () => {
    if (hallTicketNumber) {
      setView("studentDashboard");
    }
  };

  const renderHome = () => (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Please select your role to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" onClick={() => setView("adminLogin")}>
          <Shield className="mr-2 h-4 w-4" /> Admin Login
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
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
            <User className="mr-2 h-4 w-4" /> Student Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderAdminLogin = () => (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>
          Please enter your Faculty ID to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="faculty-id">Faculty ID</Label>
          <Input
            id="faculty-id"
            type="text"
            placeholder="Enter your Faculty ID"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
        </div>
        <Button className="w-full" onClick={handleAdminLogin} disabled={isPending || !facultyId}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
          Proceed
        </Button>
        <Button variant="link" className="w-full" onClick={() => { setView("home"); setError(null); }}>
          Back to main login
        </Button>
      </CardContent>
    </Card>
  );

  if (view === "adminDashboard") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center p-4 lg:p-8">
        <header className="text-center mb-8">
          <div className="flex items-center gap-2 justify-center">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">
              SeatAssign<span className="text-primary">AI</span>
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            AI-powered Seating Arrangement for Exams
          </p>
        </header>
        <AdminDashboard />
      </div>
    );
  }

  if (view === "studentDashboard") {
    return <StudentDashboard hallTicketNumber={hallTicketNumber} onBackToHome={() => {
      setView("home");
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
      {view === 'home' && renderHome()}
      {view === 'adminLogin' && renderAdminLogin()}
    </div>
  );
}
