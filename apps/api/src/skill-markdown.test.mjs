import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import app from "./index.ts";
import { skillMarkdown } from "./generated/skill-markdown.ts";

const sourceSkillMarkdown = readFileSync(
  new URL("../../../.claude/skills/use-calendar/SKILL.md", import.meta.url),
  "utf8",
);

function createBindings() {
  return {
    DB: {
      batch() {
        throw new Error("DB should not be used in SKILL.md tests");
      },
      dump() {
        throw new Error("DB should not be used in SKILL.md tests");
      },
      exec() {
        throw new Error("DB should not be used in SKILL.md tests");
      },
      prepare() {
        throw new Error("DB should not be used in SKILL.md tests");
      },
    },
    ASSETS: {
      fetch(request) {
        return new Response(`<html>${new URL(request.url).pathname}</html>`, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        });
      },
    },
  };
}

describe("skill markdown", () => {
  it("matches the canonical skill file exactly", () => {
    expect(skillMarkdown).toBe(sourceSkillMarkdown);
  });

  it("serves /SKILL.md as markdown", async () => {
    const response = await app.request(
      "http://example.com/SKILL.md",
      undefined,
      createBindings(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(await response.text()).toBe(sourceSkillMarkdown);
  });

  it("keeps the SPA fallback for other non-API routes", async () => {
    const response = await app.request(
      "http://example.com/unknown-route",
      undefined,
      createBindings(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("/index.html");
  });
});
