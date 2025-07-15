
'use server';
/**
 * @fileOverview This flow handles parsing a student PDF and generating a seating arrangement automatically.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, SeatingAssignmentSchema, ExamConfigSchema, Student, LayoutConfig } from '@/lib/types';


export async function generateSeatingArrangement(
  input: GenerateSeatingArrangementInput
): Promise<GenerateSeatingArrangementOutput> {
  return seatingArrangementFlow(input);
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


const seatingArrangementFlow = ai.defineFlow(
  {
    name: 'seatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    
    // Step 1: Parse the Student List Document (PDF) using AI
    const { output: studentListOutput } = await ai.generate({
      prompt: `You are a data extraction specialist. Your task is to extract a list of all students from the provided PDF document. The document contains student records with the following columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber'.

RULES:
1.  **EXTRACT ALL RECORDS**: You MUST extract every single student record from the document. Do not skip any rows or stop prematurely.
2.  **NO FAKE DATA**: Do NOT generate, invent, or create any student data. Use ONLY the data present in the document.
3.  **STRICT FORMAT**: Return the data as a single JSON object with a single key 'students', which is an array of student objects.

The document is provided below. Process it and extract all students.`,
      context: [{ document: { data: input.studentListDoc, contentType: "application/pdf" } }],
      output: {
        schema: z.object({
          students: z.array(StudentSchema),
        }),
      },
      model: 'googleai/gemini-1.5-flash-latest'
    });
    
    if (!studentListOutput?.students || studentListOutput.students.length === 0) {
        return { error: "Could not extract any student data from the PDF. Please ensure the file is correctly formatted with columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber' and is not empty." };
    }
    
    const students: Student[] = studentListOutput.students;

    // Step 2: Procedurally generate the seating plan based on the layout config
    const layout = input.layoutConfig;
    
    // Flatten the layout into a list of available seats
    const availableSeats: Omit<SeatingAssignment, 'name' | 'hallTicketNumber' | 'branch' | 'contactNumber'>[] = [];
    layout.blocks.forEach(block => {
        block.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const totalBenches = room.benches * room.studentsPerBench;
                for (let i = 1; i <= totalBenches; i++) {
                    availableSeats.push({
                        block: block.blockName,
                        floor: String(floor.floorNumber),
                        classroom: room.roomNumber,
                        benchNumber: i
                    });
                }
            });
        });
    });

    if (students.length > availableSeats.length) {
        return { error: `Not enough seats for all students. Required: ${students.length}, Available: ${availableSeats.length}. Please increase the layout capacity.` };
    }
    
    // Shuffle students for random assignment
    const shuffledStudents = shuffleArray(students);
    
    const seatingPlan: SeatingAssignment[] = [];
    const assignedSeats: { [key: string]: SeatingAssignment } = {}; // To check for adjacent branches

    for (let i = 0; i < shuffledStudents.length; i++) {
        const student = shuffledStudents[i];
        let assigned = false;

        for (let j = 0; j < availableSeats.length; j++) {
            const seat = availableSeats[j];
            const seatKey = `${seat.block}-${seat.floor}-${seat.classroom}-${seat.benchNumber}`;
            
            // Check if seat is already taken
            if (assignedSeats[seatKey]) continue;

            // Anti-cheating logic: check adjacent seat
            const prevSeatKey = `${seat.block}-${seat.floor}-${seat.classroom}-${seat.benchNumber - 1}`;
            const prevSeatStudent = assignedSeats[prevSeatKey];
            
            if (prevSeatStudent && prevSeatStudent.branch === student.branch) {
                // Try to find another seat if branch is same as adjacent
                continue;
            }

            const assignment: SeatingAssignment = {
                ...student,
                ...seat
            };
            
            seatingPlan.push(assignment);
            assignedSeats[seatKey] = assignment; // Mark seat as taken
            assigned = true;
            break; // Move to the next student
        }
        if (!assigned) {
           // This case should be rare if there's enough capacity and logic is sound
           // Fallback: assign to the first available seat regardless of branch
           for (let k = 0; k < availableSeats.length; k++) {
               const fallbackSeat = availableSeats[k];
               const fallbackSeatKey = `${fallbackSeat.block}-${fallbackSeat.floor}-${fallbackSeat.classroom}-${fallbackSeat.benchNumber}`;
               if (!assignedSeats[fallbackSeatKey]) {
                   const assignment: SeatingAssignment = { ...student, ...fallbackSeat };
                   seatingPlan.push(assignment);
                   assignedSeats[fallbackSeatKey] = assignment;
                   break;
               }
           }
        }
    }
    
    seatingPlan.sort((a,b) => a.hallTicketNumber.localeCompare(b.hallTicketNumber));

    // Step 3: Create the exam configuration from the layout input
    const [startHour, startMinute] = (layout.examTimings.split('to')[0].trim().match(/\d+/g) || ["09", "00"]);
    const [endHour, endMinute] = (layout.examTimings.split('to')[1].trim().match(/\d+/g) || ["12", "00"]);

    const examConfig: z.infer<typeof ExamConfigSchema> = {
        startDate: layout.startDate,
        endDate: layout.endDate,
        startTime: { hour: startHour, minute: startMinute },
        endTime: { hour: endHour, minute: endMinute },
        useSamePlan: true,
    };

    return { seatingPlan, examConfig };
  }
);
