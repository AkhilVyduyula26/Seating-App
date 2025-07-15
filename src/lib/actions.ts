
"use server";

import fs from "fs/promises";
import path from "path";
import {
  generateSeatingArrangement,
} from "@/ai/flows/seat-arrangement-flow";
import { validateFaculty } from "@/ai/flows/validate-faculty-flow";
import type { GenerateSeatingArrangementInput, ValidateFacultyInput, ExamConfig, LayoutConfig } from '@/lib/types';
import { format } from "date-fns";

const seatingPlanPath = path.resolve(process.cwd(), ".data/seating-plan.json");
const facultyAuthPath = path.resolve(process.cwd(), ".data/faculty-auth.json");

export async function createSeatingPlanAction(
  studentListCsvData: string,
  layoutConfig: LayoutConfig,
) {
  try {
    const input: GenerateSeatingArrangementInput = {
      studentListCsv: studentListCsvData,
      layoutConfig: {
        ...layoutConfig,
        // Dates are converted to string for serialization
        startDate: format(layoutConfig.startDate, 'yyyy-MM-dd'),
        endDate: format(layoutConfig.endDate, 'yyyy-MM-dd'),
      },
    };
    
    const result = await generateSeatingArrangement(input);

    if (result.error) {
      return { error: result.error };
    }
    
    await fs.mkdir(path.dirname(seatingPlanPath), { recursive: true });
    await fs.writeFile(seatingPlanPath, JSON.stringify({ plan: result.seatingPlan, examConfig: result.examConfig }, null, 2));

    return { success: true, plan: result.seatingPlan, examConfig: result.examConfig };
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
      // Return null instead of an error string to indicate no plan exists
      return { plan: undefined, examConfig: undefined };
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

export async function validateFacultyAction(facultyId: string, secureKey?: string): Promise<{
    isValid: boolean;
    error?: string;
}> {
    try {
        const input: ValidateFacultyInput = { facultyId, secureKey };
        const result = await validateFaculty(input);
        return { isValid: result.isAuthorized, error: result.error };
    } catch(e: any) {
        console.error("Error validating faculty:", e);
        return { isValid: false, error: e.message || "An unexpected error occurred during validation." };
    }
}

export async function getFacultyAuthDataAction(): Promise<{ success: boolean; data?: string; error?: string}> {
    try {
        const data = await fs.readFile(facultyAuthPath, 'utf-8');
        return { success: true, data };
    } catch (e: any) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
            return { success: false, error: "Authorization file not found." };
        }
        console.error("Error reading faculty auth data:", e);
        return { success: false, error: "Failed to read faculty authorization data." };
    }
}


export async function updateFacultyAuthDataAction(content: string): Promise<{ success: boolean; error?: string }> {
    try {
        JSON.parse(content); // Validate if the content is valid JSON
    } catch (e) {
        return { success: false, error: "Invalid JSON format." };
    }
    
    try {
        await fs.writeFile(facultyAuthPath, content, 'utf-8');
        return { success: true };
    } catch (e: any) {
        console.error("Error writing faculty auth data:", e);
        return { success: false, error: "Failed to save faculty authorization data." };
    }
}
