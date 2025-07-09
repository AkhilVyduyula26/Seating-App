"use server";

import fs from "fs/promises";
import path from "path";
import {
  generateSeatingArrangement,
} from "@/ai/flows/seat-arrangement-flow";
import { validateFaculty } from "@/ai/flows/validate-faculty-flow";
import type { GenerateSeatingArrangementInput, ValidateFacultyInput, ExamConfig } from '@/lib/types';

const seatingPlanPath = path.resolve(process.cwd(), ".data/seating-plan.json");
const facultyAuthPath = path.resolve(process.cwd(), ".data/faculty-auth.json");

export async function createSeatingPlanAction(
  studentListDataUri: string,
  seatingLayoutDataUri: string,
  examConfig: ExamConfig
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
  examConfig?: ExamConfig;
  error?: string;
}> {
  try {
    const data = await fs.readFile(seatingPlanPath, "utf-8");
    const parsedData = JSON.parse(data);
    return { plan: parsedData.plan, examConfig: parsedData.examConfig };
  } catch (error) {
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

export async function validateFacultyAction(
  facultyId: string,
  secureKey: string
) {
  try {
    const input: ValidateFacultyInput = {
      facultyId,
      secureKey,
    };
    const result = await validateFaculty(input);
    return { isValid: result.isAuthorized, error: result.error };
  } catch (e: any) {
    console.error("Error validating faculty:", e);
    return {
      isValid: false,
      error: e.message || "An unexpected error occurred during validation.",
    };
  }
}

export async function getFacultyAuthDataAction(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const data = await fs.readFile(facultyAuthPath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    console.error("Error reading faculty auth data:", error);
    return { success: false, error: 'Could not read faculty authorization file.' };
  }
}


export async function updateFacultyAuthDataAction(
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic validation to ensure it's valid JSON
    JSON.parse(content);
    await fs.writeFile(facultyAuthPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'The provided content is not valid JSON.' };
    }
    console.error("Error writing faculty auth data:", error);
    return { success: false, error: 'Could not save faculty authorization file.' };
  }
}
