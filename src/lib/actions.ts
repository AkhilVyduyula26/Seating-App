"use server";

import { z } from "zod";
import {
  generateSeatingArrangement,
  type GenerateSeatingArrangementInput,
  type GenerateSeatingArrangementOutput,
  type Student,
} from "@/ai/flows/generate-seating-arrangement";

export async function generateSeatingPlanAction(
  pdfDataUri: string,
  seatingCapacityStr: string
): Promise<{
  plan?: {seatingAssignments: GenerateSeatingArrangementOutput["seatingAssignments"]};
  students?: Student[];
  error?: string;
}> {
  try {
    const seatingCapacity = parseInt(seatingCapacityStr, 10);
    if (isNaN(seatingCapacity) || seatingCapacity <= 0) {
      return { error: "Invalid seating capacity. Must be a positive number." };
    }

    if (!pdfDataUri || !pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: 'Invalid PDF file data.' };
    }
    
    const input: GenerateSeatingArrangementInput = {
      pdfDataUri,
      seatingCapacity,
    };

    const result = await generateSeatingArrangement(input);

    if (result.students.length === 0) {
        return { error: "No student data could be extracted from the PDF." };
    }

    if (result.students.length > seatingCapacity) {
        return { error: "Seating capacity is less than the number of students found in the PDF." };
    }

    return { plan: { seatingAssignments: result.seatingAssignments }, students: result.students };

  } catch (e: any) {
    console.error("Error generating seating plan:", e);
    return { error: e.message || "An unexpected error occurred while processing the PDF." };
  }
}
