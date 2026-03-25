import type { Express } from "express";
import { z } from "zod";
import { getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function registerCalendarRoutes(app: Express) {
  app.get("/api/calendar", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { view, startDate, endDate, clientId } = req.query;

      if (view && !["day", "week", "month"].includes(view as string)) {
        return res.status(400).json({ message: "view must be day, week, or month" });
      }
      if (startDate && !dateRegex.test(startDate as string)) {
        return res.status(400).json({ message: "startDate must be YYYY-MM-DD" });
      }
      if (endDate && !dateRegex.test(endDate as string)) {
        return res.status(400).json({ message: "endDate must be YYYY-MM-DD" });
      }

      const start = startDate as string || new Date().toISOString().split("T")[0];

      let end: string;
      if (endDate) {
        end = endDate as string;
      } else if (view === "day") {
        const d = new Date(start);
        d.setDate(d.getDate() + 1);
        end = d.toISOString().split("T")[0];
      } else if (view === "week") {
        const d = new Date(start);
        d.setDate(d.getDate() + 7);
        end = d.toISOString().split("T")[0];
      } else {
        const d = new Date(start);
        d.setMonth(d.getMonth() + 1);
        end = d.toISOString().split("T")[0];
      }

      let allMeetings = await storage.getMeetingsByDateRange(advisor.id, start, end);

      if (clientId) {
        allMeetings = allMeetings.filter(m => m.clientId === clientId);
      }

      const meetingsWithClients = await Promise.all(
        allMeetings.map(async (meeting) => {
          const client = meeting.clientId ? await storage.getClient(meeting.clientId) : null;
          return { ...meeting, client };
        })
      );

      if (view === "day") {
        res.json({ view: "day", startDate: start, endDate: end, meetings: meetingsWithClients });
      } else if (view === "week") {
        const grouped: Record<string, any[]> = {};
        for (const m of meetingsWithClients) {
          const day = m.startTime.split("T")[0];
          if (!grouped[day]) grouped[day] = [];
          grouped[day].push(m);
        }
        res.json({ view: "week", startDate: start, endDate: end, days: grouped, meetings: meetingsWithClients });
      } else {
        const grouped: Record<string, any[]> = {};
        for (const m of meetingsWithClients) {
          const day = m.startTime.split("T")[0];
          if (!grouped[day]) grouped[day] = [];
          grouped[day].push(m);
        }
        res.json({ view: "month", startDate: start, endDate: end, days: grouped, meetings: meetingsWithClients });
      }
    } catch (error: any) {
      logger.error({ err: error }, "Calendar API error");
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  app.get("/api/calendar/day/:date", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const date = req.params.date;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayMeetings = await storage.getMeetingsByDateRange(advisor.id, date, nextDay.toISOString().split("T")[0]);
      const meetingsWithClients = await Promise.all(
        dayMeetings.map(async (m) => {
          const client = m.clientId ? await storage.getClient(m.clientId) : null;
          return { ...m, client };
        })
      );

      res.json({ date, meetings: meetingsWithClients });
    } catch (error: any) {
      logger.error({ err: error }, "Calendar day API error");
      res.status(500).json({ message: "Failed to fetch day data" });
    }
  });

  app.get("/api/calendar/week/:weekStart", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const weekStart = req.params.weekStart;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekMeetings = await storage.getMeetingsByDateRange(advisor.id, weekStart, weekEnd.toISOString().split("T")[0]);
      const meetingsWithClients = await Promise.all(
        weekMeetings.map(async (m) => {
          const client = m.clientId ? await storage.getClient(m.clientId) : null;
          return { ...m, client };
        })
      );

      const days: Record<string, any[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        days[key] = meetingsWithClients.filter(m => m.startTime.startsWith(key));
      }

      res.json({ weekStart, days, meetings: meetingsWithClients });
    } catch (error: any) {
      logger.error({ err: error }, "Calendar week API error");
      res.status(500).json({ message: "Failed to fetch week data" });
    }
  });

  app.post("/api/meetings/:id/check-conflicts", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });

      const conflicts = await storage.checkMeetingConflicts(
        advisor.id, meeting.startTime, meeting.endTime, meeting.id
      );

      res.json({ hasConflicts: conflicts.length > 0, conflicts });
    } catch (error: any) {
      logger.error({ err: error }, "Conflict check API error");
      res.status(500).json({ message: "Failed to check conflicts" });
    }
  });
}
