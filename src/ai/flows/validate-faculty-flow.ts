'use server';
/**
 * @fileOverview Validates a faculty member's credentials against a provided PDF document.
 *
 * - validateFaculty - A function that handles faculty ID and secure key validation.
 * - ValidateFacultyInput - The input type for the validateFaculty function.
 * - ValidateFacultyOutput - The return type for the validateFaculty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateFacultyInputSchema = z.object({
  facultyPdfDataUri: z.string().describe(
      "A PDF file of authorized faculty, as a data URI that must include a MIME type and use Base64 encoding. The PDF contains a secure key at the top and a list of faculty members with their IDs."
    ),
  facultyId: z.string().describe("The Faculty ID entered by the user."),
  secureKey: z.string().describe("The secure key entered by the user."),
});
export type ValidateFacultyInput = z.infer<typeof ValidateFacultyInputSchema>;


const ValidateFacultyOutputSchema = z.object({
  isAuthorized: z.boolean().describe("Whether the faculty member is authorized based on the provided ID and key."),
  error: z.string().optional().describe("An error message if validation fails for a specific reason, e.g., 'Secure key mismatch' or 'Faculty ID not found'."),
});
export type ValidateFacultyOutput = z.infer<typeof ValidateFacultyOutputSchema>;

export async function validateFaculty(input: ValidateFacultyInput): Promise<ValidateFacultyOutput> {
  return validateFacultyFlow(input);
}

const validateFacultyPrompt = ai.definePrompt({
  name: 'validateFacultyPrompt',
  input: {schema: ValidateFacultyInputSchema},
  output: {schema: ValidateFacultyOutputSchema},
  prompt: `You are a security validation agent. Your task is to verify a faculty member's credentials against an authorization PDF.

You will be given a PDF file and the credentials entered by a user.
- Faculty Authorization PDF: {{media url=facultyPdfDataUri}}
- Entered Faculty ID: {{{facultyId}}}
- Entered Secure Key: {{{secureKey}}}

Perform the following checks:
1. Extract the secure key printed at the top of the PDF. Compare it with the 'Entered Secure Key'. The match must be exact (case-sensitive).
2. Extract the list of authorized faculty members from the PDF.
3. Check if the 'Entered Faculty ID' exists in the extracted list.

Authorization Rules:
- If the secure keys do not match, set 'isAuthorized' to false and provide the error 'Secure key mismatch'.
- If the secure key matches but the Faculty ID is not found in the list, set 'isAuthorized' to false and provide the error 'Faculty ID not found'.
- If both the secure key matches AND the Faculty ID is found in the list, set 'isAuthorized' to true.

Return your final decision in the specified JSON format.
`,
});

const validateFacultyFlow = ai.defineFlow(
  {
    name: 'validateFacultyFlow',
    inputSchema: ValidateFacultyInputSchema,
    outputSchema: ValidateFacultyOutputSchema,
  },
  async input => {
    const {output} = await validateFacultyPrompt(input);
    return output!;
  }
);
