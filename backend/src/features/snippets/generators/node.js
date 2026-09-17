import { bodyExpression, headerLiteral, literal } from "./format.js";

export function nodeSnippet(outgoing) {
	const lines = [];
	const body = bodyExpression(outgoing.body, lines, "\t");
	const options = [`\t\tmethod: ${literal(outgoing.method)}`, `\t\theaders: ${headerLiteral(outgoing.headers, "\t\t\t", "\t\t")}`];
	if (body) options.push(`\t\tbody: ${body}`);
	lines.push("async function main() {");
	lines.push(`\tconst response = await fetch(${literal(outgoing.url)}, {`);
	lines.push(`${options.join(",\n")},`);
	lines.push("\t});");
	lines.push("\tconst text = await response.text();");
	lines.push("\tconsole.log(response.status, text);");
	lines.push("}");
	lines.push("");
	lines.push("main();");
	return lines.join("\n");
}
