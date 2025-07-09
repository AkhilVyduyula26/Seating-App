'use server';
/**
 * @fileOverview This flow handles parsing student and seating layout PDFs to generate a seating arrangement.
 * 
 * - generateSeatingArrangement - A function that orchestrates the PDF parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
    // Step 1: Parse the Student List PDF
    const { output: studentListOutput } = await ai.generate({
      prompt: `Extract the list of students from the provided PDF.
      PDF: {{media url=pdf}}`,
      context: [{ pdf: input.studentListPdf }],
      output: {
        schema: z.object({
          students: z.array(StudentSchema),
        }),
      },
      model: 'googleai/gemini-2.0-flash'
    });
    
    if (!studentListOutput?.students || studentListOutput.students.length === 0) {
        return { error: "Could not extract any student data from the provided student list PDF." };
    }
    const students = studentListOutput.students;


    // Step 2: Parse the Seating Layout PDF
    const { output: seatingLayoutOutput } = await ai.generate({
        prompt: `Extract the seating capacity details from this PDF.
        PDF: {{media url=pdf}}`,
        context: [{pdf: input.seatingLayoutPdf}],
        output: {
            schema: SeatingLayoutSchema,
        },
        model: 'googleai/gemini-2.0-flash'
    });

    if (!seatingLayoutOutput) {
        return { error: "Could not extract seating layout data from the provided layout PDF." };
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

Generate the full seating plan based on these rules and return it as a JSON array.`,
      output: {
        schema: z.object({
          seatingPlan: z.array(SeatingAssignmentSchema),
        }),
      },
       model: 'googleai/gemini-2.0-flash'
    });

    if (!arrangementOutput?.seatingPlan) {
        return { error: "Failed to generate the seating arrangement." };
    }
    
    return { seatingPlan: arrangementOutput.seatingPlan };
  }
);
