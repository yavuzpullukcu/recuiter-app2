"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Zap, TrendingUp, Play, RefreshCw, Upload } from "lucide-react";

interface NormalizedJob {
  id: number;
  titleClean: string;
  roleFamily: string | null;
  seniority: string | null;
  bodyLeasingFitScore: number;
  urgencyScore: number;
  remoteType: string | null;
  location: string | null;
  source: string;
  status: string;
}

interface PipelineResult {
  collectionResults: Array<{
    source: string;
    newJobs: number;
    duplicates: number;
    errors: string[];
  }>;
  parsedCount: number;
  normalizedCount: number;
  matchesGenerated: number;
  errors: string[];
  duration: number;
}

interface DailySummary {
  date: string;
  newJobsCollected: number;
  jobsParsed: number;
  topBodyLeasingJobs: Array<{
    id: number;
    title: string;
    source: string;
    bodyLeasingFitScore: number;
    urgencyScore: number;
  }>;
  sourceBreakdown: Record<string, number>;
}

export function IntelligenceDashboard() {
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [importingJobs, setImportingJobs] = useState(false);
  const [importingCandidates, setImportingCandidates] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    jobs: true,
    summary: true,
    topOpportunities: true,
    imports: true,
  });

  useEffect(() => {
    fetchJobs();
    fetchSummary();
  }, []);

  async function fetchJobs() {
    try {
      setLoading(true);
      const res = await fetch("/api/intelligence/jobs?status=new&minBodyLeasingScore=40&limit=20");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch jobs: ${err instanceof Error ? err.message : String(err)}`);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch("/api/intelligence/pipeline");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setSummary(data || null);
      setSummaryError(null);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setSummaryError(`Failed to fetch summary: ${err instanceof Error ? err.message : String(err)}`);
      setSummary(null);
    }
  }

  async function runPipeline() {
    try {
      setPipelineRunning(true);
      setError(null);
      const res = await fetch("/api/intelligence/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 3, sources: ["circle8", "nemensis"] }),
      });

      if (!res.ok) {
        throw new Error(`Pipeline failed: ${res.statusText}`);
      }

      const result: PipelineResult = await res.json();
      console.log("Pipeline result:", result);

      // Refresh data after pipeline
      await fetchJobs();
      await fetchSummary();
      setError(null);
    } catch (err) {
      setError(`Pipeline error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPipelineRunning(false);
    }
  }

  async function handleJobsImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingJobs(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/intelligence/import-jobs', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportMessage(`✓ Jobs imported: ${data.importedCount}${data.errorCount > 0 ? ` (${data.errorCount} errors)` : ''}`);
      await fetchJobs();
      await fetchSummary();

      setTimeout(() => setImportMessage(null), 5000);
    } catch (err) {
      setImportMessage(`✗ Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImportingJobs(false);
      e.target.value = '';
    }
  }

  async function handleCandidatesImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingCandidates(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/intelligence/import-candidates', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportMessage(`✓ Candidates imported: ${data.importedCount}${data.errorCount > 0 ? ` (${data.errorCount} errors)` : ''}`);

      setTimeout(() => setImportMessage(null), 5000);
    } catch (err) {
      setImportMessage(`✗ Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImportingCandidates(false);
      e.target.value = '';
    }
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  const bodyLeasingJobs = Array.isArray(jobs) ? jobs.filter((j) => j.bodyLeasingFitScore >= 60) : [];
  const urgentJobs = Array.isArray(jobs) ? jobs.filter((j) => j.urgencyScore >= 70) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Intelligence Dashboard</h2>
        <p className="text-brand-100">Job Intelligence Module - Real-time Job Collection & Matching</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Total Jobs</div>
          <div className="text-3xl font-bold text-brand-600">{jobs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Body Leasing Fit</div>
          <div className="text-3xl font-bold text-emerald-600">{bodyLeasingJobs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Urgent (ASAP)</div>
          <div className="text-3xl font-bold text-orange-600">{urgentJobs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm font-medium">Sources</div>
          <div className="text-3xl font-bold text-blue-600">{summary?.sourceBreakdown ? Object.entries(summary.sourceBreakdown).length : 0}</div>
        </div>
      </div>

      {/* Pipeline Control */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-brand-600" />
          Pipeline Control
        </h3>
        <button
          onClick={runPipeline}
          disabled={pipelineRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            pipelineRunning
              ? "bg-gray-200 text-gray-600 cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${pipelineRunning ? "animate-spin" : ""}`} />
          {pipelineRunning ? "Running Pipeline..." : "Run Collection Pipeline"}
        </button>
        <p className="text-sm text-gray-600 mt-2">
          Collects jobs from Circle8 & Nemensis, parses descriptions, and runs matching
        </p>
      </div>

      {/* Import Data */}
      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection("imports")}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" />
            Import Data from Excel
          </h3>
          {expandedSections.imports ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {expandedSections.imports && (
          <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-6">
            {importMessage && (
              <div className={`p-4 rounded-lg ${importMessage.startsWith('✓') ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>
                {importMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Jobs Import */}
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-white transition">
                <input
                  type="file"
                  id="jobs-import"
                  accept=".csv,.json"
                  onChange={handleJobsImport}
                  disabled={importingJobs}
                  className="hidden"
                />
                <label
                  htmlFor="jobs-import"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${importingJobs ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-8 h-8 text-brand-600" />
                  <div className="font-semibold text-gray-900">Import Jobs</div>
                  <div className="text-sm text-gray-600">Upload jobs CSV or JSON file</div>
                  <div className="text-xs text-gray-500 mt-2">Convert Excel to CSV: File → Save As → CSV UTF-8</div>
                </label>
              </div>

              {/* Candidates Import */}
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-white transition">
                <input
                  type="file"
                  id="candidates-import"
                  accept=".csv,.json"
                  onChange={handleCandidatesImport}
                  disabled={importingCandidates}
                  className="hidden"
                />
                <label
                  htmlFor="candidates-import"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${importingCandidates ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-8 h-8 text-blue-600" />
                  <div className="font-semibold text-gray-900">Import Candidates</div>
                  <div className="text-sm text-gray-600">Upload candidates CSV or JSON file</div>
                  <div className="text-xs text-gray-500 mt-2">Convert Excel to CSV: File → Save As → CSV UTF-8</div>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <div className="font-semibold mb-2">How to use:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Fill Excel template files from your Recuter folder</li>
                <li>Save as CSV: File → Save As → CSV UTF-8 format</li>
                <li>Upload the CSV file here</li>
                <li>System automatically parses and creates matches</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Daily Summary */}
      {summary && (
        <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
          <button
            onClick={() => toggleSection("summary")}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              Daily Summary
            </h3>
            {expandedSections.summary ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {expandedSections.summary && (
            <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="font-semibold">{summary.date}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">New Jobs (24h)</div>
                  <div className="text-2xl font-bold text-brand-600">{summary.newJobsCollected}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Parsed</div>
                  <div className="text-2xl font-bold text-brand-600">{summary.jobsParsed}</div>
                </div>
              </div>

              {summary?.sourceBreakdown && Object.entries(summary.sourceBreakdown).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Source Breakdown</div>
                  <div className="space-y-1">
                    {Object.entries(summary.sourceBreakdown).map(([source, count]) => (
                      <div key={source} className="flex justify-between text-sm">
                        <span className="capitalize">{source}</span>
                        <span className="font-semibold">{count} jobs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Body Leasing Opportunities */}
      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection("topOpportunities")}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Top Body Leasing Opportunities
          </h3>
          {expandedSections.topOpportunities ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {expandedSections.topOpportunities && (
          <div className="border-t border-gray-200 p-6 space-y-3 bg-gray-50">
            {bodyLeasingJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No body leasing jobs collected yet. Run the pipeline first.</p>
            ) : (
              bodyLeasingJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="bg-white p-4 rounded-lg border border-yellow-200 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{job.titleClean}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {job.roleFamily && <span className="capitalize">{job.roleFamily}</span>}
                        {job.seniority && <span> • {job.seniority}</span>}
                        {job.location && <span> • {job.location}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-600">{job.bodyLeasingFitScore}%</div>
                      <div className="text-xs text-gray-600">BL Score</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded">
                      {job.source}
                    </span>
                    {job.remoteType && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {job.remoteType}
                      </span>
                    )}
                    {job.urgencyScore >= 70 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        🔥 Urgent ({job.urgencyScore}%)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* All Normalized Jobs */}
      <div className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection("jobs")}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="text-lg font-semibold">All Normalized Jobs ({jobs.length})</h3>
          {expandedSections.jobs ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {expandedSections.jobs && (
          <div className="border-t border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">BL Score</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Urgency</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading jobs...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No jobs found. Run the pipeline to collect jobs.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{job.titleClean}</td>
                      <td className="px-6 py-4 text-gray-600 capitalize">
                        {job.roleFamily || "-"}
                        {job.seniority && <div className="text-xs text-gray-500">{job.seniority}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{job.location || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded font-semibold text-sm">
                          {job.bodyLeasingFitScore}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          job.urgencyScore >= 70
                            ? "bg-orange-100 text-orange-700"
                            : job.urgencyScore >= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                        }`}>
                          {job.urgencyScore}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-medium capitalize">
                          {job.source}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
