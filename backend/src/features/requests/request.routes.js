import { Router } from "express";
import {
	createRequest,
	deleteRequest,
	getRequest,
	listRequests,
	sendAdHocRequest,
	sendRequest,
	updateRequest,
} from "./request.controller.js";

export const requestRouter = Router();
requestRouter.get("/", listRequests);
requestRouter.post("/", createRequest);
requestRouter.post("/send", sendAdHocRequest);
requestRouter.get("/:requestId", getRequest);
requestRouter.patch("/:requestId", updateRequest);
requestRouter.delete("/:requestId", deleteRequest);
requestRouter.post("/:requestId/send", sendRequest);
