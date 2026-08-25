import { describe, expect, it } from 'vitest'
import {
  calculateCurrentStreak,
  countChineseCharacters,
  isValidCheckinDate,
  shiftDate,
} from './checkin.shared'

describe('check-in shared rules', () => {
  it('counts only Han characters in a work log', () => {
    expect(countChineseCharacters('今天完成了 SEO 研究，新增 3 个外链。')).toBe(12)
  })

  it('validates real Beijing date keys and shifts calendar dates', () => {
    expect(isValidCheckinDate('2026-02-28')).toBe(true)
    expect(isValidCheckinDate('2026-02-29')).toBe(false)
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('counts a streak across years and starts from yesterday when today is pending', () => {
    expect(calculateCurrentStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01')).toBe(3)
    expect(calculateCurrentStreak(['2026-12-30', '2026-12-31'], '2027-01-01')).toBe(2)
    expect(calculateCurrentStreak(['2026-12-29'], '2027-01-01')).toBe(0)
  })
})
