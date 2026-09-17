import { useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { SelectMenu } from "../../shared/components/SelectMenu.jsx";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => ({ value: method, label: method }));
const normalizeRows = (rows = []) => rows.map((row) => ({ key: row.key ?? "", value: row.value ?? "", enabled: row.enabled !== false, description: row.description ?? "" }));

function KeyValueEditor({ label, onChange, rows }) {
	const update = (index, patch) => onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
	const remove = (index) => onChange(rows.filter((unused, position) => position !== index));
	const add = () => onChange([...rows, { key: "", value: "", enabled: true, description: "" }]);
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
						<li className="kv-row" key={index}>
							<label className="kv-toggle"><input type="checkbox" aria-label={`Enable ${label} ${index + 1}`} checked={row.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} /></label>
							<input className="kv-key" aria-label={`${label} key ${index + 1}`} placeholder="Key" value={row.key} onChange={(event) => update(index, { key: event.target.value })} />
							<input className="kv-value" aria-label={`${label} value ${index + 1}`} placeholder="Value" value={row.value} onChange={(event) => update(index, { value: event.target.value })} />
							<button type="button" className="kv-remove" aria-label={`Remove ${label} ${index + 1}`} onClick={() => remove(index)}><MaterialIcon size={18}>close</MaterialIcon></button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function RequestEditor({ onSave, request }) {
	const initial = { name: request.name ?? "", method: request.method ?? "GET", url: request.url ?? "", queryParams: normalizeRows(request.queryParams), headers: normalizeRows(request.headers) };
	const [form, setForm] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);
	const update = (patch) => {
		setSaved(false);
		setForm((current) => ({ ...current, ...patch }));
	};
	const dirty = JSON.stringify(form) !== JSON.stringify(initial);
	const save = async (event) => {
		event.preventDefault();
		const payload = {
			name: form.name.trim() || "Untitled request",
			method: form.method,
			url: form.url.trim(),
			queryParams: form.queryParams.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
			headers: form.headers.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
		};
		try {
			setSaving(true);
			setError("");
			setSaved(false);
			await onSave(payload);
			setSaved(true);
		} catch (saveError) {
			setError(saveError.message || "The request could not be saved.");
		} finally {
			setSaving(false);
		}
	};
	return (
		<form className="request-editor" onSubmit={save}>
			<div className="request-editor-top">
				<input className="request-name-input" aria-label="Request name" maxLength={160} placeholder="Request name" value={form.name} onChange={(event) => update({ name: event.target.value })} />
				{error && <p className="request-editor-error" role="alert">{error}</p>}
				{saved && !dirty && <p className="request-editor-saved" role="status">Saved</p>}
				<button className="request-save" type="submit" disabled={saving || !dirty}>{saving ? "Saving…" : "Save"}</button>
			</div>
			<div className="request-editor-bar">
				<SelectMenu ariaLabel="HTTP method" className="method-select" onChange={(method) => update({ method })} options={METHODS} value={form.method} />
				<input className="request-url-input" aria-label="Request URL" placeholder="Enter a request URL" spellCheck={false} value={form.url} onChange={(event) => update({ url: event.target.value })} />
			</div>
			<div className="request-editor-panels">
				<KeyValueEditor label="Query Params" onChange={(queryParams) => update({ queryParams })} rows={form.queryParams} />
				<KeyValueEditor label="Headers" onChange={(headers) => update({ headers })} rows={form.headers} />
			</div>
		</form>
	);
}
