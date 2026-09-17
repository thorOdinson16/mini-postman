const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function buildVariableMap(variables = []) {
	const map = new Map();
	for (const variable of variables) {
		if (variable && variable.enabled !== false && variable.key) {
			map.set(String(variable.key).trim(), String(variable.value ?? ""));
		}
	}
	return map;
}

function resolveTemplate(value, variableMap) {
	if (typeof value !== "string" || !value.includes("{{")) return value;
	return value.replace(PLACEHOLDER, (match, key) => (variableMap.has(key) ? variableMap.get(key) : match));
}

function plain(value) {
	return value?.toObject ? value.toObject() : { ...(value ?? {}) };
}

function resolveKeyValue(rows, variableMap) {
	return (rows || []).map((row) => {
		const value = plain(row);
		return {
			...value,
			key: resolveTemplate(value.key ?? "", variableMap),
			value: resolveTemplate(value.value ?? "", variableMap),
			description: resolveTemplate(value.description ?? "", variableMap),
		};
	});
}

function resolveBody(body, variableMap) {
	const value = plain(body);
	return {
		mode: value.mode ?? "none",
		raw: resolveTemplate(value.raw ?? "", variableMap),
		formData: (value.formData || []).map((field) => {
			const item = plain(field);
			return { ...item, key: resolveTemplate(item.key ?? "", variableMap), value: resolveTemplate(item.value ?? "", variableMap) };
		}),
		urlEncoded: resolveKeyValue(value.urlEncoded || [], variableMap),
	};
}

export function resolveAuth(auth, variableMap) {
	const value = plain(auth);
	return {
		type: value.type ?? "none",
		bearer: { token: resolveTemplate(value.bearer?.token ?? "", variableMap) },
		basic: {
			username: resolveTemplate(value.basic?.username ?? "", variableMap),
			password: resolveTemplate(value.basic?.password ?? "", variableMap),
		},
		apiKey: {
			key: resolveTemplate(value.apiKey?.key ?? "", variableMap),
			value: resolveTemplate(value.apiKey?.value ?? "", variableMap),
			addTo: value.apiKey?.addTo ?? "header",
		},
	};
}

export function resolveRequestParts(request, variableMap) {
	return {
		method: request.method,
		rawUrl: request.url ?? "",
		url: resolveTemplate(request.url ?? "", variableMap),
		queryParams: resolveKeyValue(request.queryParams || [], variableMap),
		headers: resolveKeyValue(request.headers || [], variableMap),
		body: resolveBody(request.body, variableMap),
		auth: resolveAuth(request.auth, variableMap),
	};
}
