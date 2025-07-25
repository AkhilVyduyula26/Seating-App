
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
  List,
} from "lucide-react";
import { SeatingTable } from "./seating-table";
import { ExamConfig, SeatingAssignment, LayoutFormSchema, GenerationFormSchema, RoomBranchSummary } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Separator } from "./ui/separator";
import { Table as ShadTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const triggerDownload = (dataUri: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARgAAAAmCAYAAAB2jmuPAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAVNSURBVHhe7Z1NiB9FFMffj5+7s046Wd2ZmV1kYRAh+pCIiAiKCBdCPAgKuXiRkC56sC7iRR8EvLhI0UPCg4eE1N2lR0F+ChQHIZEgRAWRSCi72V12dmdn3ffvO9VMd2Z2u/vTmWneGczJzEw/3fe93/d+H4dEImG2i4GZgAKcAZwB3AJcA3wE/DGkPk8A3wD/AV8B5+XMxgfXwFfA2cDpQPpA/gdcBGwFfh8F2ApcA7wGbAduA0YC72Y3gQc/YBHwE+BUYAOwPxtXA7eAn7IbwYNNvAicDPyX/f1+AvwNfAecDcwqVjUfOAP8P/sZ6iLgd+A34BvgzWys/O/v9y/AVcDZwFdgO3AjsBq4p7T1d4FjQJp/AWcB35XvTmA/sE/o813A78AVwJbI2wPcCsyX7u4Fngb+xG3/S2A/sE9obwL2AF8l/5l6V2AnME96fRs4GPg4c+0dwFrgZ+Bv4J3L1gGfAf9jN/c9cDGwT2hvA/YBw/Iv4Ldk917AnqK2C3AisL5oPAn4E/gZeDez/W/gLWB/W0sLw+Mh4FHgHGCvjC52AfeV32bA/2wBHwMjwOrsZqS7P2yBhwLXVO0DMLIH3gMeBF7M7K0Abk5f3k198D/gS+A6YGWwXwC+DHyVnco3JpE0mQe8rGxtB65Kfp+y3YJqgXvDfgBfAxdlN0g3Y0kQzSXwVwL/N2I7DZwFjC9tq/4jI+M1u4HnQxJm+T/wX3ZTAg9m5U7gf+BW4M5U2n9l8q6lAKeD0/Ln+8AnwPvy10FgZ3G2VwGjwL/YTaK2TfNSZFkRL4I+RmTtW4GfskvJjV1pC1kLzLdSO4E7gM3V2d4HTgL+RmqXQGez2xP4CLgdGF++S/g4cFf2k1XbZk1qLzD/SW1N6v+VvO1qYH3R2vM6Mh5n9hB40lqY3bQ2a2mC7Cb7GdgJrAeeD3n7NqBtLgB+xpIgrb0b+N1Ue22aQNuy23cAG4EtQJr/l3j/2hQ/C1hR1f4JDA+bI+eD27KvA8cAa+s5m62fA49mZz83gV+Bn3Oar946zLdSO4E7U2n/Q+C+sr/J8F5gNfBb8p8GvA2cE82J2R09rE/g9+Q3GvV2+ZtRb9/48y1/w+L6+3vAacD+ogP6i03j/hO4FvjY+LqXga8yI1/nQeA54L6sT9eApzMzp+kPtwFfZAe5g9fAecBtWbfbgP+BLzP7S4BfgySoGsN3wH+z2wBslhZGbBvA39mZbQ9lX6D75+z2M/ABMNst8u/B6M1kO8uU7wJ164/Y+7KbyX7/K3M/u4GfMmv1C2AjcM/W7uNn2t8f029/mE3q9xPwm1Q2a8E4v/Uu8G7m3gX8lF13F3AZcE82rpf7qGvG6v1/8G5mcB84VwX2L4HfwR+xG8h+C7ATuHda7+nACcAo4BjwE7BXBj8A3wPvy34GdgNvZT8L7AImVOv2r7L/IeBIWVsC7F8C7wKPgI+Tf+r3b7T+F0k4k8g83Ab8r9hO43fgt+yrgR+Bt4Hfsu4nwRk4M3vfBv7NbsrvVWAp8AmwXwb/NXBJ1j8l9W2V+j8n8L/sJgQeAncCe4BngdPy9xnw/7KvAg+AZcB3b7+8D5wHjC7mZ+x9q+X+p5F4Tf1tA/8E/glI/2vA8cDf2E1I/22SgBvA3cD66U1wZ1/7mJ7u+wK8wU/s9z/gV+A5YF8Z9nWAQ8ChzNqTAO8C66sJvVv/NfDfwBGAw/L/fOA8cCUwDpi5BzgV+A0YAMzcC5wHnBvM/V97gC+A18Df2M1/3T8/BzwX3C1Y/W2BbwLPgS+BvcCf2c36x8ApwM+ZDawE7ge2A3cDn2M1gEGAq7J+7X8ZgGk6f7n+L/0PBMF/E9fMv/cAAAAASUVORK5CYII=";


export default function AdminDashboard() {
  const [step, setStep] = useState(1);
  const [layoutConfig, setLayoutConfig] = useState<LayoutFormType | null>(null);
  const [isGenerating, startGeneration] = useTransition();
  const [isDeleting, startDeletion] = useTransition();
  const [isLoading, startLoading] = useTransition();
  const [isDownloadingAttendance, startDownloadingAttendance] = useTransition();
  const [isDownloadingSummary, startDownloadingSummary] = useTransition();
  const [seatingData, setSeatingData] = useState<DisplaySeatingData | null>(null);
  const { toast } = useToast();

  const layoutForm = useForm<LayoutFormType>({
    resolver: zodResolver(LayoutFormSchema),
    defaultValues: {
      blocks: [{ name: "Main Block", floors: [{ number: 1, rooms: [{ number: "101", benches: 15, studentsPerBench: 2 }] }] }],
      startDate: new Date(),
      endDate: new Date(),
      examTimings: [{ value: "09:00 AM to 12:00 PM" }]
    }
  });

  const { fields: blockFields, append: appendBlock, remove: removeBlock } = useFieldArray({
    control: layoutForm.control,
    name: "blocks"
  });
  
  const { fields: timingFields, append: appendTiming, remove: removeTiming } = useFieldArray({
      control: layoutForm.control,
      name: "examTimings"
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

  const groupStudentsByRoom = (plan: SeatingAssignment[]) => {
      return plan.reduce((acc, student) => {
          const room = student.classroom;
          if(!acc[room]){
              acc[room] = [];
          }
          acc[room].push(student);
          
          acc[room].sort((a,b) => {
            const numA = parseInt(a.benchNumber.replace(/[^0-9]/g, ''), 10);
            const numB = parseInt(b.benchNumber.replace(/[^0-9]/g, ''), 10);
            const sideA = a.benchNumber.replace(/[^LR]/g, '');
            const sideB = b.benchNumber.replace(/[^LR]/g, '');

            if (numA !== numB) {
                return numA - numB;
            }
            return sideA.localeCompare(sideB);
          });
          return acc;
      }, {} as Record<string, SeatingAssignment[]>);
  };
  
    const addPdfHeader = (doc: jsPDF, room: string, startDate: Date, allStudents: SeatingAssignment[]) => {
        try {
            doc.addImage(logoBase64, 'PNG', 15, 8, 30, 15);
        } catch (e) {
            console.error("Could not add logo to PDF:", e);
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("MALLA REDDY UNIVERSITY", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Room No: ${room}`, 15, 30);
        doc.text(`Date: ${format(startDate, 'dd/MM/yyyy')}`, doc.internal.pageSize.getWidth() - 15, 30, { align: 'right' });

        let startY = 38;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Absentees Details", 15, startY);
        startY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const roomStudents = allStudents.filter(s => s.classroom === room);
        const roomBranches = [...new Set(roomStudents.map(s => s.branch))];

        roomBranches.forEach(branch => {
            doc.text(`${branch} Absentees Roll Numbers:`, 15, startY);
            startY += 5;
            doc.line(15, startY, doc.internal.pageSize.getWidth() - 15, startY);
            startY += 5;
            doc.line(15, startY, doc.internal.pageSize.getWidth() - 15, startY);
            startY += 5;
        });

        (doc as any).lastAutoTable = { finalY: startY };
    };


  const handleDownloadSummaryPdf = () => {
    startDownloadingSummary(() => {
        if(!seatingData) return;
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
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        });
        triggerDownload(doc.output('datauristring'), 'room_occupancy_summary.pdf');
    });
  };

  const handleDownloadAttendanceSheetPdf = () => {
    startDownloadingAttendance(() => {
        if (!seatingData) return;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const studentsByRoom = groupStudentsByRoom(seatingData.plan);
        Object.entries(studentsByRoom).forEach(([room, students], index) => {
            if (index > 0) doc.addPage();
            addPdfHeader(doc, room, seatingData.examConfig.startDate, seatingData.plan);
            const tableData = students.map((s, idx) => [idx + 1, s.name, s.hallTicketNumber, s.branch, s.benchNumber, '']);
            autoTable(doc, {
                head: [['S.No', 'Name', 'Roll No', 'Branch', 'Seat No', 'Booklet Number']],
                body: tableData,
                startY: (doc as any).lastAutoTable.finalY + 2,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
                styles: { cellPadding: 2, fontSize: 9 },
                columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 }, 3: { cellWidth: 18 }, 4: { cellWidth: 18 }, 5: { cellWidth: 30 } },
            });
        });
        triggerDownload(doc.output('datauristring'), 'attendance_sheets.pdf');
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
    const studentsByRoom = groupStudentsByRoom(seatingData.plan);
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Generated Seating Plan</span>
                </CardTitle>
                <CardDescription>
                    The seating plan has been successfully generated. Review, download, or delete the plan below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SeatingTable data={seatingData.plan} />
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
                 <Button onClick={handleDownloadAttendanceSheetPdf} variant="outline" disabled={isDownloadingAttendance}>
                    {isDownloadingAttendance ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                    Download Attendance Sheets
                </Button>
                 <Button onClick={handleDelete} variant="destructive" disabled={isDeleting} className="ml-auto">
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
                 <Button onClick={handleDownloadSummaryPdf} variant="outline" size="sm" disabled={isDownloadingSummary}>
                    {isDownloadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download Summary PDF
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

        <Card className="shadow-lg">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <List />
                    <span>Room-wise Student List</span>
                </CardTitle>
                <CardDescription>
                    Detailed student seating arrangement for each room.
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                 {Object.entries(studentsByRoom).map(([room, students]) => (
                     <div key={room}>
                        <h3 className="font-bold text-lg mb-2 text-primary border-b pb-1">Room: {room}</h3>
                        <div className="rounded-md border">
                            <ShadTable>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bench</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Roll Number</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Signature</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map(student => (
                                        <TableRow key={student.hallTicketNumber}>
                                            <TableCell>{student.benchNumber}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.hallTicketNumber}</TableCell>
                                            <TableCell>{student.branch}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </ShadTable>
                        </div>
                     </div>
                 ))}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                    <FormLabel>Exam Timings</FormLabel>
                    <div className="space-y-2">
                        {timingFields.map((field, index) => (
                            <FormField 
                                key={field.id}
                                control={layoutForm.control}
                                name={`examTimings.${index}.value`}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-2">
                                            <FormControl>
                                                <Input placeholder="e.g., 09:00 AM to 12:00 PM" {...field}/>
                                            </FormControl>
                                            {timingFields.length > 1 && (
                                                <Button variant="ghost" size="icon" onClick={() => removeTiming(index)}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => appendTiming({ value: "" })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add Time Slot
                    </Button>
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
                onClick={() => append({ number: fields.length + 1, rooms: [{ number: "", benches: 10, studentsPerBench: 2}] })}
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
                                <FormControl><Input type="number" placeholder="2" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl>
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
                onClick={() => append({ number: "", benches: 10, studentsPerBench: 2})}
                className="flex items-center gap-2"
            >
                <PlusCircle /> Add Room
            </Button>
        </div>
    );
}
