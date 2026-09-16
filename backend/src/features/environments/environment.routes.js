import { Router } from "express";
import {
	createEnvironment,
	deleteEnvironment,
	getEnvironment,
	listEnvironments,
	updateEnvironment,
} from "./environment.controller.js";

export const environmentRouter = Router();
environmentRouter.get("/", listEnvironments);
environmentRouter.post("/", createEnvironment);
environmentRouter.get("/:environmentId", getEnvironment);
environmentRouter.patch("/:environmentId", updateEnvironment);
environmentRouter.delete("/:environmentId", deleteEnvironment);
