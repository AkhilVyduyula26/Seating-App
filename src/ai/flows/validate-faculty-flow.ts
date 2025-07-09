'use server';
/**
 * @fileOverview Validates a faculty member's credentials against a provided PDF document.
 *
 * - validateFaculty - A function that handles faculty ID and secure key validation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ValidateFacultyInputSchema, ValidateFacultyOutputSchema, ValidateFacultyInput, ValidateFacultyOutput } from '@/lib/types';


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
