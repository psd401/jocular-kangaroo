import type { AccessControlConfig } from "./types"

/**
 * Configuration-driven role hierarchy for Jocular Kangaroo.
 * Swap this file to port access control to a new project.
 *
 * Role scopes:
 *   "all"      — sees all records across all schools
 *   "school"   — sees all records at their assigned school(s)
 *   "assigned" — sees SIS-rostered students + intervention relationships, within their school(s)
 */
export const ACCESS_CONTROL_CONFIG: AccessControlConfig = {
  rolePriority: [
    "Administrator",
    "Principal",
    "Teacher",
    "Counselor",
    "Specialist",
    "Nurse",
  ],

  roleScopes: {
    administrator: { scope: "all" },
    principal:     { scope: "school" },
    teacher:       { scope: "assigned" },
    counselor:     { scope: "assigned" },
    specialist:    { scope: "assigned" },
    nurse:         { scope: "assigned" },
  },
}
