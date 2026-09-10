import {
  validateEmail,
  maskEmail,
  getCategoryLabel,
  getCategoryIcon,
  getCategoryRecommendation,
  categorizeBreachName,
  getSiteUrl
} from "@/lib/utils";

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user+tag@domain.co.uk")).toBe(true);
    expect(validateEmail("a@b.io")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("missing@")).toBe(false);
    expect(validateEmail("@nodomain.com")).toBe(false);
    expect(validateEmail("spaces in@email.com")).toBe(false);
  });
});

describe("maskEmail", () => {
  it("masks middle characters of username", () => {
    const masked = maskEmail("john@example.com");
    expect(masked).toMatch(/^j.*n@example\.com$/);
    expect(masked).toContain("*");
  });

  it("keeps domain intact", () => {
    const masked = maskEmail("user@domain.org");
    expect(masked.endsWith("@domain.org")).toBe(true);
  });

  it("handles short usernames", () => {
    expect(maskEmail("a@b.com")).toBe("a@b.com");
    expect(maskEmail("ab@b.com")).toBe("a*@b.com");
  });

  it("returns original if invalid format", () => {
    expect(maskEmail("notanemail")).toBe("notanemail");
  });
});

describe("getCategoryLabel", () => {
  it("returns human-readable labels", () => {
    expect(getCategoryLabel("social")).toBe("Social Media");
    expect(getCategoryLabel("ecommerce")).toBe("E-Commerce");
    expect(getCategoryLabel("forums")).toBe("Forums & Communities");
  });

  it("returns capitalized fallback for unknown", () => {
    expect(getCategoryLabel("unknown-cat")).toBe("unknown-cat");
  });
});

describe("getCategoryIcon", () => {
  it("returns emoji icons for known categories", () => {
    expect(getCategoryIcon("social")).toBe("👤");
    expect(getCategoryIcon("gaming")).toBe("🎮");
    expect(getCategoryIcon("finance")).toBe("💳");
  });

  it("returns default icon for unknown", () => {
    expect(getCategoryIcon("xyz")).toBe("🔗");
  });
});

describe("getCategoryRecommendation", () => {
  it("returns specific actionable recommendation for known categories", () => {
    expect(getCategoryRecommendation("social")).toContain("2FA");
    expect(getCategoryRecommendation("ecommerce")).toContain("payment cards");
    expect(getCategoryRecommendation("finance")).toContain("banking/crypto credentials");
    expect(getCategoryRecommendation("forums")).toContain("password");
  });

  it("returns sensible default recommendation for unknown category", () => {
    expect(getCategoryRecommendation("unknown-xyz")).toBe("Update passwords and ensure multi-factor authentication is enabled.");
  });
});

describe("categorizeBreachName", () => {
  it("categorizes social breaches correctly", () => {
    expect(categorizeBreachName("LinkedIn")).toBe("social");
    expect(categorizeBreachName("Twitter")).toBe("social");
  });

  it("categorizes gaming and ecommerce correctly", () => {
    expect(categorizeBreachName("Steam")).toBe("gaming");
    expect(categorizeBreachName("Shopify")).toBe("ecommerce");
  });

  it("categorizes productivity correctly", () => {
    expect(categorizeBreachName("Dropbox")).toBe("productivity");
    expect(categorizeBreachName("Canva")).toBe("productivity");
  });

  it("returns other for unknown services", () => {
    expect(categorizeBreachName("SomeUnknownBreachDB")).toBe("other");
  });
});

describe("getSiteUrl", () => {
  it("returns direct link for known sites", () => {
    expect(getSiteUrl("LinkedIn")).toBe("https://www.linkedin.com");
    expect(getSiteUrl("Adobe")).toBe("https://www.adobe.com");
  });

  it("returns fallback Google search URL for unknown sites", () => {
    expect(getSiteUrl("UnknownService")).toContain("google.com/search");
  });
});


