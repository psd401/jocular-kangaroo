import { z } from 'zod';

/**
 * Common validation schemas for API routes
 */

// Common ID schemas
export const numericIdSchema = z.string().regex(/^\d+$/, 'Invalid numeric ID');
export const uuidSchema = z.string().uuid('Invalid UUID');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.string().min(1, 'Role is required')
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional()
});

export const updateUserRoleSchema = z.object({
  role: z.string().min(1, 'Role is required')
});

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(500).optional()
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional()
});

// Navigation schemas
export const createNavigationSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  icon: z.string().max(50).optional(),
  link: z.string().max(255).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['page', 'divider', 'tool']),
  parentId: z.number().int().positive().optional(),
  toolId: z.number().int().positive().optional(),
  requiresRole: z.string().max(50).optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

export const updateNavigationSchema = createNavigationSchema.partial();

export const updateNavigationOrderSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    position: z.number().int().min(0)
  }))
});

// Settings schemas
export const createSettingsSchema = z.object({
  provider: z.string().min(1, 'Provider is required').max(50),
  model: z.string().min(1, 'Model is required').max(100),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  apiKey: z.string().min(1).max(500).optional(),
  region: z.string().max(50).optional()
});

export const updateSettingsSchema = createSettingsSchema.partial();

// Job schemas
export const updateJobSchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
  output: z.any().optional(),
  error: z.string().optional()
});

// Generic ID parameter schema for route params
export const idParamSchema = z.object({
  id: z.string()
});

export const userIdParamSchema = z.object({
  userId: z.string()
});

export const roleIdParamSchema = z.object({
  roleId: z.string()
});

export const toolIdParamSchema = z.object({
  toolId: z.string()
});

/**
 * Helper function to validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { data: null, error: errors };
    }
    
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
}

/**
 * Helper function to validate query parameters with Zod schema
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T | null; error: string | null } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { data: null, error: errors };
  }
  
  return { data: result.data, error: null };
}