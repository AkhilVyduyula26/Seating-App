
'use server';
/**
 * @fileOverview This flow handles parsing a student PDF and generating a seating arrangement automatically based on a user-defined layout.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, SeatingAssignmentSchema, SeatingLayoutSchema, ExamConfig, ClassroomConfig } from '@/lib/types';


export async function generateSeatingArrangement(
  input: GenerateSeatingArrangementInput
): Promise<GenerateSeatingArrangementOutput> {
  return seatingArrangementFlow(input);
}

const seatingArrangementFlow = ai.defineFlow(
  {
    name: 'seatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    
    // Step 1: Parse the Student List Document (PDF)
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
    const students = studentListOutput.students;
    
    // Create the full list of available seats from the layout
    const availableSeats: Omit<SeatingAssignment, 'name' | 'hallTicketNumber' | 'branch' | 'contactNumber'>[] = [];
    input.seatingLayout.classrooms.forEach(room => {
        for (let i = 1; i <= room.benchCount; i++) {
            availableSeats.push({
                block: room.block,
                floor: room.floor,
                classroom: room.roomNumber,
                benchNumber: i,
            });
        }
    });

    if (students.length > availableSeats.length) {
        return { error: `Not enough seats for all students. ${students.length} students need seats, but capacity is only ${availableSeats.length}.` };
    }


    // Step 2: Generate the seating arrangement by calling another prompt/flow
    const { output: arrangementOutput } = await ai.generate({
      prompt: `You are a seating arrangement coordinator for an exam. Your primary task is to assign every student to a unique seat from the provided list of available seats.

INPUTS:
- **STUDENT_LIST**: A JSON list of students to be seated.
- **AVAILABLE_SEATS**: A JSON list of all available seats (block, floor, classroom, benchNumber).

TASKS:
1.  **ASSIGN STUDENTS**: Assign every student from the STUDENT_LIST to a unique seat from the AVAILABLE_SEATS list.

RULES:
1.  **RANDOMIZE**: You MUST shuffle the student list randomly before making any assignments. This is critical for fairness.
2.  **UNIQUE ASSIGNMENT**: Each student must be assigned to one and only one bench. No two students can have the same seat.
3.  **ANTI-CHEATING (Strict)**: You MUST try your absolute best to avoid seating two students from the same 'branch' in the same room. This is a high-priority rule.
4.  **COMPLETE LIST**: The final 'seatingPlan' must include every single student from the 'STUDENT_LIST'.
5.  **REAL DATA ONLY**: Do not generate, invent, or create any student data. Use only the students provided in the 'STUDENT_LIST'.
6.  **USE PROVIDED SEATS ONLY**: You must only use seats from the 'AVAILABLE_SEATS' list.
7.  **OUTPUT FORMAT**: The output must be a JSON object with a 'seatingPlan' array.

STUDENT_LIST (Randomize this list before assigning):
\`\`\`json
${JSON.stringify(students, null, 2)}
\`\`\`

AVAILABLE_SEATS (Use these seats for assignment):
\`\`\`json
${JSON.stringify(availableSeats, null, 2)}
\`\`\`

Based on the rules and inputs, generate the complete seating plan.
Example output entry: { "name": "John Doe", "hallTicketNumber": "H123", "branch": "CSE", "contactNumber": "9876543210", "block": "A", "floor": "1", "classroom": "101", "benchNumber": 1 }`,
      output: {
        schema: z.object({
          seatingPlan: z.array(SeatingAssignmentSchema),
        }),
      },
       model: 'googleai/gemini-1.5-flash-latest'
    });

    if (!arrangementOutput?.seatingPlan) {
        return { error: "Failed to generate the seating arrangement. The AI model could not create a valid plan." };
    }
    
    if (arrangementOutput.seatingPlan.length !== students.length) {
        return { error: `The generated plan is incomplete. The model only processed ${arrangementOutput.seatingPlan.length} out of ${students.length} students. Please check the uploaded file for formatting issues and try again.` };
    }

    // Dummy examConfig since it's not provided in the new flow
    const examConfig: ExamConfig = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        startTime: { hour: "09", minute: "00" },
        endTime: { hour: "12", minute: "00" },
        useSamePlan: true,
    };
    
    return { seatingPlan: arrangementOutput.seatingPlan, examConfig: examConfig };
  }
);
