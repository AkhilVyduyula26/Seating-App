
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
  CalendarIcon,
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig, SeatingAssignment, LayoutConfig } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const LayoutFormSchema = z.object({
  seatingCapacity: z.coerce.number().min(1, "Seating capacity is required."),
  blocks: z.coerce.number().min(1, "Number of blocks is required."),
  floors: z.coerce.number().min(1, "Number of floors is required."),
  rooms: z.coerce.number().min(1, "Number of rooms is required."),
  roomNumbers: z.string().min(1, "Room numbers are required."),
  benchesPerRoom: z.coerce.number().min(1, "Benches per room is required."),
  studentsPerBench: z.coerce.number().min(1, "Students per bench is required."),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date({ required_error: "An end date is required." }),
  examTimings: z.string().min(1, "Exam timings are required."),
});
type LayoutFormType = z.infer<typeof LayoutFormSchema>;

const GenerationFormSchema = z.object({
  studentListDoc: z
    .any()
    .refine((files) => files?.length === 1, "Student list PDF file is required."),
});
type GenerationFormType = z.infer<typeof GenerationFormSchema>;

interface DisplaySeatingData {
    plan: SeatingAssignment[];
    examConfig: ExamConfig & {
        startDate: Date;
        endDate: Date;
    };
}

export default function AdminDashboard() {
  const [step, setStep] = useState(1);
  const [layoutConfig, setLayoutConfig] = useState<LayoutFormType | null>(null);
  const [isGenerating, startGeneration] = useTransition();
  const [isDeleting, startDeletion] = useTransition();
  const [isLoading, startLoading] = useTransition();
  const [seatingData, setSeatingData] = useState<DisplaySeatingData | null>(null);
  const { toast } = useToast();

  const layoutForm = useForm<LayoutFormType>({
    resolver: zodResolver(LayoutFormSchema),
    defaultValues: {
      seatingCapacity: '' as any,
      blocks: '' as any,
      floors: '' as any,
      rooms: '' as any,
      roomNumbers: "",
      benchesPerRoom: '' as any,
      studentsPerBench: '' as any,
      examTimings: "09:00 AM to 12:00 PM",
    }
  });
  
  const generationForm = useForm<GenerationFormType>({
    resolver: zodResolver(GenerationFormSchema),
  });

  useEffect(() => {
    startLoading(async () => {
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
  
  const handleLayoutSubmit: SubmitHandler<LayoutFormType> = (data) => {
    setLayoutConfig(data);
    setStep(2);
  };

  const handleGenerationSubmit: SubmitHandler<GenerationFormType> = (data) => {
    startGeneration(async () => {
      if (!layoutConfig) {
        toast({ variant: "destructive", title: "Error", description: "Layout configuration is missing." });
        return;
      }
      
      const studentFile = data.studentListDoc[0] as File;
      const studentListDataUri = await fileToDataUri(studentFile);

      const result = await createSeatingPlanAction(
        studentListDataUri,
        layoutConfig
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
    startDeletion(async () => {
        const result = await deleteSeatingDataAction();
        if (result.success) {
            setSeatingData(null);
            setStep(1);
            setLayoutConfig(null);
            layoutForm.reset();
            generationForm.reset();
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

  if (isLoading) {
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
                 <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2" />}
                    Delete Plan
                </Button>
            </CardFooter>
        </Card>
    );
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Seating Setup - Step 1: Layout Configuration</CardTitle>
          <CardDescription>
            Define the physical layout of your examination halls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...layoutForm}>
            <form onSubmit={layoutForm.handleSubmit(handleLayoutSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={layoutForm.control} name="seatingCapacity" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Seating Capacity</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="blocks" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Number of Blocks</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="floors" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Number of Floors</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="rooms" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Number of Rooms</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="roomNumbers" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Room Numbers (comma-separated)</FormLabel>
                        <FormControl><Input placeholder="e.g., 101,102,201" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="benchesPerRoom" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Benches per Room</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 15" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="studentsPerBench" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Students per Bench</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="examTimings" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Exam Timings</FormLabel>
                        <FormControl><Input placeholder="e.g., 09:00 AM to 12:00 PM" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={layoutForm.control} name="startDate" render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Exam Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={layoutForm.control} name="endDate" render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Exam End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
              <Button type="submit" className="w-full">
                Continue to Step 2
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    )
  }
  
  if (step === 2) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Seating Setup - Step 2: Upload Student List</CardTitle>
          <CardDescription>
            Upload the student list in PDF format. The system will use the layout from Step 1 to generate the seating arrangement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...generationForm}>
            <form onSubmit={generationForm.handleSubmit(handleGenerationSubmit)} className="space-y-6">
              <FormField
                control={generationForm.control}
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
                      Ensure the PDF has headers: name, hallTicketNumber, branch,
                      contactNumber.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="w-1/3">Back to Step 1</Button>
                <Button
                  type="submit"
                  className="w-2/3"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Table className="mr-2 h-4 w-4" />
                  )}
                  Generate Seating Plan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return null;
}
