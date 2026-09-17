import { useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

let rowSequence = 0;

export function withRowIds(rows = []) {
	return rows.map((row) => (row.id ? row : { ...row, id: `kv-${rowSequence++}` }));
}

export function newRow({ showSecret = false, showType = false } = {}) {
	return { id: `kv-${rowSequence++}`, key: "", value: "", enabled: true, description: "", ...(showType ? { type: "text" } : {}), ...(showSecret ? { secret: false } : {}) };
}

export function KeyValueEditor({ label, onChange, rows, showDescription = false, showSecret = false, showType = false }) {
	const [revealed, setRevealed] = useState(() => new Set());
	const update = (index, patch) => onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
	const remove = (index) => onChange(rows.filter((unused, position) => position !== index));
	const add = () => onChange([...rows, newRow({ showSecret, showType })]);
	const toggleReveal = (id) => setRevealed((current) => {
		const next = new Set(current);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});
	const rowClass = showSecret && showDescription ? "kv-row-env" : showType ? "kv-row-typed" : "";
	return (
		<section className="kv-editor">
			<div className="kv-editor-heading">
				<h3>{label}</h3>
				<button type="button" onClick={add}><MaterialIcon size={18}>add</MaterialIcon><span>Add</span></button>
			</div>
			{rows.length === 0 ? (
				<p className="kv-editor-empty">No {label.toLowerCase()}.</p>
			) : (
				<ul className="kv-rows">
					{rows.map((row, index) => (
						<li className={`kv-row ${rowClass}`} key={row.id}>
							<label className="kv-toggle"><input type="checkbox" aria-label={`Enable ${label} ${index + 1}`} checked={row.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} /></label>
							<input className="kv-key" aria-label={`${label} key ${index + 1}`} placeholder="Key" value={row.key} onChange={(event) => update(index, { key: event.target.value })} />
							{showSecret ? (
								<span className="kv-value-wrap">
									<input className="kv-value" type={row.secret && !revealed.has(row.id) ? "password" : "text"} aria-label={`${label} value ${index + 1}`} placeholder="Value" value={row.value} onChange={(event) => update(index, { value: event.target.value })} />
									{row.secret && (
										<button type="button" className="kv-reveal" aria-label={revealed.has(row.id) ? "Hide value" : "Show value"} onClick={() => toggleReveal(row.id)}><MaterialIcon size={16}>{revealed.has(row.id) ? "visibility_off" : "visibility"}</MaterialIcon></button>
									)}
								</span>
							) : (
								<input className="kv-value" aria-label={`${label} value ${index + 1}`} placeholder="Value" value={row.value} onChange={(event) => update(index, { value: event.target.value })} />
							)}
							{showType && (
								<select className="kv-type" aria-label={`${label} type ${index + 1}`} value={row.type} onChange={(event) => update(index, { type: event.target.value })}>
									<option value="text">Text</option>
									<option value="file">File</option>
								</select>
							)}
							{showSecret && (
								<button type="button" className="kv-secret" aria-pressed={row.secret} aria-label={row.secret ? "Mark value as not secret" : "Mark value as secret"} onClick={() => update(index, { secret: !row.secret })}><MaterialIcon size={16}>{row.secret ? "lock" : "lock_open"}</MaterialIcon></button>
							)}
							{showDescription && (
								<input className="kv-description" aria-label={`${label} description ${index + 1}`} placeholder="Description" value={row.description} onChange={(event) => update(index, { description: event.target.value })} />
							)}
							<button type="button" className="kv-remove" aria-label={`Remove ${label} ${index + 1}`} onClick={() => remove(index)}><MaterialIcon size={18}>close</MaterialIcon></button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
