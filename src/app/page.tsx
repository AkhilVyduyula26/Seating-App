
"use client";

import { useState } from "react";
import { Bot, Home as HomeIcon } from "lucide-react";
import AdminDashboard from "@/components/admin-dashboard";
import FacultyView from "@/components/faculty-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [view, setView] = useState<"tabs" | "admin-dashboard" | "faculty-view">("tabs");

  const handleBackToHome = () => {
    setView("tabs");
  };

  const renderContent = () => {
    switch (view) {
      case "admin-dashboard":
        return <AdminDashboard />;
      case "faculty-view":
        return <FacultyView />;
      default:
        return (
           <Tabs defaultValue="seating" className="w-full max-w-4xl">
              <div className="flex justify-center mb-4">
                <TabsList>
                    <TabsTrigger value="seating">Seating Plan Generator</TabsTrigger>
                    <TabsTrigger value="faculty">Faculty Tools</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="seating">
                <AdminDashboard />
              </TabsContent>
              <TabsContent value="faculty">
                <FacultyView />
              </TabsContent>
            </Tabs>
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
       
       <Button
            variant="ghost"
            size="icon"
            className="absolute top-8 right-8"
            onClick={() => window.location.reload()}
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
