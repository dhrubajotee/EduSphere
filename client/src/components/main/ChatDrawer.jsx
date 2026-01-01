// client/src/components/main/ChatDrawer.jsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, Bot, Loader2, MessageCircle, X, ChevronRight } from "lucide-react";

export default function ChatDrawer() {
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const chatEndRef = useRef(null);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	const handleSend = async (e) => {
		e.preventDefault();
		const text = input.trim();
		if (!text || loading) return;

		const nextMessages = [...messages, { role: "user", content: text }];
		setMessages(nextMessages);
		setInput("");
		setLoading(true);
        
        // --- PHASE 3: CONTEXT ID RETRIEVAL AND HEADER SETUP ---
        // 1. Retrieve the Recommendation ID, which holds all academic context
        const recommendationId = localStorage.getItem("last_reco_id");
        
        // 2. Prepare base headers
		const headers = {
			"Content-Type": "application/json",
            // The existing authentication header
			Authorization: `Bearer ${localStorage.getItem("access_token")}`,
		}
        
        // 3. Inject the custom context header if the ID exists
        if (recommendationId) {
            headers["X-Recommendation-ID"] = recommendationId;
        }
        // --- END PHASE 3 UPDATE ---

		try {
			const res = await fetch("/api/chat/stream", {
				method: "POST",
                // VITAL: Use the updated headers object
				headers: headers, 
				body: JSON.stringify({ messages: nextMessages }),
			});

			const reader = res.body.getReader();
			const decoder = new TextDecoder("utf-8");
			let aiMessage = { role: "assistant", content: "" };
			setMessages((prev) => [...prev, aiMessage]);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });

				chunk.split("\n").forEach((line) => {
					if (line.startsWith("data: ")) {
						const text = line.replace("data: ", "").trim();
						if (text === "[DONE]") return;
						if (text.length > 0) {
							setMessages((prev) => {
								const updated = [...prev];
								const last = { ...updated[updated.length - 1] };
								const clean = text
									.replace(/\\n/g, "\n")
									.replace(/\\t/g, "  ")
									.replace(/\s+/g, " ")
									.replace(/\*{3}/g, "**");

								last.content = (last.content + " " + clean).trim();
								updated[updated.length - 1] = last;
								return updated;
							});
						}
					}
				});
			}
		} catch (err) {
			console.error("Streaming chat error:", err);
			setMessages((prev) => [
				...prev,
				{ role: "assistant", content: "Sorry, something went wrong." },
			]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			{!open && (
				<div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 z-50 group">

					{/* Text Label - Hidden on mobile (hidden), visible on small screens and up (sm:block) */}
					<div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
						<span className="bg-indigo-600 shadow-md border border-gray-100 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap">
							Chat with EduSphere
						</span>
					</div>

					{/* Main Button */}
					<button
						onClick={() => setOpen(true)}
						className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 sm:p-4 rounded-full shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
						aria-label="Open chat"
					>
						<MessageCircle className="w-6 h-6" />
					</button>
				</div>
			)}



			{/* Drawer Panel */}
			<div
				className={`fixed top-17 right-4 h-[calc(100%-5rem)] w-[380px]
		backdrop-blur-xl bg-white/70 border border-white/40
		shadow-[0_8px_30px_rgba(0,0,0,0.1)] rounded-2xl
		transform transition-all duration-300 ease-[cubic-bezier(.21,1.02,.73,1)]
		${open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0 pointer-events-none"}`}
			>
				{/* Header */}
				<div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white
		  rounded-t-2xl border-b border-white/20 shadow-md flex justify-between items-center">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Bot size={18} /> EduSphere AI
					</h2>
					<button onClick={() => setOpen(false)}>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Chat Area */}
				<div className="flex flex-col h-[calc(100%-140px)]">
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{messages.map((msg, idx) => (
							<ChatBubble key={idx} role={msg.role} content={msg.content} />
						))}

						{loading && (
							<div className="flex items-center gap-2 text-gray-600">
								<Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
								<TypingDots />
								<span className="text-sm">EduSphere is typing...</span>
							</div>
						)}

						<div ref={chatEndRef} />
					</div>

					{/* Input Box */}
					<form
						onSubmit={handleSend}
						className="p-3 bg-white/70 backdrop-blur-lg border-t border-white/40
					rounded-b-2xl flex items-center gap-3"
					>
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Ask EduSphere anything..."
							className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm
							  bg-white/60 backdrop-blur-md
							  focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
						<button
							type="submit"
							disabled={loading || !input.trim()}
							className="
							   bg-indigo-600/90 hover:bg-indigo-600
							   text-white rounded-xl px-4 py-2 flex items-center gap-1
							   border border-white/40 backdrop-blur-md
							   shadow-[0_6px_20px_rgba(99,102,241,0.45)]
					"
						>
							<Send className="w-4 h-4" />
							Send
						</button>
					</form>
				</div>
			</div>
		</>
	);
}

/* --- Chat bubble stays the same --- */
function ChatBubble({ role, content }) {
	const isUser = role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isUser
						? "bg-indigo-600 text-white rounded-br-none"
						: "bg-gray-100 text-gray-900 rounded-bl-none"
					}`}
			>
				{!isUser && (
					<div className="flex items-center gap-2 mb-1 text-indigo-600">
						<Bot size={14} />
						<span className="font-medium text-xs">EduSphere AI</span>
					</div>
				)}
				<div className="prose prose-sm max-w-none">
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							code({ node, inline, className, children, ...props }) {
								const match = /language-(\w+)/.exec(className || "");
								return !inline && match ? (
									<SyntaxHighlighter
										style={oneDark}
										language={match[1]}
										PreTag="div"
										className="rounded-md my-2"
									>
										{String(children).replace(/\n$/, "")}
									</SyntaxHighlighter>
								) : (
									<code
										className="bg-gray-200 text-gray-800 rounded px-1 py-0.5 text-xs font-mono"
										{...props}
									>
										{children}
									</code>
								);
							},
						}}
					>
						{content || ""}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}

/* --- Typing Dots --- */
function TypingDots() {
	return (
		<span className="flex gap-1 items-center">
			<span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
			<span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
			<span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
		</span>
	);
}