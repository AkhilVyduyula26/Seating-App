
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
    startDate: z.string().describe("The start date of the exam period in YYYY-MM-DD format."),
    endDate: z.string().describe("The end date of the exam period in YYYY-MM-DD format."),
    startTime: z.object({ hour: z.string(), minute: z.string() }),
    endTime: z.object({ hour: z.string(), minute: z.string() }),
    useSamePlan: z.boolean(),
});
export type ExamConfig = z.infer<typeof ExamConfigSchema>;

export const RoomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  benches: z.coerce.number().min(1, 'Number of benches must be at least 1'),
  studentsPerBench: z.coerce.number().min(1, 'Students per bench must be at least 1'),
});
export type Room = z.infer<typeof RoomSchema>;

export const FloorSchema = z.object({
  number: z.coerce.number(),
  rooms: z.array(RoomSchema).min(1, 'You must add at least one room to a floor.'),
});
export type Floor = z.infer<typeof FloorSchema>;

export const BlockSchema = z.object({
  name: z.string().min(1, 'Block name is required'),
  floors: z.array(FloorSchema).min(1, 'You must add at least one floor to a block.'),
});
export type Block = z.infer<typeof BlockSchema>;


export const LayoutFormSchema = z.object({
  blocks: z.array(BlockSchema).min(1, 'You must define at least one block.'),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date().optional(),
  examTimings: z.string().min(1, "Exam timings are required."),
});
export type LayoutConfig = z.infer<typeof LayoutFormSchema>;

export const GenerateSeatingArrangementInputSchema = z.object({
  studentListDoc: z
    .string()
    .describe(
      "A PDF file containing the list of students, as a data URI."
    ),
  layoutConfig: LayoutFormSchema.omit({ startDate: true, endDate: true }).extend({
      startDate: z.string(),
      endDate: z.string(),
  })
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
