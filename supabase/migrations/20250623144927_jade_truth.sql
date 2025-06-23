/*
  # Fix audit_action enum to include INSERT value

  1. Changes
    - Add 'INSERT' value to the audit_action enum type
    - This resolves the error where audit triggers try to log INSERT actions
    - The enum currently has CREATE, READ, UPDATE, DELETE, ARCHIVE, LOGIN, LOGOUT, EXPORT
    - Adding INSERT to support database audit logging for insert operations

  2. Notes
    - This is a safe operation that extends the enum without breaking existing data
    - After this change, audit triggers will be able to log INSERT actions properly
*/

-- Add INSERT value to the audit_action enum
ALTER TYPE audit_action ADD VALUE 'INSERT';