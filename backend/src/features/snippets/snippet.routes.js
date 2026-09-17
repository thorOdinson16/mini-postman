import { Router } from "express";
import { generateInlineSnippet, generateSavedSnippet } from "./snippet.controller.js";

export const snippetRouter = Router();
snippetRouter.post("/", generateInlineSnippet);
snippetRouter.get("/:requestId", generateSavedSnippet);
