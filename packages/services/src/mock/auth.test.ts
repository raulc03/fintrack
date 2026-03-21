import { MockAuthService } from "./auth";

describe("MockAuthService", () => {
  let service: MockAuthService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      length: 0,
      key: vi.fn(() => null),
    };
    // Stub both window and localStorage since auth service checks typeof window
    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);
    service = new MockAuthService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("signup", () => {
    it("creates user and returns auth response", async () => {
      const result = await service.signup({ name: "John", email: "john@test.com", password: "123456" });
      expect(result.user.email).toBe("john@test.com");
      expect(result.user.name).toBe("John");
      expect(result.token).toBeTruthy();
    });

    it("lowercases email", async () => {
      const result = await service.signup({ name: "John", email: "JOHN@Test.COM", password: "123456" });
      expect(result.user.email).toBe("john@test.com");
    });

    it("stores session in localStorage", async () => {
      await service.signup({ name: "John", email: "john@test.com", password: "123456" });
      expect(store["fintrack_session"]).toBeTruthy();
    });

    it("throws when email already in use", async () => {
      await service.signup({ name: "John", email: "john@test.com", password: "123456" });
      await expect(
        service.signup({ name: "Jane", email: "john@test.com", password: "654321" })
      ).rejects.toThrow("Email already in use");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await service.signup({ name: "John", email: "john@test.com", password: "123456" });
    });

    it("logs in with correct credentials", async () => {
      const result = await service.login({ email: "john@test.com", password: "123456" });
      expect(result.user.email).toBe("john@test.com");
    });

    it("throws with wrong password", async () => {
      await expect(
        service.login({ email: "john@test.com", password: "wrong" })
      ).rejects.toThrow("Invalid email or password");
    });

    it("throws with nonexistent email", async () => {
      await expect(
        service.login({ email: "nobody@test.com", password: "123456" })
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("getSession", () => {
    it("returns null when no session", () => {
      expect(service.getSession()).toBeNull();
    });

    it("returns session after login", async () => {
      await service.signup({ name: "John", email: "john@test.com", password: "123456" });
      const session = service.getSession();
      expect(session).not.toBeNull();
      expect(session!.user.email).toBe("john@test.com");
    });
  });

  describe("logout", () => {
    it("removes session from localStorage", async () => {
      await service.signup({ name: "John", email: "john@test.com", password: "123456" });
      service.logout();
      expect(service.getSession()).toBeNull();
    });
  });
});
