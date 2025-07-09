"use client";

import FacultyView from "@/components/faculty-view";
import { Bot } from "lucide-react";

export default function Home() {

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-6xl mb-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">
                FacultyAuth<span className="text-primary">AI</span>
              </h1>
            </div>
        </div>
        <p className="text-muted-foreground text-center mt-2">
          Secure Document Access for Authorized Faculty
        </p>
      </header>

      <main className="w-full max-w-2xl flex justify-center">
        <FacultyView />
      </main>
    </div>
  );
}
