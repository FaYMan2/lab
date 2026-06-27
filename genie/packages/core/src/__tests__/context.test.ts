import { describe, expect, it } from "vitest";
import { parseLinkedIssueNumbers } from "../context.js";

describe("parseLinkedIssueNumbers", () => {
  it("extracts closing keywords case-insensitively and de-dupes", () => {
    const body = "This Closes #12 and fixes #34. Also Resolves #12.\nUnrelated #99 mention only.";
    expect(parseLinkedIssueNumbers(body).sort((a, b) => a - b)).toEqual([12, 34]);
  });

  it("ignores plain issue mentions without a keyword", () => {
    expect(parseLinkedIssueNumbers("see #5 for context")).toEqual([]);
  });
});
