import { describe, it, expect } from "vitest";
import { DatabaseStorage } from "../storage";

describe("Database Storage Interface", () => {
  const storage = new DatabaseStorage();

  describe("Client Operations", () => {
    it("should have getClient method", () => {
      expect(typeof storage.getClient).toBe("function");
    });

    it("should have getClients method", () => {
      expect(typeof storage.getClients).toBe("function");
    });

    it("should have createClient method", () => {
      expect(typeof storage.createClient).toBe("function");
    });

    it("should have updateClient method", () => {
      expect(typeof storage.updateClient).toBe("function");
    });

    it("should have searchClients method", () => {
      expect(typeof storage.searchClients).toBe("function");
    });
  });

  describe("Account & Holdings Operations", () => {
    it("should have getAccountsByClient method", () => {
      expect(typeof storage.getAccountsByClient).toBe("function");
    });

    it("should have getHoldingsByClient method (N+1 fix)", () => {
      expect(typeof storage.getHoldingsByClient).toBe("function");
    });

    it("should have getHoldingsByAccount method", () => {
      expect(typeof storage.getHoldingsByAccount).toBe("function");
    });
  });

  describe("Task Operations", () => {
    it("should have createTask method", () => {
      expect(typeof storage.createTask).toBe("function");
    });

    it("should have updateTask method", () => {
      expect(typeof storage.updateTask).toBe("function");
    });

    it("should have deleteTask method", () => {
      expect(typeof storage.deleteTask).toBe("function");
    });

    it("should have getTasksByClient method", () => {
      expect(typeof storage.getTasksByClient).toBe("function");
    });

    it("should have getTasksByMeeting method", () => {
      expect(typeof storage.getTasksByMeeting).toBe("function");
    });
  });

  describe("Meeting Operations", () => {
    it("should have getMeetings method", () => {
      expect(typeof storage.getMeetings).toBe("function");
    });

    it("should have updateMeeting method", () => {
      expect(typeof storage.updateMeeting).toBe("function");
    });
  });

  describe("Compliance Operations", () => {
    it("should have getComplianceItems method", () => {
      expect(typeof storage.getComplianceItems).toBe("function");
    });

    it("should have updateComplianceItem method", () => {
      expect(typeof storage.updateComplianceItem).toBe("function");
    });

    it("should have getComplianceReviews method", () => {
      expect(typeof storage.getComplianceReviews).toBe("function");
    });
  });

  describe("Alert Operations", () => {
    it("should have getAlerts method", () => {
      expect(typeof storage.getAlerts).toBe("function");
    });

    it("should have markAlertRead method", () => {
      expect(typeof storage.markAlertRead).toBe("function");
    });
  });

  describe("Advisor & Associate Operations", () => {
    it("should have updateAdvisor method", () => {
      expect(typeof storage.updateAdvisor).toBe("function");
    });

    it("should have getAdvisorByEmail method", () => {
      expect(typeof storage.getAdvisorByEmail).toBe("function");
    });

    it("should have updateAssociate method", () => {
      expect(typeof storage.updateAssociate).toBe("function");
    });
  });

  describe("Workflow Operations", () => {
    it("should have updateWorkflowTemplate method", () => {
      expect(typeof storage.updateWorkflowTemplate).toBe("function");
    });

    it("should have updateClientWorkflow method", () => {
      expect(typeof storage.updateClientWorkflow).toBe("function");
    });
  });

  describe("Monte Carlo Operations", () => {
    it("should have getMonteCarloScenarios method", () => {
      expect(typeof storage.getMonteCarloScenarios).toBe("function");
    });

    it("should have updateMonteCarloScenario method", () => {
      expect(typeof storage.updateMonteCarloScenario).toBe("function");
    });
  });
});
