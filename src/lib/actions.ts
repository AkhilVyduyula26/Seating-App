"use server";

import { z } from "zod";
import {
  generateSeatingArrangement,
  type GenerateSeatingArrangementInput,
  type GenerateSeatingArrangementOutput,
} from "@/ai/flows/generate-seating-arrangement";

const StudentSchema = z.object({
  name: z.string(),
  hallTicketNumber: z.string(),
  branch: z.string(),
  contactNumber: z.string(),
});

export async function generateSeatingPlanAction(
  studentDataCsv: string,
  seatingCapacityStr: string
): Promise<{
  plan?: GenerateSeatingArrangementOutput;
  students?: GenerateSeatingArrangementInput["students"];
  error?: string;
}> {
  try {
    const seatingCapacity = parseInt(seatingCapacityStr, 10);
    if (isNaN(seatingCapacity) || seatingCapacity <= 0) {
      return { error: "Invalid seating capacity. Must be a positive number." };
    }

    const rows = studentDataCsv.trim().split("\n");
    const students: GenerateSeatingArrangementInput["students"] = [];

    for (const row of rows) {
      if (row.trim() === "") continue;
      const [name, hallTicketNumber, branch, contactNumber] = row.split(",").map(s => s.trim());
      
      const studentParseResult = StudentSchema.safeParse({
        name,
        hallTicketNumber,
        branch,
        contactNumber,
      });

      if (!studentParseResult.success) {
        return { error: `Invalid student data format in row: "${row}". Ensure format is: Name, HallTicketNumber, Branch, ContactNumber` };
      }
      students.push(studentParseResult.data);
    }

    if (students.length === 0) {
        return { error: "No student data provided." };
    }

    if (students.length > seatingCapacity) {
        return { error: "Seating capacity is less than the number of students." };
    }
    
    const input: GenerateSeatingArrangementInput = {
      students,
      seatingCapacity,
    };

    const plan = await generateSeatingArrangement(input);

    return { plan, students };

  } catch (e: any) {
    console.error("Error generating seating plan:", e);
    return { error: e.message || "An unexpected error occurred." };
  }
}
