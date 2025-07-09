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

export async function validateFacultyIdAction(
  facultyId: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const data = await fs.readFile(facultyAuthPath, "utf-8");
    const authData = JSON.parse(data);
    
    const facultyMember = authData.authorized_faculty.find(
      (faculty: { faculty_id: string }) => 
        faculty.faculty_id.toLowerCase() === facultyId.toLowerCase()
    );

    if (facultyMember) {
      return { isValid: true };
    } else {
      return { isValid: false, error: "Unauthorized Faculty ID" };
    }
  } catch (e: any) {
    console.error("Error validating faculty ID:", e);
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { isValid: false, error: "Authorization file not found. Please contact support." };
    }
    return {
      isValid: false,
      error: "An unexpected error occurred during validation.",
    };
  }
}
