import React, { useMemo, useState, useEffect } from 'react';
import { getProfile, updateResume } from '../utils/appData';
import { getJobs, createJob, getMyConnections } from '../utils/api';
import { isBusinessRole } from '../utils/flowState';
import DashboardNavbar from '../components/DashboardNavbar';
import { FileUp, FileText, Trash2, Zap, CheckCircle2, CircleDashed, Shield, ChevronRight, X, Pencil } from 'lucide-react';
import { uploadFile } from '../utils/imagekit';
import { PostSkeleton } from '../components/Skeleton';


function OpportunityCard({ item, onApply, onSave, canApply, hasResume }) {
  return (
    <article className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0a0b0d]">{item.title}</h3>
          <p className="mt-1 text-sm text-[#5b616e]">{item.company} • {item.mode}</p>
        </div>
        <span className="rounded-sm bg-[#eef0f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a0b0d]">
          {item.tag}
        </span>
      </div>
      <p className="mt-4 text-[15px] leading-[1.6] text-[#0a0b0d]">{item.description}</p>
      <div className="mt-4 flex gap-3">
        {canApply ? (
          <button
            type="button"
            onClick={() => onApply(item)}
            disabled={item.appliedByMe}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${item.appliedByMe
                ? 'bg-[#10B981] text-white opacity-80 cursor-default'
                : hasResume
                  ? 'bg-[#0052ff] text-white hover:bg-[#0046d8]'
                  : 'bg-[#eef0f3] text-[#5b616e] hover:bg-[#dfe6ef]'
              }`}
          >
            {item.appliedByMe ? (
              <><CheckCircle2 size={14} /> Applied</>
            ) : hasResume ? (
              <><Zap size={14} /> Easy Apply</>
            ) : (
              <>Apply</>
            )}
          </button>
        ) : (
          <span className="rounded-sm bg-[#eef0f3] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#5b616e]">Employer view</span>
        )}
        <button type="button" onClick={() => onSave(item.id)} className="rounded-sm border border-[rgba(91,97,110,0.25)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0a0b0d] hover:bg-[#f8fafc]">{item.savedByMe ? 'Saved' : 'Save'}</button>
      </div>
    </article>
  );
}

export default function Opportunities() {
  const isBusiness = isBusinessRole();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [opportunities, setOpportunities] = useState([]);

  async function loadOpportunities() {
    try {
      const data = await getJobs();
      setOpportunities(data);
    } catch (err) {
      console.error("Failed to fetch opportunities", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOpportunities();
  }, [refreshKey]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('explore'); // 'explore' | 'applied' | 'saved'
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    minYearsExp: '',
    location: '',
    companyId: '',
    mode: 'Remote',
    tag: 'Hiring',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [applyingOpportunity, setApplyingOpportunity] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  const filteredOpportunities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = opportunities.filter((item) => {
      const matchesQuery =
        query.length === 0 ||
        item.title.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query) ||
        item.mode.toLowerCase().includes(query);

      const matchesTag = selectedTag === 'All' || item.tag === selectedTag;
      const matchesMode = selectedMode === 'All' || item.mode === selectedMode;

      let matchesViewMode = true;
      if (!isBusiness) {
        if (viewMode === 'applied') matchesViewMode = item.appliedByMe;
        if (viewMode === 'saved') matchesViewMode = item.savedByMe;
      }

      return matchesQuery && matchesTag && matchesMode && matchesViewMode;
    });

    if (sortBy === 'title-asc') {
      return [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortBy === 'company-asc') {
      return [...result].sort((a, b) => a.company.localeCompare(b.company));
    }

    return result;
  }, [opportunities, searchQuery, selectedTag, selectedMode, sortBy, viewMode, isBusiness]);

  function clearFilters() {
    setSearchQuery('');
    setSelectedTag('All');
    setSelectedMode('All');
    setSortBy('relevance');
  }

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleApply(opportunity) {
    if (isBusiness || opportunity.appliedByMe) {
      return;
    }
    setApplyingOpportunity(opportunity);
    setCoverLetter('');
  }

  async function submitApplication() {
    setIsSubmittingApp(true);
    // Simulate a brief network delay for realism
    await new Promise((resolve) => setTimeout(resolve, 800));
    applyOpportunity(applyingOpportunity.id);
    setIsSubmittingApp(false);
    setApplyingOpportunity(null);
    refresh();
  }

  function handleSave(opportunityId) {
    toggleSaveOpportunity(opportunityId);
    refresh();
  }

  async function handleCreateOpportunity() {
    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      return;
    }

    try {
      await createJob({
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        location: jobForm.location.trim() || 'Remote',
        mode: jobForm.mode,
        tag: jobForm.tag,
        company: jobForm.companyId.trim() || undefined,
      });

      setJobForm({
        title: '',
        description: '',
        minYearsExp: '',
        location: '',
        companyId: '',
        mode: 'Remote',
        tag: 'Hiring',
      });
      refresh();
    } catch (err) {
      console.error("Failed to create opportunity", err);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        <DashboardNavbar activePath="/opportunities" />

        <header className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Opportunities</p>
          <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Verified jobs and collaboration calls</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Only verified businesses and professionals can post here. Less spam, better signal.</p>
        </header>

        {!isBusiness && (
          <div className="flex gap-6 border-b border-[rgba(91,97,110,0.18)] px-2">
            <button 
              onClick={() => setViewMode('explore')}
              className={`pb-3 pt-2 text-[15px] font-semibold transition-colors ${viewMode === 'explore' ? 'border-b-2 border-[#0052ff] text-[#0052ff]' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
            >
              Explore Opportunities
            </button>
            <button 
              onClick={() => setViewMode('applied')}
              className={`pb-3 pt-2 text-[15px] font-semibold transition-colors ${viewMode === 'applied' ? 'border-b-2 border-[#0052ff] text-[#0052ff]' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
            >
              My Applications
            </button>
            <button 
              onClick={() => setViewMode('saved')}
              className={`pb-3 pt-2 text-[15px] font-semibold transition-colors ${viewMode === 'saved' ? 'border-b-2 border-[#0052ff] text-[#0052ff]' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
            >
              Saved Jobs
            </button>
          </div>
        )}

        <section className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr_auto]">
            <input
              type="text"
              placeholder="Search by role, company, skill, location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-sm border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]"
            />

            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full rounded-sm border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]"
            >
              <option value="All">All Types</option>
              <option value="Hiring">Hiring</option>
              <option value="Consulting">Consulting</option>
              <option value="Partnership">Partnership</option>
              <option value="Freelance">Freelance</option>
            </select>

            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full rounded-sm border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]"
            >
              <option value="All">All Modes</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Contract">Contract</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-sm border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="title-asc">Sort: Role A-Z</option>
              <option value="company-asc">Sort: Company A-Z</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-sm border border-[rgba(91,97,110,0.25)] px-5 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
            >
              Clear
            </button>
          </div>

          <p className="mt-4 text-sm text-[#5b616e]">
            Showing <span className="font-semibold text-[#0a0b0d]">{filteredOpportunities.length}</span> opportunities
          </p>
        </section>

        {isBusiness ? (
          <section className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Create job post</p>
                <h2 className="mt-1 text-[22px] font-semibold text-[#0a0b0d]">Post a verified opportunity</h2>
              </div>
              <span className="rounded-sm bg-[#0052ff]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0052ff]">Job service fields</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="jobTitle" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Title</label>
                <input id="jobTitle" type="text" value={jobForm.title} onChange={(e) => setJobForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Frontend Engineer" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
              </div>
              <div className="space-y-2">
                <label htmlFor="jobCompany" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Company ID</label>
                <input id="jobCompany" type="text" value={jobForm.companyId} onChange={(e) => setJobForm((prev) => ({ ...prev, companyId: e.target.value }))} placeholder="company_cuid" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
              </div>
              <div className="space-y-2">
                <label htmlFor="jobLocation" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Location</label>
                <input id="jobLocation" type="text" value={jobForm.location} onChange={(e) => setJobForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Remote / Bengaluru" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
              </div>
              <div className="space-y-2">
                <label htmlFor="jobMode" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Mode</label>
                <select id="jobMode" value={jobForm.mode} onChange={(e) => setJobForm((prev) => ({ ...prev, mode: e.target.value }))} className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]">
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="jobTag" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Type</label>
                <select id="jobTag" value={jobForm.tag} onChange={(e) => setJobForm((prev) => ({ ...prev, tag: e.target.value }))} className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]">
                  <option value="Hiring">Hiring</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="jobExp" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Minimum experience (years)</label>
                <input id="jobExp" type="number" min="0" value={jobForm.minYearsExp} onChange={(e) => setJobForm((prev) => ({ ...prev, minYearsExp: e.target.value }))} placeholder="2" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="jobDesc" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Description</label>
                <textarea id="jobDesc" rows="4" value={jobForm.description} onChange={(e) => setJobForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe the job requirement" className="w-full resize-none rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handleCreateOpportunity} className="rounded-full bg-[#0052ff] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]">Publish job</button>
              <button type="button" className="rounded-full border border-[rgba(91,97,110,0.25)] px-5 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Save draft</button>
            </div>
          </section>
        ) : (
          <section className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex-1 min-w-[300px]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Easy Apply Settings</p>
                <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-[#0a0b0d]">
                  {getProfile()?.resume ? 'Your resume is ready' : 'Upload your resume to Easy Apply'}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5b616e]">
                  {getProfile()?.resume
                    ? `Currently using: ${getProfile()?.resume?.name}. You can apply to jobs with a single click.`
                    : 'A verified resume allows you to apply to verified job posts instantly without re-entering your details.'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {getProfile()?.resume ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(0,82,255,0.1)] bg-[#0052ff]/5 px-5 py-3">
                      <FileText size={20} className="text-[#0052ff]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0a0b0d]">{getProfile()?.resume?.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[#5b616e]">Ready for applications</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateResume(null);
                        refresh();
                      }}
                      className="rounded-full p-3 text-[#5b616e] transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Remove resume"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id="resume-upload"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsUploading(true);
                            const result = await uploadFile(file, `resume-${Date.now()}-${file.name}`, ['resume']);
                            updateResume({ name: file.name, size: file.size, url: result.url });
                            refresh();
                          } catch (err) {
                            console.error('Resume upload failed:', err);
                            alert('Failed to upload resume.');
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      accept=".pdf,.doc,.docx"
                    />
                    <label
                      htmlFor="resume-upload"
                      className={`flex cursor-pointer items-center gap-2 rounded-full bg-[#0052ff] px-8 py-4 text-[14px] font-semibold text-white transition-all hover:bg-[#0046d8] hover:shadow-lg active:scale-95 ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {isUploading ? (
                        <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading...</>
                      ) : (
                        <><FileUp size={18} /> Upload Resume</>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            filteredOpportunities.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                onApply={handleApply}
                onSave={handleSave}
                canApply={!isBusiness}
                hasResume={Boolean(getProfile()?.resume)}
              />
            ))
          )}

          {!isLoading && filteredOpportunities.length === 0 && (
            <div className="md:col-span-2 rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
              <p className="text-lg font-semibold text-[#0a0b0d]">No opportunities found</p>
              <p className="mt-2 text-sm text-[#5b616e]">Try changing search keywords or resetting filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-sm bg-[#0052ff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {applyingOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[600px] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[rgba(91,97,110,0.12)] px-6 py-5">
              <div>
                <h3 className="text-[20px] font-semibold text-[#0a0b0d]">Apply to {applyingOpportunity.company}</h3>
                <p className="text-sm text-[#5b616e] mt-1">{applyingOpportunity.title} • {applyingOpportunity.mode}</p>
              </div>
              <button onClick={() => setApplyingOpportunity(null)} className="rounded-full p-2 text-[#5b616e] hover:bg-[#f8fafc] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {getProfile()?.resume ? (
                <div className="rounded-xl border border-[rgba(16,185,129,0.2)] bg-[#10B981]/5 p-4 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0a0b0d]">Your resume is attached</p>
                    <p className="text-[13px] text-[#5b616e] mt-1">We will send {getProfile()?.resume?.name} along with your application.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[#F59E0B]/5 p-4 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0a0b0d]">No resume attached</p>
                    <p className="text-[13px] text-[#5b616e] mt-1">You haven't uploaded a default resume. You can still apply, but adding one in your settings increases your chances.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#0a0b0d]">Cover Letter / Pitch</label>
                <p className="text-xs text-[#5b616e]">Explain why you're a great fit for this role. Keep it concise.</p>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows="5"
                  placeholder="Hi team, I am very interested in this role because..."
                  className="w-full resize-none rounded-xl border border-[rgba(91,97,110,0.25)] p-4 text-sm outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff]"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#0a0b0d]">Contact Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[rgba(91,97,110,0.12)] bg-[#f8fafc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a909c]">Email</p>
                    <p className="text-sm font-medium text-[#0a0b0d] mt-1 truncate">{getProfile()?.email || 'Not provided'}</p>
                  </div>
                  <div className="rounded-xl border border-[rgba(91,97,110,0.12)] bg-[#f8fafc] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a909c]">Phone</p>
                    <p className="text-sm font-medium text-[#0a0b0d] mt-1 truncate">{getProfile()?.mobile || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[rgba(91,97,110,0.12)] bg-[#fafbfd] px-6 py-5 flex items-center justify-end gap-3">
              <button onClick={() => setApplyingOpportunity(null)} disabled={isSubmittingApp} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#5b616e] hover:bg-[#eef0f3] disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitApplication}
                disabled={isSubmittingApp || !coverLetter.trim()}
                className="flex items-center gap-2 rounded-full bg-[#0052ff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0046d8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingApp ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {isSubmittingApp ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
