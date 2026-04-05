/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ManualUpload } from "./ManualUpload";
import { MAX_PDF_BYTES } from "@/lib/constants/upload";
import { isLikelyPdf } from "./magic-pdf";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("./magic-pdf", () => ({
  isLikelyPdf: vi.fn(() => Promise.resolve(false)),
}));

const isLikelyPdfMock = vi.mocked(isLikelyPdf);

describe("ManualUpload", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      vi.fn(() => ({
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(function (this: {
          onload?: () => void;
          status: number;
        }) {
          this.status = 200;
          this.onload?.();
        }),
        upload: { onprogress: null },
        status: 200,
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the oversize error for large PDF declarations", () => {
    render(<ManualUpload />);
    const input = screen.getByTestId(
      "manual-file-input",
    ) as HTMLInputElement;
    const big = new File([new Uint8Array(MAX_PDF_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });

    act(() => {
      fireEvent.change(input, { target: { files: [big] } });
    });

    expect(
      screen.getByText(
        "This PDF is over 25 MB. Use a smaller export or compress the file, then try again.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the wrong-type error for non-PDF files", () => {
    render(<ManualUpload />);
    const input = screen.getByTestId(
      "manual-file-input",
    ) as HTMLInputElement;
    const wrong = new File(["x"], "notes.txt", { type: "text/plain" });

    act(() => {
      fireEvent.change(input, { target: { files: [wrong] } });
    });

    expect(
      screen.getByText(
        "This file is not a PDF. Choose a `.pdf` assembly manual and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("blocks presign when magic bytes are not PDF", async () => {
    const fetchMock = vi.mocked(fetch);
    render(<ManualUpload />);
    const input = screen.getByTestId(
      "manual-file-input",
    ) as HTMLInputElement;
    const fake = new File(["hello-world"], "manual.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      fireEvent.change(input, { target: { files: [fake] } });
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Upload assembly manual" }),
      );
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          "This file does not look like a valid PDF. It may be mislabeled; export or save as PDF and try again.",
        ),
      ).toBeInTheDocument(),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("after successful enqueue", () => {
    beforeEach(() => {
      isLikelyPdfMock.mockResolvedValue(true);
    });

    async function triggerUploadFlow() {
      const input = screen.getByTestId("manual-file-input") as HTMLInputElement;
      const pdfBytes = new Uint8Array(5);
      pdfBytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
      const pdf = new File([pdfBytes], "manual.pdf", {
        type: "application/pdf",
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [pdf] } });
      });

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Upload assembly manual" }),
        );
      });
    }

    it("redirects to the job assembly page", async () => {
      const fetchMock = vi.fn((url: string) => {
        if (url === "/api/jobs") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                jobId: "test-job-1",
                uploadUrl: "https://s3.example.com/upload",
                headers: { "Content-Type": "application/pdf" },
              }),
          });
        }
        if (typeof url === "string" && url.includes("/enqueue")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ok: true }),
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<ManualUpload />);
      await triggerUploadFlow();

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/jobs/test-job-1");
      });
    });
  });
});
