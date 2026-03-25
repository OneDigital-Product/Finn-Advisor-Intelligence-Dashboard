import React, { useEffect, useRef, useCallback } from 'react';

/* ── Props ── */
interface ODHeroProps {
  greeting: string;
  firstName: string;
  lastName: string;
  division: string | null;
  totalAum: number;
  totalClients: number;
  activeClients?: number;
  revenueYTD: number;
  revenueSource?: string;
  meetingCount: number;
  taskCount: number;
  caseCount: number;
  staleOppCount: number;
  eventCount: number;
  alertCount: number;
  isLiveData: boolean;
  isLoading?: boolean;
  averageClientAUM?: number;
  topClient?: { name: string; aum: number } | null;
}

/* ── OD Brand Palette ── */
const OD = {
  deepBlue: 'var(--color-brand-deep)',
  medBlue: 'var(--color-brand-primary)',
  medGreen: 'var(--color-success)',
  orange: 'var(--color-orange)',
  lightBlue: 'var(--color-brand-secondary)',
  lightGreen: 'var(--color-success-light)',
  yellow: 'var(--color-warning)',
  bgDark: 'var(--color-bg)',
  bgMed: 'var(--color-surface)',
  text1: 'var(--color-text-primary)',
  text2: 'var(--color-text-secondary)',
  text3: 'var(--color-text-tertiary)',
  border: 'var(--color-border)',
  borderLight: 'var(--color-border-strong)',
};

const F = {
  headline: "'Oswald', sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ── Formatters ── */
function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const v = value / 1_000_000_000;
    return '$' + (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + 'B';
  }
  if (abs >= 1_000_000) {
    const v = value / 1_000_000;
    return '$' + v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'M';
  }
  if (abs >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
}

function fmtAumSub(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(value) >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  return '$' + value.toLocaleString();
}

function formatHeroDate(): string {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

/* ── Keyframes ── */
const STYLE_ID = '__od_hero_kf';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes od-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes od-pip { 0%,100%{opacity:1} 50%{opacity:.3} }
  `;
  document.head.appendChild(style);
}

/* ── Ticker card data ── */
interface TickerCard {
  icon: React.ReactNode;
  count: number;
  label: string;
  badgeText: string;
  badgeColor: string;
  countColor: string;
  iconClass: string;
}

function buildCards(props: ODHeroProps): TickerCard[] {
  const badge = (count: number, hi: number, lo: number) => {
    if (count >= hi) return { badgeText: 'URGENT', badgeColor: OD.orange };
    if (count >= lo) return { badgeText: 'WARN', badgeColor: OD.yellow };
    return { badgeText: 'OK', badgeColor: OD.medGreen };
  };

  return [
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V1M11 3V1M2 7h12"/></svg>,
      count: props.meetingCount, label: 'Meetings',
      ...badge(props.meetingCount, 10, 5),
      countColor: OD.lightBlue, iconClass: 'meet',
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l3 3 7-6"/><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/></svg>,
      count: props.taskCount, label: 'Open Tasks',
      ...badge(props.taskCount, 25, 10),
      countColor: OD.yellow, iconClass: 'task',
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v4M8 11v.5"/></svg>,
      count: props.caseCount, label: 'Open Cases',
      badgeText: props.caseCount > 0 ? 'URGENT' : 'OK',
      badgeColor: props.caseCount > 0 ? OD.orange : OD.medGreen,
      countColor: OD.orange, iconClass: 'case',
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 11l4-4 3 3 5-6"/><circle cx="14" cy="4" r="2"/></svg>,
      count: props.staleOppCount, label: 'Stale Opps',
      badgeText: props.staleOppCount > 0 ? 'WARN' : 'OK',
      badgeColor: props.staleOppCount > 0 ? OD.yellow : OD.medGreen,
      countColor: OD.yellow, iconClass: 'opp',
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4v4l3 2"/></svg>,
      count: props.eventCount, label: 'Events',
      ...badge(props.eventCount, 10, 5),
      countColor: OD.medGreen, iconClass: 'event',
    },
    {
      icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L2 13h12L8 2z"/><path d="M8 6v4M8 11.5v.5"/></svg>,
      count: props.alertCount, label: 'Alerts',
      badgeText: props.alertCount > 0 ? 'URGENT' : 'OK',
      badgeColor: props.alertCount > 0 ? OD.orange : OD.medGreen,
      countColor: OD.orange, iconClass: 'alert',
    },
  ];
}

const iconBgs: Record<string, { bg: string; color: string }> = {
  meet: { bg: 'rgba(79,179,205,0.12)', color: OD.lightBlue },
  task: { bg: 'rgba(255,198,11,0.1)', color: OD.yellow },
  case: { bg: 'rgba(244,125,32,0.1)', color: OD.orange },
  opp: { bg: 'rgba(255,198,11,0.08)', color: OD.yellow },
  event: { bg: 'rgba(142,185,53,0.1)', color: OD.medGreen },
  alert: { bg: 'rgba(244,125,32,0.12)', color: OD.orange },
};

/* ── Component ── */
const ODHero: React.FC<ODHeroProps> = (props) => {
  const { greeting, firstName, lastName, totalAum, totalClients, activeClients, revenueYTD, revenueSource, isLiveData, averageClientAUM, topClient } = props;

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  useEffect(() => { ensureKeyframes(); }, []);

  const tick = useCallback(() => {
    const el = trackRef.current;
    if (el && !pausedRef.current) {
      posRef.current -= 0.5;
      const oneThird = el.scrollWidth / 3;
      if (Math.abs(posRef.current) >= oneThird) posRef.current += oneThird;
      el.style.transform = `translateX(${posRef.current}px)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const cards = buildCards(props);
  const tripled = [...cards, ...cards, ...cards];

  const rise = (delay: number): React.CSSProperties => ({
    opacity: 0,
    animation: `od-fadeUp 0.6s ease ${delay}s forwards`,
  });

  return (
    <div>
      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(135deg, ${OD.deepBlue} 0%, ${OD.bgDark} 100%)`,
        borderBottom: `1px solid ${OD.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${OD.medBlue}, rgba(142,185,53,0.5), ${OD.medBlue}, transparent)`,
        }} />

        {/* Hero grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1px 340px',
          position: 'relative', zIndex: 1,
        }}>
          {/* Left — greeting */}
          <div style={{ padding: '28px 40px 24px 24px' }}>
            <div style={{
              fontFamily: F.mono, fontSize: 10, fontWeight: 300,
              letterSpacing: '0.3em', color: OD.text3, textTransform: 'uppercase',
              marginBottom: 8, ...rise(0.05),
            }}>
              {greeting} · {formatHeroDate()}
            </div>
            <div style={{ marginBottom: 4, ...rise(0.12) }}>
              <span style={{
                fontFamily: F.headline, fontWeight: 700, fontSize: 44,
                lineHeight: 0.95, letterSpacing: '-0.01em', textTransform: 'uppercase',
                color: OD.text1,
              }}>
                {firstName}{' '}
              </span>
              <span style={{
                fontFamily: F.headline, fontWeight: 700, fontSize: 44,
                lineHeight: 0.95, letterSpacing: '-0.01em', textTransform: 'uppercase',
                color: OD.lightBlue, display: 'block',
              }}>
                {lastName}.
              </span>
            </div>
            <p style={{
              fontSize: 13, color: OD.text3, marginTop: 10, lineHeight: 1.6,
              ...rise(0.22),
            }}>
              {props.isLoading ? (
                <>Loading live data from Salesforce + Orion<span style={{ animation: 'pulse 1.5s ease-in-out infinite', color: OD.medBlue }}> ...</span></>
              ) : (
                <>Managing <strong style={{ color: OD.lightGreen, fontWeight: 600 }}>{fmtAumSub(totalAum)} in assets</strong>{' '}
                across <strong style={{ color: OD.lightGreen, fontWeight: 600 }}>{totalClients.toLocaleString()} clients</strong>{' '}
                — your book is performing within target range.</>
              )}
            </p>
          </div>

          {/* Divider */}
          <div style={{ background: OD.borderLight }} />

          {/* Right — stats */}
          <div style={{ display: 'flex', flexDirection: 'column', ...rise(0.18) }}>
            {[
              { src: 'Orion: portfolio.totalMarketValue', label: 'Assets Under Mgmt.', value: fmtCompact(totalAum), color: OD.lightBlue },
              { src: "SFDC: Account WHERE FinServ__Status__c='Active'", label: 'Active Clients', value: (activeClients ?? totalClients).toLocaleString(), color: OD.text1 },
              { src: revenueSource === 'orion-billing' ? 'Orion: billing.totalFees' : 'Est. 85 bps × AUM — billing endpoint not yet returning data', label: revenueSource === 'orion-billing' ? 'Revenue — YTD' : 'Revenue — YTD (Est.)', value: fmtCompact(revenueYTD), color: OD.medGreen },
              ...(averageClientAUM ? [{ src: 'Computed: totalAum / clientCount', label: 'Avg Client AUM', value: fmtCompact(averageClientAUM), color: OD.text2 }] : []),
              ...(topClient?.name ? [{ src: `Top client: ${topClient.name}`, label: 'Top Client', value: `${topClient.name.split(' ')[0]} · ${fmtCompact(topClient.aum)}`, color: OD.lightBlue }] : []),
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  flex: 1, padding: '13px 28px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  position: 'relative', cursor: 'default',
                  borderTop: i > 0 ? `1px solid ${OD.border}` : 'none',
                  transition: 'background .18s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,120,162,0.06)';
                  const bar = e.currentTarget.querySelector('.hstat-bar') as HTMLElement;
                  if (bar) bar.style.background = OD.medBlue;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  const bar = e.currentTarget.querySelector('.hstat-bar') as HTMLElement;
                  if (bar) bar.style.background = 'transparent';
                }}
              >
                <div className="hstat-bar" style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 2, background: 'transparent', transition: 'background .2s',
                }} />
                <div style={{
                  fontFamily: F.mono, fontSize: 7.5, fontWeight: 300,
                  letterSpacing: '.14em', color: OD.medBlue, textTransform: 'uppercase',
                  opacity: 0.7, marginBottom: 3,
                }}>
                  {stat.src}
                </div>
                <div style={{
                  fontFamily: F.mono, fontSize: 9, fontWeight: 300,
                  letterSpacing: '.22em', color: OD.text3, textTransform: 'uppercase',
                  marginBottom: 3,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontFamily: F.headline, fontWeight: 700, fontSize: 38,
                  lineHeight: 1, letterSpacing: '-0.01em', color: stat.color,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTIVITY TICKER ── */}
        <div style={{
          borderTop: '1px solid rgba(0,120,162,0.2)',
          background: 'rgba(0,52,79,0.5)',
          height: 46, display: 'flex', alignItems: 'center', overflow: 'hidden',
        }}>
          {/* Label */}
          <div style={{
            flexShrink: 0, height: '100%',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '0 16px',
            background: 'rgba(0,120,162,0.15)',
            borderRight: '1px solid rgba(0,120,162,0.3)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: OD.medGreen,
              animation: 'od-pip 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: F.headline, fontSize: 11, fontWeight: 600,
              letterSpacing: '.2em', textTransform: 'uppercase',
              color: OD.lightBlue,
            }}>
              Activity
            </span>
          </div>

          {/* Track */}
          <div
            style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, zIndex: 2,
              background: 'linear-gradient(90deg, rgba(0,52,79,0.5), transparent)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, zIndex: 2,
              background: 'linear-gradient(270deg, rgba(15,20,25,0.8), transparent)',
              pointerEvents: 'none',
            }} />
            <div
              ref={trackRef}
              style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', willChange: 'transform' }}
            >
              {tripled.map((card, i) => {
                const ib = iconBgs[card.iconClass];
                return (
                  <React.Fragment key={i}>
                    {i > 0 && i % cards.length === 0 && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 48, height: 46, flexShrink: 0,
                      }}>
                        <div style={{ width: 1, height: 18, background: 'rgba(0,120,162,0.3)' }} />
                      </div>
                    )}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      padding: '0 22px', height: 46,
                      borderRight: '1px solid rgba(45,55,72,0.4)',
                      cursor: 'default', flexShrink: 0,
                      transition: 'background .18s',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, background: ib.bg, color: ib.color,
                      }}>
                        {card.icon}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <span style={{
                          fontFamily: F.headline, fontWeight: 700, fontSize: 20,
                          lineHeight: 1, letterSpacing: '.02em', color: card.countColor,
                        }}>
                          {card.count}
                        </span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 500, letterSpacing: '.12em',
                          textTransform: 'uppercase', color: OD.text3,
                        }}>
                          {card.label}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 8, fontWeight: 600, letterSpacing: '.12em',
                        textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2,
                        color: card.badgeColor,
                        background: `${card.badgeColor}18`,
                        border: `1px solid ${card.badgeColor}40`,
                        animation: card.badgeText === 'URGENT' ? 'od-pip 1.4s ease-in-out infinite' : 'none',
                      }}>
                        {card.badgeText}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Live indicator */}
          {isLiveData && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px', flexShrink: 0, height: '100%',
              borderLeft: '1px solid rgba(0,120,162,0.3)',
              background: 'rgba(0,120,162,0.1)',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: OD.medGreen,
                animation: 'od-pip 2s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: F.mono, fontSize: 8, fontWeight: 600,
                letterSpacing: '.15em', color: OD.medGreen, textTransform: 'uppercase',
              }}>
                Live
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ODHero;
