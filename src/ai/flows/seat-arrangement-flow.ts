
'use server';
/**
 * @fileOverview This flow handles parsing student files (CSV or PDF) and generating a seating arrangement automatically.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, SeatingAssignment, ExamConfigSchema, Student, RoomBranchSummary } from '@/lib/types';
import Papa from 'papaparse';


// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function dataUriToBuffer(dataUri: string): Buffer {
    const base64 = dataUri.substring(dataUri.indexOf(',') + 1);
    return Buffer.from(base64, 'base64');
}

// Flexible header mapping to find student data fields.
// Keys are the internal field names, values are arrays of possible header names (case-insensitive).
const headerMapping: Record<keyof Student, string[]> = {
  name: ['name', 'studentname', 'fullname', 'student name', 'nameofstudent'],
  hallTicketNumber: ['hallticketnumber', 'hallticket', 'ticketnumber', 'htno', 'rollno', 'roll number'],
  branch: ['branch', 'department', 'stream'],
  contactNumber: ['contactnumber', 'phone', 'phonenumber', 'mobile', 'contact no'],
};

// Function to find the actual header from the file that corresponds to our internal field.
function findHeaderKey(field: keyof Student, headers: string[]): string | undefined {
    const possibleNames = headerMapping[field];
    for (const header of headers) {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (possibleNames.includes(normalizedHeader)) {
            return header; // Return the original header name to access the data
        }
    }
    return undefined;
}


async function parseStudentsFromCSV(csvData: string): Promise<Student[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: (results) => {
                if (results.errors.length) {
                    console.error("CSV Parsing Errors:", results.errors);
                    return reject(new Error("Failed to parse CSV file. Please check the format."));
                }

                const parsedHeaders = results.meta.fields || [];
                
                const nameHeader = findHeaderKey('name', parsedHeaders);
                const hallTicketHeader = findHeaderKey('hallTicketNumber', parsedHeaders);
                const branchHeader = findHeaderKey('branch', parsedHeaders);
                const contactHeader = findHeaderKey('contactNumber', parsedHeaders);

                if (!nameHeader) return reject(new Error("Could not find a 'Name' column. Please ensure your CSV has a column for student names (e.g., 'Name', 'FullName')."));
                if (!hallTicketHeader) return reject(new Error("Could not find a 'Hall Ticket Number' column. Please ensure your CSV has a column for hall tickets (e.g., 'HallTicket', 'Roll No')."));
                if (!branchHeader) return reject(new Error("Could not find a 'Branch' column. Please ensure your CSV has a column for student branch (e.g., 'Branch', 'Department')."));
                if (!contactHeader) return reject(new Error("Could not find a 'Contact Number' column. Please ensure your CSV has a column for contact info (e.g., 'Phone', 'ContactNumber')."));


                const students: Student[] = (results.data as any[]).map(row => ({
                    name: row[nameHeader] || '',
                    hallTicketNumber: row[hallTicketHeader] || '',
                    branch: row[branchHeader] || '',
                    contactNumber: row[contactHeader] || '',
                })).filter(s => s.name && s.hallTicketNumber);
                
                resolve(students);
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
}


async function parseStudentsFromPDF(pdfBuffer: Buffer): Promise<Student[]> {
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(pdfBuffer);
    const lines = data.text.split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error("PDF content is not in a valid table format.");
    }

    // Treat the first line as headers, trim each header.
    const headers = lines[0].trim().split(/\s{2,}/).map(h => h.trim());
    
    const nameHeader = findHeaderKey('name', headers);
    const hallTicketHeader = findHeaderKey('hallTicketNumber', headers);
    const branchHeader = findHeaderKey('branch', headers);
    const contactHeader = findHeaderKey('contactNumber', headers);

    if (!nameHeader) throw new Error("Could not find a 'Name' column in the PDF. Please ensure your PDF has a column for student names.");
    if (!hallTicketHeader) throw new Error("Could not find a 'Hall Ticket Number' column in the PDF. Please ensure your PDF has a column for hall tickets.");
    if (!branchHeader) throw new Error("Could not find a 'Branch' column in the PDF. Please ensure your PDF has a column for student branch.");
    if (!contactHeader) throw new Error("Could not find a 'Contact Number' column in the PDF. Please ensure your PDF has a column for contact info.");

    const nameIndex = headers.indexOf(nameHeader);
    const hallTicketIndex = headers.indexOf(hallTicketHeader);
    const branchIndex = headers.indexOf(branchHeader);
    const contactIndex = headers.indexOf(contactHeader);

    // This regex is designed to split columns based on two or more spaces,
    // which is common for text-based tables in PDFs.
    const students: Student[] = lines.slice(1)
        .map(line => {
            const parts = line.trim().split(/\s{2,}/).map(p => p.trim());
            if(parts.length < headers.length) return null;
            return {
                name: parts[nameIndex] || '',
                hallTicketNumber: parts[hallTicketIndex] || '',
                branch: parts[branchIndex] || '',
                contactNumber: parts[contactIndex] || '',
            };
        })
        .filter((s): s is Student => s !== null && !!s.hallTicketNumber && !!s.name);

    if (students.length === 0) {
        throw new Error("Could not parse any students from the PDF. Please check the file's text format.");
    }
    
    return students;
}


const seatingArrangementFlow = ai.defineFlow(
  {
    name: 'seatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    
    let allStudents: Student[] = [];
    try {
        for(const dataUri of input.studentListDataUris) {
            const buffer = dataUriToBuffer(dataUri);
            let students: Student[];
            if (dataUri.startsWith('data:application/pdf')) {
                 students = await parseStudentsFromPDF(buffer);
            } else if (dataUri.startsWith('data:text/csv') || dataUri.startsWith('data:application/vnd.ms-excel')) {
                 students = await parseStudentsFromCSV(buffer.toString('utf-8'));
            } else {
                // Try to infer from buffer if mime type is generic
                try {
                    students = await parseStudentsFromPDF(buffer);
                } catch (pdfError) {
                    try {
                        students = await parseStudentsFromCSV(buffer.toString('utf-8'));
                    } catch (csvError) {
                         throw new Error('Unsupported file type. Please upload a valid CSV or PDF file.');
                    }
                }
            }
            allStudents.push(...students);
        }
    } catch(e: any) {
        return { error: e.message || "Failed to parse one or more student files."};
    }
    
    if (!allStudents || allStudents.length === 0) {
        return { error: "Could not extract any student data from the uploaded files. Please ensure files are correctly formatted and not empty." };
    }
    
    // Step 2: Procedurally generate the seating plan based on the layout config
    const layout = input.layoutConfig;
    
    // Flatten the layout into a list of available seats
    const availableSeats: Omit<SeatingAssignment, 'name' | 'hallTicketNumber' | 'branch' | 'contactNumber'>[] = [];
    layout.blocks.forEach(block => {
        block.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const totalSeats = room.benches * room.studentsPerBench;
                for (let i = 1; i <= totalSeats; i++) {
                    availableSeats.push({
                        block: block.name,
                        floor: String(floor.number),
                        classroom: room.number,
                        benchNumber: i
                    });
                }
            });
        });
    });

    if (allStudents.length > availableSeats.length) {
        return { error: `Not enough seats for all students. Required: ${allStudents.length}, Available: ${availableSeats.length}. Please increase the layout capacity.` };
    }
    
    // Shuffle students for random assignment
    const shuffledStudents = shuffleArray(allStudents);
    
    const seatingPlan: SeatingAssignment[] = [];
    
    for (let i = 0; i < shuffledStudents.length; i++) {
        const student = shuffledStudents[i];
        const seat = availableSeats[i]; // Direct assignment after shuffling
        
        const assignment: SeatingAssignment = {
            ...student,
            ...seat
        };
        seatingPlan.push(assignment);
    }
    
    seatingPlan.sort((a,b) => a.hallTicketNumber.localeCompare(b.hallTicketNumber));

    // Step 3: Create the exam configuration from the layout input
    const [startHour, startMinute] = (layout.examTimings.split('to')[0].trim().match(/\d+/g) || ["09", "00"]);
    const [endHour, endMinute] = (layout.examTimings.split('to')[1].trim().match(/\d+/g) || ["12", "00"]);

    const examConfig: z.infer<typeof ExamConfigSchema> = {
        startDate: layout.startDate,
        endDate: layout.endDate,
        startTime: { hour: startHour, minute: startMinute },
        endTime: { hour: endHour, minute: endMinute },
        useSamePlan: true,
    };

    // Step 4: Generate the room-branch summary
    const roomBranchSummary: RoomBranchSummary = {};
    seatingPlan.forEach(assignment => {
        const { classroom, branch } = assignment;
        if (!roomBranchSummary[classroom]) {
            roomBranchSummary[classroom] = {};
        }
        if (!roomBranchSummary[classroom][branch]) {
            roomBranchSummary[classroom][branch] = 0;
        }
        roomBranchSummary[classroom][branch]++;
    });

    return { seatingPlan, examConfig, roomBranchSummary };
  }
);


export async function generateSeatingArrangement(
  input: GenerateSeatingArrangementInput
): Promise<GenerateSeatingArrangementOutput> {
  return seatingArrangementFlow(input);
}
