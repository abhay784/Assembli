/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AssemblyWorkspace } from "./AssemblyWorkspace";
import { mockScene } from "@/lib/scene/mock";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

describe("AssemblyWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows video and parts when job completes", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/jobs/job-xyz") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "completed",
              error: null,
            }),
        });
      }
      if (url === "/api/jobs/job-xyz/video-url") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              url: "https://s3.example.com/video.mp4",
              expiresIn: 900,
            }),
        });
      }
      if (url === "/api/jobs/job-xyz/scene") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scene: mockScene }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AssemblyWorkspace jobId="job-xyz" />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Assembly video preview"),
      ).toBeInTheDocument();
    });

    const video = screen.getByLabelText(
      "Assembly video preview",
    ) as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://s3.example.com/video.mp4");

    await waitFor(() => {
      expect(screen.getByText("Tools you'll need")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Parts inventory")).toBeInTheDocument();
    });

    expect(screen.getByText("Phillips screwdriver")).toBeInTheDocument();
  });

  it("fetches video-url once", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/jobs/j1") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "completed",
              error: null,
            }),
        });
      }
      if (url === "/api/jobs/j1/video-url") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ url: "https://s3.example.com/v.mp4" }),
        });
      }
      if (url === "/api/jobs/j1/scene") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scene: mockScene }),
        });
      }
      return Promise.resolve({ ok: false, json: () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AssemblyWorkspace jobId="j1" />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Assembly video preview"),
      ).toBeInTheDocument();
    });

    const videoCalls = fetchMock.mock.calls.filter(
      ([u]) => typeof u === "string" && u.includes("video-url"),
    );
    expect(videoCalls.length).toBe(1);
  });

  it("shows worker error when job fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "failed",
              error: "Render failed",
            }),
        }),
      ),
    );

    render(<AssemblyWorkspace jobId="bad" />);

    await waitFor(() => {
      expect(screen.getByText("Render failed")).toBeInTheDocument();
    });
  });

  it("decrements part count when minus is clicked", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/jobs/j2") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "completed",
              error: null,
            }),
        });
      }
      if (url.includes("video-url")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: "https://x/v.mp4" }),
        });
      }
      if (url.includes("/scene")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              scene: {
                steps: [
                  {
                    title: "One",
                    caption: "c",
                    parts: [
                      {
                        id: "p1",
                        label: "Widget (\u00d72)",
                        x: 0,
                        y: 0,
                        rotationDeg: 0,
                      },
                    ],
                    confidence: 1,
                    tools: [],
                    warnings: [],
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({ ok: false, json: () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AssemblyWorkspace jobId="j2" />);

    await waitFor(() => {
      expect(screen.getByText("Widget")).toBeInTheDocument();
    });

    expect(screen.getByTestId("part-count-inv-widget")).toHaveTextContent("2");

    const dec = screen.getByRole("button", {
      name: /Decrease count for Widget/,
    });

    await act(async () => {
      fireEvent.click(dec);
    });

    expect(screen.getByTestId("part-count-inv-widget")).toHaveTextContent("1");
  });
});
