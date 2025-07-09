"use server";

import {
  generateSeatingArrangement,
  type GenerateSeatingArrangementInput,
} from "@/ai/flows/generate-seating-arrangement";
import * as db from '@/lib/database';
import type { SeatingPlan } from "@/lib/types";


export async function generateSeatingPlanAction(
  studentDataPdfDataUri: string,
  seatingLayoutPdfDataUri: string,
  examDateTime: Date,
): Promise<{
  plan?: SeatingPlan[];
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

    const combinedPlan: SeatingPlan[] = result.seatingAssignments.map((assignment) => {
        const student = result.students.find(s => s.hallTicketNumber === assignment.hallTicketNumber);
        return {
            ...assignment,
            name: student?.name || 'N/A',
            branch: student?.branch || 'N/A',
            contactNumber: student?.contactNumber || 'N/A',
        }
    });

    await db.saveSeatingPlan(combinedPlan, examDateTime);
    
    // ** Simulation of Scheduled Tasks **
    // In a production environment, you would now trigger a scheduled function (e.g., using Google Cloud Scheduler or Vercel Cron).
    // 1. Schedule WhatsApp alerts: A function would be scheduled to run 1 hour before `examDateTime`. It would read the plan and send messages.
    // 2. Schedule data deletion: Another function would be scheduled to run after the exam ends to call `deleteSeatingPlan()`.
    
    return { plan: combinedPlan };

  } catch (e: any) {
    console.error("Error generating seating plan:", e);
    if (e.message?.includes('API key not valid')) {
        return { error: "The provided Gemini API Key is invalid. Please check and try again." };
    }
    return { error: e.message || "An unexpected error occurred while processing the PDFs." };
  }
}


export async function getSeatingPlanAction() {
  return await db.getSeatingPlan();
}

export async function deleteSeatingPlanAction() {
  await db.deleteSeatingPlan();
  return { success: true };
}

export async function getStudentSeatAction(hallTicketNumber: string) {
  if (!hallTicketNumber) return null;
  return await db.getStudentSeatByHallTicket(hallTicketNumber);
}