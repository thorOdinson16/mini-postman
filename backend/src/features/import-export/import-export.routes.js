import { Router } from "express";
import { exportCollection, importCollection } from "./import-export.controller.js";

export const importExportRouter = Router();
importExportRouter.get("/collections/:collectionId", exportCollection);
importExportRouter.post("/collections", importCollection);
