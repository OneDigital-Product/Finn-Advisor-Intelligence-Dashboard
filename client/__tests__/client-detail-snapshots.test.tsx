import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { ClientTabs } from "../src/pages/client-detail/client-tabs";
import { EstatePlanningSection } from "../src/pages/client-detail/estate-planning-section";
import { RetirementSection } from "../src/pages/client-detail/retirement-section";
import { DirectIndexingSection } from "../src/pages/client-detail/direct-indexing-section";

const mockClient = {
  id: "1",
  firstName: "John",
  lastName: "Doe",
  name: "John Doe",
  email: "john@example.com",
  phone: "555-0100",
  status: "active",
  riskProfile: "moderate",
  totalAum: 1500000,
  advisorId: "advisor-1",
};

const defaultTabProps = {
  activeSection: "overview",
  clientId: "1",
  client: mockClient,
  accounts: [],
  holdings: [],
  alternativeAssets: [],
  perf: [],
  householdMembers: [],
  lifeEvents: [],
  perfData: [],
  pieData: [],
  clientMeetings: [],
  documents: [],
  checklistData: [],
  complianceItems: [],
  totalAum: 1500000,
  marketData: null,
  marketLoading: false,
  refetchMarket: vi.fn(),
  teamMembers: [],
  suggestedTasks: [],
  setSuggestedTasks: vi.fn(),
  setSelectedAccountId: vi.fn(),
  user: { id: "user-1", advisorId: "advisor-1" },
  isMobile: false,
};

describe("Client Detail UI Snapshots", () => {
  it("ClientTabs renders overview tab layout", () => {
    const { container } = render(<ClientTabs {...defaultTabProps} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ClientTabs renders estate tab layout", () => {
    const { container } = render(
      <ClientTabs {...defaultTabProps} activeSection="estate" />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ClientTabs renders retirement tab layout", () => {
    const { container } = render(
      <ClientTabs {...defaultTabProps} activeSection="retirement" />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ClientTabs renders direct-indexing tab layout", () => {
    const { container } = render(
      <ClientTabs {...defaultTabProps} activeSection="direct-indexing" />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("EstatePlanningSection renders section header and layout", () => {
    const { container } = render(
      <EstatePlanningSection
        clientId="1"
        clientName="John Doe"
        totalAum={1500000}
        advisorId="advisor-1"
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("RetirementSection renders section header and layout", () => {
    const { container } = render(
      <RetirementSection
        clientId="1"
        totalAum={1500000}
        clientName="John Doe"
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DirectIndexingSection renders section header and layout", () => {
    const { container } = render(
      <DirectIndexingSection
        clientId="1"
        clientName="John Doe"
        totalAum={1500000}
      />
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
