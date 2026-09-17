import { Router } from "express";
import { clearHistory, deleteHistory, listHistory, replayHistory, saveHistory } from "./history.controller.js";

export const historyRouter = Router();
historyRouter.get("/", listHistory);
historyRouter.delete("/", clearHistory);
historyRouter.delete("/:historyId", deleteHistory);
historyRouter.post("/:historyId/replay", replayHistory);
historyRouter.post("/:historyId/save", saveHistory);
