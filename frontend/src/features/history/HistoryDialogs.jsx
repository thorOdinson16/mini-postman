import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog.jsx";
import { SaveToCollectionDialog } from "./SaveToCollectionDialog.jsx";

export function HistoryDialogs({ collections, state }) {
	return (
		<>
			{state.saving && (
				<SaveToCollectionDialog
					collections={collections}
					defaultName={`${state.saving.request.method} ${state.saving.request.rawUrl || state.saving.request.url}`.slice(0, 160)}
					onClose={state.closeSave}
					onSave={(payload) => state.save(state.saving, payload)}
				/>
			)}
			{state.deleting && (
				<ConfirmationDialog
					busy={state.busy}
					confirmLabel="Delete"
					error={state.actionError}
					message="This history entry will be permanently deleted."
					onCancel={state.cancelDelete}
					onConfirm={state.confirmDelete}
					title="Delete history entry?"
				/>
			)}
			{state.clearOpen && (
				<ConfirmationDialog
					busy={state.busy}
					confirmLabel="Clear"
					error={state.actionError}
					message="All history for this workspace will be permanently deleted."
					onCancel={state.cancelClear}
					onConfirm={state.confirmClear}
					title="Clear history?"
				/>
			)}
		</>
	);
}
