
'use server';
/**
 * @fileOverview This flow handles the server-side generation of PDF documents.
 * 
 * - generatePdfFlow - A Genkit flow that acts as a wrapper for PDF generation logic.
 */

import { ai } from '@/ai/genkit';
import { PdfRequestSchema, PdfResponseSchema } from '@/lib/types';
import { generatePdfDocument } from '@/lib/pdf-generator';

const generatePdfFlow = ai.defineFlow(
    {
        name: 'generatePdfFlow',
        inputSchema: PdfRequestSchema,
        outputSchema: PdfResponseSchema,
    },
    async (input) => {
        try {
            const pdfDataUri = await generatePdfDocument(input);
            return { pdfDataUri };

        } catch (e: any) {
            console.error("PDF Generation Flow Error:", e);
            return { error: e.message || 'An unknown error occurred during PDF generation.' };
        }
    }
);

export { generatePdfFlow };
