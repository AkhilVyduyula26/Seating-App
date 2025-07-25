
'use server';
/**
 * @fileOverview This flow handles the server-side generation of PDF documents.
 * 
 * - generatePdf - A function that creates various types of PDFs based on seating plan data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PdfRequestSchema, PdfResponseSchema, PdfRequest, PdfResponse, SeatingAssignment } from '@/lib/types';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARgAAAAmCAYAAAB2jmuPAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAVNSURBVHhe7Z1NiB9FFMffj5+7s046Wd2ZmV1kYRAh+pCIiAiKCBdCPAgKuXiRkC56sC7iRR8EvLhI0UPCg4eE1N2lR0F+ChQHIZEgRAWRSCi72V12dmdn3ffvO9VMd2Z2u/vTmWneGczJzEw/3fe93/d+H4dEImG2i4GZgAKcAZwB3AJcA3wE/DGkPk8A3wD/AV8B5+XMxgfXwFfA2cDpQPpA/gdcBGwFfh8F2ApcA7wGbAduA0YC72Y3gQc/YBHwE+BUYAOwPxtXA7eAn7IbwYNNvAicDPyX/f1+AvwNfAecDcwqVjUfOAP8P/sZ6iLgd+A34BvgzWys/O/v9y/AVcDZwFdgO3AjsBq4p7T1d4FjQJp/AWcB35XvTmA/sE/o813A78AVwJbI2wPcCsyX7u4Fngb+xG3/S2A/sE9obwL2AF8l/5l6V2AnME96fRs4GPg4c+0dwFrgZ+Bv4J3L1gGfAf9jN/c9cDGwT2hvA/YBw/Iv4Ldk917AnqK2C3AisL5oPAn4E/gZeDez/W/gLWB/W0sLw+Mh4FHgHGCvjC52AfeV32bA/2wBHwMjwOrsZqS7P2yBhwLXVO0DMLIH3gMeBF7M7K0Abk5f3k198D/gS+A6YGWwXwC+DHyVnco3JpE0mQe8rGxtB65Kfp+y3YJqgXvDfgBfAxdlN0g3Y0kQzSXwVwL/N2I7DZwFjC9tq/4jI+M1u4HnQxJm+T/wX3ZTAg9m5U7gf+BW4M5U2n9l8q6lAKeD0/Ln+8AnwPvy10FgZ3G2VwGjwL/YTaK2TfNSZFkRL4I+RmTtW4GfskvJjV1pC1kLzLdSO4E7gM3V2d4HTgL+RmqXQGez2xP4CLgdGF++S/g4cFf2k1XbZk1qLzD/SW1N6v+VvO1qYH3R2vM6Mh5n9hB40lqY3bQ2a2mC7Cb7GdgJrAeeD3n7NqBtLgB+xpIgrb0b+N1Ue22aQNuy23cAG4EtQJr/l3j/2hQ/C1hR1f4JDA+bI+eD27KvA8cAa+s5m62fA49mZz83gV+Bn3Oar946zLdSO4E7U2n/Q+C+sr/J8F5gNfBb8p8GvA2cE82J2R09rE/g9+Q3GvV2+ZtRb9/48y1/w+L6+3vAacD+ogP6i03j/hO4FvjY+LqXga8yI1/nQeA54L6sT9eApzMzp+kPtwFfZAe5g9fAecBtWbfbgP+BLzP7S4BfgySoGsN3wH+z2wBslhZGbBvA39mZbQ9lX6D75+z2M/ABMNst8u/B6M1kO8uU7wJ164/Y+7KbyX7/K3M/u4GfMmv1C2AjcM/W7uNn2t8f029/mE3q9xPwm1Q2a8E4v/Uu8G7m3gX8lF13F3AZcE82rpf7qGvG6v1/8G5mcB84VwX2L4HfwR+xG8h+C7ATuHda7+nACcAo4BjwE7BXBj8A3wPvy34GdgNvZT8L7AImVOv2r7L/IeBIWVsC7F8C7wKPgI+Tf+r3b7T+F0k4k8g83Ab8r9hO43fgt+yrgR+Bt4Hfsu4nwRk4M3vfBv7NbsrvVWAp8AmwXwb/NXBJ1j8l9W2V+j8n8L/sJgQeAncCe4BngdPy9xnw/7KvAg+AZcB3b7+8D5wHjC7mZ+x9q+X+p5F4Tf1tA/8E/glI/2vA8cDf2E1I/22SgBvA3cD66U1wZ1/7mJ7u+wK8wU/s9z/gV+A5YF8Z9nWAQ8ChzNqTAO8C66sJvVv/NfDfwBGAw/L/fOA8cCUwDpi5BzgV+A0YAMzcC5wHnBvM/V97gC+A18Df2M1/3T8/BzwX3C1Y/W2BbwLPgS+BvcCf2c36x8ApwM+ZDawE7ge2A3cDn2M1gEGAq7J+7X8ZgGk6f7n+L/0PBMF/E9fMv/cAAAAASUVORK5CYII=";


const generatePdfFlow = ai.defineFlow(
    {
        name: 'generatePdfFlow',
        inputSchema: PdfRequestSchema,
        outputSchema: PdfResponseSchema,
    },
    async (input) => {
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            switch (input.type) {
                case 'summary':
                    generateSummaryPdf(doc, input.roomBranchSummary);
                    break;
                case 'attendanceSheet':
                    generateAttendanceSheetPdf(doc, input.seatingPlan, input.examConfig);
                    break;
                case 'roomList':
                    generateRoomListPdf(doc, input.seatingPlan, input.examConfig);
                    break;
                default:
                    throw new Error('Invalid PDF type specified.');
            }
            
            const pdfDataUri = doc.output('datauristring');
            return { pdfDataUri };

        } catch (e: any) {
            console.error("PDF Generation Flow Error:", e);
            return { error: e.message || 'An unknown error occurred during PDF generation.' };
        }
    }
);


const groupStudentsByRoom = (plan: SeatingAssignment[]) => {
    return plan.reduce((acc, student) => {
        const room = student.classroom;
        if (!acc[room]) {
            acc[room] = [];
        }
        acc[room].push(student);

        // Sort students within each room by bench number
        acc[room].sort((a, b) => {
            const numA = parseInt(a.benchNumber.replace(/[^0-9]/g, ''), 10);
            const numB = parseInt(b.benchNumber.replace(/[^0-9]/g, ''), 10);
            const sideA = a.benchNumber.replace(/[^LR]/g, '');
            const sideB = b.benchNumber.replace(/[^LR]/g, '');

            if (numA !== numB) return numA - numB;
            return sideA.localeCompare(sideB);
        });
        return acc;
    }, {} as Record<string, SeatingAssignment[]>);
};

const generateSummaryPdf = (doc: jsPDF, summary: PdfRequest['roomBranchSummary']) => {
    doc.text("Room Occupancy Summary", 14, 16);
    const tableData: (string | number)[][] = [];
    Object.entries(summary).forEach(([room, branches]) => {
        Object.entries(branches).forEach(([branch, count]) => {
            tableData.push([room, branch, count]);
        });
    });
    autoTable(doc, {
        head: [['Room', 'Branch', 'Student Count']],
        body: tableData,
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });
};

const generateAttendanceSheetPdf = (doc: jsPDF, plan: PdfRequest['seatingPlan'], examConfig: PdfRequest['examConfig']) => {
    const studentsByRoom = groupStudentsByRoom(plan);
    Object.entries(studentsByRoom).forEach(([room, students], index) => {
        if (index > 0) doc.addPage();
        addPdfHeader(doc, room, examConfig.startDate);
        const tableData = students.map((s, idx) => [idx + 1, s.name, s.hallTicketNumber, s.branch, s.benchNumber, '']);
        autoTable(doc, {
            head: [['S.No', 'Name', 'Roll No', 'Branch', 'Seat No', 'Booklet Number']],
            body: tableData,
            startY: (doc as any).lastAutoTable.finalY + 2,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
            styles: { cellPadding: 2, fontSize: 9 },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 }, 3: { cellWidth: 18 }, 4: { cellWidth: 18 }, 5: { cellWidth: 30 } },
        });
    });
};

const generateRoomListPdf = (doc: jsPDF, plan: PdfRequest['seatingPlan'], examConfig: PdfRequest['examConfig']) => {
    const studentsByRoom = groupStudentsByRoom(plan);
    Object.entries(studentsByRoom).forEach(([room, students], index) => {
        if (index > 0) doc.addPage();
        addPdfHeader(doc, room, examConfig.startDate);
        const tableData = students.map((s, idx) => [idx + 1, s.name, s.hallTicketNumber, s.branch, s.benchNumber]);
        autoTable(doc, {
            head: [['S.No', 'Name', 'Roll No', 'Branch', 'Seat No']],
            body: tableData,
            startY: (doc as any).lastAutoTable.finalY + 2,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
            styles: { cellPadding: 2, fontSize: 9 },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 35 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 } },
        });
    });
};

const addPdfHeader = (doc: jsPDF, room: string, startDate: string) => {
    try {
        doc.addImage(logoBase64, 'PNG', 15, 8, 30, 15);
    } catch (e) {
        console.error("Could not add logo to PDF:", e);
    }
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("MALLA REDDY UNIVERSITY", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Room No: ${room}`, 15, 30);
    doc.text(`Date: ${format(new Date(startDate), 'dd/MM/yyyy')}`, doc.internal.pageSize.getWidth() - 15, 30, { align: 'right' });

    let startY = 38;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Absentees Details", 15, startY);
    startY += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // This logic assumes we need to generate absentees section from plan, which is not available here directly.
    // This should ideally be derived from the 'students' array passed to the specific PDF functions.
    // For now, providing a generic structure.
    const roomBranches = ['CSE', 'IT', 'IOT', 'AIML']; // Example branches
    roomBranches.forEach(branch => {
        doc.text(`${branch} Absentees Roll Numbers:`, 15, startY);
        startY += 5;
        doc.line(15, startY, doc.internal.pageSize.getWidth() - 15, startY);
        startY += 5;
        doc.line(15, startY, doc.internal.pageSize.getWidth() - 15, startY);
        startY += 5;
    });

    // Save the final Y position for the table to start after this header
    (doc as any).lastAutoTable = { finalY: startY };
};


export async function generatePdf(
  input: PdfRequest
): Promise<PdfResponse> {
  return generatePdfFlow(input);
}
