import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { api, ApiError } from "@/lib/api";

const replace = vi.fn();
let pathname = "/library";
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

import { AuthProvider } from "@/lib/auth";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import AdminPage from "@/app/admin/page";

const user = { id: 1, email: "a@b.co", is_admin: true, created_at: "2026-01-01T00:00:00Z" };
const cfg = { allow_signup: false, invite_signup: true, dev_autologin: false };

beforeEach(() => {
  vi.restoreAllMocks();
  replace.mockClear();
  pathname = "/library";
  search = "";
  vi.spyOn(api, "authConfig").mockResolvedValue(cfg);
});

describe("route guard", () => {
  it("redirects anonymous users to /login with next", async () => {
    vi.spyOn(api, "me").mockRejectedValue(new ApiError("Not authenticated", 401));
    render(
      <AuthProvider>
        <div>secret</div>
      </AuthProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Flibrary"));
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when authenticated (e.g. dev autologin)", async () => {
    vi.spyOn(api, "me").mockResolvedValue(user);
    render(
      <AuthProvider>
        <div>secret</div>
      </AuthProvider>,
    );
    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not guard /login", async () => {
    pathname = "/login";
    vi.spyOn(api, "me").mockRejectedValue(new ApiError("Not authenticated", 401));
    render(
      <AuthProvider>
        <div>public</div>
      </AuthProvider>,
    );
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

function renderLogin() {
  pathname = "/login";
  vi.spyOn(api, "me").mockRejectedValue(new ApiError("Not authenticated", 401));
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}
function fillLogin() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter2hunter2" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("login page", () => {
  it("logs in and redirects to next", async () => {
    search = "next=%2Fpapers%2F3";
    const login = vi.spyOn(api, "login").mockResolvedValue(user);
    renderLogin();
    fillLogin();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/papers/3"));
    expect(login).toHaveBeenCalledWith("a@b.co", "hunter2hunter2");
  });

  it("ignores external next targets", async () => {
    search = "next=%2F%2Fevil.com";
    vi.spyOn(api, "login").mockResolvedValue(user);
    renderLogin();
    fillLogin();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new ApiError("Invalid email or password", 401));
    renderLogin();
    fillLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("shows retry time when throttled", async () => {
    const e = new ApiError("Too many login attempts", 429);
    e.retryAfter = 30;
    vi.spyOn(api, "login").mockRejectedValue(e);
    renderLogin();
    fillLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in 30 seconds");
  });
});

describe("signup page", () => {
  it("prefills the invite code from ?invite=", async () => {
    pathname = "/signup";
    search = "invite=ABC123";
    vi.spyOn(api, "me").mockRejectedValue(new ApiError("Not authenticated", 401));
    render(
      <AuthProvider>
        <SignupPage />
      </AuthProvider>,
    );
    expect(screen.getByLabelText("Invite code")).toHaveValue("ABC123");
  });
});

describe("admin page", () => {
  it("shows a created invite code and link once", async () => {
    pathname = "/admin";
    vi.spyOn(api, "me").mockResolvedValue(user);
    vi.spyOn(api, "adminUsers").mockResolvedValue([]);
    const list = vi.spyOn(api, "adminInvites").mockResolvedValue([]);
    vi.spyOn(api, "createInvite").mockResolvedValue({ code: "SECRETCODE", expires_at: "2026-12-01T00:00:00Z" });
    render(
      <AuthProvider>
        <AdminPage />
      </AuthProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Create invite" }));
    expect(await screen.findByTestId("invite-code")).toHaveTextContent("SECRETCODE");
    expect(screen.getByText(/\/signup\?invite=SECRETCODE/)).toBeInTheDocument();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/SECRETCODE/)).toBeNull();
  });

  it("blocks non-admins", async () => {
    pathname = "/admin";
    vi.spyOn(api, "me").mockResolvedValue({ ...user, is_admin: false });
    render(
      <AuthProvider>
        <AdminPage />
      </AuthProvider>,
    );
    expect(await screen.findByText("Admin only.")).toBeInTheDocument();
  });
});
