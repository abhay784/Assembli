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

describe("ManualUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
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
});
