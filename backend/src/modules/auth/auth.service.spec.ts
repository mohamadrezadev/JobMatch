import { ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

describe("AuthService registration", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    analyticsEvent: { create: jest.fn() },
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue("token"),
  };
  const service = new AuthService(prisma as any, jwtService as any);
  const dto = {
    email: "used@example.com",
    password: "password123",
    firstName: "کاربر",
    lastName: "آزمایشی",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a clear conflict when the email already exists", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    await expect(service.register(dto)).rejects.toEqual(
      new ConflictException("این ایمیل قبلاً ثبت شده است."),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("maps a concurrent unique constraint failure to the same conflict", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue({ code: "P2002" });

    await expect(service.register(dto)).rejects.toEqual(
      new ConflictException("این ایمیل قبلاً ثبت شده است."),
    );
    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
  });
});
