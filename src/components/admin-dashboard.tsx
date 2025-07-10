
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createSeatingPlanAction, getSeatingDataAction, deleteSeatingDataAction } from "@/lib/actions";
import {
  FileUp,
  Loader2,
  Table,
  Trash2,
  Armchair,
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig, SeatingAssignment } from "@/lib/types";

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });


const GenerationFormSchema = z.object({
  seatingCapacity: z.string().min(1, "Seating capacity is required.").refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, { message: "Capacity must be a positive number."}),
  studentListDoc: z
    .any()
    .refine((files) => files?.length === 1, "Student list PDF file is required."),
});
type GenerationFormType = z.infer<typeof GenerationFormSchema>;


export default function AdminDashboard() {
  const [isPending, startTransition] = useTransition();
  const [seatingData, setSeatingData] = useState<{ plan: SeatingAssignment[], examConfig: ExamConfig } | null>(null);
  const { toast } = useToast();

  const form = useForm<GenerationFormType>({
    resolver: zodResolver(GenerationFormSchema),
    defaultValues: {
      seatingCapacity: "",
      studentListDoc: undefined,
    },
  });

  useEffect(() => {
    startTransition(async () => {
      const data = await getSeatingDataAction();
      if (data.plan && data.examConfig) {
        setSeatingData({
            plan: data.plan,
            examConfig: {
                ...data.examConfig,
                startDate: new Date(data.examConfig.startDate),
                endDate: new Date(data.examConfig.endDate),
            }
        });
      }
    });
  }, []);
  
  const onSubmit: SubmitHandler<GenerationFormType> = (data) => {
    startTransition(async () => {
      
      const studentFile = data.studentListDoc[0] as File;
      const studentListDataUri = await fileToDataUri(studentFile);
      const capacity = parseInt(data.seatingCapacity, 10);

      const result = await createSeatingPlanAction(
        capacity,
        studentListDataUri,
      );

      if (result.success && result.plan && result.examConfig) {
        toast({
          title: "Success",
          description: "Seating plan created successfully.",
        });
        setSeatingData({
            plan: result.plan,
            examConfig: {
                ...result.examConfig,
                startDate: new Date(result.examConfig.startDate),
                endDate: new Date(result.examConfig.endDate),
            }
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error Creating Plan",
          description: result.error || "An unexpected error occurred.",
        });
      }
    });
  };
  
  const handleDelete = () => {
    startTransition(async () => {
        const result = await deleteSeatingDataAction();
        if (result.success) {
            setSeatingData(null);
            form.reset();
            toast({
                title: 'Plan Deleted',
                description: 'The seating plan has been cleared.',
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            });
        }
    });
  };

  if (isPending && !seatingData) {
    return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading existing plan...</p>
        </div>
    )
  }

  if (seatingData) {
    return (
        <Card className="w-full max-w-7xl shadow-lg">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Generated Seating Plan</span>
                </CardTitle>
                <CardDescription>
                    The seating plan has been successfully generated.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SeatingTable data={seatingData.plan} />
            </CardContent>
            <CardFooter>
                 <Button onClick={handleDelete} variant="destructive" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2" />}
                    Delete Plan
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Table />
                Seating Plan Generator
            </CardTitle>
            <CardDescription>
              Provide the total capacity and student list to generate the plan.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="seatingCapacity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Armchair /> Total Seating Capacity</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 150" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                   <FormField
                        control={form.control}
                        name="studentListDoc"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <FileUp /> Student List File (PDF)
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => field.onChange(e.target.files)}
                                    />
                                </FormControl>
                                 <FormDescription>
                                    Upload the PDF with student details. Ensure it has headers: name, hallTicketNumber, branch, contactNumber.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={isPending}
                        >
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Table className="mr-2 h-4 w-4" />
                        )}
                        Generate Seating Plan
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
