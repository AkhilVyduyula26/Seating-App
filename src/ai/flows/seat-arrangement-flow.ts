
'use server';
/**
 * @fileOverview This flow handles parsing a student PDF and generating a seating arrangement automatically.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, SeatingAssignmentSchema, ExamConfigSchema } from '@/lib/types';


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
    const studentCount = students.length;

    // Step 2: Generate the seating arrangement and exam config by calling another prompt/flow
    const { output: arrangementOutput } = await ai.generate({
      prompt: `You are a seating arrangement coordinator for an exam. Your tasks are to assign students to unique seats based on a predefined layout and define the exam schedule.

INPUTS:
- **STUDENT_LIST**: A JSON list of students to be seated.
- **STUDENT_COUNT**: The total number of students to seat.
- **LAYOUT_CONFIG**: A JSON object describing the exact physical layout of the exam halls.

TASKS:
1.  **ASSIGN STUDENTS**: Assign every student from the STUDENT_LIST to a unique bench within the rooms specified in the LAYOUT_CONFIG.
2.  **CREATE EXAM CONFIG**: Use the start date, end date, and timings from the LAYOUT_CONFIG to define the exam schedule. The 'useSamePlan' flag should always be true.

RULES:
1.  **RANDOMIZE**: You MUST shuffle the student list randomly before making any assignments. This is critical for fairness.
2.  **UNIQUE ASSIGNMENT**: Each student must be assigned to one and only one bench. No two students can have the same seat.
3.  **ANTI-CHEATING (Strict)**: You MUST try your absolute best to avoid seating two students from the same 'branch' in the same room. This is a high-priority rule.
4.  **COMPLETE LIST**: The final 'seatingPlan' must include every single student from the 'STUDENT_LIST'. The length of the final 'seatingPlan' array must be exactly equal to STUDENT_COUNT.
5.  **REAL DATA ONLY**: Do not generate, invent, or create any student data. Use only the students provided in the 'STUDENT_LIST'.
6.  **ADHERE TO LAYOUT**: You must strictly follow the provided LAYOUT_CONFIG. Do not invent new rooms or exceed the number of benches specified for each room.
7.  **OUTPUT FORMAT**: The output must be a single JSON object with a 'seatingPlan' array and an 'examConfig' object.

STUDENT_COUNT: ${studentCount}

LAYOUT_CONFIG:
\`\`\`json
${JSON.stringify(input.layoutConfig, null, 2)}
\`\`\`

STUDENT_LIST (Randomize this list before assigning):
\`\`\`json
${JSON.stringify(students, null, 2)}
\`\`\`

Based on the rules and inputs, generate the complete seating plan and exam configuration.`,
      output: {
        schema: z.object({
          seatingPlan: z.array(SeatingAssignmentSchema),
          examConfig: ExamConfigSchema,
        }),
      },
       model: 'googleai/gemini-1.5-flash-latest'
    });

    if (!arrangementOutput?.seatingPlan || !arrangementOutput.examConfig) {
        return { error: "Failed to generate the seating arrangement or exam config. The AI model could not create a valid plan." };
    }
    
    if (arrangementOutput.seatingPlan.length !== students.length) {
        return { error: `The generated plan is incomplete. The model only processed ${arrangementOutput.seatingPlan.length} out of ${students.length} students. Please check the uploaded file for formatting issues and try again.` };
    }
    
    return { seatingPlan: arrangementOutput.seatingPlan, examConfig: arrangementOutput.examConfig };
  }
);
