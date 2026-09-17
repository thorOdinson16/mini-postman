import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/components/Modal.jsx";

export function CollectionEditor({ collection = null, onClose, onSave }) {
	const titleId = `collection-editor-${useId().replace(/:/g, "")}`;
	const [name, setName] = useState(collection?.name || "");
	const [description, setDescription] = useState(collection?.description || "");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const editing = Boolean(collection);
	const submit = async (event) => {
		event.preventDefault();
		const values = { name: name.trim(), description: description.trim() };
		if (!values.name) {
			setError("Enter a collection name.");
			return;
		}
		try {
			setBusy(true);
			setError("");
			await onSave(values);
		} catch (saveError) {
			setError(saveError.message || "The collection could not be saved.");
		} finally {
			setBusy(false);
		}
	};
	return createPortal(
		<Modal className="collection-editor-modal" labelledBy={titleId} onClose={() => { if (!busy) onClose(); }}>
			<section className="collection-editor">
				<h2 id={titleId}>{editing ? "Rename collection" : "New collection"}</h2>
				<form onSubmit={submit}>
					<div className="outlined-input">
						<input data-autofocus disabled={busy} id="collection-name" maxLength={120} placeholder=" " required value={name} onChange={(event) => setName(event.target.value)} />
						<label htmlFor="collection-name">Name</label>
					</div>
					<div className="outlined-input">
						<textarea disabled={busy} id="collection-description" maxLength={1000} placeholder=" " rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
						<label htmlFor="collection-description">Description</label>
					</div>
					{error && <p className="collection-editor-error" role="alert">{error}</p>}
					<footer>
						<button disabled={busy} type="button" onClick={onClose}>Cancel</button>
						<button className="collection-editor-submit" disabled={busy} type="submit">{busy ? "Saving…" : editing ? "Save" : "Create"}</button>
					</footer>
				</form>
			</section>
		</Modal>,
		document.body,
	);
}
