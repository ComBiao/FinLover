import { describe, expect, it } from "vitest";

import { loginSchema, registerFormSchema } from "@/types/auth";

const validRegisterInput = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "Password1",
  confirmPassword: "Password1",
  dataPrivacyConsent: true,
};

describe("registerFormSchema", () => {
  it("accepts valid input", () => {
    const result = registerFormSchema.safeParse(validRegisterInput);
    expect(result.success).toBe(true);
  });

  it("trims leading/trailing whitespace from name and email", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      name: "  Jane Doe  ",
      email: "  jane@example.com  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("rejects a password missing an uppercase letter", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      password: "password1",
      confirmPassword: "password1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Include at least one uppercase letter");
    }
  });

  it("rejects a password missing a lowercase letter", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      password: "PASSWORD1",
      confirmPassword: "PASSWORD1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Include at least one lowercase letter");
    }
  });

  it("rejects a password missing a number", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      password: "Password",
      confirmPassword: "Password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Include at least one number");
    }
  });

  it("rejects a password longer than 72 bytes (bcrypt limit)", () => {
    const longPassword = `Aa1${"a".repeat(70)}`; // 73 bytes total

    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      password: longPassword,
      confirmPassword: longPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Password must be at most 72 bytes");
    }
  });

  it("rejects a multi-byte (emoji) password whose byte length exceeds 72 even though its character length doesn't", () => {
    const emojiPassword = `Aa1${"😀".repeat(20)}`; // 43 UTF-16 code units, but 83 UTF-8 bytes
    expect(emojiPassword.length).toBeLessThan(72);

    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      password: emojiPassword,
      confirmPassword: emojiPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Password must be at most 72 bytes");
    }
  });

  it("rejects when confirmPassword does not match password", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      confirmPassword: "Different1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "confirmPassword");
      expect(issue?.message).toBe("Passwords do not match");
    }
  });

  it("rejects when dataPrivacyConsent is false", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      dataPrivacyConsent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "dataPrivacyConsent");
      expect(issue).toBeDefined();
    }
  });

  it("returns an error for every field at once on an empty submission", () => {
    const result = registerFormSchema.safeParse({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      dataPrivacyConsent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = new Set(result.error.issues.map((issue) => issue.path[0]));
      expect(fields).toEqual(
        new Set(["name", "email", "password", "confirmPassword", "dataPrivacyConsent"])
      );
    }
  });

  it("returns both a mismatched-password error and a consent error when both are invalid", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput,
      confirmPassword: "Different1",
      dataPrivacyConsent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmPasswordIssue = result.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword"
      );
      const dataPrivacyConsentIssue = result.error.issues.find(
        (issue) => issue.path[0] === "dataPrivacyConsent"
      );
      expect(confirmPasswordIssue?.message).toBe("Passwords do not match");
      expect(dataPrivacyConsentIssue).toBeDefined();
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ email: "jane@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from email", () => {
    const result = loginSchema.safeParse({
      email: "  jane@example.com  ",
      password: "secret",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("rejects a password longer than 72 bytes (bcrypt limit)", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
  });

  it("rejects a multi-byte (emoji) password whose byte length exceeds 72 even though its character length doesn't", () => {
    const emojiPassword = "😀".repeat(19); // 38 UTF-16 code units, but 76 UTF-8 bytes
    expect(emojiPassword.length).toBeLessThan(72);

    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: emojiPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Password must be at most 72 bytes");
    }
  });

  it("returns an error for every field at once on an empty submission", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = new Set(result.error.issues.map((issue) => issue.path[0]));
      expect(fields).toEqual(new Set(["email", "password"]));
    }
  });
});
