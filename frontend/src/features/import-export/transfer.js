const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function downloadJson(content, filename) {
	const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export async function readJsonFile(file) {
	if (file.size > MAX_IMPORT_BYTES) throw new Error("The selected file exceeds the 5 MB limit.");
	const text = await file.text();
	try {
		return JSON.parse(text);
	} catch {
		throw new Error("The selected file is not valid JSON.");
	}
}
