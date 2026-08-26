import { describe, expect, it } from "vitest";
import {
  OFFER_WINDOW_MINUTES,
  computeRespondByDeadline,
  isOfferExpired,
} from "@/engine/claimWindow";

describe("computeRespondByDeadline", () => {
  it("adds the offer window to now", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const deadline = computeRespondByDeadline(now);
    expect(deadline.getTime() - now.getTime()).toBe(OFFER_WINDOW_MINUTES * 60 * 1000);
  });
});

describe("isOfferExpired", () => {
  it("is not expired before the deadline", () => {
    const respondBy = new Date("2026-01-01T00:15:00Z");
    const now = new Date("2026-01-01T00:10:00Z");
    expect(isOfferExpired(respondBy, now)).toBe(false);
  });

  it("is expired exactly at the deadline (boundary is inclusive)", () => {
    const respondBy = new Date("2026-01-01T00:15:00Z");
    expect(isOfferExpired(respondBy, respondBy)).toBe(true);
  });

  it("is expired after the deadline", () => {
    const respondBy = new Date("2026-01-01T00:15:00Z");
    const now = new Date("2026-01-01T00:16:00Z");
    expect(isOfferExpired(respondBy, now)).toBe(true);
  });
});
