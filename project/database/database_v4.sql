-- ============================================================================
-- ITM8 Attendance Database Schema v4
-- ============================================================================
-- Changes from v3:
-- - accounts.id: BIGINT AUTO_INCREMENT -> VARCHAR(16) (generated ID)
-- - jobs.id: BIGINT AUTO_INCREMENT -> VARCHAR(16) (generated ID)
-- - Updated all foreign key references to use VARCHAR(16)
-- ============================================================================

CREATE TABLE jobs (
    id VARCHAR(16) PRIMARY KEY,
    department VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE accounts (
    id VARCHAR(16) PRIMARY KEY,
    role ENUM('admin', 'manager', 'student') NOT NULL,
    department VARCHAR(100),
    school_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_last_updated TIMESTAMP,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(20),
    course VARCHAR(100) NULL,
    year_level FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP NULL
);


CREATE TABLE account_jobs (
    account_id VARCHAR(16) NOT NULL,
    job_id VARCHAR(16) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(16),
    expires_at TIMESTAMP,

    PRIMARY KEY (account_id, job_id),
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);


CREATE TABLE job_activity (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(16) NOT NULL,
    time_in TIMESTAMP NULL,
    time_out TIMESTAMP NULL,
    properties JSON NULL,
    
    invalidated_at TIMESTAMP NULL,
    invalidation_notes VARCHAR(255) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);


CREATE TABLE time_adjustments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(16) NOT NULL,
    manager_id VARCHAR(16),
    adjustment_minutes INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES accounts(id) ON DELETE SET NULL
);


CREATE TABLE student_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(16) NOT NULL,
    weekdays JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);


CREATE TABLE schedule_overrides (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(16) NOT NULL,
    date DATE NOT NULL,
    
    request_notes TEXT NOT NULL,
    response_notes TEXT NULL,
    
    approved_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    
    manager_id VARCHAR(16) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES accounts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_date (account_id, date)
);


CREATE TABLE job_certificate (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(16) NOT NULL,
    duty_hours INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    managers JSON NOT NULL,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
