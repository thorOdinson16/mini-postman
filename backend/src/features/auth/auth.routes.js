import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { login, logout, session } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", login);
authRouter.get("/session", requireAuth, session);
authRouter.post("/logout", requireAuth, logout);
