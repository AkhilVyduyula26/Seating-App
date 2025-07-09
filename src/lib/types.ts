import type { GenerateSeatingArrangementOutput } from "@/ai/flows/generate-seating-arrangement";

export type SeatingAssignment = GenerateSeatingArrangementOutput["seatingAssignments"][0];

// Combined type for a single student's seating plan
export type SeatingPlan = SeatingAssignment & {
  name: string;
  branch: string;
  contactNumber: string;
};

export type ExamConfig = {
  startDate: string; // ISO Date string
  endDate: string;   // ISO Date string
  startTime: { hour: string; minute: string };
  endTime: { hour: string; minute: string };
  useSamePlan: boolean;
};

// Type for the entire stored plan in the "database"
export type FullSeatingPlan = {
    plan: SeatingPlan[];
    examConfig: ExamConfig;
};

// Combined type for what the student view needs
export type StudentSeatDetails = SeatingPlan & {
    examConfig: ExamConfig;
};
