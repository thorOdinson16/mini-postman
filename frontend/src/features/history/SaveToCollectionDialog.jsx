import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { buildFolderTree } from "../collections/collection-tree.js";
import { Modal } from "../../shared/components/Modal.jsx";
import { SelectMenu } from "../../shared/components/SelectMenu.jsx";

function folderOptions(collection) {
	const options = [{ value: "", label: "Collection root" }];
	if (!collection) return options;
	const walk = (nodes, depth) => {
		for (const { folder, children } of nodes) {
			options.push({ value: String(folder._id), label: `${"— ".repeat(depth)}${folder.name}` });
			walk(children, depth + 1);
		}
	};
	walk(buildFolderTree(collection.folders), 0);
	return options;
}

export function SaveToCollectionDialog({ collections, defaultName = "", onClose, onSave }) {
	const titleId = `save-to-collection-${useId().replace(/:/g, "")}`;
	const [name, setName] = useState(defaultName);
	const [collectionId, setCollectionId] = useState(collections[0] ? String(collections[0]._id) : "");
	const [folderId, setFolderId] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const collection = collections.find((item) => String(item._id) === collectionId);
	const submit = async (event) => {
		event.preventDefault();
		if (!name.trim()) {
			setError("Enter a request name.");
			return;
		}
		if (!collectionId) {
			setError("Choose a collection.");
			return;
		}
		try {
			setBusy(true);
			setError("");
			await onSave({ name: name.trim(), collectionId, folderId: folderId || null });
		} catch (saveError) {
			setError(saveError.message || "The request could not be saved.");
		} finally {
			setBusy(false);
		}
	};
	return createPortal(
		<Modal className="save-request-modal" labelledBy={titleId} onClose={() => { if (!busy) onClose(); }}>
			<section className="save-request">
				<h2 id={titleId}>Save to collection</h2>
				{collections.length === 0 ? (
					<p className="save-request-empty">Create a collection first, then save this request into it.</p>
				) : (
					<form onSubmit={submit}>
						<div className="outlined-input">
							<input data-autofocus disabled={busy} id="save-request-name" maxLength={160} placeholder=" " required value={name} onChange={(event) => setName(event.target.value)} />
							<label htmlFor="save-request-name">Name</label>
						</div>
						<div className="save-request-field"><span>Collection</span><SelectMenu ariaLabel="Collection" disabled={busy} onChange={(value) => { setCollectionId(value); setFolderId(""); }} options={collections.map((item) => ({ value: String(item._id), label: item.name }))} value={collectionId} /></div>
						<div className="save-request-field"><span>Folder</span><SelectMenu ariaLabel="Folder" disabled={busy} onChange={setFolderId} options={folderOptions(collection)} value={folderId} /></div>
						{error && <p className="save-request-error" role="alert">{error}</p>}
						<div className="save-request-actions">
							<button type="button" disabled={busy} onClick={onClose}>Cancel</button>
							<button className="save-request-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
						</div>
					</form>
				)}
			</section>
		</Modal>,
		document.body,
	);
}
