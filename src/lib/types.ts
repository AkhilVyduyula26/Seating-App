import type { GenerateSeatingArrangementOutput } from "@/ai/flows/generate-seating-arrangement";

export type SeatingAssignment = GenerateSeatingArrangementOutput["seatingAssignments"][0];

// Combined type for a single student's seating plan
export type SeatingPlan = SeatingAssignment & {
  name: string;
  branch: string;
  contactNumber: string;
};

// Type for the entire stored plan in the "database"
export type FullSeatingPlan = {
    plan: SeatingPlan[];
    examDateTime: string; // ISO string
};

// Combined type for what the student view needs
export type StudentSeatDetails = SeatingPlan & {
    examDateTime: string;
};
