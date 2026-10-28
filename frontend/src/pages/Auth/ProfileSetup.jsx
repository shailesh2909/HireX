import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, setUser } from '../../utils/flowState';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const user = getUser();
  const lockedFirstName = useMemo(() => String(user?.firstName || '').trim(), [user?.firstName]);
  const lockedLastName = useMemo(() => String(user?.lastName || '').trim(), [user?.lastName]);
  const extractedMobile = user?.mobileNumber || user?.mobile || '';
  const [lookingFor, setLookingFor] = useState([]);
  const [isPublicFigure, setIsPublicFigure] = useState(false);
  const [mobileNumber, setMobileNumber] = useState(extractedMobile);
  const [error, setError] = useState('');

  function toggleLookingFor(option) {
    setLookingFor((current) => (
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    ));
  }

  function handleContinue() {
    setError('');
    if (!lockedFirstName || !lockedLastName) {
      setError('Government ID name was not found. Please complete Didit verification again.');
      return;
    }
    const nextUser = {
      ...(user || {}),
      firstName: lockedFirstName,
      lastName: lockedLastName,
      mobileNumber: String(mobileNumber || '').trim(),
      mobile: String(mobileNumber || '').trim(),
    };
    setUser(nextUser);
    navigate('/verification-complete');
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-[980px] rounded-[30px] border border-[rgba(91,97,110,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(10,11,13,0.08)] lg:p-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Step 2 of 3</p>
            <h1 className="mt-2 text-[38px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Image process</h1>
          </div>
          <span className="rounded-full bg-[#0052ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">Verified user</span>
        </div>

        <p className="max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">
          This is Step 2 after Didit verification. Confirm your details and continue to completion.
        </p>
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="firstName">First name (from ID)</label>
            <input id="firstName" type="text" value={lockedFirstName} readOnly className="w-full cursor-not-allowed rounded-2xl border border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] px-4 py-3 text-sm text-[#5b616e] outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="lastName">Last name (from ID)</label>
            <input id="lastName" type="text" value={lockedLastName} readOnly className="w-full cursor-not-allowed rounded-2xl border border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] px-4 py-3 text-sm text-[#5b616e] outline-none" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="mobileNumber">Mobile number</label>
            <input
              id="mobileNumber"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              readOnly
              placeholder="Not available from government ID"
              className="w-full cursor-not-allowed rounded-2xl border border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] px-4 py-3 text-sm text-[#5b616e] outline-none"
            />
            <p className="text-xs text-[#5b616e]">
              {extractedMobile
                ? 'Auto-filled from your verified document and locked.'
                : 'Didit did not provide a phone number from the government ID.'}
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="headline">Professional headline</label>
            <input id="headline" type="text" placeholder="Product Designer | SaaS | UX Research" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="location">Location</label>
            <input id="location" type="text" placeholder="Mumbai, India" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="experience">Experience</label>
            <input id="experience" type="text" placeholder="4 years" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="skills">Top skills</label>
            <input id="skills" type="text" placeholder="React, Node.js, Growth Marketing" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="bio">About</label>
            <textarea id="bio" rows="5" placeholder="Write a short summary about your work and goals..." className="w-full resize-none rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="education">Education</label>
            <input id="education" type="text" placeholder="School / College | Degree | Duration" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
            <p className="text-xs text-[#5b616e]">Schema supports structured education data, so enter items separated by pipe symbols for now.</p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="experience">Experience</label>
            <input id="experience" type="text" placeholder="Company | Role | Duration" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
            <p className="text-xs text-[#5b616e]">You can add multiple roles separated by commas or create one entry per line later.</p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a0b0d]" htmlFor="skills">Skills</label>
            <input id="skills" type="text" placeholder="React, Node.js, Growth Marketing" className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-semibold text-[#0a0b0d]">Looking for</p>
            <div className="flex flex-wrap gap-3">
              {['Freelance', 'Consulting', 'Hiring', 'Partnerships', 'Mentorship'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleLookingFor(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${lookingFor.includes(option) ? 'bg-[#0052ff] text-white' : 'border border-[rgba(91,97,110,0.25)] text-[#0a0b0d] hover:border-[#0052ff] hover:text-[#0052ff]'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-start gap-3 text-sm text-[#5b616e] sm:col-span-2">
            <input type="checkbox" checked={isPublicFigure} onChange={(e) => setIsPublicFigure(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0052ff]" />
            I am a public figure or creator and want broader visibility.
          </label>

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="button" onClick={handleContinue} className="rounded-full bg-[#0052ff] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]">
              Save and continue
            </button>
            <button type="button" onClick={() => navigate('/verification-complete')} className="rounded-full border border-[rgba(91,97,110,0.25)] px-6 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
