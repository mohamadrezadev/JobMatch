import { validate } from "class-validator";
import { SendMessageDto } from "./send-message.dto";
describe("Chat validation", () => {
  it.each(["", "   ", "x".repeat(4001)])(
    "rejects invalid message",
    async (message) => {
      expect(
        (await validate(Object.assign(new SendMessageDto(), { message })))
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects invalid IDs", async () => {
    expect(
      (
        await validate(
          Object.assign(new SendMessageDto(), {
            message: "Backend",
            conversationId: "foreign-invalid",
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it("accepts a role-only message with no ID", async () => {
    expect(
      await validate(
        Object.assign(new SendMessageDto(), { message: "Backend" }),
      ),
    ).toEqual([]);
  });
});
