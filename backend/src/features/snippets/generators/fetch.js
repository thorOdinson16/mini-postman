import { bodyExpression, headerLiteral, literal } from "./format.js";

export function fetchSnippet(outgoing) {
	const lines = [];
	const body = bodyExpression(outgoing.body, lines);
	const options = [`method: ${literal(outgoing.method)}`, `headers: ${headerLiteral(outgoing.headers)}`];
	if (body) options.push(`body: ${body}`);
	lines.push(`const response = await fetch(${literal(outgoing.url)}, {`);
	lines.push(`  ${options.join(",\n  ")},`);
	lines.push("});");
	lines.push("const text = await response.text();");
	lines.push("console.log(response.status, text);");
	return lines.join("\n");
}
