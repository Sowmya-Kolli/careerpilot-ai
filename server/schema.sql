-- SQL Schema Initialization for CareerPilot AI Database tables

CREATE TABLE IF NOT EXISTS cp_users (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  career_goal VARCHAR(255),
  preferred_roles VARCHAR(255),
  job_search_status VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gmail_accounts (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL REFERENCES cp_users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, email)
);

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES cp_users(id) ON DELETE CASCADE,
  company VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  is_starred BOOLEAN DEFAULT FALSE,
  deadline VARCHAR(10) NOT NULL,
  last_updated VARCHAR(50) NOT NULL,
  tags TEXT[],
  recruiter_name VARCHAR(100),
  recruiter_email VARCHAR(100),
  recruiter_phone VARCHAR(50),
  attachments TEXT[]
);

CREATE TABLE IF NOT EXISTS emails (
  id VARCHAR(100) PRIMARY KEY,
  sender VARCHAR(200) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  date VARCHAR(10) NOT NULL,
  body TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  category VARCHAR(50) NOT NULL,
  action_needed TEXT NOT NULL,
  application_id VARCHAR(100) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(100) PRIMARY KEY,
  application_id VARCHAR(100) REFERENCES applications(id) ON DELETE CASCADE,
  company VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  due_date VARCHAR(10) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(100) PRIMARY KEY,
  application_id VARCHAR(100) REFERENCES applications(id) ON DELETE CASCADE,
  company VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  date VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES cp_users(id) ON DELETE CASCADE,
  timestamp VARCHAR(50) NOT NULL,
  agent VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(10) NOT NULL
);
