-- ============================================================================
-- Migration Script: database_old.sql -> database_v2.sql
-- ============================================================================
-- This script migrates an existing database from the old schema structure
-- to the v2 structure. Run this script on a database that was created with
-- database_old.sql.
--
-- IMPORTANT: Back up your database before running this migration!
-- ============================================================================

-- ============================================================================
-- STEP 1: Add UNIQUE constraint to accounts.school_id
-- ============================================================================
-- The old schema did not have a UNIQUE constraint on school_id.
-- First, check for duplicates and handle them if they exist.

-- Remove duplicate school_ids (keep the first one, set others to NULL)
-- Uncomment and run manually if duplicates exist:
-- UPDATE accounts a1
-- JOIN (
--     SELECT school_id, MIN(id) as min_id
--     FROM accounts
--     WHERE school_id IS NOT NULL
--     GROUP BY school_id
--     HAVING COUNT(*) > 1
-- ) a2 ON a1.school_id = a2.school_id AND a1.id > a2.min_id
-- SET a1.school_id = NULL;

-- Add the UNIQUE constraint (will fail if duplicates exist)
ALTER TABLE accounts
ADD UNIQUE INDEX idx_school_id_unique (school_id);

-- ============================================================================
-- STEP 2: Modify password_last_updated behavior (optional)
-- ============================================================================
-- The old schema had ON UPDATE CURRENT_TIMESTAMP, v2 does not.
-- This change removes the auto-update behavior.
-- Note: This requires recreating the column to remove the ON UPDATE clause.

ALTER TABLE accounts
MODIFY COLUMN password_last_updated TIMESTAMP NULL DEFAULT NULL;

-- ============================================================================
-- STEP 3: Verify existing columns exist (course and year_level)
-- ============================================================================
-- These columns should already exist in the old schema.
-- If they don't, add them:

-- Check and add course if missing
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'accounts' 
    AND COLUMN_NAME = 'course'
);
SET @query = IF(@column_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN course VARCHAR(100) NULL', 
    'SELECT "course column already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add year_level if missing
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'accounts' 
    AND COLUMN_NAME = 'year_level'
);
SET @query = IF(@column_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN year_level FLOAT NULL', 
    'SELECT "year_level column already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 4: Verify all foreign key constraints exist
-- ============================================================================
-- The old schema already has these constraints, but verify they're present.

-- account_jobs foreign keys (should exist)
-- job_activity foreign key (should exist)
-- time_adjustments foreign keys (should exist)
-- student_schedules foreign key (should exist)
-- schedule_overrides foreign keys (should exist)

-- ============================================================================
-- STEP 5: Verify all indexes exist
-- ============================================================================
-- Most indexes should already exist from the old schema.
-- Add any missing indexes here if needed.

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The database should now match the v2 schema structure.
-- 
-- Summary of changes applied:
--   1. Added UNIQUE constraint to accounts.school_id
--   2. Removed ON UPDATE behavior from password_last_updated
--   3. Verified course and year_level columns exist
--
-- To verify the migration, compare the output of:
--   SHOW CREATE TABLE accounts;
--   SHOW CREATE TABLE jobs;
--   SHOW CREATE TABLE account_jobs;
--   SHOW CREATE TABLE job_activity;
--   SHOW CREATE TABLE time_adjustments;
--   SHOW CREATE TABLE student_schedules;
--   SHOW CREATE TABLE schedule_overrides;
-- ============================================================================

SELECT 'Migration completed successfully!' AS status;
