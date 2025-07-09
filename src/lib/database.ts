'use server';

import fs from 'fs/promises';
import path from 'path';
import type { SeatingPlan, FullSeatingPlan, StudentSeatDetails, ExamConfig } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), '.data', 'seating-plan.json');
const dataDir = path.dirname(dataFilePath);

// Helper to ensure directory exists
async function ensureDirectoryExists() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
    throw new Error('Could not create data directory.');
  }
}

// Helper to read data
async function readData(): Promise<FullSeatingPlan | null> {
  try {
    await ensureDirectoryExists();
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist, which is fine.
    }
    console.error('Failed to read seating plan data:', error);
    // Don't throw here, just return null for robustness
    return null;
  }
}

// Helper to write data
async function writeData(data: FullSeatingPlan | null): Promise<void> {
  try {
    await ensureDirectoryExists();
    if (data === null) {
      await fs.unlink(dataFilePath).catch(err => {
        if (err.code !== 'ENOENT') throw err;
      });
    } else {
      await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to write seating plan data:', error);
    throw new Error('Could not write seating plan data.');
  }
}

// Service functions
export async function saveSeatingPlan(plan: SeatingPlan[], examConfig: ExamConfig): Promise<void> {
    const data: FullSeatingPlan = {
        plan,
        examConfig,
    };
    await writeData(data);
}

export async function getSeatingPlan(): Promise<FullSeatingPlan | null> {
    return await readData();
}

export async function deleteSeatingPlan(): Promise<void> {
    await writeData(null);
}

export async function getStudentSeatByHallTicket(hallTicketNumber: string): Promise<StudentSeatDetails | null> {
    const data = await readData();
    if (!data) return null;

    const studentSeat = data.plan.find(seat => seat.hallTicketNumber.toLowerCase() === hallTicketNumber.toLowerCase());
    
    if (studentSeat) {
        return {
            ...studentSeat,
            examConfig: data.examConfig,
        };
    }
    return null;
}
