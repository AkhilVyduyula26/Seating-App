
'use server';
/**
 * @fileOverview This flow handles parsing student and seating layout documents to generate a seating arrangement.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, SeatingLayoutSchema, SeatingAssignmentSchema, ExamConfig } from '@/lib/types';


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
    // Step 1: Parse the Seating Layout Document with a very strict prompt
    const { output: seatingLayoutOutput } = await ai.generate({
        prompt: `You are a data extraction specialist. Your only task is to extract data from an Excel file and return it as a valid JSON object.

CRITICAL INSTRUCTIONS:
1.  All values for 'blocks', 'floorsPerBlock', 'roomsPerFloor', and 'benchesPerRoom' MUST be NUMBERS. Do NOT return them as strings.
2.  There is only one row of data. Extract it.
3.  Do not add any commentary or extra text. Your output must ONLY be the JSON object.

EXAMPLE: If the file has 2 blocks, 3 floors, 10 rooms, and 20 benches, the output MUST be exactly:
{
  "blocks": 2,
  "floorsPerBlock": 3,
  "roomsPerFloor": 10,
  "benchesPerRoom": 20
}

Now, extract the data from the provided document. The document has these columns: 'blocks', 'floorsPerBlock', 'roomsPerFloor', 'benchesPerRoom'.`,
        context: [{ document: { data: input.seatingLayoutDoc, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }],
        output: {
            schema: SeatingLayoutSchema,
        },
        model: 'googleai/gemini-1.5-flash-latest'
    });

    if (!seatingLayoutOutput) {
        return { error: "Could not extract seating layout data. Please ensure the layout file is correctly formatted with columns: 'blocks', 'floorsPerBlock', 'roomsPerFloor', 'benchesPerRoom' and is not empty." };
    }
    
    const blocks = Number(seatingLayoutOutput.blocks);
    const floorsPerBlock = Number(seatingLayoutOutput.floorsPerBlock);
    const roomsPerFloor = Number(seatingLayoutOutput.roomsPerFloor);
    const benchesPerRoom = Number(seatingLayoutOutput.benchesPerRoom);
    
    if (isNaN(blocks) || isNaN(floorsPerBlock) || isNaN(roomsPerFloor) || isNaN(benchesPerRoom)) {
      return { error: "One or more values in the seating layout file are not valid numbers. The AI model failed to extract them correctly. Please check the file and try again." };
    }

    const layout = { blocks, floorsPerBlock, roomsPerFloor, benchesPerRoom };
    const totalCapacity = layout.blocks * layout.floorsPerBlock * layout.roomsPerFloor * layout.benchesPerRoom;

    // Step 2: Parse the Student List Document
    const { output: studentListOutput } = await ai.generate({
      prompt: `Extract the list of students from the provided document. The document has these columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber'. Return the data as a JSON object with a 'students' array.`,
      context: [{ document: { data: input.studentListDoc, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }],
      output: {
        schema: z.object({
          students: z.array(StudentSchema),
        }),
      },
      model: 'googleai/gemini-1.5-flash-latest'
    });
    
    if (!studentListOutput?.students || studentListOutput.students.length === 0) {
        return { error: "Could not extract any student data. Please ensure the student list file is correctly formatted with columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber' and is not empty." };
    }
    const students = studentListOutput.students;

    // Step 3: Check capacity after both files are parsed
    if(totalCapacity < students.length) {
        return { error: `Not enough seats for all students. Required: ${students.length}, Available: ${totalCapacity}` };
    }

    // Step 4: Generate the seating arrangement by calling another prompt/flow
    const { output: arrangementOutput } = await ai.generate({
      prompt: `You are a seating arrangement coordinator for an exam. Your task is to assign seats to students based on a list and a set of rules. You MUST follow these rules exactly.

RULES:
1.  Assign a unique seat to every student from the provided list. Do not invent students.
2.  **CRUCIAL ANTI-CHEATING RULE**: To prevent cheating, no two students from the same branch (e.g., two 'CSE' students) should be seated directly next to each other on consecutive benches in the same room. You must alternate branches.
3.  Fill seats sequentially: Fill all benches in a room, then all rooms on a floor, then all floors in a block, before moving to the next block. (Block -> Floor -> Room -> Bench).

AVAILABLE SEATING LAYOUT:
- Total Blocks: ${layout.blocks} (Named SOE1, SOE2, etc.)
- Floors per Block: ${layout.floorsPerBlock} (Numbered 1, 2, 3...)
- Classrooms per Floor: ${layout.roomsPerFloor} (Numbered starting from 101, 102... for floor 1; 201, 202... for floor 2, etc.)
- Benches per Classroom: ${layout.benchesPerRoom} (Numbered 1, 2, 3...)

STUDENT LIST TO BE SEATED:
\`\`\`json
${JSON.stringify(students, null, 2)}
\`\`\`

Based on the rules, layout, and student list above, generate the complete seating plan. The output must be a JSON object with a 'seatingPlan' array containing an entry for every single student.`,
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
