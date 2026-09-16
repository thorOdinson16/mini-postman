import { Router } from "express";
import {
	addFolder,
	createCollection,
	deleteCollection,
	deleteFolder,
	getCollection,
	listCollections,
	renameFolder,
	reorderFolders,
	updateCollection,
} from "./collection.controller.js";

export const collectionRouter = Router();
collectionRouter.get("/", listCollections);
collectionRouter.post("/", createCollection);
collectionRouter.get("/:collectionId", getCollection);
collectionRouter.patch("/:collectionId", updateCollection);
collectionRouter.delete("/:collectionId", deleteCollection);
collectionRouter.post("/:collectionId/folders", addFolder);
collectionRouter.put("/:collectionId/folders/order", reorderFolders);
collectionRouter.patch("/:collectionId/folders/:folderId", renameFolder);
collectionRouter.delete("/:collectionId/folders/:folderId", deleteFolder);
