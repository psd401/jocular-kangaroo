// Sample data for reports mockup — replace with real queries later

export const interventionsByType = [
  { type: "Academic", count: 45 },
  { type: "Behavioral", count: 28 },
  { type: "Social-Emotional", count: 19 },
  { type: "Attendance", count: 12 },
  { type: "Speech/Language", count: 8 },
]

export const interventionsByStatus = [
  { status: "In Progress", count: 52, fill: "hsl(var(--chart-1))" },
  { status: "Completed", count: 34, fill: "hsl(var(--chart-2))" },
  { status: "Not Started", count: 14, fill: "hsl(var(--chart-3))" },
  { status: "On Hold", count: 8, fill: "hsl(var(--chart-4))" },
  { status: "Discontinued", count: 4, fill: "hsl(var(--chart-5))" },
]

export const monthlyTrend = [
  { month: "Sep", started: 18, completed: 5 },
  { month: "Oct", started: 22, completed: 10 },
  { month: "Nov", started: 15, completed: 14 },
  { month: "Dec", started: 8, completed: 12 },
  { month: "Jan", started: 20, completed: 16 },
  { month: "Feb", started: 14, completed: 18 },
  { month: "Mar", started: 10, completed: 20 },
  { month: "Apr", started: 5, completed: 17 },
]

export const goalAchievementByProgram = [
  { program: "Reading Recovery", achieved: 78, total: 100 },
  { program: "Math Intervention", achieved: 65, total: 100 },
  { program: "Behavior Support", achieved: 72, total: 100 },
  { program: "Speech Therapy", achieved: 85, total: 100 },
  { program: "Social Skills", achieved: 60, total: 100 },
  { program: "Tutoring", achieved: 70, total: 100 },
]

export const sessionsPerMonth = [
  { month: "Sep", sessions: 85, attended: 72 },
  { month: "Oct", sessions: 110, attended: 95 },
  { month: "Nov", sessions: 98, attended: 82 },
  { month: "Dec", sessions: 65, attended: 55 },
  { month: "Jan", sessions: 105, attended: 90 },
  { month: "Feb", sessions: 112, attended: 98 },
  { month: "Mar", sessions: 120, attended: 105 },
  { month: "Apr", sessions: 95, attended: 80 },
]

export const interventionsByGrade = [
  { grade: "K", count: 8 },
  { grade: "1st", count: 14 },
  { grade: "2nd", count: 18 },
  { grade: "3rd", count: 22 },
  { grade: "4th", count: 16 },
  { grade: "5th", count: 12 },
  { grade: "6th", count: 9 },
  { grade: "7th", count: 6 },
  { grade: "8th", count: 4 },
  { grade: "9th", count: 3 },
]

export const studentsByInterventionType = [
  { type: "Academic", count: 62, fill: "hsl(var(--chart-1))" },
  { type: "Behavioral", count: 35, fill: "hsl(var(--chart-2))" },
  { type: "Social-Emotional", count: 24, fill: "hsl(var(--chart-3))" },
  { type: "Attendance", count: 15, fill: "hsl(var(--chart-4))" },
]

export const schoolComparison = [
  { school: "Lincoln ES", active: 25, completed: 18 },
  { school: "Washington ES", active: 20, completed: 22 },
  { school: "Jefferson MS", active: 18, completed: 15 },
  { school: "Roosevelt ES", active: 15, completed: 12 },
  { school: "Adams MS", active: 12, completed: 10 },
  { school: "Madison HS", active: 8, completed: 14 },
]

export const staffWorkload = [
  { staff: "J. Smith", active: 12, completed: 5 },
  { staff: "M. Johnson", active: 10, completed: 8 },
  { staff: "A. Williams", active: 9, completed: 6 },
  { staff: "S. Brown", active: 8, completed: 10 },
  { staff: "L. Davis", active: 7, completed: 4 },
  { staff: "K. Wilson", active: 6, completed: 7 },
  { staff: "R. Taylor", active: 5, completed: 9 },
  { staff: "P. Martinez", active: 4, completed: 3 },
]

export const sessionsByDayOfWeek = [
  { day: "Mon", sessions: 28 },
  { day: "Tue", sessions: 32 },
  { day: "Wed", sessions: 25 },
  { day: "Thu", sessions: 30 },
  { day: "Fri", sessions: 18 },
]

export const workloadTrend = [
  { month: "Sep", avgCaseload: 6.2 },
  { month: "Oct", avgCaseload: 7.1 },
  { month: "Nov", avgCaseload: 7.8 },
  { month: "Dec", avgCaseload: 7.5 },
  { month: "Jan", avgCaseload: 8.2 },
  { month: "Feb", avgCaseload: 8.0 },
  { month: "Mar", avgCaseload: 7.4 },
  { month: "Apr", avgCaseload: 6.8 },
]

export const topInterventionsByProgress = [
  { id: 1, student: "Alex Rivera", program: "Reading Recovery", progress: 92, status: "In Progress" },
  { id: 2, student: "Maya Chen", program: "Math Intervention", progress: 88, status: "In Progress" },
  { id: 3, student: "Jordan Lee", program: "Speech Therapy", progress: 85, status: "In Progress" },
  { id: 4, student: "Sam Patel", program: "Behavior Support", progress: 78, status: "In Progress" },
  { id: 5, student: "Taylor Kim", program: "Social Skills", progress: 75, status: "In Progress" },
  { id: 6, student: "Casey Nguyen", program: "Reading Recovery", progress: 72, status: "In Progress" },
  { id: 7, student: "Drew Martinez", program: "Tutoring", progress: 68, status: "In Progress" },
  { id: 8, student: "Riley Johnson", program: "Math Intervention", progress: 65, status: "In Progress" },
  { id: 9, student: "Morgan Davis", program: "Behavior Support", progress: 60, status: "In Progress" },
  { id: 10, student: "Jamie Wilson", program: "Speech Therapy", progress: 55, status: "In Progress" },
]
