export function shellQuote(value) {
	return `'${String(value).replace(/'/g, "'\\''")}'`;
}

export function literal(value) {
	return JSON.stringify(String(value));
}

export function headerLiteral(headers, entryIndent = "    ", closeIndent = "  ") {
	const entries = headers.map(({ key, value }) => `${entryIndent}${literal(key)}: ${literal(value)},`);
	return `{\n${entries.join("\n")}\n${closeIndent}}`;
}

export function bodyExpression(body, lines, indent = "") {
	if (!body) return null;
	if (body.kind === "raw") return literal(body.value);
	if (body.kind === "urlEncoded") {
		const pairs = body.pairs.map(([key, value]) => `[${literal(key)}, ${literal(value)}]`).join(", ");
		return `new URLSearchParams([${pairs}])`;
	}
	if (body.kind === "formData") {
		lines.push(`${indent}const formData = new FormData();`);
		for (const [key, value] of body.fields) lines.push(`${indent}formData.append(${literal(key)}, ${literal(value)});`);
		return "formData";
	}
	return null;
}
