import "server-only";
import type { Event, Guest } from "@/db/schema";
import { findGuestForUser, getEventById } from "./data";
import { getViewer, type Viewer } from "./session";

/**
 * Authorization for Server Actions and Route Handlers. Every mutation
 * re-reads the session here rather than trusting anything from the client.
 */

export async function requireHost(eventId: string): Promise<{ viewer: Viewer; event: Event } | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const event = await getEventById(eventId);
  if (!event || event.hostId !== viewer.id) return null;
  return { viewer, event };
}

export type Participant = {
  viewer: Viewer;
  event: Event;
  isHost: boolean;
  guest: Guest | null;
  displayName: string;
};

/** The host, or someone with a guest record on this event. Otherwise null. */
export async function requireParticipant(eventId: string): Promise<Participant | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const event = await getEventById(eventId);
  if (!event) return null;
  const isHost = event.hostId === viewer.id;
  const guest = await findGuestForUser(eventId, viewer.id);
  if (!isHost && !guest) return null;
  return { viewer, event, isHost, guest, displayName: isHost ? event.hostName : guest!.name };
}

export const NOT_ALLOWED = "You don’t have access to do that.";
export const SLOW_DOWN = "That’s a lot at once. Give it a minute and try again.";
