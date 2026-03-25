import { logger } from "../lib/logger";

export interface CalendlyEventType {
  id: string;
  name: string;
  slug: string;
  bookingUrl: string;
  durationMinutes: number;
  description?: string;
  active: boolean;
}

export interface CalendlyUser {
  id: string;
  name: string;
  slug: string;
  uri: string;
}

export class CalendlyIntegration {
  private baseUrl = "https://api.calendly.com";

  constructor(private accessToken: string) {}

  async getUser(): Promise<CalendlyUser> {
    const res = await fetch(`${this.baseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "Calendly getUser failed");
      throw new Error(`Calendly API error: ${res.status}`);
    }

    const data = (await res.json()) as any;
    const resource = data.resource;
    return {
      id: resource.uri.split("/").pop(),
      name: resource.name,
      slug: resource.slug,
      uri: resource.uri,
    };
  }

  async getEventTypes(): Promise<CalendlyEventType[]> {
    const user = await this.getUser();

    const res = await fetch(
      `${this.baseUrl}/event_types?user=${user.uri}&active=true`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "Calendly getEventTypes failed");
      throw new Error(`Calendly API error: ${res.status}`);
    }

    const data = (await res.json()) as any;
    return (data.collection || []).map((event: any) => ({
      id: event.uri.split("/").pop(),
      name: event.name,
      slug: event.slug,
      bookingUrl: event.scheduling_url,
      durationMinutes: event.duration,
      description: event.description_plain || event.description_html || "",
      active: event.active,
    }));
  }

  async getEventTypeLink(eventTypeId: string): Promise<string | null> {
    const events = await this.getEventTypes();
    const event = events.find((e) => e.id === eventTypeId);
    return event?.bookingUrl || null;
  }
}

export function createCalendlyIntegration(accessToken: string): CalendlyIntegration {
  return new CalendlyIntegration(accessToken);
}
