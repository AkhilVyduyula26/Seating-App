"use client";

import { useState, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  GenerateSeatingArrangementOutput,
  Student
} from "@/ai/flows/generate-seating-arrangement";
import { generateSeatingPlanAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import SeatingChart from "./seating-chart";
import { Loader2, Zap } from "lucide-react";

interface AdminDashboardProps {
  onSeatingPlanGenerated: (
    plan: {seatingAssignments: GenerateSeatingArrangementOutput["seatingAssignments"]},
    students: Student[]
  ) => void;
}

const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
        reject(error);
    };
    reader.readAsDataURL(file);
});


const AdminFormSchema = z.object({
  studentDataPdf: z
    .any()
    .refine((files) => files?.length === 1, "PDF file is required.")
    .refine((files) => files?.[0]?.type === "application/pdf", "Must be a PDF file.")
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`),
  seatingCapacity: z.string().min(1, "Seating capacity is required.").refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, {
    message: "Capacity must be a positive number.",
  }),
});

type AdminFormType = z.infer<typeof AdminFormSchema>;

export default function AdminDashboard({ onSeatingPlanGenerated }: AdminDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [generatedPlan, setGeneratedPlan] = useState<{seatingAssignments: GenerateSeatingArrangementOutput["seatingAssignments"]} | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const form = useForm<AdminFormType>({
    resolver: zodResolver(AdminFormSchema),
    defaultValues: {
      seatingCapacity: "",
    },
  });

  const onSubmit: SubmitHandler<AdminFormType> = (data) => {
    startTransition(async () => {
      setGeneratedPlan(null);
      setStudents([]);
      
      const file = data.studentDataPdf[0] as File;
      const pdfDataUri = await fileToDataUri(file);

      const result = await generateSeatingPlanAction(
        pdfDataUri,
        data.seatingCapacity
      );

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      } else if (result.plan && result.students) {
        toast({
          title: "Success",
          description: "Seating arrangement generated successfully!",
        });
        setGeneratedPlan(result.plan);
        setStudents(result.students);
        onSeatingPlanGenerated(result.plan, result.students);
      }
    });
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
        <CardDescription>
          Upload a PDF with student data and set the total seating capacity to generate the arrangement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="studentDataPdf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Data (PDF)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => field.onChange(e.target.files)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seatingCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seating Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Generate Seating Plan
            </Button>
          </form>
        </Form>
        
        {isPending && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium">AI is thinking... Reading PDF and allocating seats.</p>
                <p className="text-sm">This may take a moment.</p>
            </div>
        )}

        {generatedPlan && students.length > 0 && !isPending && (
          <div className="mt-8 animate-in fade-in duration-500">
            <SeatingChart assignments={generatedPlan.seatingAssignments} students={students} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
