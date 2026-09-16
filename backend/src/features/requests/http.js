import { HTTP_MAX_RESPONSE_BYTES, HTTP_REQUEST_TIMEOUT_MS } from "../../shared/constants/http.js";
import { AppError } from "../../shared/errors/app-error.js";

const DEFAULT_CONTENT_TYPES = {
	json: "application/json",
	text: "text/plain",
	urlEncoded: "application/x-www-form-urlencoded",
};

function enabledRows(rows) {
	return (rows || []).filter((row) => row && row.enabled !== false && String(row.key ?? "").length > 0);
}

function applyAuth(headers, url, auth) {
	const type = auth?.type ?? "none";
	if (type === "bearer") {
		headers.set("Authorization", `Bearer ${auth.bearer?.token ?? ""}`);
	} else if (type === "basic") {
		const credentials = `${auth.basic?.username ?? ""}:${auth.basic?.password ?? ""}`;
		headers.set("Authorization", `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`);
	} else if (type === "apiKey" && auth.apiKey?.key) {
		if (auth.apiKey.addTo === "query") url.searchParams.append(auth.apiKey.key, auth.apiKey.value ?? "");
		else headers.set(auth.apiKey.key, auth.apiKey.value ?? "");
	}
}

function buildBody(body, headers) {
	const mode = body?.mode ?? "none";
	if (mode === "none") return undefined;
	if (mode === "json" || mode === "text") {
		if (!headers.has("Content-Type")) headers.set("Content-Type", DEFAULT_CONTENT_TYPES[mode]);
		return body.raw ?? "";
	}
	if (mode === "urlEncoded") {
		const params = new URLSearchParams();
		for (const { key, value } of enabledRows(body.urlEncoded)) params.append(key, value ?? "");
		if (!headers.has("Content-Type")) headers.set("Content-Type", DEFAULT_CONTENT_TYPES.urlEncoded);
		return params;
	}
	if (mode === "formData") {
		const form = new FormData();
		for (const field of enabledRows(body.formData)) {
			if (field.type === "file") continue;
			form.append(field.key, field.value ?? "");
		}
		return form;
	}
	return undefined;
}

export async function executeRequest(resolved, auth) {
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
	const headers = new Headers();
	for (const { key, value } of enabledRows(resolved.headers)) headers.set(key, value ?? "");
	applyAuth(headers, url, auth);
	const body = buildBody(resolved.body, headers);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), HTTP_REQUEST_TIMEOUT_MS);
	const startedAt = performance.now();
	try {
		const response = await fetch(url, { method: resolved.method, headers, body, redirect: "follow", signal: controller.signal });
		const text = await response.text();
		const truncated = Buffer.byteLength(text, "utf8") > HTTP_MAX_RESPONSE_BYTES;
		const responseBody = truncated ? Buffer.from(text, "utf8").subarray(0, HTTP_MAX_RESPONSE_BYTES).toString("utf8") : text;
		return {
			status: response.status,
			statusText: response.statusText ?? "",
			ok: response.ok,
			headers: [...response.headers.entries()].map(([key, value]) => ({ key, value })),
			body: responseBody,
			size: Buffer.byteLength(responseBody, "utf8"),
			durationMs: Math.round(performance.now() - startedAt),
			contentType: response.headers.get("content-type") ?? "",
			truncated,
			error: "",
		};
	} catch (error) {
		return {
			status: 0,
			statusText: "",
			ok: false,
			headers: [],
			body: "",
			size: 0,
			durationMs: Math.round(performance.now() - startedAt),
			contentType: "",
			truncated: false,
			error: error?.name === "AbortError" ? `The request timed out after ${HTTP_REQUEST_TIMEOUT_MS} ms.` : error?.message || "The request could not be completed.",
		};
	} finally {
		clearTimeout(timeout);
	}
}
