
import { z } from 'zod';

export const StudentSchema = z.object({
  name: z.string().describe('The full name of the student.'),
  hallTicketNumber: z.string().describe('The unique hall ticket number of the student.'),
  branch: z.string().describe('The student\'s branch of study (e.g., CSE, IT, IoT).'),
  contactNumber: z.string().describe('The student\'s contact phone number.'),
});
export type Student = z.infer<typeof StudentSchema>;

// Schema for manual layout input from the admin form
export const DynamicFloorSchema = z.object({
    name: z.string().min(1, "Floor name is required."),
    rooms: z.string().min(1, "Room numbers are required."),
    benchesPerRoom: z.string().min(1, "Benches per room is required.").refine(val => !isNaN(parseInt(val, 10)), { message: "Benches must be a number."}),
});

export const DynamicBlockSchema = z.object({
    name: z.string().min(1, "Block name is required."),
    floors: z.array(DynamicFloorSchema).min(1, "At least one floor is required."),
});

export const DynamicLayoutInputSchema = z.object({
    blocks: z.array(DynamicBlockSchema).min(1, "At least one block is required."),
});
export type DynamicLayoutInput = z.infer<typeof DynamicLayoutInputSchema>;


export const SeatingLayoutSchema = z.object({
  blocks: z.any().describe('Total number of blocks available.'),
  floorsPerBlock: z.any().describe('Number of floors in each block.'),
  roomsPerFloor: z.any().describe('Number of rooms on each floor.'),
  benchesPerRoom: z.any().describe('Number of benches in each room.'),
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

export const ExamConfigSchema = z.object({
    startDate: z.string().describe("The start date of the exam period in ISO format."),
    endDate: z.string().describe("The end date of the exam period in ISO format."),
    startTime: z.object({ hour: z.string(), minute: z.string() }),
    endTime: z.object({ hour: z.string(), minute: z.string() }),
    useSamePlan: z.boolean(),
});
export type ExamConfig = z.infer<typeof ExamConfigSchema>;

export const GenerateSeatingArrangementInputSchema = z.object({
  studentListDoc: z
    .string()
    .describe(
      "A PDF, CSV, or XLSX file containing the list of students, as a data URI."
    ),
  seatingLayout: DynamicLayoutInputSchema,
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
