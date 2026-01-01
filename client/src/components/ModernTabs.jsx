// client/src/components/ModernTabs.jsx

import React, { useEffect, useState } from "react"
import { Upload, Sparkles, MessageSquare } from "lucide-react"
import UploadSection from "./UploadSection"
import RecommendationsSection from "./RecommendationsSection"
import ChatSection from "./ChatSection"

export default function ModernTabs() {
  const [activeTab, setActiveTab] = useState("upload");

  const tabs = [
    { id: "upload", label: "Upload", icon: <Upload className="w-4 h-4" /> },
    { id: "recommendations", label: "Recommendations", icon: <Sparkles className="w-4 h-4" /> },
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
  ]

  // ...
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const handleDocumentUpload = (result) => {
    // result: { transcriptId, recommendation }
    setUploadedDocuments((prev) => [...prev, result.transcriptId]);
    // transform server payload into your UI’s structure
    const picks = (result.recommendation.courses || []).map((c) => ({
      type: "course",
      title: `Course ID ${c.course_id}`,
      course_id: c.course_id,
      description: c.rationale,
      match: c.match,
    }));
    setRecommendations(picks);
    setActiveTab("recommendations");
  };
  // ...

  useEffect(() => {
    const saved = localStorage.getItem("uploadedDocs");
    if (saved) setUploadedDocuments(JSON.parse(saved));
  }, []);


  useEffect(() => {
    localStorage.setItem("uploadedDocs", JSON.stringify(uploadedDocuments));
  }, [uploadedDocuments]);


  return (

    <div className="w-full max-w-4xl mx-auto p-2">
      {/* Tab Navigation */}
      <div className="relative mb-8">
        {/* Background container with border */}
        <div className="relative bg-gray-100/30 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-300/50 shadow-sm">
          <div className="relative flex gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                font-medium text-sm transition-all duration-300 flex-1
                ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}
              `}
                >
                  {/* Active background */}
                  {isActive && (
                    <span className="absolute inset-0 bg-white rounded-xl shadow-md border border-gray-300/50 transition-all duration-300" />
                  )}

                  {/* Content */}
                  <span className="relative z-10 flex items-center gap-2">
                    <span className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>

                  {/* Hover effect */}
                  {!isActive && (
                    <span className="absolute inset-0 bg-white/50 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active indicator line */}
        <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "upload" && <UploadSection onUpload={handleDocumentUpload} />}
        {activeTab === "recommendations" && (
          <RecommendationsSection recommendations={recommendations} uploadedDocuments={uploadedDocuments} />
        )}
        {activeTab === "chat" && <ChatSection />}
      </div>
    </div>

  )
}
