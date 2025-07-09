
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, Home as HomeIcon, LogIn, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { validateFacultyAction } from "@/lib/actions";
import AdminDashboard from "@/components/admin-dashboard";
import StudentDashboard from "@/components/student-dashboard";
import { Loader2 } from "lucide-react";

const AdminLoginSchema = z.object({
  facultyId: z.string().min(1, "Faculty ID is required."),
});
type AdminLoginType = z.infer<typeof AdminLoginSchema>;

const StudentLoginSchema = z.object({
  hallTicketNumber: z.string().min(1, "Hall ticket number is required."),
});
type StudentLoginType = z.infer<typeof StudentLoginSchema>;

export default function Home() {
  const [role, setRole] = useState<"admin" | "student" | "admin-dashboard" | "student-dashboard" | null>(null);
  const [hallTicketNumber, setHallTicketNumber] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const adminForm = useForm<AdminLoginType>({
    resolver: zodResolver(AdminLoginSchema),
    defaultValues: { facultyId: "" },
  });

  const studentForm = useForm<StudentLoginType>({
    resolver: zodResolver(StudentLoginSchema),
    defaultValues: { hallTicketNumber: "" },
  });

  const handleAdminLogin: SubmitHandler<AdminLoginType> = async (data) => {
    setIsPending(true);
    const result = await validateFacultyAction(data.facultyId);
    if (result.isValid) {
      setRole("admin-dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error || "Unauthorized Faculty ID.",
      });
    }
    setIsPending(false);
  };

  const handleStudentLogin: SubmitHandler<StudentLoginType> = (data) => {
    setIsPending(true);
    setHallTicketNumber(data.hallTicketNumber);
    setRole("student-dashboard");
    setIsPending(false);
  };
  
  const handleBackToHome = () => {
    setRole(null);
    setHallTicketNumber("");
    adminForm.reset();
    studentForm.reset();
  }

  const renderContent = () => {
    switch (role) {
      case "admin-dashboard":
        return <AdminDashboard />;
      case "student-dashboard":
        return <StudentDashboard hallTicketNumber={hallTicketNumber} onBackToHome={handleBackToHome} />;
      case "admin":
        return (
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>
                Please enter your Faculty ID to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...adminForm}>
                <form
                  onSubmit={adminForm.handleSubmit(handleAdminLogin)}
                  className="space-y-4"
                >
                  <FormField
                    control={adminForm.control}
                    name="facultyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faculty ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
                    Login
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
      case "student":
        return (
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Student Login</CardTitle>
              <CardDescription>
                Please enter your Hall Ticket Number to find your seat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...studentForm}>
                <form
                  onSubmit={studentForm.handleSubmit(handleStudentLogin)}
                  className="space-y-4"
                >
                  <FormField
                    control={studentForm.control}
                    name="hallTicketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hall Ticket Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your ticket number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
                    Find My Seat
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
              <CardTitle>Welcome to SeatAssignAI</CardTitle>
              <CardDescription>Please select your role to login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => setRole("admin")}
              >
                <LogIn className="mr-2" /> Admin Login
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setRole("student")}
              >
                <User className="mr-2" /> Student Login
              </Button>
            </CardContent>
          </Card>
        );
    }
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
       {role && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-8 right-8"
              onClick={handleBackToHome}
            >
              <HomeIcon />
              <span className="sr-only">Home</span>
            </Button>
        )}

      <main className="w-full flex items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
