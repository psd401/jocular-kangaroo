"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Briefcase } from "lucide-react"
import { InterventionSummaryTab } from "./_components/intervention-summary-tab"
import { ProgressReportsTab } from "./_components/progress-reports-tab"
import { StudentReportsTab } from "./_components/student-reports-tab"
import { StaffWorkloadTab } from "./_components/staff-workload-tab"

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View intervention data and generate reports
        </p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Intervention Summary
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress Reports
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Student Reports
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Staff & Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <InterventionSummaryTab />
        </TabsContent>
        <TabsContent value="progress">
          <ProgressReportsTab />
        </TabsContent>
        <TabsContent value="students">
          <StudentReportsTab />
        </TabsContent>
        <TabsContent value="staff">
          <StaffWorkloadTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
