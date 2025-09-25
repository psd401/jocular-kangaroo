import { relations } from 'drizzle-orm';
import {
  users,
  roles,
  userRoles,
  tools,
  roleTools,
  navigationItems,
  schools,
  students,
  studentGuardians,
  interventionPrograms,
  interventions,
  interventionGoals,
  interventionSessions,
  interventionTeam,
  interventionAttachments,
  documents,
  communicationLog,
  jobs
} from './schema';

// ===== USER & ROLE RELATIONS =====

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  createdStudents: many(students, { relationName: 'createdBy' }),
  updatedStudents: many(students, { relationName: 'updatedBy' }),
  assignedInterventions: many(interventions, { relationName: 'assignedTo' }),
  createdInterventions: many(interventions, { relationName: 'createdBy' }),
  recordedSessions: many(interventionSessions),
  interventionTeamMembers: many(interventionTeam),
  documents: many(documents),
  createdAttachments: many(interventionAttachments),
  communicationLogs: many(communicationLog),
  jobs: many(jobs)
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  roleTools: many(roleTools)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  })
}));

// ===== TOOL & NAVIGATION RELATIONS =====

export const toolsRelations = relations(tools, ({ many }) => ({
  roleTools: many(roleTools),
  navigationItems: many(navigationItems)
}));

export const roleToolsRelations = relations(roleTools, ({ one }) => ({
  role: one(roles, {
    fields: [roleTools.roleId],
    references: [roles.id]
  }),
  tool: one(tools, {
    fields: [roleTools.toolId],
    references: [tools.id]
  })
}));

export const navigationItemsRelations = relations(navigationItems, ({ one, many }) => ({
  parent: one(navigationItems, {
    fields: [navigationItems.parentId],
    references: [navigationItems.id],
    relationName: 'parentChild'
  }),
  children: many(navigationItems, {
    relationName: 'parentChild'
  }),
  tool: one(tools, {
    fields: [navigationItems.toolId],
    references: [tools.id]
  })
}));

// ===== SCHOOL & STUDENT RELATIONS =====

export const schoolsRelations = relations(schools, ({ many }) => ({
  students: many(students)
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id]
  }),
  createdBy: one(users, {
    fields: [students.createdBy],
    references: [users.id],
    relationName: 'createdBy'
  }),
  updatedBy: one(users, {
    fields: [students.updatedBy],
    references: [users.id],
    relationName: 'updatedBy'
  }),
  guardians: many(studentGuardians),
  interventions: many(interventions),
  communicationLogs: many(communicationLog)
}));

export const studentGuardiansRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, {
    fields: [studentGuardians.studentId],
    references: [students.id]
  })
}));

// ===== INTERVENTION SYSTEM RELATIONS =====

export const interventionProgramsRelations = relations(interventionPrograms, ({ many }) => ({
  interventions: many(interventions)
}));

export const interventionsRelations = relations(interventions, ({ one, many }) => ({
  student: one(students, {
    fields: [interventions.studentId],
    references: [students.id]
  }),
  program: one(interventionPrograms, {
    fields: [interventions.programId],
    references: [interventionPrograms.id]
  }),
  assignedTo: one(users, {
    fields: [interventions.assignedTo],
    references: [users.id],
    relationName: 'assignedTo'
  }),
  createdBy: one(users, {
    fields: [interventions.createdBy],
    references: [users.id],
    relationName: 'createdBy'
  }),
  goals: many(interventionGoals),
  sessions: many(interventionSessions),
  teamMembers: many(interventionTeam),
  attachments: many(interventionAttachments),
  communicationLogs: many(communicationLog)
}));

export const interventionGoalsRelations = relations(interventionGoals, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionGoals.interventionId],
    references: [interventions.id]
  })
}));

export const interventionSessionsRelations = relations(interventionSessions, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionSessions.interventionId],
    references: [interventions.id]
  }),
  recordedBy: one(users, {
    fields: [interventionSessions.recordedBy],
    references: [users.id]
  })
}));

export const interventionTeamRelations = relations(interventionTeam, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionTeam.interventionId],
    references: [interventions.id]
  }),
  user: one(users, {
    fields: [interventionTeam.userId],
    references: [users.id]
  })
}));

// ===== DOCUMENT MANAGEMENT RELATIONS =====

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id]
  }),
  interventionAttachments: many(interventionAttachments)
}));

export const interventionAttachmentsRelations = relations(interventionAttachments, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionAttachments.interventionId],
    references: [interventions.id]
  }),
  document: one(documents, {
    fields: [interventionAttachments.documentId],
    references: [documents.id]
  }),
  createdBy: one(users, {
    fields: [interventionAttachments.createdBy],
    references: [users.id]
  })
}));

// ===== COMMUNICATION RELATIONS =====

export const communicationLogRelations = relations(communicationLog, ({ one }) => ({
  student: one(students, {
    fields: [communicationLog.studentId],
    references: [students.id]
  }),
  intervention: one(interventions, {
    fields: [communicationLog.interventionId],
    references: [interventions.id]
  }),
  createdBy: one(users, {
    fields: [communicationLog.createdBy],
    references: [users.id]
  })
}));

// ===== SYSTEM RELATIONS =====

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id]
  })
}));