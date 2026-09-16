import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { environmentRouter } from "./features/environments/environment.routes.js";
import { workspaceRouter } from "./features/workspaces/workspace.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

export function createApp() {
	const app = express();
	app.disable("x-powered-by");
	app.use(cors());
	app.use(express.json({ limit: "100kb" }));
	app.use(express.static(publicDirectory));
	app.get("/api/v1/health", (request, response) => {
		const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
		response.status(database === "connected" ? 200 : 503).json({ data: { status: database === "connected" ? "ok" : "degraded", database } });
	});
	app.use("/api/v1/workspaces", workspaceRouter);
	app.use("/api/v1/environments", environmentRouter);
	app.use(notFoundHandler);
	app.use(errorHandler);
	return app;
}
