
"use client";

import { useState, useTransition } from "react";
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
  CalendarIcon,
  PlusCircle,
  X,
  Users,
  Download,
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig, SeatingAssignment, LayoutConfig, BlockSchema, LayoutFormSchema, GenerationFormSchema, RoomBranchSummary } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Separator } from "./ui/separator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

type LayoutFormType = z.infer<typeof LayoutFormSchema>;
type GenerationFormType = z.infer<typeof GenerationFormSchema>;


interface DisplaySeatingData {
    plan: SeatingAssignment[];
    examConfig: ExamConfig & {
        startDate: Date;
        endDate: Date;
    };
    summary: RoomBranchSummary;
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
      blocks: [{ name: "Main Block", floors: [{ number: 1, rooms: [{ number: "101", benches: 15, studentsPerBench: 1 }] }] }],
      startDate: new Date(),
      endDate: new Date(),
      examTimings: "09:00 AM to 12:00 PM"
    }
  });

  const { fields: blockFields, append: appendBlock, remove: removeBlock } = useFieldArray({
    control: layoutForm.control,
    name: "blocks"
  });

  const generationForm = useForm<GenerationFormType>({
    resolver: zodResolver(GenerationFormSchema),
    defaultValues: {
        studentListFiles: [{ file: undefined }]
    }
  });

  const { fields: fileFields, append: appendFile, remove: removeFile } = useFieldArray({
      control: generationForm.control,
      name: "studentListFiles"
  });

  useEffect(() => {
    startLoading(async () => {
      const data = await getSeatingDataAction();
      if (data.plan && data.examConfig && data.summary) {
        setSeatingData({
            plan: data.plan,
            examConfig: {
                ...data.examConfig,
                startDate: new Date(data.examConfig.startDate),
                endDate: new Date(data.examConfig.endDate),
            },
            summary: data.summary,
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
      
      const files: File[] = data.studentListFiles.map(f => f.file[0]).filter(Boolean);

      if (files.length === 0) {
          toast({ variant: "destructive", title: "Error", description: "Please upload at least one student file." });
          return;
      }

      const studentListDataUris = await Promise.all(files.map(fileToDataUri));

      const result = await createSeatingPlanAction(
        studentListDataUris,
        layoutConfig
      );

      if (result.success && result.plan && result.examConfig && result.summary) {
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
            },
            summary: result.summary,
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

  const handleDownloadPdf = () => {
    if (!seatingData) return;

    const doc = new jsPDF();
    doc.text("Room Occupancy Summary", 14, 16);

    const tableData: (string | number)[][] = [];
    Object.entries(seatingData.summary).forEach(([room, branches]) => {
      Object.entries(branches).forEach(([branch, count]) => {
        tableData.push([room, branch, count]);
      });
    });

    autoTable(doc, {
      head: [['Room', 'Branch', 'Student Count']],
      body: tableData,
      startY: 20,
      theme: 'grid',
       headStyles: {
        fillColor: [41, 128, 185], // A nice blue color
        textColor: 255,
        fontStyle: 'bold',
      },
    });

    doc.save('room_occupancy_summary.pdf');
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
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <Card className="shadow-lg">
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
        
        <Card className="shadow-lg">
             <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Users />
                       <span>Room Occupancy Summary</span>
                    </CardTitle>
                    <CardDescription>
                        Branch-wise student count in each room.
                    </CardDescription>
                </div>
                 <Button onClick={handleDownloadPdf} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download as PDF
                </Button>
            </CardHeader>
             <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {Object.entries(seatingData.summary).map(([room, branches]) => (
                         <div key={room} className="p-4 rounded-lg bg-muted/50">
                             <h4 className="font-semibold text-primary mb-2">Room: {room}</h4>
                             <ul className="space-y-1 text-sm">
                                 {Object.entries(branches).map(([branch, count]) => (
                                     <li key={branch} className="flex justify-between">
                                         <span>{branch}:</span>
                                         <span className="font-medium">{count} student(s)</span>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     ))}
                 </div>
             </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Seating Setup - Step 1: Layout Configuration</CardTitle>
          <CardDescription>
            Define the physical layout of your examination halls by adding blocks, floors, and rooms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...layoutForm}>
            <form onSubmit={layoutForm.handleSubmit(handleLayoutSubmit)} className="space-y-6">
              {blockFields.map((block, blockIndex) => (
                <Card key={block.id} className="p-4 border-dashed relative">
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeBlock(blockIndex)}>
                        <X className="h-4 w-4"/>
                    </Button>
                  <CardHeader className="p-2">
                    <CardTitle className="text-lg">Block {blockIndex + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-4">
                    <FormField
                      control={layoutForm.control}
                      name={`blocks.${blockIndex}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Block Name</FormLabel>
                          <FormControl><Input placeholder="e.g., Main Block" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FloorsField blockIndex={blockIndex} control={layoutForm.control} register={layoutForm.register} getValues={layoutForm.getValues} setValue={layoutForm.setValue} />
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendBlock({ name: "", floors: [{ number: 1, rooms: [] }] })}
                className="flex items-center gap-2"
              >
                <PlusCircle /> Add Another Block
              </Button>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                 <FormField control={layoutForm.control} name="examTimings" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Exam Timings</FormLabel>
                        <FormControl><Input placeholder="e.g., 09:00 AM to 12:00 PM" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
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
          <CardTitle>Seating Setup - Step 2: Upload Student Lists</CardTitle>
          <CardDescription>
            Upload one or more student list files in CSV or PDF format. Each file can represent a different branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...generationForm}>
            <form onSubmit={generationForm.handleSubmit(handleGenerationSubmit)} className="space-y-6">
              <div className="space-y-4">
                {fileFields.map((field, index) => (
                    <FormField
                    key={field.id}
                    control={generationForm.control}
                    name={`studentListFiles.${index}.file`}
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel className={cn(index !== 0 && "sr-only")}>
                         Student List Files (CSV, PDF)
                        </FormLabel>
                         <div className="flex items-center gap-2">
                            <FormControl>
                                <Input
                                    type="file"
                                    accept=".csv,.pdf,application/vnd.ms-excel"
                                    onChange={(e) => onChange(e.target.files)}
                                    {...rest}
                                />
                            </FormControl>
                            {fileFields.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendFile({ file: undefined })}
                >
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Another File
                </Button>
              </div>
                <FormDescription>
                  Ensure each file has columns/headers for: name, hallTicketNumber, branch, contactNumber.
                </FormDescription>

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

const FloorsField = ({ blockIndex, control, register, getValues, setValue }: { blockIndex: number, control: any, register: any, getValues: any, setValue: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `blocks.${blockIndex}.floors`
    });

    return (
        <div className="space-y-4 pl-4 border-l-2">
            {fields.map((floor, floorIndex) => (
                <Card key={floor.id} className="p-3 bg-muted/40 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(floorIndex)}>
                        <X className="h-4 w-4"/>
                    </Button>
                    <CardContent className="p-1 space-y-4">
                        <FormField
                            control={control}
                            name={`blocks.${blockIndex}.floors.${floorIndex}.number`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Floor Number</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <RoomsField blockIndex={blockIndex} floorIndex={floorIndex} control={control} register={register} getValues={getValues} setValue={setValue} />
                    </CardContent>
                </Card>
            ))}
            <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ number: fields.length + 1, rooms: [{ number: "", benches: 10, studentsPerBench: 1}] })}
                className="flex items-center gap-2"
            >
                <PlusCircle /> Add Floor
            </Button>
        </div>
    );
};

const RoomsField = ({ blockIndex, floorIndex, control, register, getValues, setValue }: { blockIndex: number, floorIndex: number, control: any, register: any, getValues: any, setValue: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `blocks.${blockIndex}.floors.${floorIndex}.rooms`
    });
    
    const watchRoomFields = getValues(`blocks.${blockIndex}.floors.${floorIndex}.rooms`);

    return (
        <div className="space-y-3 pl-4">
            <h4 className="text-sm font-medium">Rooms</h4>
            {fields.map((room, roomIndex) => (
                <div key={room.id} className="p-3 rounded-md bg-background border grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(roomIndex)}>
                        <X className="h-4 w-4"/>
                    </Button>
                    <FormField
                        control={control}
                        name={`blocks.${blockIndex}.floors.${floorIndex}.rooms.${roomIndex}.number`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Room No.</FormLabel>
                                <FormControl><Input placeholder="101" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name={`blocks.${blockIndex}.floors.${floorIndex}.rooms.${roomIndex}.benches`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs"># Benches</FormLabel>
                                <FormControl><Input type="number" placeholder="15" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name={`blocks.${blockIndex}.floors.${floorIndex}.rooms.${roomIndex}.studentsPerBench`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Students/Bench</FormLabel>
                                <FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div className="flex items-end">
                        <p className="text-xs text-muted-foreground">
                            Capacity: {(watchRoomFields?.[roomIndex]?.benches || 0) * (watchRoomFields?.[roomIndex]?.studentsPerBench || 0)}
                        </p>
                    </div>
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ number: "", benches: 10, studentsPerBench: 1})}
                className="flex items-center gap-2"
            >
                <PlusCircle /> Add Room
            </Button>
        </div>
    );
}

    
