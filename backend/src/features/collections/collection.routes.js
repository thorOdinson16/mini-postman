import { Router } from "express";
import {
	addFolder,
	createCollection,
	deleteCollection,
	deleteFolder,
	duplicateCollection,
	listCollections,
	renameFolder,
	reorderCollections,
	reorderFolders,
	searchCollections,
	updateCollection,
} from "./collection.controller.js";

export const collectionRouter = Router();
collectionRouter.get("/search", searchCollections);
collectionRouter.put("/order", reorderCollections);
collectionRouter.get("/", listCollections);
collectionRouter.post("/", createCollection);
collectionRouter.patch("/:collectionId", updateCollection);
collectionRouter.delete("/:collectionId", deleteCollection);
collectionRouter.post("/:collectionId/duplicate", duplicateCollection);
collectionRouter.post("/:collectionId/folders", addFolder);
collectionRouter.put("/:collectionId/folders/order", reorderFolders);
collectionRouter.patch("/:collectionId/folders/:folderId", renameFolder);
collectionRouter.delete("/:collectionId/folders/:folderId", deleteFolder);
