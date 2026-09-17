import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./features/auth/auth.routes.js";
import { collectionRouter } from "./features/collections/collection.routes.js";
import { environmentRouter } from "./features/environments/environment.routes.js";
import { historyRouter } from "./features/history/history.routes.js";
import { importExportRouter } from "./features/import-export/import-export.routes.js";
import { requestRouter } from "./features/requests/request.routes.js";
import { snippetRouter } from "./features/snippets/snippet.routes.js";
import { workspaceRouter } from "./features/workspaces/workspace.routes.js";
import { requireAuth } from "./shared/middleware/auth.js";
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
	app.use("/api/v1/auth", authRouter);
	app.use("/api/v1/workspaces", requireAuth, workspaceRouter);
	app.use("/api/v1/environments", requireAuth, environmentRouter);
	app.use("/api/v1/collections", requireAuth, collectionRouter);
	app.use("/api/v1/requests", requireAuth, requestRouter);
	app.use("/api/v1/history", requireAuth, historyRouter);
	app.use("/api/v1/snippets", requireAuth, snippetRouter);
	app.use("/api/v1/import-export", requireAuth, importExportRouter);
	app.use(notFoundHandler);
	app.use(errorHandler);
	return app;
}
