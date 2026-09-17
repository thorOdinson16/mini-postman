import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";

export function KeyValueEditor({ label, onChange, rows, showType = false }) {
	const update = (index, patch) => onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
	const remove = (index) => onChange(rows.filter((unused, position) => position !== index));
	const add = () => onChange([...rows, showType ? { key: "", value: "", type: "text", enabled: true, description: "" } : { key: "", value: "", enabled: true, description: "" }]);
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
						<li className={`kv-row ${showType ? "kv-row-typed" : ""}`} key={index}>
							<label className="kv-toggle"><input type="checkbox" aria-label={`Enable ${label} ${index + 1}`} checked={row.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} /></label>
							<input className="kv-key" aria-label={`${label} key ${index + 1}`} placeholder="Key" value={row.key} onChange={(event) => update(index, { key: event.target.value })} />
							<input className="kv-value" aria-label={`${label} value ${index + 1}`} placeholder="Value" value={row.value} onChange={(event) => update(index, { value: event.target.value })} />
							{showType && (
								<select className="kv-type" aria-label={`${label} type ${index + 1}`} value={row.type} onChange={(event) => update(index, { type: event.target.value })}>
									<option value="text">Text</option>
									<option value="file">File</option>
								</select>
							)}
							<button type="button" className="kv-remove" aria-label={`Remove ${label} ${index + 1}`} onClick={() => remove(index)}><MaterialIcon size={18}>close</MaterialIcon></button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
