import { render, screen } from "@testing-library/react";

const mockUser = vi.hoisted(() => ({
  id: "1",
  name: "John Doe",
  email: "john@test.com",
  createdAt: "",
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { Header } from "./header";

describe("Header", () => {
  it("renders the title", () => {
    render(<Header title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders add button when onAddClick is provided", () => {
    render(<Header title="Test" onAddClick={() => {}} addLabel="New Item" />);
    expect(screen.getByText("New Item")).toBeInTheDocument();
  });

  it("does not render add button when onAddClick is not provided", () => {
    render(<Header title="Test" />);
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
  });

  it("renders user name", () => {
    render(<Header title="Test" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders avatar with initials", () => {
    render(<Header title="Test" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
