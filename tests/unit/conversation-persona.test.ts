import { describe, expect, it } from "vitest";
import { CONVERSATION_ROLES, getRoleDef, personaPrompt } from "@/lib/conversation-roles";
import { DIFFICULTIES } from "@/lib/practice-taxonomy";

// Role-play level (spec: the level changes the AI persona, not just the scenario).
describe("personaPrompt", () => {
  it("adds a different behaviour for every role at every level", () => {
    for (const role of CONVERSATION_ROLES) {
      const prompts = DIFFICULTIES.map((d) => personaPrompt(role, d));
      expect(new Set(prompts).size).toBe(4);
      for (const [i, p] of prompts.entries()) {
        expect(p.startsWith(role.systemPrompt)).toBe(true);
        expect(p).toContain(`Level: ${DIFFICULTIES[i].charAt(0)}${DIFFICULTIES[i].slice(1).toLowerCase()}.`);
      }
    }
  });

  it("makes Expert harder than Beginner in the customer role", () => {
    const customer = getRoleDef("CUSTOMER")!;
    expect(personaPrompt(customer, "BEGINNER")).toMatch(/hint/);
    expect(personaPrompt(customer, "EXPERT")).toMatch(/irate/);
  });

  it("falls back to the plain role instructions for a missing or unknown level", () => {
    const partner = getRoleDef("CONVERSATION_PARTNER")!;
    expect(personaPrompt(partner, null)).toBe(partner.systemPrompt);
    expect(personaPrompt(partner, "IMPOSSIBLE")).toBe(partner.systemPrompt);
  });
});
