import { Router } from "express";
import { createWorkspace, deleteWorkspace, listWorkspaces, updateWorkspace } from "./workspace.controller.js";

export const workspaceRouter = Router();
workspaceRouter.get("/", listWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.patch("/:workspaceId", updateWorkspace);
workspaceRouter.delete("/:workspaceId", deleteWorkspace);
