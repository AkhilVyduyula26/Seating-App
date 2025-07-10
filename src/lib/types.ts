
import { z } from 'zod';

export const StudentSchema = z.object({
  name: z.string().describe('The full name of the student.'),
  hallTicketNumber: z.string().describe('The unique hall ticket number of the student.'),
  branch: z.string().describe('The student\'s branch of study (e.g., CSE, IT, IoT).'),
  contactNumber: z.string().describe('The student\'s contact phone number.'),
});
export type Student = z.infer<typeof StudentSchema>;


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

export const ExamConfigSchema = z.object({
    startDate: z.string().describe("The start date of the exam period in ISO format."),
    endDate: z.string().describe("The end date of the exam period in ISO format."),
    startTime: z.object({ hour: z.string(), minute: z.string() }),
    endTime: z.object({ hour: z.string(), minute: z.string() }),
    useSamePlan: z.boolean(),
});
export type ExamConfig = z.infer<typeof ExamConfigSchema>;

export const ClassroomConfigSchema = z.object({
  block: z.string().min(1, "Block is required."),
  floor: z.string().min(1, "Floor is required."),
  roomNumber: z.string().min(1, "Room number is required."),
  benchCount: z.number().min(1, "Bench count must be at least 1."),
});
export type ClassroomConfig = z.infer<typeof ClassroomConfigSchema>;

export const SeatingLayoutSchema = z.object({
  classrooms: z.array(ClassroomConfigSchema),
});
export type SeatingLayout = z.infer<typeof SeatingLayoutSchema>;


export const GenerateSeatingArrangementInputSchema = z.object({
  studentListDoc: z
    .string()
    .describe(
      "A PDF file containing the list of students, as a data URI."
    ),
  seatingLayout: SeatingLayoutSchema,
});
export type GenerateSeatingArrangementInput = z.infer<typeof GenerateSeatingArrangementInputSchema>;

export const GenerateSeatingArrangementOutputSchema = z.object({
  seatingPlan: z.array(SeatingAssignmentSchema).optional().describe("The final generated seating arrangement for all students."),
  examConfig: ExamConfigSchema.optional().describe("The exam configuration."),
  error: z.string().optional().describe("An error message if the process fails."),
});
export type GenerateSeatingArrangementOutput = z.infer<typeof GenerateSeatingArrangementOutputSchema>;


export const ValidateFacultyInputSchema = z.object({
  facultyId: z.string().describe("The Faculty ID entered by the user."),
  secureKey: z.string().optional().describe("The secure key entered by the user."),
});
export type ValidateFacultyInput = z.infer<typeof ValidateFacultyInputSchema>;


export const ValidateFacultyOutputSchema = z.object({
  isAuthorized: z.boolean().describe("Whether the faculty member is authorized based on the provided ID and key."),
  error: z.string().optional().describe("An error message if validation fails for a specific reason, e.g., 'Secure key mismatch' or 'Faculty ID not found'."),
});
export type ValidateFacultyOutput = z.infer<typeof ValidateFacultyOutputSchema>;
