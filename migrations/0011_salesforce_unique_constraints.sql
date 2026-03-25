CREATE UNIQUE INDEX IF NOT EXISTS "clients_salesforce_contact_id_uniq" ON "clients" USING btree ("salesforce_contact_id") WHERE salesforce_contact_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_salesforce_task_id_uniq" ON "tasks" USING btree ("salesforce_task_id") WHERE salesforce_task_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meetings_salesforce_event_id_uniq" ON "meetings" USING btree ("salesforce_event_id") WHERE salesforce_event_id IS NOT NULL;
