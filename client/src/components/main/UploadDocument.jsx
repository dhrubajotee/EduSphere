// client/src/components/UploadSection.jsx

import React, { useState } from "react"
import { Upload, FileText, CheckCircle } from "lucide-react"
import api from "../../api/axiosClient"

export default function UploadDocument({ onUpload, uploadedFiles, setUploadedFiles,loading, setLoading, setFileForAnalyze,  }) {
  const [dragActive, setDragActive] = useState(false)

  

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }

  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }

  const processFiles = async (files) => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"))
    if (pdfs.length === 0) return
    setUploadedFiles(prev => [...prev, ...pdfs.map(f => f.name)])
    setFileForAnalyze(pdfs[0])
    // upload first PDF then analyze
    
  }

  return (
    <div className="space-y-8">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all ${dragActive ? "border-blue-600 bg-blue-100" : "border-gray-300 bg-gray-100 hover:border-blue-400"
          }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`relative rounded-full bg-blue-100 p-6 transition-all duration-300 ${dragActive ? "scale-110 bg-blue-200" : ""}`}>
            <div className="absolute inset-0 rounded-full bg-blue-200 animate-ping" />
            <Upload className="relative h-12 w-12 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload Your Academic Transcript (PDF)</h3>
            <p className="mt-1 text-sm text-gray-500">Drag-drop or choose a file</p>
          </div>
          <label className="cursor-pointer group">
            <input type="file" multiple onChange={handleFileInput} className="hidden" accept=".pdf" />
            <span className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white transition-all hover:bg-blue-500">
              <Upload className="h-5 w-5" />
              Browse Files
            </span>
          </label>
          {loading && <p className="text-sm text-gray-600 mt-2">Analyzing with AI…</p>}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
          <div className="grid gap-3">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file}</p>
                  {/* <p className="text-xs text-gray-500">Analyzed</p> */}
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
