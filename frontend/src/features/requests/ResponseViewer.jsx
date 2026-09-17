import { useState } from "react";

const formatBytes = (bytes) => {
	if (!bytes) return "0 B";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const statusClass = (response) => {
	if (response.error || !response.status) return "error";
	if (response.status < 300) return "success";
	if (response.status < 400) return "redirect";
	if (response.status < 500) return "client";
	return "server";
};

const prettyJson = (body) => {
	try {
		return JSON.stringify(JSON.parse(body), null, 2);
	} catch {
		return null;
	}
};

function SentRequest({ request }) {
	const bodyText = request.body?.raw
		? request.body.raw
		: JSON.stringify({ mode: request.body?.mode, formData: request.body?.formData, urlEncoded: request.body?.urlEncoded }, null, 2);
	return (
		<div className="sent-request">
			<div className="sent-row"><span className="sent-method">{request.method}</span><code className="sent-url">{request.url}</code></div>
			<dl className="sent-meta">
				<dt>Original URL</dt>
				<dd>{request.rawUrl || request.url}</dd>
			</dl>
			<h4>Query Params</h4>
			{request.queryParams?.length ? (
				<ul className="response-headers">{request.queryParams.map((item, index) => <li key={index}><span className="response-header-key">{item.key}</span><span className="response-header-value">{item.value}</span></li>)}</ul>
			) : <p className="response-empty">No query params.</p>}
			<h4>Headers</h4>
			{request.headers?.length ? (
				<ul className="response-headers">{request.headers.map((item, index) => <li key={index}><span className="response-header-key">{item.key}</span><span className="response-header-value">{item.value}</span></li>)}</ul>
			) : <p className="response-empty">No headers.</p>}
			<h4>Body</h4>
			<pre className="response-code">{bodyText}</pre>
			<h4>Auth</h4>
			<pre className="response-code">{JSON.stringify(request.auth, null, 2)}</pre>
		</div>
	);
}

export function ResponseViewer({ error, result, sending }) {
	const [tab, setTab] = useState("body");
	const [pretty, setPretty] = useState(true);
	if (sending) {
		return <section className="response-viewer response-idle" role="status"><div className="response-loading"><span className="spinner" />Sending request…</div></section>;
	}
	if (error) {
		return <section className="response-viewer"><div className="response-error" role="alert">{error}</div></section>;
	}
	if (!result) {
		return <section className="response-viewer response-idle"><p>Send the request to see the response.</p></section>;
	}
	const { request, response } = result;
	const formatted = prettyJson(response.body || "");
	const json = formatted !== null;
	return (
		<section className="response-viewer">
			<div className="response-summary">
				<span className={`response-status ${statusClass(response)}`}>{response.error ? "Error" : `${response.status} ${response.statusText || ""}`.trim()}</span>
				<span className="response-meta">{response.durationMs} ms</span>
				<span className="response-meta">{formatBytes(response.size)}</span>
				{response.contentType && <span className="response-meta">{response.contentType}</span>}
			</div>
			{response.error && <p className="response-error" role="alert">{response.error}</p>}
			{response.truncated && <p className="response-note">The response body was truncated at the maximum size.</p>}
			<div className="editor-tabs" role="tablist" aria-label="Response sections">
				{[["body", "Body"], ["headers", "Headers"], ["sent", "Sent request"]].map(([id, label]) => (
					<button key={id} type="button" role="tab" className={tab === id ? "active" : ""} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
				))}
			</div>
			<div className="response-panel">
				{tab === "body" && (response.body ? (
					<div className="response-body">
						{json && (
							<div className="response-body-actions">
								<button type="button" className={pretty ? "active" : ""} onClick={() => setPretty(true)}>Pretty</button>
								<button type="button" className={!pretty ? "active" : ""} onClick={() => setPretty(false)}>Raw</button>
							</div>
						)}
						<pre className="response-code">{json && pretty ? formatted : response.body}</pre>
					</div>
				) : <p className="response-empty">No response body.</p>)}
				{tab === "headers" && (response.headers.length ? (
					<ul className="response-headers">{response.headers.map((header, index) => <li key={index}><span className="response-header-key">{header.key}</span><span className="response-header-value">{header.value}</span></li>)}</ul>
				) : <p className="response-empty">No response headers.</p>)}
				{tab === "sent" && <SentRequest request={request} />}
			</div>
		</section>
	);
}
