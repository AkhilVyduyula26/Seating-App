"use server";

import {
  validateFaculty,
  type ValidateFacultyInput,
} from "@/ai/flows/validate-faculty-flow";

export async function validateFacultyAction(
  facultyPdfDataUri: string,
  facultyId: string,
  secureKey: string
): Promise<{
  isValid?: boolean;
  error?: string;
}> {
  try {
    if (
      !facultyPdfDataUri ||
      !facultyPdfDataUri.startsWith("data:application/pdf;base64,")
    ) {
      return { error: "Invalid Faculty PDF file." };
    }
    if (!facultyId) {
        return { error: "Faculty ID is required." };
    }
    if (!secureKey) {
        return { error: "Secure Key is required." };
    }

    const input: ValidateFacultyInput = {
      facultyPdfDataUri,
      facultyId,
      secureKey,
    };

    const result = await validateFaculty(input);
    
    if (result.error) {
        return { isValid: false, error: result.error };
    }

    return { isValid: result.isAuthorized };
  } catch (e: any) {
    console.error("Error validating faculty:", e);
    if (e.message?.includes("API key not valid")) {
      return {
        error:
          "The provided Gemini API Key is invalid. Please check and try again.",
      };
    }
    return {
      error: e.message || "An unexpected error occurred during validation.",
    };
  }
}
