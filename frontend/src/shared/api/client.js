const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
let sessionToken = localStorage.getItem("postman-session-token") || "";

export function setSessionToken(token) {
	sessionToken = token || "";
	if (sessionToken) localStorage.setItem("postman-session-token", sessionToken);
	else localStorage.removeItem("postman-session-token");
}

export const hasSessionToken = () => Boolean(sessionToken);

export async function request(path, options = {}) {
	const response = await fetch(`${baseUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
			...options.headers,
		},
	});
	if (response.status === 204) return null;
	const contentType = response.headers?.get?.("content-type") || "";
	const payload = contentType.includes("application/json") || !response.headers ? await response.json() : null;
	if (!response.ok) {
		const code = payload?.error?.code;
		const message = payload?.error?.message || `Postman service returned ${response.status}.`;
		if (response.status === 401 && ["AUTH_REQUIRED", "INVALID_TOKEN", "ACCOUNT_UNAVAILABLE"].includes(code)) {
			setSessionToken("");
			window.dispatchEvent(new CustomEvent("postman-session-expired", { detail: message }));
		}
		throw new Error(message);
	}
	if (!payload || !("data" in payload)) throw new Error("Postman service returned an invalid response.");
	return payload.data;
}
