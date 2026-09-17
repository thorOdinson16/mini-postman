import { useState } from "react";
import { SelectMenu } from "../../shared/components/SelectMenu.jsx";
import { KeyValueEditor } from "./KeyValueEditor.jsx";
import { RequestAuthEditor } from "./RequestAuthEditor.jsx";
import { RequestBodyEditor } from "./RequestBodyEditor.jsx";
import { ResponseViewer } from "./ResponseViewer.jsx";
import { requestApi } from "./request.api.js";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => ({ value: method, label: method }));
const normalizeRows = (rows = []) => rows.map((row) => ({ key: row.key ?? "", value: row.value ?? "", enabled: row.enabled !== false, description: row.description ?? "" }));
const normalizeBody = (body) => ({
	mode: body?.mode ?? "none",
	raw: body?.raw ?? "",
	formData: (body?.formData ?? []).map((field) => ({ key: field.key ?? "", value: field.value ?? "", type: field.type === "file" ? "file" : "text", enabled: field.enabled !== false, description: field.description ?? "" })),
	urlEncoded: normalizeRows(body?.urlEncoded),
});
const normalizeAuth = (auth) => ({
	type: auth?.type ?? "none",
	bearer: { token: auth?.bearer?.token ?? "" },
	basic: { username: auth?.basic?.username ?? "", password: auth?.basic?.password ?? "" },
	apiKey: { key: auth?.apiKey?.key ?? "", value: auth?.apiKey?.value ?? "", addTo: auth?.apiKey?.addTo === "query" ? "query" : "header" },
});
const activeCount = (rows) => rows.filter((row) => row.enabled !== false && row.key.trim()).length;

export function RequestEditor({ onSave, request }) {
	const initial = {
		name: request.name ?? "",
		method: request.method ?? "GET",
		url: request.url ?? "",
		queryParams: normalizeRows(request.queryParams),
		headers: normalizeRows(request.headers),
		body: normalizeBody(request.body),
		auth: normalizeAuth(request.auth),
	};
	const [form, setForm] = useState(initial);
	const [tab, setTab] = useState("params");
	const [saving, setSaving] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);
	const [sendResult, setSendResult] = useState(null);
	const [sendError, setSendError] = useState("");
	const update = (patch) => {
		setSaved(false);
		setSendError("");
		setSendResult(null);
		setForm((current) => ({ ...current, ...patch }));
	};
	const dirty = JSON.stringify(form) !== JSON.stringify(initial);
	const buildPayload = () => ({
		name: form.name.trim() || "Untitled request",
		method: form.method,
		url: form.url.trim(),
		queryParams: form.queryParams.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
		headers: form.headers.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
		body: {
			mode: form.body.mode,
			raw: form.body.raw,
			formData: form.body.formData.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
			urlEncoded: form.body.urlEncoded.filter((row) => row.key.trim()).map((row) => ({ ...row, key: row.key.trim() })),
		},
		auth: form.auth,
	});
	const tabs = [
		{ id: "params", label: "Params", count: activeCount(form.queryParams) },
		{ id: "headers", label: "Headers", count: activeCount(form.headers) },
		{ id: "body", label: "Body" },
		{ id: "auth", label: "Auth" },
	];
	const save = async (event) => {
		event.preventDefault();
		try {
			setSaving(true);
			setError("");
			setSaved(false);
			await onSave(buildPayload());
			setSaved(true);
		} catch (saveError) {
			setError(saveError.message || "The request could not be saved.");
		} finally {
			setSaving(false);
		}
	};
	const send = async () => {
		setSending(true);
		setSendError("");
		setSendResult(null);
		try {
			if (dirty) {
				try {
					await onSave(buildPayload());
					setSaved(true);
				} catch (saveError) {
					setError(saveError.message || "The request could not be saved.");
					return;
				}
			}
			setSendResult(await requestApi.send(request._id));
		} catch (sendRequestError) {
			setSendError(sendRequestError.message || "The request could not be sent.");
		} finally {
			setSending(false);
		}
	};
	return (
		<div className="request-workspace">
			<form className="request-editor" onSubmit={save}>
				<div className="request-editor-top">
					<input className="request-name-input" aria-label="Request name" maxLength={160} placeholder="Request name" value={form.name} onChange={(event) => update({ name: event.target.value })} />
					{error && <p className="request-editor-error" role="alert">{error}</p>}
					{saved && !dirty && <p className="request-editor-saved" role="status">Saved</p>}
					<button className="request-send" type="button" disabled={sending || saving} onClick={send}>{sending ? "Sending…" : "Send"}</button>
					<button className="request-save" type="submit" disabled={saving || sending || !dirty}>{saving ? "Saving…" : "Save"}</button>
				</div>
				<div className="request-editor-bar">
					<SelectMenu ariaLabel="HTTP method" className="method-select" onChange={(method) => update({ method })} options={METHODS} value={form.method} />
					<input className="request-url-input" aria-label="Request URL" placeholder="Enter a request URL" spellCheck={false} value={form.url} onChange={(event) => update({ url: event.target.value })} />
				</div>
				<div className="editor-tabs" role="tablist" aria-label="Request sections">
					{tabs.map((entry) => (
						<button key={entry.id} type="button" role="tab" className={tab === entry.id ? "active" : ""} aria-selected={tab === entry.id} onClick={() => setTab(entry.id)}>
							{entry.label}
							{entry.count ? <span className="editor-tab-count">{entry.count}</span> : null}
						</button>
					))}
				</div>
				<div className="editor-panel">
					{tab === "params" && <KeyValueEditor label="Query Params" onChange={(queryParams) => update({ queryParams })} rows={form.queryParams} />}
					{tab === "headers" && <KeyValueEditor label="Headers" onChange={(headers) => update({ headers })} rows={form.headers} />}
					{tab === "body" && <RequestBodyEditor body={form.body} onChange={(body) => update({ body })} />}
					{tab === "auth" && <RequestAuthEditor auth={form.auth} onChange={(auth) => update({ auth })} />}
				</div>
			</form>
			<ResponseViewer error={sendError} result={sendResult} sending={sending} snippetSource={{ requestId: request._id }} />
		</div>
	);
}
