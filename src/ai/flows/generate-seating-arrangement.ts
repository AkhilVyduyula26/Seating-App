'use server';
/**
 * @fileOverview Parses student data and seating layout from PDF files and automatically assigns seats, ensuring no students from the same branch sit next to each other.
 *
 * - generateSeatingArrangement - A function that handles PDF parsing and seating arrangement generation.
 * - GenerateSeatingArrangementInput - The input type for the generateSeatingArrangement function.
 * - GenerateSeatingArrangementOutput - The return type for the generateSeatingArrangement function.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {z} from 'genkit';

const StudentSchema = z.object({
  name: z.string().describe('The name of the student.'),
  hallTicketNumber: z.string().describe('The hall ticket number of the student.'),
  branch: z.string().describe('The branch of the student.'),
  contactNumber: z.string().describe('The contact number of the student.'),
});
export type Student = z.infer<typeof StudentSchema>;


const PromptInputSchema = z.object({
  studentDataPdfDataUri: z.string().describe(
      "A PDF file of student data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  seatingLayoutPdfDataUri: z.string().describe(
      "A PDF file describing the seating layout (blocks, floors, rooms, benches), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const GenerateSeatingArrangementInputSchema = PromptInputSchema.extend({
  apiKey: z.string().describe('The Gemini API key to use for the request.'),
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
  input: {schema: PromptInputSchema},
  output: {schema: GenerateSeatingArrangementOutputSchema},
  prompt: `You are an expert in parsing student and seating layout data from PDF files and assigning seats for exams.

You will be given two PDF files:
1. A PDF containing student data with columns for Name, Hall Ticket Number, Branch, and Contact Number.
2. A PDF containing the seating layout, with details on the number of blocks, floors per block, rooms per floor, and benches per room.

Your tasks are:
1. Parse the student data from the student data PDF.
   Student Data PDF: {{media url=studentDataPdfDataUri}}
2. Parse the seating layout from the seating layout PDF to understand the exact structure and total capacity.
   Seating Layout PDF: {{media url=seatingLayoutPdfDataUri}}
3. Use the parsed layout to assign each student a unique seat (Block, Floor, Classroom, and Bench Number).
4. Crucially, ensure that no two students from the same branch are seated next to each other. You must enforce this rule strictly.
5. Check if the total number of students exceeds the total seating capacity derived from the layout PDF. For this task, you can assume capacity is sufficient and must assign a seat to every student.

Return BOTH the parsed student list AND the final seating arrangement in the specified JSON format.

The block, floor, and classroom assignments must be consistent with the provided seating layout PDF.
`,
});

const generateSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'generateSeatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async input => {
    const { apiKey, ...promptInput } = input;
    
    const model = googleAI({apiKey}).model('gemini-2.0-flash');

    const {output} = await generateSeatingArrangementPrompt(promptInput, { model });
    return output!;
  }
);
