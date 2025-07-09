"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SeatingPlan } from "@/lib/types";

interface SeatingChartProps {
  plan: SeatingPlan[];
}

export default function SeatingChart({ plan }: SeatingChartProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  const branches = useMemo(() => ["all", ...new Set(plan.map(d => d.branch))], [plan]);

  const filteredData = useMemo(() => {
    return plan.filter(item => {
      const lowerCaseSearch = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(lowerCaseSearch) ||
        item.hallTicketNumber.toLowerCase().includes(lowerCaseSearch);
      const matchesBranch = branchFilter === "all" || item.branch === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [plan, searchTerm, branchFilter]);

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Generated Seating Chart</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by name or hall ticket..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
                {branches.map(branch => (
                    <SelectItem key={branch} value={branch}>
                        {branch === 'all' ? 'All Branches' : branch}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hall Ticket</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Classroom</TableHead>
              <TableHead>Bench</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow key={item.hallTicketNumber}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.hallTicketNumber}</TableCell>
                  <TableCell>{item.branch}</TableCell>
                  <TableCell>{item.block}</TableCell>
                  <TableCell>{item.floor}</TableCell>
                  <TableCell>{item.classroom}</TableCell>
                  <TableCell>{item.benchNumber}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
