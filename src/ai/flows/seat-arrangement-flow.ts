'use server';
/**
 * @fileOverview This flow handles parsing student and seating layout documents to generate a seating arrangement.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, SeatingLayoutSchema, SeatingAssignmentSchema } from '@/lib/types';


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
    // Step 1: Parse the Student List Document
    const { output: studentListOutput } = await ai.generate({
      prompt: `Extract the list of students from the provided Excel document.
      The document contains the following columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber'.
      Return the data as a JSON object with a 'students' array.`,
      context: [{ document: { data: input.studentListDoc, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }],
      output: {
        schema: z.object({
          students: z.array(StudentSchema),
        }),
      },
      model: 'googleai/gemini-1.5-flash-latest'
    });
    
    if (!studentListOutput?.students || studentListOutput.students.length === 0) {
        return { error: "Could not extract any student data from the student list file. Please ensure the file is correctly formatted with columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber' and is not empty." };
    }
    const students = studentListOutput.students;


    // Step 2: Parse the Seating Layout Document
    const { output: seatingLayoutOutput } = await ai.generate({
        prompt: `Extract the seating capacity details from this Excel document.
        The document contains columns for: 'blocks', 'floorsPerBlock', 'roomsPerFloor', 'benchesPerRoom'.
        There will be only one row of data. Return it as a JSON object.`,
        context: [{ document: { data: input.seatingLayoutDoc, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }],
        output: {
            schema: SeatingLayoutSchema,
        },
        model: 'googleai/gemini-1.5-flash-latest'
    });

    if (!seatingLayoutOutput) {
        return { error: "Could not extract seating layout data from the layout file. Please ensure the file is correctly formatted with columns: 'blocks', 'floorsPerBlock', 'roomsPerFloor', 'benchesPerRoom' and is not empty." };
    }
    const layout = seatingLayoutOutput;
    const totalCapacity = layout.blocks * layout.floorsPerBlock * layout.roomsPerFloor * layout.benchesPerRoom;
    if(totalCapacity < students.length) {
        return { error: `Not enough seats for all students. Required: ${students.length}, Available: ${totalCapacity}` };
    }

    // Step 3: Generate the seating arrangement
    const { output: arrangementOutput } = await ai.generate({
      prompt: `You are a seating arrangement coordinator for an exam. Your task is to assign seats to students based on a list and a set of rules.

RULES:
1.  Assign a unique seat to every student.
2.  **Crucial Rule**: To prevent cheating, no two students from the same branch should be seated directly next to each other (i.e., on consecutive benches in the same room).
3.  Fill seats sequentially: Block -> Floor -> Room -> Bench.

AVAILABLE SEATING:
- Total Blocks: ${layout.blocks} (Named SOE1, SOE2, etc.)
- Floors per Block: ${layout.floorsPerBlock} (Numbered 1, 2, 3...)
- Classrooms per Floor: ${layout.roomsPerFloor} (Numbered starting from 101, 102... for floor 1, 201, 202... for floor 2, etc.)
- Benches per Classroom: ${layout.benchesPerRoom} (Numbered 1, 2, 3...)

STUDENT LIST:
\`\`\`json
${JSON.stringify(students, null, 2)}
\`\`\`

Generate the full seating plan based on these rules and return it as a JSON object with a 'seatingPlan' array.`,
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
    
    return { seatingPlan: arrangementOutput.seatingPlan };
  }
);
