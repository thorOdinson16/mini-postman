import { HTTP_MAX_RESPONSE_BYTES, HTTP_REQUEST_TIMEOUT_MS } from "../../shared/constants/http.js";
import { buildOutgoingRequest } from "./outgoing.js";

function toFetchBody(body) {
	if (!body) return undefined;
	if (body.kind === "raw") return body.value;
	if (body.kind === "urlEncoded") {
		const params = new URLSearchParams();
		for (const [key, value] of body.pairs) params.append(key, value);
		return params;
	}
	if (body.kind === "formData") {
		const form = new FormData();
		for (const [key, value] of body.fields) form.append(key, value);
		return form;
	}
	return undefined;
}

export async function executeRequest(resolved, auth) {
	const outgoing = buildOutgoingRequest(resolved, auth);
	const headers = new Headers();
	for (const { key, value } of outgoing.headers) headers.set(key, value);
	const body = toFetchBody(outgoing.body);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), HTTP_REQUEST_TIMEOUT_MS);
	const startedAt = performance.now();
	try {
		const response = await fetch(outgoing.url, { method: outgoing.method, headers, body, redirect: "follow", signal: controller.signal });
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
