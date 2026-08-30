/** 每天出海一小时品牌标识：用太阳、海浪和打卡勾表达持续出海与每日行动。 */
export function Logo({ size = 18, compact = false, showCheckinLabel = true }: { size?: number; compact?: boolean; showCheckinLabel?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[9px] font-display font-semibold tracking-[-0.3px] text-foreground"
      style={{ fontSize: size }}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-lg"
        style={{
          width: 28,
          height: 28,
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
          <path d="M8 19c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m11.5 15.5 3 3 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span>
          每天出海一小时{showCheckinLabel && <span className="font-medium opacity-[0.58]">（打卡润）</span>}
        </span>
      )}
    </span>
  )
}
