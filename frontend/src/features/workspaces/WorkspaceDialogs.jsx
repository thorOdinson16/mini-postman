import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog.jsx";
import { CollectionEditor } from "../collections/CollectionEditor.jsx";

export function WorkspaceDialogs({ state }) {
	return (
		<>
			{state.editor && (
				<CollectionEditor
					collection={state.editor.mode === "edit" ? state.editor.workspace : null}
					kind="workspace"
					onClose={state.closeEditor}
					onSave={state.save}
				/>
			)}
			{state.deleting && (
				<ConfirmationDialog
					busy={state.busy}
					confirmLabel="Delete"
					error={state.actionError}
					message={`"${state.deleting.name}" and everything inside it will be permanently deleted.`}
					onCancel={state.cancelDelete}
					onConfirm={state.confirmDelete}
					title="Delete workspace?"
				/>
			)}
		</>
	);
}
