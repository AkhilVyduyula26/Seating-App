"use server";

import fs from "fs/promises";
import path from "path";
import {
  generateSeatingArrangement,
} from "@/ai/flows/seat-arrangement-flow";
import type { GenerateSeatingArrangementInput } from '@/lib/types';

const seatingPlanPath = path.resolve(process.cwd(), ".data/seating-plan.json");

export async function createSeatingPlanAction(
  studentListDataUri: string,
  seatingLayoutDataUri: string,
  examConfig: GenerateSeatingArrangementInput['examConfig']
) {
  try {
    if (
      !studentListDataUri ||
      !studentListDataUri.startsWith("data:application/pdf;base64,")
    ) {
      return { error: "Invalid student list PDF file." };
    }
    if (
      !seatingLayoutDataUri ||
      !seatingLayoutDataUri.startsWith("data:application/pdf;base64,")
    ) {
      return { error: "Invalid seating layout PDF file." };
    }

    const input: GenerateSeatingArrangementInput = {
      studentListPdf: studentListDataUri,
      seatingLayoutPdf: seatingLayoutDataUri,
      examConfig
    };
    
    const result = await generateSeatingArrangement(input);

    if (result.error) {
      return { error: result.error };
    }
    
    // Simulate saving to a database
    await fs.mkdir(path.dirname(seatingPlanPath), { recursive: true });
    await fs.writeFile(seatingPlanPath, JSON.stringify({ plan: result.seatingPlan, examConfig }, null, 2));

    return { success: true };
  } catch (e: any) {
    console.error("Error creating seating plan:", e);
     if (e.message?.includes("API key not valid")) {
      return {
        error:
          "The provided Gemini API Key is invalid. Please check and try again.",
      };
    }
    return {
      error: e.message || "An unexpected error occurred.",
    };
  }
}

export async function getSeatingDataAction(): Promise<{
  plan?: any[];
  examConfig?: GenerateSeatingArrangementInput['examConfig'];
  error?: string;
}> {
  try {
    const data = await fs.readFile(seatingPlanPath, "utf-8");
    const parsedData = JSON.parse(data);
    return { plan: parsedData.plan, examConfig: parsedData.examConfig };
  } catch (error) {
    // If the file doesn't exist, it's not an error, just means no plan is saved yet.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    console.error("Error fetching seating data:", error);
    return { error: "Failed to load seating data." };
  }
}

export async function deleteSeatingDataAction() {
    try {
        await fs.unlink(seatingPlanPath);
        return { success: true };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return { success: true }; // Already deleted
        }
        console.error("Error deleting seating data:", error);
        return { error: "Failed to delete seating data." };
    }
}
