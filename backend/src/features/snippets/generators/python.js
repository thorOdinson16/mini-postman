import { headerLiteral, literal } from "./format.js";

function bodyParts(body) {
	if (!body) return { lines: [], args: [] };
	if (body.kind === "raw") return { lines: [`data = ${literal(body.value)}`], args: ["data=data"] };
	if (body.kind === "urlEncoded") {
		const pairs = body.pairs.map(([key, value]) => `(${literal(key)}, ${literal(value)})`).join(", ");
		return { lines: [`data = [${pairs}]`], args: ["data=data"] };
	}
	if (body.kind === "formData") {
		const fields = body.fields.map(([key, value]) => `(${literal(key)}, (None, ${literal(value)}))`).join(", ");
		return { lines: [`files = [${fields}]`], args: ["files=files"] };
	}
	return { lines: [], args: [] };
}

export function pythonSnippet(outgoing) {
	const { lines: bodyLines, args } = bodyParts(outgoing.body);
	const lines = ["import requests", "", `headers = ${headerLiteral(outgoing.headers, "    ", "")}`, ...bodyLines, ""];
	const extra = args.length ? `, ${args.join(", ")}` : "";
	lines.push(`response = requests.request(${literal(outgoing.method)}, ${literal(outgoing.url)}, headers=headers${extra})`);
	lines.push("print(response.status_code)");
	lines.push("print(response.text)");
	return lines.join("\n");
}
