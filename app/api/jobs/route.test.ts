import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./[id]/route";
import { POST as POSTEnqueue } from "./[id]/enqueue/route";
import { POST } from "./route";
import { getJobQueue } from "@/lib/queue";
import { objectExistsInBucket } from "@/lib/s3/head-object";

vi.mock("@/lib/queue", () => ({
  getJobQueue: vi.fn(),
}));

vi.mock("@/lib/s3/head-object", () => ({
  objectExistsInBucket: vi.fn(),
}));

vi.mock("@/lib/s3/presign", () => ({
  buildManualPdfKey: (jobId: string) => `uploads/${jobId}/manual.pdf`,
  presignManualUpload: vi.fn(() =>
    Promise.resolve({ url: "https://signed.example/upload", expiresIn: 900 }),
  ),
}));

describe("POST /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns presigned upload metadata for valid PDF requests", async () => {
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "application/pdf",
        sizeBytes: 1200,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      jobId: string;
      uploadUrl: string;
      key: string;
      headers: Record<string, string>;
      expiresIn: number;
    };
    expect(body.jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.uploadUrl).toContain("signed.example");
    expect(body.key).toBe(`uploads/${body.jobId}/manual.pdf`);
    expect(body.headers["Content-Type"]).toBe("application/pdf");
    expect(body.expiresIn).toBe(900);
    expect(getJobQueue).not.toHaveBeenCalled();
  });

  it("returns 400 for oversize declarations", async () => {
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "application/pdf",
        sizeBytes: 30 * 1024 * 1024,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("POST /api/jobs/[id]/enqueue", () => {
  const jobId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(objectExistsInBucket).mockResolvedValue(true);
    vi.mocked(getJobQueue).mockReturnValue({
      add: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  it("enqueues after confirming the PDF exists in S3", async () => {
    const request = new Request(
      `http://localhost/api/jobs/${jobId}/enqueue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "application/pdf",
          sizeBytes: 1200,
        }),
      },
    );

    const response = await POSTEnqueue(request, {
      params: Promise.resolve({ id: jobId }),
    });

    expect(response.status).toBe(200);
    expect(objectExistsInBucket).toHaveBeenCalledWith(
      `uploads/${jobId}/manual.pdf`,
    );
    expect(vi.mocked(getJobQueue).mock.results[0]?.value.add).toHaveBeenCalledWith(
      jobId,
      {
        jobId,
        s3Key: `uploads/${jobId}/manual.pdf`,
        contentType: "application/pdf",
        sizeBytes: 1200,
      },
      { jobId },
    );
  });

  it("returns 409 when the object is not in S3 yet", async () => {
    vi.mocked(objectExistsInBucket).mockResolvedValue(false);

    const request = new Request(
      `http://localhost/api/jobs/${jobId}/enqueue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "application/pdf",
          sizeBytes: 1200,
        }),
      },
    );

    const response = await POSTEnqueue(request, {
      params: Promise.resolve({ id: jobId }),
    });

    expect(response.status).toBe(409);
    expect(getJobQueue).not.toHaveBeenCalled();
  });
});

describe("GET /api/jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns queued for waiting jobs", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "job-1",
          timestamp: 1_700_000_000_000,
          processedOn: undefined,
          finishedOn: undefined,
          failedReason: undefined,
          getState: vi.fn(() => Promise.resolve("waiting")),
        }),
      ),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/jobs/job-1"),
      { params: Promise.resolve({ id: "job-1" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      error: string | null;
      sceneKey: string | null;
    };
    expect(body.status).toBe("queued");
    expect(body.error).toBeNull();
    expect(body.sceneKey).toBeNull();
  });

  it("returns processing for active jobs", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "job-2",
          timestamp: 1,
          processedOn: 2,
          finishedOn: undefined,
          failedReason: undefined,
          getState: vi.fn(() => Promise.resolve("active")),
        }),
      ),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/jobs/job-2"),
      { params: Promise.resolve({ id: "job-2" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      sceneKey: string | null;
    };
    expect(body.status).toBe("processing");
    expect(body.sceneKey).toBeNull();
  });

  it("returns sceneKey when job completed with return value", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "job-done",
          timestamp: 1,
          processedOn: 2,
          finishedOn: 3,
          failedReason: undefined,
          returnvalue: { sceneKey: "uploads/job-done/scene.json" },
          getState: vi.fn(() => Promise.resolve("completed")),
        }),
      ),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/jobs/job-done"),
      { params: Promise.resolve({ id: "job-done" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      sceneKey: string | null;
    };
    expect(body.status).toBe("completed");
    expect(body.sceneKey).toBe("uploads/job-done/scene.json");
  });

  it("returns sceneKey null when completed without return value", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "job-norv",
          timestamp: 1,
          processedOn: 2,
          finishedOn: 3,
          failedReason: undefined,
          returnvalue: undefined,
          getState: vi.fn(() => Promise.resolve("completed")),
        }),
      ),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/jobs/job-norv"),
      { params: Promise.resolve({ id: "job-norv" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { sceneKey: string | null };
    expect(body.sceneKey).toBeNull();
  });

  it("returns 404 when the job is missing", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() => Promise.resolve(undefined)),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/jobs/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
