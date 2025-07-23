'use server';
/**
 * @fileOverview This flow handles parsing a student CSV and generating a seating arrangement automatically.
 * 
 * - generateSeatingArrangement - A function that orchestrates the document parsing and seat assignment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, GenerateSeatingArrangementInput, GenerateSeatingArrangementOutput, SeatingAssignment, ExamConfigSchema, Student } from '@/lib/types';
import Papa from 'papaparse';


// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
                
                const requiredFields = ['name', 'hallTicketNumber', 'branch', 'contactNumber'];
                const headers = results.meta.fields;

                if(!headers || !requiredFields.every(field => headers.includes(field))) {
                    return reject(new Error(`CSV must contain the headers: ${requiredFields.join(', ')}`));
                }

                // @ts-ignore
                const students: Student[] = results.data.map(row => ({
                    name: row.name || '',
                    hallTicketNumber: row.hallTicketNumber || '',
                    branch: row.branch || '',
                    contactNumber: row.contactNumber || '',
                })).filter(s => s.name && s.hallTicketNumber);
                
                resolve(students);
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
}


const seatingArrangementFlow = ai.defineFlow(
  {
    name: 'seatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    
    // Step 1: Parse all student list CSVs
    let allStudents: Student[] = [];
    try {
        for(const csvData of input.studentListCsvs) {
            const students = await parseStudentsFromCSV(csvData);
            allStudents.push(...students);
        }
    } catch(e: any) {
        return { error: e.message || "Failed to parse one or more student CSVs."};
    }
    
    if (!allStudents || allStudents.length === 0) {
        return { error: "Could not extract any student data from the CSVs. Please ensure files are correctly formatted and not empty." };
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

    return { seatingPlan, examConfig };
  }
);


export async function generateSeatingArrangement(
  input: GenerateSeatingArrangementInput
): Promise<GenerateSeatingArrangementOutput> {
  return seatingArrangementFlow(input);
}
