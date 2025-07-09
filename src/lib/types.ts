import { z } from 'zod';

export const StudentSchema = z.object({
  name: z.string().describe('The full name of the student.'),
  hallTicketNumber: z.string().describe('The unique hall ticket number of the student.'),
  branch: z.string().describe('The student\'s branch of study (e.g., CSE, IT, IoT).'),
  contactNumber: z.string().describe('The student\'s contact phone number.'),
});
export type Student = z.infer<typeof StudentSchema>;


export const SeatingLayoutSchema = z.object({
  blocks: z.number().describe('Total number of blocks available.'),
  floorsPerBlock: z.number().describe('Number of floors in each block.'),
  roomsPerFloor: z.number().describe('Number of rooms on each floor.'),
  benchesPerRoom: z.number().describe('Number of benches in each room.'),
});
export type SeatingLayout = z.infer<typeof SeatingLayoutSchema>;


export const SeatingAssignmentSchema = z.object({
    name: z.string(),
    hallTicketNumber: z.string(),
    branch: z.string(),
    contactNumber: z.string(),
    block: z.string(),
    floor: z.string(),
    classroom: z.string(),
    benchNumber: z.number(),
});
export type SeatingAssignment = z.infer<typeof SeatingAssignmentSchema>;

export type ExamConfig = {
    startDate: Date;
    endDate: Date;
    startTime: { hour: string; minute: string };
    endTime: { hour: string; minute: string };
    useSamePlan: boolean;
};

export const GenerateSeatingArrangementInputSchema = z.object({
  studentListPdf: z
    .string()
    .describe(
      "A PDF file containing the list of students, as a data URI."
    ),
  seatingLayoutPdf: z
    .string()
    .describe(
      "A PDF file containing the seating capacity and layout details, as a data URI."
    ),
   examConfig: z.object({
    startDate: z.date(),
    endDate: z.date(),
    startTime: z.object({ hour: z.string(), minute: z.string() }),
    endTime: z.object({ hour: z.string(), minute: z.string() }),
    useSamePlan: z.boolean(),
  }),
});
export type GenerateSeatingArrangementInput = z.infer<typeof GenerateSeatingArrangementInputSchema>;

export const GenerateSeatingArrangementOutputSchema = z.object({
  seatingPlan: z.array(SeatingAssignmentSchema).optional().describe("The final generated seating arrangement for all students."),
  error: z.string().optional().describe("An error message if the process fails."),
});
export type GenerateSeatingArrangementOutput = z.infer<typeof GenerateSeatingArrangementOutputSchema>;


export const ValidateFacultyInputSchema = z.object({
  facultyPdfDataUri: z.string().describe(
      "A PDF file of authorized faculty, as a data URI that must include a MIME type and use Base64 encoding. The PDF contains a secure key at the top and a list of faculty members with their IDs."
    ),
  facultyId: z.string().describe("The Faculty ID entered by the user."),
  secureKey: z.string().describe("The secure key entered by the user."),
});
export type ValidateFacultyInput = z.infer<typeof ValidateFacultyInputSchema>;


export const ValidateFacultyOutputSchema = z.object({
  isAuthorized: z.boolean().describe("Whether the faculty member is authorized based on the provided ID and key."),
  error: z.string().optional().describe("An error message if validation fails for a specific reason, e.g., 'Secure key mismatch' or 'Faculty ID not found'."),
});
export type ValidateFacultyOutput = z.infer<typeof ValidateFacultyOutputSchema>;
