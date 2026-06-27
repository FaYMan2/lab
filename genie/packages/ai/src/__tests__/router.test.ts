import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ProviderName, TaskKind } from "@genie/config";
import type { Provider } from "../provider.js";
import { ModelRouter, type RoutingOverrideStore } from "../router.js";
import { AIService } from "../service.js";

/** A provider that just echoes which model it was asked to run — lets us assert routing. */
function fakeProvider(name: string): Provider {
  return {
    name,
    async generateText(req) {
      return { text: `${name}:${req.model}`, usage: { inputTokens: 1, outputTokens: 1 } };
    },
    async generateStructured(req) {
      return {
        value: { provider: name, model: req.model },
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    },
  };
}

const defaults: Record<TaskKind, string> = {
  triage: "anthropic:claude-haiku-4-5",
  script_gen: "anthropic:claude-sonnet-4-6",
  summarize: "anthropic:claude-haiku-4-5",
  heal: "anthropic:claude-sonnet-4-6",
};

const registry = new Map<ProviderName, Provider>([
  ["anthropic", fakeProvider("anthropic")],
  ["gemini", fakeProvider("gemini")],
]);

const EchoSchema = z.object({ provider: z.string(), model: z.string() });

describe("ModelRouter", () => {
  it("uses env defaults when no override store is present", async () => {
    const svc = new AIService(registry, new ModelRouter(defaults));
    const out = await svc.generateStructured("triage", { schema: EchoSchema, prompt: "hi" });
    expect(out).toEqual({ provider: "anthropic", model: "claude-haiku-4-5" });
  });

  it("lets an override store swap provider+model per task with no business-logic change", async () => {
    const store: RoutingOverrideStore = {
      async resolve(task) {
        return task === "script_gen" ? "gemini:gemini-2.5-pro" : undefined;
      },
    };
    const svc = new AIService(registry, new ModelRouter(defaults, store));

    const triage = await svc.generateStructured("triage", { schema: EchoSchema, prompt: "x" });
    const scriptGen = await svc.generateStructured("script_gen", { schema: EchoSchema, prompt: "x" });

    expect(triage.provider).toBe("anthropic"); // default untouched
    expect(scriptGen).toEqual({ provider: "gemini", model: "gemini-2.5-pro" }); // override wins
  });

  it("throws a clear error when routed to an unconfigured provider", async () => {
    const onlyAnthropic = new Map<ProviderName, Provider>([["anthropic", fakeProvider("anthropic")]]);
    const store: RoutingOverrideStore = { async resolve() { return "gemini:gemini-2.5-flash"; } };
    const svc = new AIService(onlyAnthropic, new ModelRouter(defaults, store));
    await expect(
      svc.generateStructured("triage", { schema: EchoSchema, prompt: "x" }),
    ).rejects.toThrow(/Provider "gemini" is selected but not configured/);
  });
});
