import React from 'react';
import { useNavigate } from 'react-router-dom';

function PillButton({ children, variant = 'solid', onClick, className = '' }) {
  const base = 'inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-black';
  const styles = {
    solid: 'bg-[#0052ff] text-white hover:bg-[#578bfa] border border-[#0052ff]',
    ghost: 'bg-[#eef0f3] text-[#0a0b0d] hover:bg-[#dfe6ef] border border-[#eef0f3]',
    bordered: 'bg-transparent text-[#0052ff] border border-[#0052ff] hover:bg-[#0052ff] hover:text-white',
    dark: 'bg-[#282b31] text-white hover:bg-[#578bfa] border border-[#282b31]',
  };

  return (
    <button onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function FeatureCard({ index, title, text, note, dark = false, accent = false, className = '' }) {
  return (
    <article className={`group relative overflow-hidden rounded-[18px] border p-8 shadow-[0_1px_0_rgba(10,11,13,0.02)] transition-all duration-300 hover:-translate-y-1 ${dark ? 'border-[rgba(255,255,255,0.08)] bg-[#282b31] text-white' : 'border-[rgba(91,97,110,0.16)] bg-white text-[#0a0b0d]'} ${className}`}>
      <div className={`absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rounded-full blur-3xl ${accent ? 'bg-[#0052ff]/16' : dark ? 'bg-white/8' : 'bg-[#eef0f3]'}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-semibold transition-transform group-hover:scale-105 ${dark ? 'bg-white/8 text-white' : 'bg-[#eef0f3] text-[#0052ff]'}`}>
          0{index}
        </div>
        <span className={`mt-2 h-px flex-1 ${dark ? 'bg-white/10' : 'bg-[#d7deea]'}`} />
      </div>
      <div className="relative mt-7 space-y-4">
        <h3 className="text-[20px] font-semibold leading-[1.28] tracking-[-0.02em]">{title}</h3>
        <p className={`text-[16px] leading-[1.6] ${dark ? 'text-white/76' : 'text-[#5b616e]'}`}>{text}</p>
        <div className={`flex flex-wrap gap-2 pt-2 ${dark ? 'text-white/80' : 'text-[#0a0b0d]'}`}>
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${dark ? 'bg-white/8' : 'bg-[#eef0f3]'}`}>{note}</span>
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${dark ? 'bg-[#0052ff] text-white' : 'bg-[#0052ff] text-white'}`}>Verified only</span>
        </div>
      </div>
    </article>
  );
}

function FeatureShowcase() {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:auto-rows-[280px]">
      <article className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#121316] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] lg:col-span-7 lg:row-span-2 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80">
              Real identity engine
            </div>
            <div className="rounded-full bg-[#0052ff] px-4 py-2 text-[13px] font-semibold text-white">
              Verified Human ✅
            </div>
          </div>

          <div className="max-w-[520px] space-y-5">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a6b3d1]">Featured flow</p>
            <h3 className="font-display text-[42px] leading-[1.02] tracking-[-0.04em] sm:text-[56px]">
              Real people. Real companies. Real opportunities.
            </h3>
            <p className="text-[18px] leading-[1.56] text-white/72">
              Start as an individual or business, complete verification, and unlock a trust-first network built for hiring, collaboration, and growth.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">People</p>
              <p className="mt-3 text-[30px] font-semibold leading-none">10K+</p>
              <p className="mt-2 text-[14px] text-white/70">Verified members</p>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">Businesses</p>
              <p className="mt-3 text-[30px] font-semibold leading-none">2K+</p>
              <p className="mt-2 text-[14px] text-white/70">Approved companies</p>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">Trust</p>
              <p className="mt-3 text-[30px] font-semibold leading-none">100%</p>
              <p className="mt-2 text-[14px] text-white/70">Verified-first flow</p>
            </div>
          </div>
        </div>
      </article>

      <FeatureCard index="1" title="Connect with professionals" text="Discover verified people in your industry and grow a meaningful network." note="Industry graph" dark accent className="lg:col-span-5" />
      <FeatureCard index="2" title="Share verified achievements" text="Publish milestones, case studies, and insights where credibility is tied to verified identity." note="Credibility first" dark className="lg:col-span-4" />
      <FeatureCard index="3" title="Discover jobs and partnerships" text="Find role openings, project gigs, and strategic tie-ups posted by verified professionals and businesses." note="Opportunity feed" dark accent className="lg:col-span-4" />
      <FeatureCard index="4" title="Build long-term trust" text="Turn one conversation into lasting collaboration with transparent, verified profiles on both sides." note="Reputation layer" dark className="lg:col-span-4" />
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-[20px] border border-[rgba(91,97,110,0.18)] bg-white p-8">
      <p className="text-[36px] font-normal leading-[1.11] text-[#0a0b0d]">{value}</p>
      <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.16px] text-[#5b616e]">{label}</p>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#0a0b0d]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        .font-display {
          font-family: 'Montserrat', sans-serif;
        }
        .font-sans-ui {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-[rgba(91,97,110,0.14)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052ff] text-white shadow-sm">
                <span className="text-lg font-bold">V</span>
              </div>
              <div>
                <p className="font-display text-[22px] leading-none text-[#0a0b0d]">SyncUp</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b616e]">verified professional network</p>
              </div>
            </div>
            <nav className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-[16px] font-semibold text-[#0a0b0d] transition-colors hover:text-[#0052ff]">Features</a>
              <a href="#companies" className="text-[16px] font-semibold text-[#0a0b0d] transition-colors hover:text-[#0052ff]">Companies</a>
              <a href="#about" className="text-[16px] font-semibold text-[#0a0b0d] transition-colors hover:text-[#0052ff]">About</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <PillButton variant="ghost" onClick={() => navigate('/signin')}>Sign In</PillButton>
            <PillButton variant="solid" onClick={() => navigate('/signup/individual')} className="hidden sm:inline-flex">Get Verified</PillButton>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-white px-6 pb-20 pt-16 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-[820px] space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(91,97,110,0.2)] bg-[#eef0f3] px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-[#0052ff]" />
                <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0a0b0d]">Identity-first professional network</span>
              </div>

              <h1 className="font-display text-[52px] leading-[1] tracking-[-0.04em] text-[#0a0b0d] sm:text-[64px] lg:text-[80px]">
                Where Verified People
                <br />
                Build Serious Careers.
              </h1>

              <p className="max-w-[680px] text-[18px] leading-[1.56] text-[#5b616e] sm:text-[20px]">
                SyncUp is the trust layer for modern networking. Individuals and businesses verify first, then connect for hiring, projects, referrals, and high-value collaboration.
              </p>

              <p className="max-w-[680px] text-[17px] font-semibold leading-[1.5] text-[#0a0b0d]">
                Punch line: Trust first. Opportunity faster.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <PillButton variant="solid" onClick={() => navigate('/signup/individual')}>Join as Individual</PillButton>
                <PillButton variant="ghost" onClick={() => navigate('/signup/business')}>Join as Business</PillButton>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  <img alt="professional 1" className="h-10 w-10 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" />
                  <img alt="professional 2" className="h-10 w-10 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" />
                  <img alt="professional 3" className="h-10 w-10 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0a0b0d]">10K+ verified members</p>
                  <p className="text-[14px] text-[#5b616e]">Built for founders, freelancers, teams, and recruiters</p>
                </div>
              </div>
            </div>

            <div className="relative lg:-mt-6">
              <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#0052ff]/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#0052ff]/8 blur-3xl" />
              <div className="rounded-none border border-[rgba(91,97,110,0.16)] bg-[#f7f7f7de] p-5 shadow-[0_30px_80px_rgba(10,11,13,0.08)]">
                <div className="overflow-hidden rounded-none bg-white">
                  <div className="relative aspect-[4/4.2] overflow-hidden bg-[#eef0f3]">
                    <img
                      alt="Professionals networking in a modern workspace"
                      className="h-full w-full object-cover object-[center_30%]"
                      src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                    <div className="absolute left-5 top-5 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#0a0b0d] shadow-sm">
                      Verified Human ✅
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 rounded-none border border-white/40 bg-[rgba(247,247,247,0.88)] p-5 backdrop-blur-xl">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Trust signal</p>
                          <p className="mt-1 text-[32px] font-medium leading-none text-[#0a0b0d]">100%</p>
                          <p className="mt-1 text-[14px] text-[#5b616e]">One person, one profile, one accountable identity.</p>
                        </div>
                        <div className="rounded-full border border-[#0052ff] px-3 py-1 text-[13px] font-semibold text-[#0052ff]">
                          Verified badge
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#0a0b0d] px-6 py-24 text-white lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-2xl space-y-4">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Networking features</p>
                <h2 className="font-display text-[36px] leading-[1.08] tracking-[-0.03em] sm:text-[44px]">Built for verified connections, not vanity metrics.</h2>
                <p className="text-[18px] leading-[1.56] text-white/72">Every action in SyncUp starts with identity trust, so networking outcomes stay useful for both individuals and companies.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[13px] font-semibold tracking-[0.12em] text-white/80 uppercase">
                Zero fake profile tolerance
              </div>
            </div>

            <FeatureShowcase />
          </div>
        </section>

        <section id="companies" className="bg-white px-6 py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 max-w-3xl space-y-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Trust differentiator</p>
              <h2 className="font-display text-[36px] leading-[1.11] tracking-[-0.03em] sm:text-[44px]">Identity and business verification before interaction.</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[20px] border border-[rgba(91,97,110,0.16)] bg-[#eef0f3] p-8 lg:p-10">
                <div className="mb-6 flex items-center gap-3">
                  <span className="rounded-full bg-[#0052ff] px-4 py-2 text-[13px] font-semibold text-white">Verified Human ✅</span>
                  <span className="rounded-full border border-[#0052ff] px-4 py-2 text-[13px] font-semibold text-[#0052ff]">Face verification</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[16px] bg-white p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0f3] text-[#0052ff]"><span className="material-symbols-outlined">face</span></div>
                    <h3 className="mt-5 text-[18px] font-semibold leading-[1.33]">Face liveness check</h3>
                    <p className="mt-2 text-[16px] leading-[1.5] text-[#5b616e]">Live facial verification blocks bot accounts and spoofing attempts at signup.</p>
                  </div>
                  <div className="rounded-[16px] bg-white p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0f3] text-[#0052ff]"><span className="material-symbols-outlined">person_off</span></div>
                    <h3 className="mt-5 text-[18px] font-semibold leading-[1.33]">Duplicate prevention</h3>
                    <p className="mt-2 text-[16px] leading-[1.5] text-[#5b616e]">Embedding match logic helps enforce one person to one profile for cleaner trust.
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-white p-6 sm:col-span-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0f3] text-[#0052ff]"><span className="material-symbols-outlined">domain_verification</span></div>
                    <h3 className="mt-5 text-[18px] font-semibold leading-[1.33]">Verified companies</h3>
                    <p className="mt-2 text-[16px] leading-[1.5] text-[#5b616e]">Company onboarding and validation happen before posting jobs, events, or partnership requests.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#0a0b0d] p-8 text-white lg:p-10">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Trust score</p>
                    <h3 className="mt-2 font-display text-[32px] leading-[1.13]">Trust-first network</h3>
                  </div>
                  <div className="rounded-full bg-[#0052ff] px-4 py-2 text-[13px] font-semibold text-white">Verified Human ✅</div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[16px] bg-[#282b31] p-5">
                    <p className="text-[13px] font-semibold text-white/70">Fake identities blocked</p>
                    <p className="mt-2 text-[32px] font-medium leading-none">99%</p>
                  </div>
                  <div className="rounded-[16px] bg-[#282b31] p-5">
                    <p className="text-[13px] font-semibold text-white/70">Referral abuse reduced</p>
                    <p className="mt-2 text-[32px] font-medium leading-none">Verified only</p>
                  </div>
                  <div className="rounded-[16px] bg-[#282b31] p-5">
                    <p className="text-[13px] font-semibold text-white/70">Accountability</p>
                    <p className="mt-2 text-[16px] leading-[1.5] text-white/80">Every user is tied to a real verified identity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f3] px-6 py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 max-w-3xl space-y-4 text-center lg:text-left">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Professionals & businesses</p>
              <h2 className="font-display text-[36px] leading-[1.11] tracking-[-0.03em] sm:text-[44px]">Two sides of the same trusted network.</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-[20px] bg-white p-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)] lg:p-10">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Professionals</p>
                <h3 className="mt-4 text-[32px] font-normal leading-[1.13] text-[#0a0b0d]">Create your profile. Prove your identity. Unlock better opportunities.</h3>
                <p className="mt-4 text-[18px] leading-[1.56] text-[#5b616e]">From job seekers to consultants, verified professionals can network with higher trust and better response quality.</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <PillButton variant="bordered" onClick={() => navigate('/signup/individual')} className="rounded-[16px]">Create profile</PillButton>
                  <PillButton variant="ghost" onClick={() => navigate('/signup/individual')} className="rounded-[16px]">Verify identity</PillButton>
                </div>
              </article>

              <article className="rounded-[20px] bg-white p-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)] lg:p-10">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Businesses</p>
                <h3 className="mt-4 text-[32px] font-normal leading-[1.13] text-[#0a0b0d]">Verify your company. Hire and partner with confidence.</h3>
                <p className="mt-4 text-[18px] leading-[1.56] text-[#5b616e]">Verified businesses can post roles, discover experts, and collaborate with people whose identity is already validated.</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <PillButton variant="solid" onClick={() => navigate('/signup/business')} className="rounded-[16px]">Verify company</PillButton>
                  <PillButton variant="ghost" onClick={() => navigate('/signup/business')} className="rounded-[16px]">Open business account</PillButton>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 max-w-3xl space-y-4 text-center lg:text-left">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Impact</p>
              <h2 className="font-display text-[36px] leading-[1.11] tracking-[-0.03em] sm:text-[44px]">Real platform problems, solved at identity level.</h2>
              <p className="text-[18px] leading-[1.56] text-[#5b616e]">SyncUp reduces fake users, duplicate profiles, and untrusted outreach by enforcing verification before participation.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard index="1" title="Fake profiles blocked" text="Liveness verification keeps automated and spoofed accounts out of the network." note="Identity gate" />
              <FeatureCard index="2" title="Duplicate accounts reduced" text="Face embedding checks reduce multiple identities and strengthen accountability." note="One person one profile" />
              <FeatureCard index="3" title="Business trust increased" text="Verified company onboarding improves hiring quality and partnership confidence." note="Company validation" />
            </div>

            <div className="mt-6 rounded-[20px] border border-[rgba(91,97,110,0.16)] bg-[#0a0b0d] p-8 text-white shadow-[0_24px_60px_rgba(10,11,13,0.18)] lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="space-y-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Impact statement</p>
                  <h3 className="font-display text-[36px] leading-[1.08] tracking-[-0.03em] sm:text-[44px]">We are building a trust-first growth platform where every account is tied to a real identity.</h3>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <span className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/90">Safer hiring</span>
                    <span className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/90">Trusted partnerships</span>
                    <span className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/90">Authentic networking</span>
                  </div>
                </div>
                <div className="rounded-[18px] bg-[#282b31] p-6 lg:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Trust signal</p>
                      <p className="mt-2 text-[20px] font-semibold">Fraud-resistant referrals</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0052ff] text-white">
                      <span className="text-[20px] font-bold">V</span>
                    </div>
                  </div>
                  <p className="mt-5 text-[16px] leading-[1.56] text-white/78">Referral value, hiring quality, and network trust all improve when identity is verified before engagement.</p>
                  <div className="mt-6 rounded-[14px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Verified Human</p>
                    <p className="mt-2 text-[18px] font-semibold">Trust first. Opportunity faster.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f3] px-6 py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 max-w-3xl space-y-4 text-center lg:text-left">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0052ff]">Stats</p>
              <h2 className="font-display text-[36px] leading-[1.11] tracking-[-0.03em] sm:text-[44px]">Trust metrics that prove platform quality.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <StatCard value="10K+" label="Verified Users" />
              <StatCard value="2K+" label="Companies" />
              <StatCard value="100%" label="Verified Profiles" />
            </div>
          </div>
        </section>

        <section id="about" className="bg-[#0a0b0d] px-6 py-24 text-white lg:px-10 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Final CTA</p>
              <h2 className="mt-4 font-display text-[52px] leading-[1] tracking-[-0.04em] sm:text-[64px]">Join the network where trust is built in.</h2>
              <p className="mt-5 max-w-[620px] text-[18px] leading-[1.56] text-white/72">Whether you are an individual or a business, start verified and grow with people you can trust.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <PillButton variant="solid" onClick={() => navigate('/signup/individual')}>Join as Individual</PillButton>
                <PillButton variant="dark" onClick={() => navigate('/signup/business')}>Join as Business</PillButton>
              </div>
            </div>
            <div className="rounded-none border border-[rgba(255,255,255,0.12)] bg-[#282b31] p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-none bg-white/5 p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Use cases</p>
                  <p className="mt-3 text-[18px] leading-[1.5]">Safer hiring, trusted partnerships, cleaner referrals, better collaboration.</p>
                </div>
                <div className="rounded-none bg-white/5 p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Fraud resistant</p>
                  <p className="mt-3 text-[18px] leading-[1.5]">Only verified identities participate in core growth and referral systems.</p>
                </div>
                <div className="rounded-none bg-white/5 p-5 sm:col-span-2">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Main promise</p>
                  <p className="mt-3 text-[18px] leading-[1.5]">Identity-verified networking that turns trust into measurable outcomes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(91,97,110,0.18)] bg-white px-6 py-12 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-[22px] text-[#0a0b0d]">SyncUp</p>
            <p className="mt-2 text-[14px] text-[#5b616e]">Trust-first networking for verified individuals and businesses.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[14px] font-semibold text-[#0a0b0d]">
            <a href="#" className="transition-colors hover:text-[#0052ff]">Privacy</a>
            <a href="#" className="transition-colors hover:text-[#0052ff]">Terms</a>
            <a href="#" className="transition-colors hover:text-[#0052ff]">Contact</a>
          </div>
          <div className="flex items-center gap-3 text-[#5b616e]">
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-[#0052ff]">public</span>
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-[#0052ff]">alternate_email</span>
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-[#0052ff]">partner_reports</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
