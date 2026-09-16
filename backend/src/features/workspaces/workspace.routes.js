import { Router } from "express";
import {
	createWorkspace,
	deleteWorkspace,
	getWorkspace,
	listWorkspaces,
	updateWorkspace,
} from "./workspace.controller.js";

export const workspaceRouter = Router();
workspaceRouter.get("/", listWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.get("/:workspaceId", getWorkspace);
workspaceRouter.patch("/:workspaceId", updateWorkspace);
workspaceRouter.delete("/:workspaceId", deleteWorkspace);
