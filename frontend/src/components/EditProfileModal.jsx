import React, { useState } from 'react';
import { X } from 'lucide-react';

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-sm border border-[#E2E8F0] bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
      {children}
    </label>
  );
}

function TextInput({ id, value, onChange, placeholder }) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
    />
  );
}

function Toggle({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between rounded-sm border border-[#E2E8F0] px-3 py-2.5">
      <span className="text-sm font-medium text-[#0F172A]">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#0066FF]"
      />
    </label>
  );
}

export default function EditProfileModal({ mode = 'all', draftInfo, onFieldChange, onSave, onCancel }) {
  const isAboutMode = mode === 'about';
  const [languageInput, setLanguageInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  function addEducationField() {
    const next = [...(draftInfo.educations || []), ''];
    onFieldChange('educations', next);
  }

  function updateEducation(index, value) {
    const next = [...(draftInfo.educations || [])];
    next[index] = value;
    onFieldChange('educations', next);
  }

  function removeEducation(index) {
    const next = (draftInfo.educations || []).filter((_, itemIndex) => itemIndex !== index);
    onFieldChange('educations', next);
  }

  function addLanguage() {
    const trimmed = languageInput.trim();
    if (!trimmed) {
      return;
    }

    const current = draftInfo.languages || [];
    if (current.includes(trimmed)) {
      setLanguageInput('');
      return;
    }

    onFieldChange('languages', [...current, trimmed]);
    setLanguageInput('');
  }

  function removeLanguage(language) {
    const next = (draftInfo.languages || []).filter((item) => item !== language);
    onFieldChange('languages', next);
  }

  function addLink() {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      return;
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const current = draftInfo.links || [];
    if (current.some((item) => item.url === normalized)) {
      setLinkInput('');
      return;
    }

    onFieldChange('links', [...current, { id: `link-${Date.now()}`, url: normalized }]);
    setLinkInput('');
  }

  function removeLink(linkId) {
    const next = (draftInfo.links || []).filter((item) => item.id !== linkId);
    onFieldChange('links', next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6 sm:px-6" onClick={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-sm border border-[#CBD5E1] bg-[#F8FAFC] shadow-[0_20px_50px_rgba(2,6,23,0.32)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(91,97,110,0.12)] bg-white px-5 py-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#0a0b0d]">{isAboutMode ? 'Edit about' : 'Edit profile'}</h2>
            {isAboutMode ? (
              <p className="mt-4 text-[13px] leading-relaxed text-[#5b616e]">
                You can write about your years of experience, industry, or skills. People also talk about their achievements or previous job experiences.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#64748B]">Update your information section by section.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="self-start rounded-full p-2 text-[#5b616e] transition-colors hover:bg-[#f5f7fb] hover:text-[#0a0b0d]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-160px)] space-y-6 overflow-y-auto p-5 sm:p-6">
          {isAboutMode ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgba(91,97,110,0.2)] bg-white p-4 focus-within:border-[#0066FF]">
                <textarea
                  id="about"
                  rows="12"
                  value={draftInfo.about || ''}
                  onChange={(event) => onFieldChange('about', event.target.value)}
                  placeholder="Share your professional story..."
                  className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#0a0b0d] outline-none"
                />
                <div className="mt-4 flex items-center justify-between border-t border-[rgba(91,97,110,0.08)] pt-4">
                  <button type="button" className="flex items-center gap-2 text-[13px] font-medium text-[#0066FF] hover:underline">
                    <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-orange-400 text-[8px] text-white">AI</span>
                    Get AI suggestions <span className="font-normal text-[#5b616e]">with Premium</span>
                  </button>
                  <span className="text-[12px] text-[#5b616e]">
                    {(draftInfo.about || '').length.toLocaleString()} / 2,600
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="openTo">Open to</Label>
                <textarea
                  id="openTo"
                  rows="2"
                  value={draftInfo.openTo || ''}
                  onChange={(event) => onFieldChange('openTo', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[rgba(91,97,110,0.12)] bg-white px-4 py-3 text-sm text-[#0a0b0d] outline-none transition-colors focus:border-[#0066FF]"
                />
              </div>
            </div>
          ) : (
            <>
              <Section title="Basic info" subtitle="Your identity details shown on your profile header.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <TextInput id="firstName" value={draftInfo.firstName || ''} onChange={(value) => onFieldChange('firstName', value)} placeholder="First name" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <TextInput id="lastName" value={draftInfo.lastName || ''} onChange={(value) => onFieldChange('lastName', value)} placeholder="Last name" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="mobile">Mobile number</Label>
                    <TextInput id="mobile" value={draftInfo.mobile || ''} onChange={(value) => onFieldChange('mobile', value)} placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <input
                      id="email"
                      type="email"
                      value={draftInfo.email || ''}
                      onChange={(event) => onFieldChange('email', event.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="additionalName">Additional name</Label>
                    <TextInput id="additionalName" value={draftInfo.additionalName || ''} onChange={(value) => onFieldChange('additionalName', value)} placeholder="Middle name / preferred name" />
                  </div>
                  <div>
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <select
                      id="pronouns"
                      value={draftInfo.pronouns || ''}
                      onChange={(event) => onFieldChange('pronouns', event.target.value)}
                      className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="He/Him">He/Him</option>
                      <option value="She/Her">She/Her</option>
                      <option value="They/Them">They/Them</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">Headline</p>
                  <p className="mt-1 text-sm text-[#475569]">System controlled field. This is non-editable.</p>
                </div>

                <div>
                  <Label htmlFor="languageInput">Languages</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(draftInfo.languages || []).map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => removeLanguage(language)}
                        className="rounded-sm border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#334155]"
                      >
                        {language} x
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="languageInput"
                      type="text"
                      value={languageInput}
                      onChange={(event) => setLanguageInput(event.target.value)}
                      placeholder="Add language"
                      className="w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="rounded-sm border border-[#0066FF] px-3 py-2 text-sm font-semibold text-[#0066FF]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Professional" subtitle="Role, industry, and expertise highlights.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="currentPosition">Current position</Label>
                    <TextInput id="currentPosition" value={draftInfo.currentPosition || ''} onChange={(value) => onFieldChange('currentPosition', value)} placeholder="Senior Frontend Engineer" />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <TextInput id="industry" value={draftInfo.industry || ''} onChange={(value) => onFieldChange('industry', value)} placeholder="Semiconductor Manufacturing" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills">Skills</Label>
                  <textarea
                    id="skills"
                    rows="3"
                    value={draftInfo.skills || ''}
                    onChange={(event) => onFieldChange('skills', event.target.value)}
                    placeholder="React, JavaScript, Collaboration"
                    className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                  />
                </div>

                <Toggle
                  id="showCurrentPosition"
                  label="Show current position in my intro"
                  checked={Boolean(draftInfo.showCurrentPosition)}
                  onChange={(value) => onFieldChange('showCurrentPosition', value)}
                />
              </Section>

              <Section title="Education" subtitle="School, college, diploma, and other education details.">
                <div className="space-y-2">
                  {(draftInfo.educations || []).map((education, index) => (
                    <div key={`education-${index}`} className="flex gap-2">
                      <input
                        type="text"
                        value={education}
                        onChange={(event) => updateEducation(index, event.target.value)}
                        placeholder="School / College / Diploma"
                        className="w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                      />
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="rounded-sm border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#475569]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEducationField}
                    className="rounded-sm border border-[#0066FF] px-3 py-2 text-sm font-semibold text-[#0066FF]"
                  >
                    + Add education
                  </button>
                </div>

                <Toggle
                  id="showEducation"
                  label="Show school in my intro"
                  checked={Boolean(draftInfo.showEducation)}
                  onChange={(value) => onFieldChange('showEducation', value)}
                />
              </Section>

              <Section title="Location" subtitle="Where you are currently based.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="country">Country / region</Label>
                    <TextInput id="country" value={draftInfo.country || ''} onChange={(value) => onFieldChange('country', value)} placeholder="India" />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <TextInput id="state" value={draftInfo.state || ''} onChange={(value) => onFieldChange('state', value)} placeholder="Maharashtra" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <TextInput id="city" value={draftInfo.city || ''} onChange={(value) => onFieldChange('city', value)} placeholder="Pune" />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal code</Label>
                    <TextInput id="postalCode" value={draftInfo.postalCode || ''} onChange={(value) => onFieldChange('postalCode', value)} placeholder="411043" />
                  </div>
                </div>
              </Section>

              <Section title="Links" subtitle="Add LinkedIn, GitHub, portfolio, or any public link.">
                <div className="space-y-2">
                  {(draftInfo.links || []).map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="url"
                        value={item.url || ''}
                        onChange={(event) => {
                          const next = (draftInfo.links || []).map((link) => (
                            link.id === item.id ? { ...link, url: event.target.value } : link
                          ));
                          onFieldChange('links', next);
                        }}
                        className="w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(item.id)}
                        className="rounded-sm border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#475569]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(event) => setLinkInput(event.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={addLink}
                      className="rounded-sm border border-[#0066FF] px-3 py-2 text-sm font-semibold text-[#0066FF]"
                    >
                      + Add link
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="About and preferences" subtitle="How others understand your profile.">
                <div>
                  <Label htmlFor="about">About</Label>
                  <textarea
                    id="about"
                    rows="4"
                    value={draftInfo.about || ''}
                    onChange={(event) => onFieldChange('about', event.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <Label htmlFor="openTo">Open to</Label>
                  <textarea
                    id="openTo"
                    rows="2"
                    value={draftInfo.openTo || ''}
                    onChange={(event) => onFieldChange('openTo', event.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#0066FF]"
                  />
                </div>
              </Section>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[rgba(91,97,110,0.12)] bg-white px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-6 py-2 text-[14px] font-semibold text-[#5b616e] transition-colors hover:text-[#0a0b0d]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-[#0066FF] px-8 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#0056d6]"
          >
            {isAboutMode ? 'Save' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}