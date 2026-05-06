import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, comparePassword, requireAuth, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role as "employer" | "employee" | "consultant" | "admin", employerId: user.employerId };
  const token = signToken(authUser);
  await logAudit(authUser, "user.login");
  res.json({ token, user: authUser });
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const user = getUser(req);
  await logAudit(user, "user.logout");
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/session", requireAuth, async (req, res) => {
  const user = getUser(req);
  res.json({ user, authenticated: true });
});

router.post("/auth/demo-login", async (req, res) => {
  const { role } = req.body as { role: string };
  const validRoles = ["employer", "employee", "consultant", "admin"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid role" });
    return;
  }
  const demoEmails: Record<string, string> = {
    employer: "hr.demo@acmecorp.com",
    employee: "james.chen@demo.com",
    consultant: "consultant.demo@transitioniq.com",
    admin: "admin@transitioniq.com",
  };
  const email = demoEmails[role];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(404).json({ error: "Not Found", message: `Demo user for role '${role}' not found. Ensure seed data has been loaded.` });
    return;
  }
  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role as "employer" | "employee" | "consultant" | "admin", employerId: user.employerId };
  const token = signToken(authUser);
  await logAudit(authUser, "user.demo_login", "role", undefined, role);
  res.json({ token, user: authUser });
});

export default router;
