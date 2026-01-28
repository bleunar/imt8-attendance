CREATE TABLE jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP NULL
);


CREATE TABLE account_jobs (
    account_id INT NOT NULL,
    job_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    expires_at TIMESTAMP,

    PRIMARY KEY (account_id, job_id),
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);


CREATE TABLE job_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    time_in TIMESTAMP NULL,
    time_out TIMESTAMP NULL,
    properties JSON NULL,
    
    invalidated_at TIMESTAMP NULL,
    invalidation_notes VARCHAR(255) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);