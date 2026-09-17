import { Router } from "express";
import { createRequest, deleteRequest, duplicateRequest, listRequests, reorderRequests, searchRequests, sendRequest, updateRequest } from "./request.controller.js";

export const requestRouter = Router();
requestRouter.get("/search", searchRequests);
requestRouter.put("/order", reorderRequests);
requestRouter.get("/", listRequests);
requestRouter.post("/", createRequest);
requestRouter.patch("/:requestId", updateRequest);
requestRouter.delete("/:requestId", deleteRequest);
requestRouter.post("/:requestId/duplicate", duplicateRequest);
requestRouter.post("/:requestId/send", sendRequest);
