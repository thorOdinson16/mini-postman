import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

const parseJson = (text) => {
	if (!text) return { value: null, isJson: false };
	try {
		return { value: JSON.parse(text), isJson: true };
	} catch {
		return { value: null, isJson: false };
	}
};

const isPrimitive = (value) => value === null || typeof value !== "object";
const formatValue = (value) => {
	if (value === null) return "null";
	if (typeof value === "string") return JSON.stringify(value);
	return String(value);
};
const valueType = (value) => (value === null ? "null" : typeof value);

function highlight(text, query) {
	const source = String(text);
	if (!query) return source;
	const lower = source.toLowerCase();
	const needle = query.toLowerCase();
	const parts = [];
	let index = 0;
	let count = 0;
	while (index < source.length) {
		const found = lower.indexOf(needle, index);
		if (found === -1) {
			parts.push(source.slice(index));
			break;
		}
		if (found > index) parts.push(source.slice(index, found));
		parts.push(<mark key={`m${count}`} className="body-match">{source.slice(found, found + needle.length)}</mark>);
		count += 1;
		index = found + needle.length;
	}
	return parts;
}

function collectMatches(value, query) {
	const matches = [];
	if (!query) return matches;
	const needle = query.toLowerCase();
	const walk = (node, path) => {
		if (Array.isArray(node)) {
			node.forEach((item, index) => {
				const childPath = `${path}[${index}]`;
				if (isPrimitive(item)) {
					if (String(item).toLowerCase().includes(needle)) matches.push(childPath);
				} else {
					walk(item, childPath);
				}
			});
		} else if (node && typeof node === "object") {
			for (const [key, item] of Object.entries(node)) {
				const childPath = `${path}.${key}`;
				const keyMatch = key.toLowerCase().includes(needle);
				const valueMatch = isPrimitive(item) && String(item).toLowerCase().includes(needle);
				if (keyMatch || valueMatch) matches.push(childPath);
				if (!isPrimitive(item)) walk(item, childPath);
			}
		}
	};
	walk(value, "$");
	return matches;
}

function collectContainerPaths(value, path = "$", list = []) {
	if (Array.isArray(value)) {
		list.push(path);
		value.forEach((item, index) => collectContainerPaths(item, `${path}[${index}]`, list));
	} else if (value && typeof value === "object") {
		list.push(path);
		for (const [key, item] of Object.entries(value)) collectContainerPaths(item, `${path}.${key}`, list);
	}
	return list;
}

function countOccurrences(text, query) {
	if (!query) return 0;
	const lower = text.toLowerCase();
	const needle = query.toLowerCase();
	let count = 0;
	let index = 0;
	while ((index = lower.indexOf(needle, index)) !== -1) {
		count += 1;
		index += needle.length;
	}
	return count;
}

function JsonTree({ activeMatch, collapsed, data, matches, onToggle, query }) {
	const matchOrder = useMemo(() => new Map(matches.map((path, index) => [path, index])), [matches]);
	const renderNode = (name, value, path, depth) => {
		const indent = { paddingLeft: `${depth * 18}px` };
		const matchIndex = matchOrder.has(path) ? matchOrder.get(path) : null;
		const rowClass = `json-row ${matchIndex !== null ? "json-match" : ""} ${matchIndex !== null && matchIndex === activeMatch ? "json-match-active" : ""}`;
		if (isPrimitive(value)) {
			return (
				<div className={rowClass} key={path} style={indent} data-match={matchIndex !== null ? matchIndex : undefined}>
					<span className="json-toggle-spacer" aria-hidden="true" />
					{name !== undefined && <><span className="json-key">{highlight(name, query)}</span><span className="json-punct">: </span></>}
					<span className={`json-value json-value-${valueType(value)}`}>{highlight(formatValue(value), query)}</span>
				</div>
			);
		}
		const isArray = Array.isArray(value);
		const entries = isArray ? value.map((item, index) => [index, item]) : Object.entries(value);
		const expanded = query ? true : !collapsed.has(path);
		const open = isArray ? "[" : "{";
		const close = isArray ? "]" : "}";
		return (
			<div className="json-node" key={path}>
				<div className={rowClass} style={indent} data-match={matchIndex !== null ? matchIndex : undefined}>
					<button type="button" className={`json-toggle ${expanded ? "expanded" : ""}`} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${name ?? (isArray ? "array" : "object")}`} onClick={() => onToggle(path)}><MaterialIcon size={16}>chevron_right</MaterialIcon></button>
					{name !== undefined && <><span className="json-key">{highlight(name, query)}</span><span className="json-punct">: </span></>}
					<span className="json-punct">{open}</span>
					{!expanded && <span className="json-summary">{entries.length} {entries.length === 1 ? "item" : "items"}</span>}
					{(!expanded || entries.length === 0) && <span className="json-punct">{close}</span>}
				</div>
				{expanded && entries.length > 0 && (
					<>
						{entries.map(([key, item]) => renderNode(isArray ? undefined : key, item, isArray ? `${path}[${key}]` : `${path}.${key}`, depth + 1))}
						<div className="json-row json-close" style={{ paddingLeft: `${depth * 18 + 18}px` }}><span className="json-punct">{close}</span></div>
					</>
				)}
			</div>
		);
	};
	return <div className="json-tree">{renderNode(undefined, data, "$", 0)}</div>;
}

export function ResponseBody({ body }) {
	const { value, isJson } = useMemo(() => parseJson(body), [body]);
	const [view, setView] = useState(isJson ? "tree" : "raw");
	const [query, setQuery] = useState("");
	const [activeMatch, setActiveMatch] = useState(0);
	const [collapsed, setCollapsed] = useState(() => new Set());
	const containerReference = useRef(null);
	const treeMatches = useMemo(() => (isJson && view === "tree" && query ? collectMatches(value, query) : []), [isJson, query, value, view]);
	const rawCount = useMemo(() => (view === "raw" || !isJson ? countOccurrences(body, query) : 0), [body, isJson, query, view]);
	const matchCount = view === "tree" && isJson ? treeMatches.length : rawCount;
	useEffect(() => {
		setView(isJson ? "tree" : "raw");
		setQuery("");
		setActiveMatch(0);
		setCollapsed(new Set());
	}, [body, isJson]);
	useEffect(() => {
		setActiveMatch(0);
	}, [query, view]);
	useEffect(() => {
		const container = containerReference.current;
		if (!container || !query) return;
		const node = container.querySelector(`[data-match="${activeMatch}"]`) || container.querySelector(`[data-raw-match="${activeMatch}"]`);
		node?.scrollIntoView({ block: "nearest" });
	}, [activeMatch, query, view, treeMatches]);
	const move = (direction) => {
		if (!matchCount) return;
		setActiveMatch((current) => (current + direction + matchCount) % matchCount);
	};
	const rawNodes = useMemo(() => {
		if (!query) return body;
		const lower = body.toLowerCase();
		const needle = query.toLowerCase();
		const parts = [];
		let index = 0;
		let occurrence = 0;
		while (index < body.length) {
			const found = lower.indexOf(needle, index);
			if (found === -1) {
				parts.push(body.slice(index));
				break;
			}
			if (found > index) parts.push(body.slice(index, found));
			const current = occurrence;
			parts.push(<mark key={`m${current}`} className="body-match" data-raw-match={current}>{body.slice(found, found + needle.length)}</mark>);
			occurrence += 1;
			index = found + needle.length;
		}
		return parts;
	}, [body, query]);
	return (
		<div className="response-body">
			<div className="response-body-toolbar">
				<div className="body-search">
					<MaterialIcon size={16}>search</MaterialIcon>
					<input aria-label="Search response body" placeholder="Search body" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); move(event.shiftKey ? -1 : 1); } else if (event.key === "Escape") setQuery(""); }} />
					{query && <span className="body-search-count" aria-live="polite">{matchCount ? `${activeMatch + 1}/${matchCount}` : "0/0"}</span>}
					{query && <button type="button" aria-label="Previous match" onClick={() => move(-1)}><MaterialIcon size={16}>arrow_upward</MaterialIcon></button>}
					{query && <button type="button" aria-label="Next match" onClick={() => move(1)}><MaterialIcon size={16}>arrow_downward</MaterialIcon></button>}
					{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><MaterialIcon size={16}>close</MaterialIcon></button>}
				</div>
				<div className="body-view-actions">
					{isJson && (
						<div className="view-toggle">
							<button type="button" className={view === "tree" ? "active" : ""} onClick={() => setView("tree")}>Tree</button>
							<button type="button" className={view === "raw" ? "active" : ""} onClick={() => setView("raw")}>Raw</button>
						</div>
					)}
					{isJson && view === "tree" && (
						<>
							<button type="button" className="body-tree-action" onClick={() => setCollapsed(new Set())}>Expand all</button>
							<button type="button" className="body-tree-action" onClick={() => setCollapsed(new Set(collectContainerPaths(value)))}>Collapse all</button>
						</>
					)}
				</div>
			</div>
			<div className="response-body-content" ref={containerReference}>
				{isJson && view === "tree" ? (
					<JsonTree activeMatch={activeMatch} collapsed={collapsed} data={value} matches={treeMatches} onToggle={(path) => setCollapsed((current) => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; })} query={query} />
				) : (
					<pre className="response-code">{rawNodes}</pre>
				)}
			</div>
		</div>
	);
}
