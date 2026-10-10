import { describe, expect, it, vi } from "vitest";

import { pathAfterSignIn, sameTags, savePreferences, tagLabel, toggleTag } from "./preferences";

function token(payload: object) {
  return `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;
}

describe("toggleTag", () => {
  it("adds a tag that is not selected and removes one that is", () => {
    expect(toggleTag(["fantasy"], "history")).toEqual(["fantasy", "history"]);
    expect(toggleTag(["fantasy", "history"], "fantasy")).toEqual(["history"]);
  });
});

describe("savePreferences", () => {
  it("PUTs the tags and returns what was saved", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ selected: ["fantasy"] });
    await expect(savePreferences(["fantasy"], fetchJson)).resolves.toEqual(["fantasy"]);
    expect(fetchJson).toHaveBeenCalledWith("/preferences", {
      method: "PUT",
      body: JSON.stringify({ tags: ["fantasy"] }),
    });
  });
});

describe("pathAfterSignIn", () => {
  it("sends owners to the overview without asking for preferences", async () => {
    const fetchJson = vi.fn();
    await expect(pathAfterSignIn(token({ role: "owner" }), fetchJson)).resolves.toBe("/overview");
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("asks members without preferences to pick them", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ categories: [], selected: [] });
    await expect(pathAfterSignIn(token({ role: "member" }), fetchJson)).resolves.toBe(
      "/preferences",
    );
  });

  it("sends members with preferences to the overview", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ categories: [], selected: ["fantasy"] });
    await expect(pathAfterSignIn(token({ role: "member" }), fetchJson)).resolves.toBe(
      "/overview",
    );
  });

  it("falls back to the overview if preferences fail to load", async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error("down"));
    await expect(pathAfterSignIn(token({ role: "member" }), fetchJson)).resolves.toBe(
      "/overview",
    );
  });
});

describe("tagLabel", () => {
  const categories = [{ id: "genres", label: "Genres", tags: [{ id: "fantasy", label: "Fantasy" }] }];

  it("finds the label for a tag id", () => {
    expect(tagLabel(categories, "fantasy")).toBe("Fantasy");
  });

  it("falls back to the id for unknown tags", () => {
    expect(tagLabel(categories, "gone")).toBe("gone");
  });
});

describe("sameTags", () => {
  it("ignores order but notices additions and removals", () => {
    expect(sameTags(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameTags(["a"], ["a", "b"])).toBe(false);
    expect(sameTags(["a", "b"], ["a", "c"])).toBe(false);
  });
});
