import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../../shared/components/MaterialIcon.jsx";
import { createTabList } from "../../shared/utils/a11y.js";
import { snippetsApi } from "../snippets/snippets.api.js";
import { ResponseBody } from "./ResponseBody.jsx";

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

export function ResponseViewer({ error, result, sending, snippetSource = null }) {
	const [tab, setTab] = useState("body");
	const [snippets, setSnippets] = useState(null);
	const [snippetsLoading, setSnippetsLoading] = useState(false);
	const [snippetsError, setSnippetsError] = useState("");
	const [copied, setCopied] = useState("");
	const tabReference = useRef(null);
	useEffect(() => {
		setSnippets(null);
		setSnippetsError("");
		setCopied("");
	}, [result]);
	const loadSnippets = async () => {
		if (!snippetSource) return;
		setSnippetsLoading(true);
		setSnippetsError("");
		try {
			const data = snippetSource.requestId ? await snippetsApi.forRequest(snippetSource.requestId) : await snippetsApi.forPayload(snippetSource.request);
			setSnippets(data.snippets);
		} catch (snippetError) {
			setSnippetsError(snippetError.message);
		} finally {
			setSnippetsLoading(false);
		}
	};
	const openTab = (id) => {
		setTab(id);
		if (id === "snippets" && snippets === null && !snippetsLoading) loadSnippets();
	};
	const copy = async (language, code) => {
		try {
			if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
			else {
				const area = document.createElement("textarea");
				area.value = code;
				area.style.position = "fixed";
				area.style.opacity = "0";
				document.body.appendChild(area);
				area.select();
				document.execCommand("copy");
				document.body.removeChild(area);
			}
			setCopied(language);
			setTimeout(() => setCopied((current) => (current === language ? "" : current)), 1600);
	} catch {
		setSnippetsError("Copying to the clipboard is unavailable in this browser.");
	}
	};
	const tabList = createTabList({ ids: ["body", "headers", "sent", "snippets"], activeId: tab, onChange: openTab, ariaLabel: "Response sections", idPrefix: "response", listRef: tabReference });
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
			<div className="editor-tabs" {...tabList.listProps}>
				{[["body", "Body"], ["headers", "Headers"], ["sent", "Sent request"], ["snippets", "Snippets"]].map(([id, label]) => (
					<button key={id} type="button" {...tabList.tabProps(id)} className={tab === id ? "active" : ""} onClick={() => openTab(id)}>{label}</button>
				))}
			</div>
			<div className="response-panel" {...tabList.panelProps(tab)}>
				{tab === "body" && (response.body ? <ResponseBody body={response.body} /> : <p className="response-empty">No response body.</p>)}
				{tab === "headers" && ((response.headers || []).length ? (
					<ul className="response-headers">{(response.headers || []).map((header, index) => <li key={index}><span className="response-header-key">{header.key}</span><span className="response-header-value">{header.value}</span></li>)}</ul>
				) : <p className="response-empty">No response headers.</p>)}
				{tab === "sent" && <SentRequest request={request} />}
				{tab === "snippets" && (
					<div className="snippets">
						<div className="snippets-bar">
							<span className="snippets-title">Code snippets</span>
							<button type="button" className="snippets-refresh" disabled={!snippetSource || snippetsLoading} onClick={loadSnippets}><MaterialIcon size={16}>sync</MaterialIcon><span>{snippetsLoading ? "Generating…" : "Refresh"}</span></button>
						</div>
						{!snippetSource ? (
							<p className="response-empty">Snippets are unavailable for this entry.</p>
						) : snippetsError ? (
							<div className="snippets-error" role="alert"><span>{snippetsError}</span><button type="button" onClick={loadSnippets}>Try again</button></div>
						) : snippetsLoading && !snippets ? (
							<p className="response-empty">Generating snippets…</p>
						) : snippets ? (
							snippets.map((snippet) => (
								<section className="snippet" key={snippet.language}>
									<div className="snippet-head">
										<span className="snippet-language">{snippet.language}</span>
										<button type="button" className="snippet-copy" onClick={() => copy(snippet.language, snippet.code)}>
											<MaterialIcon size={16}>{copied === snippet.language ? "check" : "content_copy"}</MaterialIcon>
											<span aria-live="polite">{copied === snippet.language ? "Copied" : "Copy"}</span>
										</button>
									</div>
									<pre className="response-code">{snippet.code}</pre>
								</section>
							))
						) : null}
					</div>
				)}
			</div>
		</section>
	);
}
