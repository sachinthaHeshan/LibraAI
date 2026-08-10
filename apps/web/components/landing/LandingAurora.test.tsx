import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingAurora } from "./LandingAurora";

describe("LandingAurora", () => {
  it("renders a decorative aria-hidden layer with three blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(3);
  });
});
