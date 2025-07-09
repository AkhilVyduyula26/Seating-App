"use server";

import { z } from "zod";
import {
  generateSeatingArrangement,
  type GenerateSeatingArrangementInput,
  type GenerateSeatingArrangementOutput,
  type Student,
} from "@/ai/flows/generate-seating-arrangement";

export async function generateSeatingPlanAction(
  studentDataPdfDataUri: string,
  seatingLayoutPdfDataUri: string
): Promise<{
  plan?: {seatingAssignments: GenerateSeatingArrangementOutput["seatingAssignments"]};
  students?: Student[];
  error?: string;
}> {
  try {
    if (!studentDataPdfDataUri || !studentDataPdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: 'Invalid Student Data PDF file.' };
    }
    if (!seatingLayoutPdfDataUri || !seatingLayoutPdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: 'Invalid Seating Layout PDF file.' };
    }
    
    const input: GenerateSeatingArrangementInput = {
      studentDataPdfDataUri,
      seatingLayoutPdfDataUri,
    };

    const result = await generateSeatingArrangement(input);

    if (!result.students || result.students.length === 0) {
        return { error: "No student data could be extracted from the PDF." };
    }

    if (!result.seatingAssignments || result.seatingAssignments.length === 0) {
      return { error: "Could not generate seating assignments. The AI might have had an issue with the layout PDF." };
    }

    if (result.students.length > result.seatingAssignments.length) {
      return { error: `Seating capacity is insufficient. Found ${result.students.length} students but only ${result.seatingAssignments.length} seats could be assigned.` };
    }

    return { plan: { seatingAssignments: result.seatingAssignments }, students: result.students };

  } catch (e: any) {
    console.error("Error generating seating plan:", e);
    return { error: e.message || "An unexpected error occurred while processing the PDFs." };
  }
}
