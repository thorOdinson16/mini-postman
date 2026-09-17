import { shellQuote } from "./format.js";

export function curlSnippet(outgoing) {
	const lines = [`curl -X ${outgoing.method} ${shellQuote(outgoing.url)}`];
	for (const { key, value } of outgoing.headers) lines.push(`-H ${shellQuote(`${key}: ${value}`)}`);
	if (outgoing.body?.kind === "raw") lines.push(`--data-raw ${shellQuote(outgoing.body.value)}`);
	else if (outgoing.body?.kind === "urlEncoded") for (const [key, value] of outgoing.body.pairs) lines.push(`--data-urlencode ${shellQuote(`${key}=${value}`)}`);
	else if (outgoing.body?.kind === "formData") for (const [key, value] of outgoing.body.fields) lines.push(`-F ${shellQuote(`${key}=${value}`)}`);
	return lines.join(" \\\n  ");
}
