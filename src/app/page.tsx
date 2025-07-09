
"use client";

import { useState } from "react";
import { Bot, Home as HomeIcon, LogIn } from "lucide-react";
import AdminDashboard from "@/components/admin-dashboard";
import FacultyView from "@/components/faculty-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from "react";
import { validateFacultyAction } from "@/lib/actions";
import StudentDashboard from "@/components/student-dashboard";


export default function Home() {
  const [role, setRole] = useState<"admin" | "student" | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [facultyId, setFacultyId] = useState("");
  const [hallTicketNumber, setHallTicketNumber] = useState("");
  const [submittedHallTicket, setSubmittedHallTicket] = useState("");
  const { toast } = useToast();

  const handleAdminLogin = () => {
     startTransition(async () => {
        const result = await validateFacultyAction(facultyId);
        if (result.isValid) {
            setIsLoggedIn(true);
        } else {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: result.error || "Unauthorized Faculty ID",
            });
        }
    });
  };

  const handleStudentLogin = () => {
    if (hallTicketNumber.trim()) {
        setSubmittedHallTicket(hallTicketNumber);
        setIsLoggedIn(true);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Input",
            description: "Please enter a hall ticket number.",
        });
    }
  };
  
  const handleBackToHome = () => {
    setRole(null);
    setIsLoggedIn(false);
    setFacultyId("");
    setHallTicketNumber("");
    setSubmittedHallTicket("");
  }


  const renderContent = () => {
    if (isLoggedIn) {
        if (role === 'admin') {
            return <AdminDashboard />;
        }
        if (role === 'student' && submittedHallTicket) {
            return <StudentDashboard hallTicketNumber={submittedHallTicket} onBackToHome={handleBackToHome} />;
        }
    }
    
    if (role) {
        return (
             <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LogIn />
                        {role === 'admin' ? 'Admin Login' : 'Student Login'}
                    </CardTitle>
                    <CardDescription>
                        Please enter your credentials to proceed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {role === 'admin' ? (
                        <Input 
                            placeholder="Enter Faculty ID"
                            value={facultyId}
                            onChange={(e) => setFacultyId(e.target.value)}
                            disabled={isPending}
                        />
                    ) : (
                         <Input 
                            placeholder="Enter Hall Ticket Number"
                            value={hallTicketNumber}
                            onChange={(e) => setHallTicketNumber(e.target.value)}
                         />
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                     <Button 
                        className="w-full" 
                        onClick={role === 'admin' ? handleAdminLogin : handleStudentLogin}
                        disabled={isPending}
                    >
                        {isPending ? "Logging in..." : "Login"}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleBackToHome}>
                        Back
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>Please select your role to login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Button
                    className="w-full"
                    onClick={() => setRole("admin")}
                >
                    Admin Login
                </Button>
                 <Button
                    className="w-full"
                    onClick={() => setRole("student")}
                >
                    Student Login
                </Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 lg:p-8">
      <header className="absolute top-8 w-full text-center">
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
       
       <Button
            variant="ghost"
            size="icon"
            className="absolute top-8 right-8"
            onClick={handleBackToHome}
        >
            <HomeIcon />
            <span className="sr-only">Home</span>
        </Button>

      <main className="w-full flex items-center justify-center pt-24">
        {renderContent()}
      </main>
    </div>
  );
}
