import { AppError } from "../../shared/errors/app-error.js";
import { resolveAuth } from "../../shared/utils/variables.js";

const DEFAULT_CONTENT_TYPES = {
	json: "application/json",
	text: "text/plain",
	urlEncoded: "application/x-www-form-urlencoded",
};

function enabledRows(rows) {
	return (rows || []).filter((row) => row && row.enabled !== false && String(row.key ?? "").length > 0);
}

function hasHeader(headers, name) {
	return headers.some((header) => header.key.toLowerCase() === name.toLowerCase());
}

function setHeader(headers, key, value) {
	const index = headers.findIndex((header) => header.key.toLowerCase() === key.toLowerCase());
	if (index === -1) headers.push({ key, value });
	else headers[index] = { key: headers[index].key, value };
}

function applyAuth(headers, queryPairs, auth) {
	const type = auth?.type ?? "none";
	if (type === "bearer") {
		setHeader(headers, "Authorization", `Bearer ${auth.bearer?.token ?? ""}`);
	} else if (type === "basic") {
		const credentials = `${auth.basic?.username ?? ""}:${auth.basic?.password ?? ""}`;
		setHeader(headers, "Authorization", `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`);
	} else if (type === "apiKey" && auth.apiKey?.key) {
		if (auth.apiKey.addTo === "query") queryPairs.push([auth.apiKey.key, auth.apiKey.value ?? ""]);
		else setHeader(headers, auth.apiKey.key, auth.apiKey.value ?? "");
	}
}

function buildBody(body, headers) {
	const mode = body?.mode ?? "none";
	if (mode === "none") return null;
	if (mode === "json" || mode === "text") {
		if (!hasHeader(headers, "content-type")) headers.push({ key: "Content-Type", value: DEFAULT_CONTENT_TYPES[mode] });
		return { kind: "raw", value: body.raw ?? "" };
	}
	if (mode === "urlEncoded") {
		if (!hasHeader(headers, "content-type")) headers.push({ key: "Content-Type", value: DEFAULT_CONTENT_TYPES.urlEncoded });
		return { kind: "urlEncoded", pairs: enabledRows(body.urlEncoded).map(({ key, value }) => [key, value ?? ""]) };
	}
	if (mode === "formData") {
		return { kind: "formData", fields: enabledRows(body.formData).filter((field) => field.type !== "file").map(({ key, value }) => [key, value ?? ""]) };
	}
	return null;
}

function buildHeaders(resolved, auth) {
	const headers = [];
	for (const { key, value } of enabledRows(resolved.headers)) setHeader(headers, key, value ?? "");
	const queryPairs = [];
	applyAuth(headers, queryPairs, auth);
	return { headers, queryPairs };
}

function appendQuery(url, pairs) {
	if (!pairs.length) return url;
	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}${pairs.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`;
}

export function selectAuth(requestAuth, collectionAuth, variableMap) {
	if (requestAuth && requestAuth.type && requestAuth.type !== "none") return requestAuth;
	return resolveAuth(collectionAuth ?? { type: "none" }, variableMap);
}

export function buildOutgoingRequest(resolved, auth) {
	let url;
	try {
		url = new URL(resolved.url);
	} catch {
		throw new AppError(400, "INVALID_REQUEST_URL", "Provide a valid absolute request URL.");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new AppError(400, "INVALID_REQUEST_URL", "Only http and https request URLs are supported.");
	}
	for (const { key, value } of enabledRows(resolved.queryParams)) url.searchParams.append(key, value ?? "");
	const { headers, queryPairs } = buildHeaders(resolved, auth);
	for (const [key, value] of queryPairs) url.searchParams.append(key, value);
	const body = buildBody(resolved.body, headers);
	return { method: resolved.method, url: url.toString(), headers, body };
}

export function buildSnippetRequest(resolved, auth) {
	const { headers, queryPairs } = buildHeaders(resolved, auth);
	const query = [...enabledRows(resolved.queryParams).map(({ key, value }) => [key, value ?? ""]), ...queryPairs];
	const body = buildBody(resolved.body, headers);
	return { method: resolved.method, url: appendQuery(resolved.url ?? "", query), headers, body };
}
