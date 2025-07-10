
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, useFieldArray, type SubmitHandler, Controller } from "react-hook-form";
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
  X,
  Building,
  DoorOpen,
  Armchair,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { SeatingLayout, ExamConfig, DynamicLayoutInputSchema, DynamicLayoutInput } from "@/lib/types";

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const StudentListFormSchema = z.object({
  studentListDoc: z
    .any()
    .refine((files) => files?.length === 1, "Student list file is required."),
});
type StudentListFormType = z.infer<typeof StudentListFormSchema>;

export default function AdminDashboard() {
  const [isPending, startTransition] = useTransition();
  const [seatingData, setSeatingData] = useState<{ plan: any[], examConfig: ExamConfig } | null>(null);
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [layoutData, setLayoutData] = useState<DynamicLayoutInput | null>(null);

  const layoutForm = useForm<DynamicLayoutInput>({
    resolver: zodResolver(DynamicLayoutInputSchema),
    defaultValues: {
      blocks: [{ name: "", floors: [{ name: "", rooms: "", benchesPerRoom: "" }] }],
    },
  });

  const { fields: blockFields, append: appendBlock, remove: removeBlock } = useFieldArray({
    control: layoutForm.control,
    name: "blocks",
  });

  const studentForm = useForm<StudentListFormType>({
    resolver: zodResolver(StudentListFormSchema),
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
  
  const handleLayoutSubmit: SubmitHandler<DynamicLayoutInput> = (data) => {
    setLayoutData(data);
    setCurrentStep(2);
  };

  const handleStudentSubmit: SubmitHandler<StudentListFormType> = (data) => {
    startTransition(async () => {
      if (!layoutData) {
          toast({ variant: 'destructive', title: 'Error', description: 'Seating layout data is missing.' });
          setCurrentStep(1);
          return;
      }
      
      const studentFile = data.studentListDoc[0] as File;
      const studentListDataUri = await fileToDataUri(studentFile);

      const result = await createSeatingPlanAction(
        layoutData,
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
            setCurrentStep(1);
            setLayoutData(null);
            layoutForm.reset();
            studentForm.reset();
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

  if (isPending && !seatingData && currentStep === 1) {
    return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
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
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Table />
                Seating Plan Generator
            </CardTitle>
            <CardDescription>
              Follow the steps below to generate the exam seating arrangement.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {currentStep === 1 && (
                <div className="animate-in fade-in">
                    <Form {...layoutForm}>
                        <form onSubmit={layoutForm.handleSubmit(handleLayoutSubmit)} className="space-y-6">
                            <h3 className="font-semibold text-lg">Step 1: Define Seating Structure</h3>
                            
                            {blockFields.map((block, blockIndex) => (
                                <Card key={block.id} className="p-4 relative">
                                    <CardHeader className="p-2">
                                        <CardTitle className="text-base">Block {blockIndex + 1}</CardTitle>
                                         {blockFields.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeBlock(blockIndex)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-2 space-y-4">
                                        <FormField
                                            control={layoutForm.control}
                                            name={`blocks.${blockIndex}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel><Building className="inline-block mr-2" />Block Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g., SOE2" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FloorsFieldArray blockIndex={blockIndex} control={layoutForm.control} />
                                    </CardContent>
                                </Card>
                            ))}
                            <Button type="button" variant="outline" onClick={() => appendBlock({ name: "", floors: [{ name: "", rooms: "", benchesPerRoom: "" }] })}>
                                <PlusCircle className="mr-2" /> Add Block
                            </Button>
                            
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="ml-2" /></>}
                            </Button>
                        </form>
                    </Form>
                </div>
            )}

            {currentStep === 2 && (
                 <div className="animate-in fade-in">
                    <div className="p-4 rounded-md bg-green-50 border border-green-200 mb-6 flex items-center gap-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                            <h4 className="font-semibold text-green-800">Step 1 Complete</h4>
                            <p className="text-sm text-green-700">Seating structure defined successfully.</p>
                        </div>
                    </div>
                     <Form {...studentForm}>
                        <form onSubmit={studentForm.handleSubmit(handleStudentSubmit)} className="space-y-6">
                            <h3 className="font-semibold text-lg">Step 2: Upload Student List</h3>
                           <FormField
                                control={studentForm.control}
                                name="studentListDoc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <FileUp /> Student List File (PDF, CSV, or XLSX)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                accept=".pdf, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                onChange={(e) => field.onChange(e.target.files)}
                                            />
                                        </FormControl>
                                         <FormDescription>
                                            Upload the file with student details. Ensure it has headers: name, hallTicketNumber, branch, contactNumber.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setCurrentStep(1)}
                                  disabled={isPending}
                                >
                                  Back
                                </Button>
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
                            </div>
                        </form>
                    </Form>
                </div>
            )}
        </CardContent>
    </Card>
  );
}

function FloorsFieldArray({ blockIndex, control }: { blockIndex: number, control: any }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `blocks.${blockIndex}.floors`
    });

    return (
        <div className="space-y-4 pl-4 border-l">
            {fields.map((floor, floorIndex) => (
                <div key={floor.id} className="p-3 bg-slate-50 rounded-md relative">
                     {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(floorIndex)}>
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                    <h4 className="font-medium mb-2">Floor {floorIndex + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField
                            control={control}
                            name={`blocks.${blockIndex}.floors.${floorIndex}.name`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Floor Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., 1st Floor" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`blocks.${blockIndex}.floors.${floorIndex}.rooms`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel><DoorOpen className="inline-block mr-2" />Room Numbers</FormLabel>
                                    <FormControl><Input placeholder="e.g., 201, 202, 203" {...field} /></FormControl>
                                     <FormDescription className="text-xs">Comma-separated</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`blocks.${blockIndex}.floors.${floorIndex}.benchesPerRoom`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel><Armchair className="inline-block mr-2" />Benches per Room</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            ))}
             <Button type="button" size="sm" variant="outline" onClick={() => append({ name: "", rooms: "", benchesPerRoom: "" })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Floor
            </Button>
        </div>
    );
}
