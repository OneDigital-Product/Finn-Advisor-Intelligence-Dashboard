-- Calendar & Task Integration (Feature 1.6) migration
-- Adds meeting enhancements, meeting_notes table, and recurring_tasks table

-- Enhanced meetings table with new columns
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_description TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]';

-- Meeting notes table for structured note records with AI summaries
CREATE TABLE IF NOT EXISTS meeting_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id VARCHAR NOT NULL REFERENCES meetings(id),
  advisor_id VARCHAR NOT NULL REFERENCES advisors(id),
  note_text TEXT NOT NULL,
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_notes_meeting_id_idx ON meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_notes_advisor_id_idx ON meeting_notes(advisor_id);

-- Recurring tasks table
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR NOT NULL REFERENCES tasks(id),
  pattern TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  days_of_week JSONB DEFAULT '[]',
  date_of_month INTEGER,
  end_date TEXT,
  next_due_date TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recurring_tasks_task_id_idx ON recurring_tasks(task_id);

-- Add completed_at to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
