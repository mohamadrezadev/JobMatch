import { BadRequestException } from "@nestjs/common";
import { JobDiscoveryService } from "../application/job-discovery.service";
import { JobDiscoveryController } from "./job-discovery.controller";

describe("JobDiscoveryController candidate listing", () => {
  const runId = "00000000-0000-4000-8000-000000000000";

  function setup() {
    const discovery = {
      listCandidates: jest.fn(async () => ({ candidates: [] })),
    };
    return {
      discovery,
      controller: new JobDiscoveryController(
        discovery as unknown as JobDiscoveryService,
      ),
    };
  }

  it("rejects a non-numeric candidate page limit", async () => {
    const { controller, discovery } = setup();
    await expect(
      controller.candidates(
        { sub: "user" },
        runId,
        undefined,
        undefined,
        "abc",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(discovery.listCandidates).not.toHaveBeenCalled();
  });

  it("passes an integer limit to the bounded repository query", async () => {
    const { controller, discovery } = setup();
    await controller.candidates(
      { sub: "user" },
      runId,
      "MATCHED",
      "cursor",
      "25",
    );
    expect(discovery.listCandidates).toHaveBeenCalledWith("user", runId, {
      status: "MATCHED",
      cursor: "cursor",
      limit: 25,
    });
  });
});
