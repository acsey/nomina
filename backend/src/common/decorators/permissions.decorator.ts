import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions decorator for granular access control
 *
 * Usage: @Permissions('employees:read', 'employees:write')
 *
 * Permission format: "resource:action" or "resource:action:scope"
 * - resource: employees, payroll, incidents, vacations, benefits, etc.
 * - action: read, write, delete, approve, etc.
 * - scope (optional): own, company, subordinates, all
 *
 * Examples:
 *   @Permissions('employees:read') - Can read employees
 *   @Permissions('employees:read:own') - Can only read own employee data
 *   @Permissions('payroll:approve') - Can approve payroll
 *   @Permissions('incidents:create:subordinates') - Can create incidents for subordinates
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
