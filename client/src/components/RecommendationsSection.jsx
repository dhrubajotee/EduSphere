// client/src/components/RecommendationsSection.jsx

"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Award,
  BookOpen,
  Download,
  Trash2,
  Loader2,
  Globe,
  FileText,
  X, // Added X icon for delete button
} from "lucide-react";
import api, { apiDownload } from "../api/axiosClient";
import Swal from "sweetalert2";

// CHANGED: Accept 'recommendations' prop from MainPage
export default function RecommendationsSection({ uploadedDocuments, recommendations }) {
  // We use the prop data to initialize the mutable state
  const [courses, setCourses] = useState(recommendations || []); 
  const [scholarships, setScholarships] = useState([]); 
  const [summaries, setSummaries] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [lastRecoId, setLastRecoId] = useState(null);

  // We only need to control loading states for subsequent actions
  const [fetchingScholarships, setFetchingScholarships] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  // ERROR state is now only for secondary actions (scholarships, pdf save)
  const [error, setError] = useState(""); 

  // Load last recommendation ID from localStorage (This is correct)
  useEffect(() => {
    const rid = localStorage.getItem("last_reco_id");
    if (rid) setLastRecoId(parseInt(rid, 10));
    
    // Set initial courses based on the prop received from MainPage
    // Note: We need to update this anytime the prop changes, not just on mount
    if (recommendations && recommendations.length > 0) {
        setCourses(recommendations);
    }
  }, [recommendations]); // Re-run if new recommendations are passed in

  // Fetch saved summaries (Correct)
  const fetchSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const res = await api.get("/summaries");
      setSummaries(res.data);
    } catch (err) {
      console.error("Failed to load summaries:", err);
    } finally {
      setLoadingSummaries(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  // 🔹 Generate AI transcript summary (Correct)
  const generateSummary = async () => {
    if (generatingSummary || fetchingScholarships) return;
    setGeneratingSummary(true);
    try {
      const res = await api.post("/summaries/generate");
      setAiSummary(res.data.summary_text || res.data.text || "");
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Summary generated successfully.",
        confirmButtonColor: "#3085d6",
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate summary.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  // 🔹 Fetch scholarships (Correct)
  const fetchScholarships = async () => {
    if (fetchingScholarships || generatingSummary) return;
    setFetchingScholarships(true);
    try {
      const res = await api.post("/scholarships/generate");
      const list = Array.isArray(res.data?.scholarships)
        ? res.data.scholarships
        : [];
      setScholarships(list);
      if (list.length === 0)
        alert("No scholarships found for this profile yet.");
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to fetch scholarships.");
    } finally {
      setFetchingScholarships(false);
    }
  };

  // 🔹 Save unified summary PDF (Correct)
  const saveSummaryPDF = async () => {
    if (!lastRecoId) return alert("No recommendation available to save yet.");
    if (!aiSummary)
      return await Swal.fire({
        icon: "error", // Changed from danger to error
        title: "Missing Summary",
        text: "Generate a transcript summary before saving.",
        confirmButtonColor: "#3085d6",
      });
    setSaving(true);
    try {
      await api.post("/summaries", {
        recommendation_id: lastRecoId,
        summary_text: aiSummary,
        include_scholarships: scholarships.length > 0,
      });
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Summary PDF saved (includes courses and scholarships).",
        confirmButtonColor: "#3085d6",
      });
      await fetchSummaries();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to save summary.");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Download PDF (Correct)
  const handleDownload = async (id) => {
    try {
      await apiDownload(`/summaries/${id}/download`, `summary_${id}.pdf`);
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // 🔹 Delete summary (Correct)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this summary?"))
      return;
    try {
      await api.delete(`/summaries/${id}`);
      alert("Summary deleted successfully.");
      await fetchSummaries();
    } catch (err) {
      console.error(err);
      alert("Failed to delete summary.");
    }
  };

  // ------------------------------------------------------------------
  // ⭐ NEW: Course Deletion Handler
  // ------------------------------------------------------------------
  const handleDeleteCourse = async (courseId) => {
    if (!lastRecoId) return alert("No active recommendation to modify.");
    if (!window.confirm("Are you sure you want to remove this course from your recommendations? This cannot be undone.")) {
        return;
    }
    
    setSaving(true); // Reuse saving state for API interaction
    try {
        // DELETE endpoint: DELETE /api/recommendations/{reco_id}/courses/{course_id}
        const res = await api.delete(
            `/recommendations/${lastRecoId}/courses/${courseId}`
        );

        // API returns the updated list of courses
        const updatedCourses = res.data.courses || [];
        
        // Update local state to reflect the deletion immediately
        setCourses(updatedCourses);

        await Swal.fire({
            icon: "info",
            title: "Removed",
            text: "Course removed from your recommendations. Saved reports will exclude it.",
            confirmButtonColor: "#3085d6",
        });

    } catch (error) {
        console.error("Error deleting course:", error);
        Swal.fire({
            icon: "error",
            title: "Failed",
            text: error.response?.data?.error || "Failed to remove course.",
            confirmButtonColor: "#d33",
        });
    } finally {
        setSaving(false);
    }
  };
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="text-center text-red-600 py-10">
        ⚠️ {error}
      </div>
    );
  }

  // 🔹 Render UI
  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Documents Analyzed"
          value={uploadedDocuments.length}
          icon={<BookOpen className="h-6 w-6 text-blue-600" />}
        />
        <StatCard
          title="Courses Found"
          value={courses.length}
          icon={<TrendingUp className="h-6 w-6 text-indigo-600" />}
        />
        <StatCard
          title="Scholarships"
          value={scholarships.length}
          icon={<Award className="h-6 w-6 text-green-600" />}
        />
      </div>

      {/* Recommended Courses */}
      <SectionTitle>Recommended Courses</SectionTitle>
      {/* VITAL CHANGE: Pass the new handler down to CourseList */}
      <CourseList 
        courses={courses} 
        onDelete={handleDeleteCourse} 
      />

      {/* Scholarships */}
      <div className="flex items-center justify-center"> 
        <SectionTitle>Scholarship Opportunities</SectionTitle>
        {/* The button moves out of this container in the final code below */}
      </div>

      <div className="flex justify-center mb-6">
          <button
            onClick={fetchScholarships}
            disabled={fetchingScholarships || generatingSummary || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            <Globe className="w-4 h-4" />
            {fetchingScholarships ? "Searching..." : "Find Scholarships"}
          </button>
      </div>

      <ScholarshipList
        scholarships={scholarships}
        loading={fetchingScholarships}
      />

      {/* --- AI Summary Section --- */}
      <div className="p-6 rounded-lg border border-gray-300 bg-white">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> Transcript Summary
        </h2>
        {aiSummary ? (
          <p className="text-gray-700 text-sm whitespace-pre-line mb-4">
            {aiSummary}
          </p>
        ) : (
          <p className="text-gray-500 text-sm">
            Generate a concise summary of your transcript using AI.
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={generateSummary}
            disabled={
              generatingSummary || fetchingScholarships || saving || courses.length === 0
            } // Disable if no courses were generated (meaning no transcript processed)
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {generatingSummary ? "Generating..." : "Generate Summary"}
          </button>

          {aiSummary && (
            <button
              onClick={saveSummaryPDF}
              disabled={
                saving ||
                fetchingScholarships ||
                !aiSummary.trim()
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : fetchingScholarships
                  ? "Please wait (loading scholarships)..."
                  : "Save Full Report (PDF)"}
            </button>
          )}
        </div>
      </div>

      {/* Saved Summaries */}
      <div>
        <SectionTitle>Saved Results</SectionTitle>
        {loadingSummaries ? (
          <p className="text-gray-500 text-sm">Loading saved summaries...</p>
        ) : summaries.length === 0 ? (
          <p className="text-gray-500 text-sm">No saved summaries yet.</p>
        ) : (
          <div className="grid gap-3">
            {summaries.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-medium text-gray-900">Summary #{s.id}</p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownload(s.id)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 transition"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Small UI Components ---
const StatCard = ({ title, value, icon }) => (
  <div className="rounded-lg border border-gray-300 bg-white p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="rounded-full bg-gray-100 p-3">{icon}</div>
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="mb-4 text-xl font-bold text-gray-900">{children}</h2>
);

// VITAL CHANGE: Component now accepts onDelete handler
const CourseList = ({ courses, onDelete }) => (
  <div className="grid gap-4">
    {courses.length === 0 ? (
      <p className="text-gray-500 text-sm">
        No recommendations yet. Try uploading a transcript.
      </p>
    ) : (
      courses.map((course) => (
        <div
          // It's safer to use a unique ID if available. Using course.course_id here.
          key={course.course_id || course.code} 
          className="relative rounded-lg border border-gray-300 bg-white p-6 hover:shadow-md transition-shadow"
        >
            {/* ⭐ NEW: Delete Button in the top right corner */}
            <button
                onClick={() => onDelete(course.course_id)}
                className="absolute top-3 right-3 p-1 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors z-10"
                aria-label={`Remove ${course.title}`}
            >
                <X className="w-4 h-4" />
            </button>
            {/* ---------------------------------------------------- */}

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 pr-6"> {/* Added pr-6 to give space for the delete button */}
              <h3 className="font-semibold text-gray-900">{course.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {course.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-full bg-blue-100 px-3 py-1">
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(course.match || 0)}%
                </span>
              </div>

              {/* 🔗 Learn More link under the match badge */}
              {course.link && (
                <a
                  href={course.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                >
                  Learn More →
                </a>
              )}
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

const ScholarshipList = ({ scholarships, loading }) => {
  if (loading)
    return (
      <div className="flex items-center justify-center py-8 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-green-600" />
        Searching scholarships...
      </div>
    );
  return (
    <div className="grid gap-4">
      {scholarships.map((sch, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-300 bg-white p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{sch.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{sch.description}</p>
              {sch.link && (
                <a
                  href={sch.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-green-700 hover:underline inline-block mt-1"
                >
                  View details →
                </a>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-full bg-green-100 px-3 py-1">
                <span className="text-sm font-semibold text-green-600">
                  {Math.round(sch.match || 0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};