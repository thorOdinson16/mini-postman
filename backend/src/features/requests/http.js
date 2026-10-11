import net from "node:net";
import { getConfig } from "../../shared/config/index.js";
import { HTTP_MAX_REDIRECTS, HTTP_MAX_RESPONSE_BYTES, HTTP_REQUEST_TIMEOUT_MS } from "../../shared/constants/http.js";
import { resolveDestination } from "../../shared/utils/destination-guard.js";
import { buildOutgoingRequest } from "./outgoing.js";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization"];

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

function sendPinned(fetchImpl, destination, init) {
	const target = new URL(destination.url);
	target.hostname = net.isIPv6(destination.address) ? `[${destination.address}]` : destination.address;
	const headers = new Headers(init.headers);
	if (!headers.has("host")) headers.set("host", destination.url.host);
	const tls = net.isIP(destination.hostname) ? undefined : { serverName: destination.hostname };
	return fetchImpl(target.toString(), { ...init, headers, tls });
}

function nextHop(response, from, method, body, headers) {
	const location = response.headers.get("location");
	if (!REDIRECT_STATUSES.has(response.status) || !location) return null;
	const url = new URL(location, from).toString();
	const switchToGet = response.status === 303 || ((response.status === 301 || response.status === 302) && method === "POST");
	const nextHeaders = new Headers(headers);
	if (new URL(url).origin !== new URL(from).origin) {
		for (const name of CREDENTIAL_HEADERS) nextHeaders.delete(name);
	}
	if (switchToGet) {
		nextHeaders.delete("content-type");
		return { url, method: "GET", body: undefined, headers: nextHeaders };
	}
	return { url, method, body, headers: nextHeaders };
}

export async function executeRequest(resolved, auth, options = {}) {
	const outgoing = buildOutgoingRequest(resolved, auth);
	const fetchImpl = options.fetchImpl ?? fetch;
	const guardOptions = {
		allowPrivate: options.allowPrivate ?? getConfig().allowPrivateDestinations,
		...(options.lookup ? { lookup: options.lookup } : {}),
	};
	let destination = await resolveDestination(outgoing.url, guardOptions);
	let hop = { url: outgoing.url, method: outgoing.method, body: toFetchBody(outgoing.body), headers: new Headers() };
	for (const { key, value } of outgoing.headers) hop.headers.set(key, value);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), HTTP_REQUEST_TIMEOUT_MS);
	const startedAt = performance.now();
	try {
		let response = await sendPinned(fetchImpl, destination, { method: hop.method, headers: hop.headers, body: hop.body, redirect: "manual", signal: controller.signal });
		for (let redirects = 0; ; redirects += 1) {
			const next = nextHop(response, hop.url, hop.method, hop.body, hop.headers);
			if (!next) break;
			if (redirects >= HTTP_MAX_REDIRECTS) throw new Error(`The request was redirected more than ${HTTP_MAX_REDIRECTS} times.`);
			destination = await resolveDestination(next.url, guardOptions);
			hop = next;
			response = await sendPinned(fetchImpl, destination, { method: hop.method, headers: hop.headers, body: hop.body, redirect: "manual", signal: controller.signal });
		}
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
