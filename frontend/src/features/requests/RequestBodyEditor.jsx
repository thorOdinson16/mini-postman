import { useState } from "react";
import { SelectMenu } from "../../shared/components/SelectMenu.jsx";
import { KeyValueEditor } from "./KeyValueEditor.jsx";

const MODES = [
	{ value: "none", label: "None" },
	{ value: "json", label: "JSON" },
	{ value: "text", label: "Text" },
	{ value: "urlEncoded", label: "Form URL Encoded" },
	{ value: "formData", label: "Form Data" },
];

export function RequestBodyEditor({ body, onChange }) {
	const [jsonError, setJsonError] = useState("");
	const set = (patch) => onChange({ ...body, ...patch });
	const validity = (() => {
		if (body.mode !== "json" || !body.raw.trim()) return "";
		try {
			JSON.parse(body.raw);
			return "valid";
		} catch {
			return "invalid";
		}
	})();
	const format = () => {
		try {
			set({ raw: JSON.stringify(JSON.parse(body.raw || ""), null, 2) });
			setJsonError("");
		} catch (error) {
			setJsonError(error.message);
		}
	};
	return (
		<section className="body-editor">
			<div className="body-editor-bar">
				<SelectMenu ariaLabel="Body mode" className="body-mode-select" onChange={(mode) => { setJsonError(""); set({ mode }); }} options={MODES} value={body.mode} />
				{body.mode === "json" && (
					<>
						<span className={`body-json-status ${validity}`} role="status">{validity === "valid" ? "Valid JSON" : validity === "invalid" ? "Invalid JSON" : ""}</span>
						<button type="button" className="body-format" disabled={!body.raw.trim()} onClick={format}>Format</button>
					</>
				)}
			</div>
			{body.mode === "json" || body.mode === "text" ? (
				<textarea
					className="body-raw"
					aria-label="Request body"
					placeholder={body.mode === "json" ? '{\n  "key": "value"\n}' : "Enter request body"}
					spellCheck={false}
					value={body.raw}
					onChange={(event) => { setJsonError(""); set({ raw: event.target.value }); }}
				/>
			) : body.mode === "urlEncoded" ? (
				<KeyValueEditor label="Form URL Encoded" onChange={(urlEncoded) => set({ urlEncoded })} rows={body.urlEncoded} />
			) : body.mode === "formData" ? (
				<KeyValueEditor label="Form Data" onChange={(formData) => set({ formData })} rows={body.formData} showType />
			) : (
				<p className="body-empty">This request has no body.</p>
			)}
			{jsonError && <p className="body-json-error" role="alert">{jsonError}</p>}
		</section>
	);
}
