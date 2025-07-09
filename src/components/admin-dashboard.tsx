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
  Home,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Repeat
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  
const timeOptions = (interval: number) => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return options;
};

const AdminDashboardSchema = z.object({
  studentListPdf: z
    .any()
    .refine((files) => files?.length === 1, "Student list PDF is required."),
  seatingLayoutPdf: z
    .any()
    .refine((files) => files?.length === 1, "Seating layout PDF is required."),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  startTime: z.string({ required_error: "Start time is required." }),
  endTime: z.string({ required_error: "End time is required." }),
  useSamePlan: z.boolean().default(false),
}).refine(data => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});

type AdminDashboardType = z.infer<typeof AdminDashboardSchema>;

export default function AdminDashboard({ onBackToHome }: { onBackToHome: () => void; }) {
  const [isPending, startTransition] = useTransition();
  const [seatingData, setSeatingData] = useState<{ plan: any[], examConfig: ExamConfig } | null>(null);
  const { toast } = useToast();

  const form = useForm<AdminDashboardType>({
    resolver: zodResolver(AdminDashboardSchema),
    defaultValues: {
        useSamePlan: true,
        startTime: '10:30',
        endTime: '12:30',
    }
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

  const onSubmit: SubmitHandler<AdminDashboardType> = (data) => {
    startTransition(async () => {
      const studentFile = data.studentListPdf[0] as File;
      const layoutFile = data.seatingLayoutPdf[0] as File;
      
      const [studentListDataUri, seatingLayoutDataUri] = await Promise.all([
        fileToDataUri(studentFile),
        fileToDataUri(layoutFile),
      ]);
        
      const examConfig: ExamConfig = {
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: {
            hour: data.startTime.split(':')[0],
            minute: data.startTime.split(':')[1],
        },
        endTime: {
            hour: data.endTime.split(':')[0],
            minute: data.endTime.split(':')[1],
        },
        useSamePlan: data.useSamePlan,
      };

      const result = await createSeatingPlanAction(
        studentListDataUri,
        seatingLayoutDataUri,
        examConfig,
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Seating plan created successfully.",
        });
        const savedData = await getSeatingDataAction();
        if (savedData.plan && savedData.examConfig) {
            setSeatingData({
                plan: savedData.plan,
                examConfig: {
                    ...savedData.examConfig,
                    startDate: new Date(savedData.examConfig.startDate),
                    endDate: new Date(savedData.examConfig.endDate),
                }
            });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
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

  if (seatingData) {
    const { startDate, endDate, startTime, endTime } = seatingData.examConfig;
    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Generated Seating Plan</span>
                    <Button variant="ghost" size="icon" onClick={onBackToHome}>
                        <Home />
                    </Button>
                </CardTitle>
                <CardDescription>
                    The seating plan has been successfully generated for exams from {format(startDate, 'PPP')} to {format(endDate, 'PPP')} between {startTime.hour}:{startTime.minute} and {endTime.hour}:{endTime.minute}.
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
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Table />
                Admin Dashboard
            </div>
            <Button variant="ghost" size="icon" onClick={onBackToHome}>
                <Home />
            </Button>
        </CardTitle>
        <CardDescription>
          Upload student and seating layout PDFs to generate the exam seating arrangement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="studentListPdf"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2">
                        <FileUp /> Student List PDF
                    </FormLabel>
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
                name="seatingLayoutPdf"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2">
                        <FileUp /> Seating Layout PDF
                    </FormLabel>
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
            </div>

            <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium flex items-center gap-2"><CalendarIcon /> Exam Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                        date < (form.getValues("startDate") || new Date())
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2"><Clock /> Start Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select start time" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeOptions(30).map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2"><Clock /> End Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select end time" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeOptions(30).map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="useSamePlan"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2"><Repeat /> Use Same Seating Plan for All Exam Days</FormLabel>
                            <FormDescription>
                            If enabled, the same seat is assigned for all days.
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
            </div>
            
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
              Create Seating Plan
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
