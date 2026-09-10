/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { SummaryLoadingSkeleton } from "@/components/LoadingSkeleton";

// Mock ToastProvider for components that need it
jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: jest.fn(), removeToast: jest.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("SearchBar", () => {
  it("renders the email input, CAPTCHA, and Check Email button", () => {
    render(<SearchBar onSearch={jest.fn()} />);
    expect(screen.getByPlaceholderText("e.g. name@example.com")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /i'm not a robot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check email/i })).toBeInTheDocument();
  });

  it("shows inline error for invalid email on submit", async () => {
    render(<SearchBar onSearch={jest.fn()} />);
    const input = screen.getByPlaceholderText("e.g. name@example.com");
    const captcha = screen.getByRole("checkbox", { name: /i'm not a robot/i });
    const button = screen.getByRole("button", { name: /check email/i });

    fireEvent.change(input, { target: { value: "notanemail" } });
    fireEvent.click(captcha);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/that doesn't look like a valid email/i)).toBeInTheDocument();
    });
  });

  it("shows validation error if CAPTCHA is not checked", async () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} />);
    const input = screen.getByPlaceholderText("e.g. name@example.com");
    const button = screen.getByRole("button", { name: /check email/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/please check "i'm not a robot" before checking your email/i)).toBeInTheDocument();
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  it("calls onSearch with valid email when CAPTCHA is checked", async () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} />);
    const input = screen.getByPlaceholderText("e.g. name@example.com");
    const captcha = screen.getByRole("checkbox", { name: /i'm not a robot/i });
    const button = screen.getByRole("button", { name: /check email/i });

    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(captcha);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith("test@example.com", expect.stringMatching(/^dev_token_/));
    });
  });


  it("shows empty-field error if submitted blank", async () => {
    render(<SearchBar onSearch={jest.fn()} />);
    const button = screen.getByRole("button", { name: /check email/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    });
  });
});

describe("ResultCard", () => {
  const mockAccount = {
    site: "LinkedIn",
    siteUrl: "https://www.linkedin.com",
    logo: "/logos/linkedin.svg",
    discoverySource: "Breach — LinkedIn (2012)",
    confidence: "possible" as const,
    category: "social",
    notes: "Change password immediately.",
  };

  it("renders site name", () => {
    render(<ResultCard account={mockAccount} />);
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
  });

  it("renders 'Possible' confidence badge", () => {
    render(<ResultCard account={mockAccount} />);
    expect(screen.getByLabelText(/confidence: possible/i)).toBeInTheDocument();
  });

  it("renders Visit and Change password buttons", () => {
    render(<ResultCard account={mockAccount} />);
    expect(screen.getByLabelText(/visit linkedin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/change password on linkedin/i)).toBeInTheDocument();
  });

  it("renders verified badge when confidence is verified", () => {
    render(<ResultCard account={{ ...mockAccount, confidence: "verified" }} />);
    expect(screen.getByLabelText(/confidence: verified/i)).toBeInTheDocument();
  });
});

describe("PrivacyBanner", () => {
  it("renders privacy message", () => {
    render(<PrivacyBanner />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    render(<PrivacyBanner />);
    const dismissButton = screen.getByLabelText(/dismiss privacy notice/i);
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });
  });
});

describe("SummaryLoadingSkeleton", () => {
  it("renders loading status with public breach text", () => {
    render(<SummaryLoadingSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/querying public breach datasets/i)).toBeInTheDocument();
  });
});
