import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";

export const POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

const MAX_IMPORT_DEPTH = 50;

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const MAX_NAME = 120;
const MAX_REQUEST_NAME = 160;
const MAX_URL = 2048;

const parentOf = (value) => (value ? String(value) : null);
const sameParent = (left, right) => parentOf(left) === parentOf(right);
const clamp = (value, max) => String(value ?? "").trim().slice(0, max);

function authToPostman(auth) {
	if (!auth || auth.type === "none") return undefined;
	if (auth.type === "bearer") {
		return { type: "bearer", bearer: [{ key: "token", value: auth.bearer?.token ?? "", type: "string" }] };
	}
	if (auth.type === "basic") {
		return {
			type: "basic",
			basic: [
				{ key: "username", value: auth.basic?.username ?? "", type: "string" },
				{ key: "password", value: auth.basic?.password ?? "", type: "string" },
			],
		};
	}
	if (auth.type === "apiKey") {
		return {
			type: "apikey",
			apikey: [
				{ key: "key", value: auth.apiKey?.key ?? "", type: "string" },
				{ key: "value", value: auth.apiKey?.value ?? "", type: "string" },
				{ key: "in", value: auth.apiKey?.addTo ?? "header", type: "string" },
			],
		};
	}
	return undefined;
}

function authFromPostman(auth) {
	if (!auth || auth.type === "noauth") return { type: "none" };
	const params = Object.fromEntries((auth[auth.type] || []).map((entry) => [entry.key, entry.value]));
	if (auth.type === "bearer") return { type: "bearer", bearer: { token: params.token ?? "" } };
	if (auth.type === "basic") return { type: "basic", basic: { username: params.username ?? "", password: params.password ?? "" } };
	if (auth.type === "apikey") return { type: "apiKey", apiKey: { key: params.key ?? "", value: params.value ?? "", addTo: params.in === "query" ? "query" : "header" } };
	return { type: "none" };
}

function keyValueToPostman(rows) {
	return (rows || []).map((row) => ({
		key: row.key,
		value: row.value ?? "",
		...(row.description ? { description: row.description } : {}),
		...(row.enabled === false ? { disabled: true } : {}),
	}));
}

function keyValueFromPostman(rows) {
	return (rows || []).map((row) => ({
		key: String(row.key ?? ""),
		value: String(row.value ?? ""),
		enabled: row.disabled !== true,
		description: typeof row.description === "string" ? row.description : "",
	}));
}

function bodyToPostman(body) {
	const mode = body?.mode ?? "none";
	if (mode === "none") return undefined;
	if (mode === "json" || mode === "text") {
		return { mode: "raw", raw: body.raw ?? "", options: { raw: { language: mode } } };
	}
	if (mode === "urlEncoded") return { mode: "urlencoded", urlencoded: keyValueToPostman(body.urlEncoded) };
	if (mode === "formData") {
		return {
			mode: "formdata",
			formdata: (body.formData || []).map((field) => ({
				key: field.key,
				value: field.value ?? "",
				type: field.type === "file" ? "file" : "text",
				...(field.description ? { description: field.description } : {}),
				...(field.enabled === false ? { disabled: true } : {}),
			})),
		};
	}
	return undefined;
}

function bodyFromPostman(body) {
	if (!body || !body.mode || body.mode === "none") return { mode: "none", raw: "", formData: [], urlEncoded: [] };
	if (body.mode === "raw") {
		return { mode: body.options?.raw?.language === "json" ? "json" : "text", raw: String(body.raw ?? ""), formData: [], urlEncoded: [] };
	}
	if (body.mode === "urlencoded") {
		return { mode: "urlEncoded", raw: "", urlEncoded: keyValueFromPostman(body.urlencoded), formData: [] };
	}
	if (body.mode === "formdata") {
		return {
			mode: "formData",
			raw: "",
			urlEncoded: [],
			formData: (body.formdata || []).map((field) => ({
				key: String(field.key ?? ""),
				value: String(field.value ?? ""),
				type: field.type === "file" ? "file" : "text",
				enabled: field.disabled !== true,
				description: typeof field.description === "string" ? field.description : "",
			})),
		};
	}
	return { mode: "none", raw: "", formData: [], urlEncoded: [] };
}

function urlToPostman(url, queryParams) {
	const pairs = queryParams || [];
	const raw = pairs.length ? `${url}${url.includes("?") ? "&" : "?"}${pairs.map((pair) => `${pair.key}=${pair.value}`).join("&")}` : url;
	const result = { raw };
	if (pairs.length) result.query = keyValueToPostman(pairs);
	return result;
}

function parseQueryString(query) {
	return query
		.split("&")
		.filter(Boolean)
		.map((pair) => {
			const index = pair.indexOf("=");
			return index === -1
				? { key: pair, value: "", enabled: true, description: "" }
				: { key: pair.slice(0, index), value: pair.slice(index + 1), enabled: true, description: "" };
		});
}

function urlFromPostman(url) {
	if (typeof url === "string") {
		const index = url.indexOf("?");
		return { url: index === -1 ? url : url.slice(0, index), queryParams: index === -1 ? [] : parseQueryString(url.slice(index + 1)) };
	}
	if (url && typeof url === "object") {
		const raw = String(url.raw ?? "");
		if (Array.isArray(url.query)) {
			return { url: raw.split("?")[0], queryParams: keyValueFromPostman(url.query) };
		}
		const index = raw.indexOf("?");
		return { url: index === -1 ? raw : raw.slice(0, index), queryParams: index === -1 ? [] : parseQueryString(raw.slice(index + 1)) };
	}
	return { url: "", queryParams: [] };
}

function requestToPostman(request) {
	const result = { method: request.method };
	if (request.description) result.description = request.description;
	const header = keyValueToPostman(request.headers);
	if (header.length) result.header = header;
	result.url = urlToPostman(request.url ?? "", request.queryParams || []);
	const auth = authToPostman(request.auth);
	if (auth) result.auth = auth;
	const body = bodyToPostman(request.body);
	if (body) result.body = body;
	return result;
}

function requestFromPostman(request) {
	const { url, queryParams } = urlFromPostman(request.url);
	return {
		description: clamp(request.description ?? "", 1000),
		method: METHODS.includes(request.method) ? request.method : "GET",
		url: String(url).slice(0, MAX_URL),
		queryParams,
		headers: keyValueFromPostman(request.header),
		body: bodyFromPostman(request.body),
		auth: authFromPostman(request.auth),
	};
}

function buildItems(folders, requests, parentId) {
	const levelFolders = folders.filter((folder) => sameParent(folder.parentId, parentId)).sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
	const levelRequests = requests.filter((request) => sameParent(request.folderId, parentId)).sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
	const items = [];
	for (const folder of levelFolders) {
		items.push({ name: folder.name, item: buildItems(folders, requests, folder._id) });
	}
	for (const request of levelRequests) {
		items.push({ name: request.name, request: requestToPostman(request) });
	}
	return items;
}

export function toPostmanCollection(collection, requests) {
	const info = { name: collection.name };
	if (collection.description) info.description = collection.description;
	info.schema = POSTMAN_SCHEMA;
	const result = { info };
	const auth = authToPostman(collection.auth);
	if (auth) result.auth = auth;
	result.item = buildItems(collection.folders || [], requests || [], null);
	return result;
}

function walkItems(items, parentId, folders, requests, depth = 0) {
	if (depth > MAX_IMPORT_DEPTH) throw new AppError(400, "INVALID_COLLECTION_FORMAT", "The collection is nested too deeply.");
	let folderOrder = 0;
	let requestOrder = 0;
	for (const item of items) {
		if (!item || typeof item !== "object") continue;
		if (Array.isArray(item.item)) {
			const folder = { _id: new mongoose.Types.ObjectId(), name: clamp(item.name ?? "Folder", MAX_NAME) || "Folder", parentId: parentId ?? null, order: folderOrder };
			folderOrder += 1;
			folders.push(folder);
			walkItems(item.item, folder._id, folders, requests, depth + 1);
		} else if (item.request) {
			const parsed = requestFromPostman(item.request);
			requests.push({ ...parsed, name: clamp(item.name ?? "Request", MAX_REQUEST_NAME) || "Request", folderId: parentId ?? null, order: requestOrder });
			requestOrder += 1;
		}
	}
}

export function fromPostmanCollection(content) {
	if (!content || typeof content !== "object" || Array.isArray(content)) {
		throw new AppError(400, "INVALID_COLLECTION_FORMAT", "Provide a Postman collection object.");
	}
	if (!Array.isArray(content.item)) {
		throw new AppError(400, "INVALID_COLLECTION_FORMAT", "The Postman collection must contain an item array.");
	}
	const name = clamp(content.info?.name, MAX_NAME);
	if (!name) throw new AppError(400, "INVALID_COLLECTION_FORMAT", "The Postman collection must include an info.name.");
	const folders = [];
	const requests = [];
	walkItems(content.item, null, folders, requests);
	return {
		name,
		description: clamp(content.info?.description ?? "", 1000),
		auth: authFromPostman(content.auth),
		folders,
		requests,
	};
}

export function postmanFileName(name) {
	const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return `${slug || "collection"}.postman_collection.json`;
}
