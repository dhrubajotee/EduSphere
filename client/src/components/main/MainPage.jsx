// client/src/components/main/MainPage.jsx

import React, { useEffect, useState } from 'react'
import PreferenceInput from './PreferenceInput';
import { BarChart3, Brain, ChartSpline, LineChart, ScanSearch } from 'lucide-react';
import ChatDrawer from './ChatDrawer';
import UploadDocument from './UploadDocument';
import api from '../../api/axiosClient';
import RecommendationsSection from '../RecommendationsSection';

export default function MainPage() {

    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [showRecommendation, setShowRecommendation] = useState(false);

    // preference
    const [preference, setPreference] = useState("");

    // upload state
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [fileForAnalyze, setFileForAnalyze] = useState();

    const handlePreferenceChange = (e) => {
        setPreference(e.target.value)
    }

    const handleDocumentUpload = (result) => {
        setUploadedDocuments((prev) => [...prev, result.transcriptId]);
        // transform server payload into your UI’s structure
        const picks = (result.recommendation.courses || []).map((c) => ({
            type: "course",
            title: c.title, // Use title directly from server
            code: c.code, // Use code directly from server
            course_id: c.course_id,
            description: c.description || c.rationale, // Use description/rationale
            match: c.match,
            link: c.link,
        }));
        setRecommendations(picks);
        setShowRecommendation(true);
    };

    const handleAnalysis = async () => {
        if (!fileForAnalyze) {
            alert("Please upload a transcript file first.");
            return;
        }

        setLoading(true)
        try {
            // 1. Upload Transcript
            const form = new FormData()
            form.append("file", fileForAnalyze)
            const up = await api.post("/transcripts/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
            const transcriptId = up.data.id

            const userPreference = preference; // Capture the state

            // 2. Create Recommendation (Phase 2 Logic)
            const reco = await api.post("/recommendations", { 
                transcript_id: transcriptId,
                preference: userPreference 
            })
            
            // 3. Save IDs for Phase 3 (Chat context)
            localStorage.setItem("last_reco_id", reco.data.id);
            localStorage.setItem("last_transcript_id", transcriptId); // <-- ADDED FOR PHASE 3

            // 4. Update UI
            handleDocumentUpload({
                transcriptId,
                recommendation: reco.data
            })

            // IMPORTANT: If you still get a console error after this, it means another
            // component (possibly RecommendationsSection) is making a secondary V1 call.
            
        } catch (err) {
            console.error("Analysis Error:", err.response?.data?.error || err.message, err);
            alert("Failed to generate recommendations. Please check API key, logs, and ensure courses are seeded.");
        } finally {
            setLoading(false)
        }
    }

    // Existing useEffects for localStorage management
    useEffect(() => {
        const saved = localStorage.getItem("uploadedDocs");
        if (saved) setUploadedDocuments(JSON.parse(saved));
    }, []);


    useEffect(() => {
        localStorage.setItem("uploadedDocs", JSON.stringify(uploadedDocuments));
    }, [uploadedDocuments]);


    return (
        <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <UploadDocument
                    // ... props ...
                    onUpload={handleDocumentUpload}
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    loading={loading}
                    setLoading={setLoading}
                    setFileForAnalyze={setFileForAnalyze}
                />
                <PreferenceInput value={preference} onChange={handlePreferenceChange} />
                <div className="flex justify-center pb-4">
                    <button
                        className="px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 
                                     hover:shadow-md active:scale-95 transition-all duration-200 inline-flex items-center gap-2
                                     max-w-[280px]"
                        onClick={handleAnalysis}
                        disabled={loading || !fileForAnalyze}
                    >
                        <BarChart3 size={20} strokeWidth={3} />
                        {loading ? 'Analyzing...' : 'Start Analyzing'}
                    </button>
                </div>

                {/* Show RecommendationsSection after a successful analysis */}
                {showRecommendation && uploadedDocuments.length > 0 && (
                    <RecommendationsSection 
                        uploadedDocuments={uploadedDocuments} 
                        recommendations={recommendations}
                    />
                )}

            </div>

            <ChatDrawer />

        </div>
    )
}