'use server';
/**
 * @fileOverview Automatically assigns seats to students, ensuring no students from the same branch sit next to each other.
 *
 * - generateSeatingArrangement - A function that generates the seating arrangement.
 * - GenerateSeatingArrangementInput - The input type for the generateSeatingArrangement function.
 * - GenerateSeatingArrangementOutput - The return type for the generateSeatingArrangement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StudentSchema = z.object({
  name: z.string().describe('The name of the student.'),
  hallTicketNumber: z.string().describe('The hall ticket number of the student.'),
  branch: z.string().describe('The branch of the student.'),
  contactNumber: z.string().describe('The contact number of the student.'),
});

const GenerateSeatingArrangementInputSchema = z.object({
  students: z.array(StudentSchema).describe('An array of student objects.'),
  seatingCapacity: z.number().describe('The total seating capacity of the exam hall.'),
});
export type GenerateSeatingArrangementInput = z.infer<typeof GenerateSeatingArrangementInputSchema>;

const SeatingAssignmentSchema = z.object({
  hallTicketNumber: z.string().describe('The hall ticket number of the student.'),
  block: z.string().describe('The block number the student is assigned to.'),
  floor: z.string().describe('The floor number the student is assigned to.'),
  classroom: z.string().describe('The classroom number the student is assigned to.'),
  benchNumber: z.number().describe('The bench number the student is assigned to.'),
});

const GenerateSeatingArrangementOutputSchema = z.object({
  seatingAssignments: z.array(SeatingAssignmentSchema).describe('An array of seating assignments for each student.'),
});
export type GenerateSeatingArrangementOutput = z.infer<typeof GenerateSeatingArrangementOutputSchema>;

export async function generateSeatingArrangement(input: GenerateSeatingArrangementInput): Promise<GenerateSeatingArrangementOutput> {
  return generateSeatingArrangementFlow(input);
}

const generateSeatingArrangementPrompt = ai.definePrompt({
  name: 'generateSeatingArrangementPrompt',
  input: {schema: GenerateSeatingArrangementInputSchema},
  output: {schema: GenerateSeatingArrangementOutputSchema},
  prompt: `You are an expert in assigning seats to students in an exam hall.

Given the following list of students and the seating capacity, generate a seating arrangement such that no two students from the same branch are seated next to each other.

Students: {{{JSON.stringify(students)}}}

Seating Capacity: {{{seatingCapacity}}}

Return the seating arrangement in the following JSON format:

{{JSON.stringify(GenerateSeatingArrangementOutputSchema.shape)}}

Ensure that all students are assigned a seat and that the seating arrangement is optimized to avoid students from the same branch sitting next to each other. Generate unique Block, Floor, Classroom, and Bench Number details for each student. Assume there are multiple blocks, floors and classrooms.
`,
});

const generateSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'generateSeatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async input => {
    const {output} = await generateSeatingArrangementPrompt(input);
    return output!;
  }
);
