
"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
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
  PlusCircle,
  Building,
  School,
  Armchair,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig, SeatingAssignment, ClassroomConfigSchema, SeatingLayoutSchema } from "@/lib/types";
import type { SeatingLayout } from "@/lib/types";

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const GenerationFormSchema = z.object({
  studentListDoc: z
    .any()
    .refine((files) => files?.length === 1, "Student list PDF file is required."),
});
type GenerationFormType = z.infer<typeof GenerationFormSchema>;

export default function AdminDashboard() {
  const [isPending, startTransition] = useTransition();
  const [seatingData, setSeatingData] = useState<{ plan: SeatingAssignment[], examConfig: ExamConfig } | null>(null);
  const [step, setStep] = useState(1);
  const [seatingLayout, setSeatingLayout] = useState<SeatingLayout | null>(null);
  const { toast } = useToast();

  const layoutForm = useForm<z.infer<typeof SeatingLayoutSchema>>({
    resolver: zodResolver(SeatingLayoutSchema),
    defaultValues: {
      classrooms: [{ block: 'A', floor: '1', roomNumber: '101', benchCount: 20 }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: layoutForm.control,
    name: "classrooms",
  });

  const uploadForm = useForm<GenerationFormType>({
    resolver: zodResolver(GenerationFormSchema),
  });

  useState(() => {
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
  });
  
  const onLayoutSubmit: SubmitHandler<SeatingLayout> = (data) => {
    setSeatingLayout(data);
    setStep(2);
  };
  
  const onUploadSubmit: SubmitHandler<GenerationFormType> = (data) => {
    startTransition(async () => {
      if (!seatingLayout) {
        toast({ variant: "destructive", title: "Error", description: "Seating layout is missing." });
        return;
      }
      
      const studentFile = data.studentListDoc[0] as File;
      const studentListDataUri = await fileToDataUri(studentFile);

      const result = await createSeatingPlanAction(
        studentListDataUri,
        seatingLayout,
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
            uploadForm.reset();
            layoutForm.reset();
            setStep(1);
            setSeatingLayout(null);
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

  const totalCapacity = layoutForm.watch('classrooms').reduce((acc, curr) => acc + (Number(curr.benchCount) || 0), 0);

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
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
        {step === 1 && (
            <>
            <CardHeader>
                <CardTitle>Step 1: Configure Exam Hall Layout</CardTitle>
                <CardDescription>Define the blocks, floors, and rooms available for the exam. The total capacity will be calculated automatically.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...layoutForm}>
                    <form onSubmit={layoutForm.handleSubmit(onLayoutSubmit)} className="space-y-6">
                        {fields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg relative">
                             <FormField
                                control={layoutForm.control}
                                name={`classrooms.${index}.block`}
                                render={({ field }) => (
                                    <FormItem><FormLabel><Building className="inline-block mr-1"/>Block</FormLabel><FormControl><Input placeholder="e.g., A" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                             />
                             <FormField
                                control={layoutForm.control}
                                name={`classrooms.${index}.floor`}
                                render={({ field }) => (
                                    <FormItem><FormLabel><School className="inline-block mr-1"/>Floor</FormLabel><FormControl><Input placeholder="e.g., 1" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                             />
                             <FormField
                                control={layoutForm.control}
                                name={`classrooms.${index}.roomNumber`}
                                render={({ field }) => (
                                    <FormItem><FormLabel><School className="inline-block mr-1"/>Room No.</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                             />
                             <FormField
                                control={layoutForm.control}
                                name={`classrooms.${index}.benchCount`}
                                render={({ field }) => (
                                    <FormItem><FormLabel><Armchair className="inline-block mr-1"/>Benches</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl><FormMessage /></FormItem>
                                )}
                             />
                             {fields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                          </div>
                        ))}
                        <div className="flex justify-between items-center">
                            <Button type="button" variant="outline" onClick={() => append({ block: 'A', floor: '1', roomNumber: '', benchCount: 20 })}>
                                <PlusCircle className="mr-2"/> Add Room
                            </Button>
                            <div className="text-lg font-bold">
                                Total Capacity: <span className="text-primary">{totalCapacity}</span>
                            </div>
                        </div>
                         <Button type="submit" className="w-full">
                            Next Step <ArrowRight className="ml-2"/>
                         </Button>
                    </form>
                </Form>
            </CardContent>
            </>
        )}
        {step === 2 && (
             <>
            <CardHeader>
                 <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="absolute top-4 left-4"><ArrowLeft className="mr-2"/> Back</Button>
                <CardTitle className="text-center">Step 2: Upload Student List</CardTitle>
                <CardDescription className="text-center">Upload the PDF with student details. The number of students should not exceed the capacity of <span className="font-bold text-primary">{totalCapacity}</span>.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...uploadForm}>
                    <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-6">
                       <FormField
                            control={uploadForm.control}
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
                                        Ensure the PDF has headers: name, hallTicketNumber, branch, contactNumber.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="w-full"
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
            </>
        )}
    </Card>
  );
}
