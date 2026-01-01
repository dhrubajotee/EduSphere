// client/src/components/ChatSection.jsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, Bot, Loader2 } from "lucide-react";

export default function ChatSection() {
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

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
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
                  .replace(/\\t/g, "  ")
                  .replace(/\s+/g, " ")
                  .replace(/\*{3}/g, "**") // fix markdown bold
                  .replace(/(\w)([A-Z])/g, "$1 $2"); // add space between joined words

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
    <div className="flex flex-col h-[80vh] border rounded-lg bg-white shadow-sm">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} role={msg.role} content={msg.content} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 pl-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <TypingDots />
            <span className="text-sm">EduSphere is typing...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input field */}
      <form
        onSubmit={handleSend}
        className="border-t flex items-center gap-3 p-3 bg-gray-50"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask EduSphere anything..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 flex items-center gap-1 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}

// 🗨️ Chat bubble with markdown rendering
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

        {/* 🧩 Markdown rendered here */}
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
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    {children}
                  </a>
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

// Animated typing dots
function TypingDots() {
  return (
    <span className="flex gap-1 items-center">
      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
    </span>
  );
}
