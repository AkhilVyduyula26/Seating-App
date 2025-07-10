
'use server';
/**
 * @fileOverview This flow handles parsing student and seating layout documents to generate a seating arrangement.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, StudentSchema, DynamicLayoutInput, SeatingAssignmentSchema, ExamConfig } from '@/lib/types';


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
    
    // Step 1: Generate layout from manual input
    const layout = input.seatingLayout;
    let totalCapacity = 0;
    const allSeats: {block: string; floor: string; roomNo: string; benchNo: number}[] = [];

    layout.blocks.forEach(block => {
        block.floors.forEach(floor => {
            const roomNumbers = floor.rooms.split(',').map(r => r.trim()).filter(r => r);
            const benches = parseInt(floor.benchesPerRoom, 10);
            if (isNaN(benches)) {
                throw new Error(`Invalid number of benches for block ${block.name}, floor ${floor.name}`);
            }
            totalCapacity += roomNumbers.length * benches;
            
            roomNumbers.forEach(roomNo => {
                for (let i = 1; i <= benches; i++) {
                    allSeats.push({
                        block: block.name,
                        floor: floor.name,
                        roomNo: roomNo,
                        benchNo: i
                    });
                }
            });
        });
    });


    // Step 2: Parse the Student List CSV/XLSX Document
    const { output: studentListOutput } = await ai.generate({
      prompt: `Extract the list of students from the provided document. The document has these columns: 'name', 'hallTicketNumber', 'branch', 'contactNumber'. You must extract every single student record from the document. Do not skip any rows. Do not generate any fake data. Return the data as a JSON object with a 'students' array.`,
      context: [{ document: { data: input.studentListDoc } }], // Genkit infers content type
      output: {
        schema: z.object({
          students: z.array(StudentSchema),
        }),
      },
      model: 'googleai/gemini-1.5-flash-latest'
    });
    
    if (!studentListOutput?.students || studentListOutput.students.length === 0) {
        return { error: "Could not extract any student data. Please ensure the student list file (CSV or XLSX) is correctly formatted with headers: 'name', 'hallTicketNumber', 'branch', 'contactNumber' and is not empty." };
    }
    const students = studentListOutput.students;

    // Step 3: Check capacity after both files are parsed
    if(totalCapacity < students.length) {
        return { error: `Not enough seats for all students. Required: ${students.length}, Available: ${totalCapacity}` };
    }

    // Step 4: Generate the seating arrangement by calling another prompt/flow
    const { output: arrangementOutput } = await ai.generate({
      prompt: `You are a seating arrangement coordinator for an exam. Your task is to assign every student from the provided list to a unique seat from the available list. You MUST follow these rules exactly.

RULES:
1.  **RANDOMIZE**: You MUST shuffle the student list randomly before making any assignments. This is critical for fairness and must be done every time.
2.  **UNIQUE ASSIGNMENT**: Assign each student to one and only one bench from the 'AVAILABLE_SEATS' list. No two students can have the same seat.
3.  **ANTI-CHEATING (Strict)**: You MUST try your absolute best to avoid seating two students from the same 'branch' in the same 'roomNo'. This is a high-priority rule.
4.  **COMPLETE LIST**: The final 'seatingPlan' must include every single student from the 'STUDENT_LIST'. Do not miss anyone.
5.  **REAL DATA ONLY**: Do not generate, invent, or create any student data. Use only the students provided in the 'STUDENT_LIST'.

AVAILABLE_SEATS (List of all possible benches):
\`\`\`json
${JSON.stringify(allSeats, null, 2)}
\`\`\`

STUDENT_LIST (Randomize this list before assigning):
\`\`\`json
${JSON.stringify(students, null, 2)}
\`\`\`

Based on the rules, seats, and student list, generate the complete seating plan. The output must be a JSON object with a 'seatingPlan' array containing an entry for every student, combining their details with their assigned seat.
Example output entry: { "name": "John Doe", "hallTicketNumber": "H123", "branch": "CSE", "contactNumber": "9876543210", "block": "SOE2", "floor": "1st", "classroom": "201", "benchNumber": 1 }
Note that 'classroom' in the output schema corresponds to 'roomNo' from the available seats.
`,
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
    
    if (arrangementOutput.seatingPlan.length < students.length) {
        return { error: `The generated plan is incomplete. Expected ${students.length} students, but only got ${arrangementOutput.seatingPlan.length}. Please try again.` };
    }

    // Dummy examConfig since it's not provided in the new flow
    const examConfig: ExamConfig = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        startTime: { hour: "00", minute: "00" },
        endTime: { hour: "00", minute: "00" },
        useSamePlan: true,
    };
    
    return { seatingPlan: arrangementOutput.seatingPlan, examConfig: examConfig };
  }
);

    