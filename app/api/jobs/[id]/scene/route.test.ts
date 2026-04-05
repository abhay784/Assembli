import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getJobQueue } from "@/lib/queue";
import { getObjectJson } from "@/lib/s3/get-object-json";
import { mockScene } from "@/lib/scene/mock";

vi.mock("@/lib/queue", () => ({
  getJobQueue: vi.fn(),
}));

vi.mock("@/lib/s3/get-object-json", () => ({
  getObjectJson: vi.fn(),
}));

describe("GET /api/jobs/[id]/scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 when job is not completed", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "j1",
          returnvalue: {},
          getState: vi.fn(() => Promise.resolve("active")),
        }),
      ),
    } as never);

    const res = await GET(new Request("http://localhost/api/jobs/j1/scene"), {
      params: Promise.resolve({ id: "j1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns parsed SceneJSON when job completed and S3 object valid", async () => {
    vi.mocked(getObjectJson).mockResolvedValue(mockScene);
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "job-done",
          returnvalue: { sceneKey: "uploads/job-done/scene.json" },
          getState: vi.fn(() => Promise.resolve("completed")),
        }),
      ),
    } as never);

    const res = await GET(
      new Request("http://localhost/api/jobs/job-done/scene"),
      { params: Promise.resolve({ id: "job-done" }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as typeof mockScene;
    expect(body.steps.length).toBe(mockScene.steps.length);
  });

  it("returns 404 when sceneKey missing", async () => {
    vi.mocked(getJobQueue).mockReturnValue({
      getJob: vi.fn(() =>
        Promise.resolve({
          id: "j",
          returnvalue: {},
          getState: vi.fn(() => Promise.resolve("completed")),
        }),
      ),
    } as never);

    const res = await GET(new Request("http://localhost/api/jobs/j/scene"), {
      params: Promise.resolve({ id: "j" }),
    });
    expect(res.status).toBe(404);
  });
});
