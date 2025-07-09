'use server';
/**
 * @fileOverview Parses student data from a PDF and automatically assigns seats, ensuring no students from the same branch sit next to each other.
 *
 * - generateSeatingArrangement - A function that handles PDF parsing and seating arrangement generation.
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
export type Student = z.infer<typeof StudentSchema>;


const GenerateSeatingArrangementInputSchema = z.object({
  pdfDataUri: z.string().describe(
      "A PDF file of student data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
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
  students: z.array(StudentSchema).describe('The parsed list of student objects from the PDF.'),
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
  prompt: `You are an expert in parsing student data from PDF files and assigning seats for exams.

First, parse the student data from the provided PDF. The PDF contains columns for Name, Hall Ticket Number, Branch, and Contact Number. Extract this information into a structured list of students.

PDF with student data: {{media url=pdfDataUri}}

After parsing, use the extracted student list and the given seating capacity to generate a seating arrangement where no two students from the same branch are seated next to each other.

Seating Capacity: {{{seatingCapacity}}}

Return BOTH the parsed student list AND the final seating arrangement in the following JSON format:

{{JSON.stringify(GenerateSeatingArrangementOutputSchema.shape)}}

Ensure that all students are assigned a seat. Generate unique Block, Floor, Classroom, and Bench Number details for each student. Assume there are multiple blocks, floors and classrooms.
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
