import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingAurora } from "./LandingAurora";

describe("LandingAurora", () => {
  it("renders hero variant with five decorative blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora");
    expect(html).not.toContain("landing-aurora-section");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(5);
  });

  it("renders section variant with two lighter blobs", () => {
    const html = renderToStaticMarkup(<LandingAurora variant="section" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("landing-aurora-section");
    expect(html.match(/landing-aurora-blob/g)?.length).toBe(2);
  });
});
