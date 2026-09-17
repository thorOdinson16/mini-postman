import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog.jsx";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { Modal } from "../../shared/components/Modal.jsx";
import { EnvironmentEditor } from "./EnvironmentEditor.jsx";

export function EnvironmentManager({ activeId, environments, error, initialEnvironment = null, initialView = "list", onActivate, onClose, onCreate, onDelete, onUpdate }) {
	const titleId = `environment-manager-${useId().replace(/:/g, "")}`;
	const [view, setView] = useState(initialView);
	const [editing, setEditing] = useState(initialEnvironment);
	const [deleting, setDeleting] = useState(null);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const save = async (values) => {
		if (editing) await onUpdate(editing._id, values);
		else await onCreate(values);
		setView("list");
		setEditing(null);
	};
	const confirmDelete = async () => {
		try {
			setDeleteBusy(true);
			setDeleteError("");
			await onDelete(deleting._id);
			setDeleting(null);
		} catch (deleteRequestError) {
			setDeleteError(deleteRequestError.message);
		} finally {
			setDeleteBusy(false);
		}
	};
	return createPortal(
		<Modal className="environment-manager-modal" labelledBy={titleId} onClose={onClose}>
			<section className="environment-manager">
				{view === "edit" ? (
					<>
						<h2 id={titleId}>{editing ? "Edit environment" : "New environment"}</h2>
						<EnvironmentEditor environment={editing} onCancel={() => { setView("list"); setEditing(null); }} onSave={save} />
					</>
				) : (
					<>
						<div className="environment-manager-head">
							<h2 id={titleId}>Environments</h2>
							<button className="environment-new" type="button" onClick={() => { setEditing(null); setView("edit"); }}><MaterialIcon size={18}>add</MaterialIcon><span>New</span></button>
						</div>
						{error && <p className="environment-manager-error" role="alert">{error}</p>}
						{environments.length === 0 ? (
							<p className="environment-empty">No environments yet.</p>
						) : (
							<ul className="environment-list">
								{environments.map((environment) => {
									const isActive = String(environment._id) === String(activeId);
									return (
										<li className={`environment-item ${isActive ? "active" : ""}`} key={environment._id}>
											<button type="button" className="environment-activate" aria-pressed={isActive} aria-label={`Set ${environment.name} active`} onClick={() => onActivate(environment._id)}><MaterialIcon size={20}>{isActive ? "check_circle" : "radio_button_unchecked"}</MaterialIcon></button>
											<div className="environment-item-body">
												<strong>{environment.name}</strong>
												<span>{environment.variables.length} variable{environment.variables.length === 1 ? "" : "s"}</span>
											</div>
											<button type="button" className="environment-item-action" aria-label={`Edit ${environment.name}`} onClick={() => { setEditing(environment); setView("edit"); }}><MaterialIcon size={18}>edit</MaterialIcon></button>
											<button type="button" className="environment-item-action danger" aria-label={`Delete ${environment.name}`} onClick={() => { setDeleteError(""); setDeleting(environment); }}><MaterialIcon size={18}>delete</MaterialIcon></button>
										</li>
									);
								})}
							</ul>
						)}
						<div className="environment-manager-actions"><button type="button" onClick={onClose}>Done</button></div>
					</>
				)}
			</section>
			{deleting && (
				<ConfirmationDialog
					busy={deleteBusy}
					confirmLabel="Delete"
					error={deleteError}
					message={`"${deleting.name}" will be permanently deleted.`}
					onCancel={() => { if (!deleteBusy) { setDeleting(null); setDeleteError(""); } }}
					onConfirm={confirmDelete}
					title="Delete environment?"
				/>
			)}
		</Modal>,
		document.body,
	);
}
