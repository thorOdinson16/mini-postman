import { useState } from "react";
import { KeyValueEditor, withRowIds } from "../requests/KeyValueEditor.jsx";

const normalizeVariables = (variables = []) =>
	withRowIds(variables.map((variable) => ({ key: variable.key ?? "", value: variable.value ?? "", enabled: variable.enabled !== false, secret: variable.secret === true, description: variable.description ?? "" })));

export function EnvironmentEditor({ environment = null, onCancel, onSave }) {
	const [name, setName] = useState(environment?.name || "");
	const [variables, setVariables] = useState(() => normalizeVariables(environment?.variables));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const submit = async (event) => {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Enter an environment name.");
			return;
		}
		const cleaned = variables
			.filter((row) => row.key.trim())
			.map((row) => ({ key: row.key.trim(), value: row.value, enabled: row.enabled, secret: row.secret, description: row.description }));
		const keys = cleaned.map((row) => row.key.toLowerCase());
		if (new Set(keys).size !== keys.length) {
			setError("Each variable key must be unique.");
			return;
		}
		try {
			setBusy(true);
			setError("");
			await onSave({ name: trimmed, variables: cleaned });
		} catch (saveError) {
			setError(saveError.message || "The environment could not be saved.");
		} finally {
			setBusy(false);
		}
	};
	return (
		<form className="environment-editor" onSubmit={submit}>
			<div className="outlined-input">
				<input data-autofocus disabled={busy} id="environment-name" maxLength={120} placeholder=" " required value={name} onChange={(event) => setName(event.target.value)} />
				<label htmlFor="environment-name">Name</label>
			</div>
			<KeyValueEditor label="Variables" onChange={setVariables} rows={variables} showDescription showSecret />
			{error && <p className="environment-editor-error" role="alert">{error}</p>}
			<div className="environment-editor-actions">
				<button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
				<button className="environment-editor-submit" disabled={busy} type="submit">{busy ? "Saving…" : environment ? "Save" : "Create"}</button>
			</div>
		</form>
	);
}
