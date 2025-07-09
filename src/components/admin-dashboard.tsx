"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { deleteSeatingPlanAction, generateSeatingPlanAction, getSeatingPlanAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import SeatingChart from "./seating-chart";
import { Calendar as CalendarIcon, Loader2, Zap, Trash2, AlertTriangle, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FullSeatingPlan, SeatingPlan, ExamConfig } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
});

const AdminFormSchema = z.object({
  studentDataPdf: z.any().refine((files) => files?.length === 1, "Student data PDF is required."),
  seatingLayoutPdf: z.any().refine((files) => files?.length === 1, "Seating layout PDF is required."),
  examStartDate: z.date({ required_error: "Exam start date is required." }),
  examEndDate: z.date({ required_error: "Exam end date is required." }),
  examStartTime: z.object({
      hour: z.string().min(1, "Hour is required."),
      minute: z.string().min(1, "Minute is required."),
  }),
  examEndTime: z.object({
      hour: z.string().min(1, "Hour is required."),
      minute: z.string().min(1, "Minute is required."),
  }),
  useSamePlan: z.boolean().default(true),
}).refine(data => data.examEndDate >= data.examStartDate, {
    message: "End date cannot be before start date.",
    path: ["examEndDate"],
});

type AdminFormType = z.infer<typeof AdminFormSchema>;

export default function AdminDashboard() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [seatingData, setSeatingData] = useState<FullSeatingPlan | null>(null);

  const fetchSeatingPlan = useCallback(async () => {
    setIsLoading(true);
    const data = await getSeatingPlanAction();
    if (data) {
        setSeatingData(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSeatingPlan();
  }, [fetchSeatingPlan]);


  const form = useForm<AdminFormType>({
    resolver: zodResolver(AdminFormSchema),
    defaultValues: {
        examStartTime: { hour: '10', minute: '00' },
        examEndTime: { hour: '13', minute: '00' },
        useSamePlan: true,
    }
  });

  const onSubmit: SubmitHandler<AdminFormType> = (data) => {
    startTransition(async () => {
      const studentFile = data.studentDataPdf[0] as File;
      const studentDataUri = await fileToDataUri(studentFile);

      const layoutFile = data.seatingLayoutPdf[0] as File;
      const layoutDataUri = await fileToDataUri(layoutFile);
      
      const examConfig: ExamConfig = {
        startDate: data.examStartDate.toISOString(),
        endDate: data.examEndDate.toISOString(),
        startTime: data.examStartTime,
        endTime: data.examEndTime,
        useSamePlan: data.useSamePlan,
      };

      const result = await generateSeatingPlanAction(studentDataUri, layoutDataUri, examConfig);

      if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else if (result.plan) {
        toast({ title: "Success", description: "Seating arrangement generated and saved successfully!" });
        setSeatingData({ plan: result.plan, examConfig });
      }
    });
  };
  
  const handleDeletePlan = () => {
    startTransition(async () => {
        const result = await deleteSeatingPlanAction();
        if (result.success) {
            setSeatingData(null);
            form.reset();
            toast({ title: "Success", description: "The seating plan has been deleted." });
        } else {
            toast({ variant: "destructive", title: "Error", description: "Could not delete the seating plan." });
        }
    });
  }

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Loading Admin Dashboard...</p>
        </div>
    )
  }

  if (seatingData) {
    const { startDate, endDate, startTime, endTime } = seatingData.examConfig;
    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Existing Seating Chart</CardTitle>
                        <CardDescription>
                            A seating plan is generated for exams from {format(new Date(startDate), "PPP")} to {format(new Date(endDate), "PPP")},
                            daily from {startTime.hour}:{startTime.minute} to {endTime.hour}:{endTime.minute}.
                        </CardDescription>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="mr-2"/> Delete Plan</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the current seating plan
                                and all associated data.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePlan} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 animate-spin"/>}
                                Continue
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent>
                <SeatingChart plan={seatingData.plan} />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
        <CardDescription>
          Upload PDFs, set the exam schedule, and generate the seating arrangement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="studentDataPdf"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Student Data (PDF)</FormLabel>
                    <FormControl>
                        <Input type="file" accept="application/pdf" onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="seatingLayoutPdf"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Seating Layout (PDF)</FormLabel>
                    <FormControl>
                        <Input type="file" accept="application/pdf" onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="space-y-4">
                <div>
                    <FormLabel>Exam Date Range</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <FormField control={form.control} name="examStartDate" render={({ field }) => (
                            <FormItem>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a start date</span>}
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="examEndDate" render={({ field }) => (
                            <FormItem>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                 <div>
                    <FormLabel>Daily Exam Time</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 items-center">
                        <p className="text-sm text-muted-foreground text-center">Start</p>
                        <FormField control={form.control} name="examStartTime.hour" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger></FormControl><SelectContent>{Array.from({length: 12}, (_, i) => i + 8).map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        <FormField control={form.control} name="examStartTime.minute" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Minute" /></SelectTrigger></FormControl><SelectContent>{['00', '15', '30', '45'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        <div/>
                        <p className="text-sm text-muted-foreground text-center">End</p>
                        <FormField control={form.control} name="examEndTime.hour" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger></FormControl><SelectContent>{Array.from({length: 12}, (_, i) => i + 10).map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        <FormField control={form.control} name="examEndTime.minute" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Minute" /></SelectTrigger></FormControl><SelectContent>{['00', '15', '30', '45'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                    </div>
                </div>
            </div>

            <FormField
              control={form.control}
              name="useSamePlan"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Use Same Seating Plan for All Exam Days</FormLabel>
                    <FormDescription>
                      If enabled, the same seat is assigned to each student for the entire exam duration.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Generate & Save Seating Plan
            </Button>
          </form>
        </Form>
        
        {isPending && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium">AI is thinking... Reading PDFs and allocating seats.</p>
                <p className="text-sm">This may take a moment. The plan will be saved upon completion.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
