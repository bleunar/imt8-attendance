CREATE TABLE jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    department VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
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
    course VARCHAR(100) NULL, -- course for students, specialization for managers
    year_level FLOAT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP NULL -- assume that account is suspended if this has value
);


CREATE TABLE account_jobs (
    account_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT,
    expires_at TIMESTAMP,

    PRIMARY KEY (account_id, job_id),
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);


CREATE TABLE job_activity (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    time_in TIMESTAMP NULL,
    time_out TIMESTAMP NULL,
    properties JSON NULL,
    
    invalidated_at TIMESTAMP NULL, -- assume that the activity is invalid if this has value
    invalidation_notes VARCHAR(255) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);


CREATE TABLE time_adjustments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    manager_id BIGINT, -- admin/manager that created the adjustment
    adjustment_minutes INT NOT NULL, -- amt of time to add/deduct (+/-)
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE student_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    weekdays JSON NOT NULL, -- array containing the weekdays where this schedule applies. (e.g. [1,2,3] is Mon-Wed)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);


-- specific date adjustments/overrides
CREATE TABLE schedule_overrides (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    date DATE NOT NULL,
    
    -- Request/Response workflow fields
    request_notes TEXT NOT NULL, -- Student's reason for the request
    response_notes TEXT NULL, -- Manager's optional message
    
    approved_at TIMESTAMP NULL, -- When the request was approved (implies Approved status)
    rejected_at TIMESTAMP NULL, -- When the request was rejected (implies Rejected status)
    cancelled_at TIMESTAMP NULL, -- When the request was cancelled by student (implies Cancelled status)
    
    manager_id BIGINT NULL, -- The manager who approved/rejected the request
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES accounts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_date (account_id, date)
);


-- NEW/UPDATED Tables:

-- NEW
CREATE TABLE job_completion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT UNSIGNED NOT NULL,
    duty_hours INT NOT NULL,
    school_year VARCHAR NOT NULL,
    semester VARCHAR NOT NULL,
    managers JSON NOT NULL, -- list of the manager's account_id, name, and specialization. e.g.[{`id`: `123456`, `name`: `Jaymar Dingcong`, specialization: `IT Specialist`}, ]
);


-- UPDATED: Added a field to mark if the activity is recorded
CREATE TABLE job_activity (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    time_in TIMESTAMP NULL,
    time_out TIMESTAMP NULL,
    properties JSON NULL,
    
    invalidated_at TIMESTAMP NULL, -- assume that the activity is invalid if this has value
    invalidation_notes VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    recorded_at TIMESTAMP NULL, -- assume that the activity has been recorded if this has value
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);