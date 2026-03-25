CREATE INDEX "alerts_advisor_id_severity_idx" ON "alerts" USING btree ("advisor_id","severity");--> statement-breakpoint
CREATE INDEX "alerts_client_id_idx" ON "alerts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "approval_items_status_priority_idx" ON "approval_items" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "clients_advisor_id_idx" ON "clients" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "custodial_changes_status_idx" ON "custodial_changes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "holdings_account_id_idx" ON "holdings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "investor_profiles_client_id_idx" ON "investor_profiles" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "meetings_advisor_id_start_time_idx" ON "meetings" USING btree ("advisor_id","start_time");--> statement-breakpoint
CREATE INDEX "meetings_client_id_idx" ON "meetings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tasks_client_id_status_idx" ON "tasks" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "tasks_advisor_id_idx" ON "tasks" USING btree ("advisor_id");