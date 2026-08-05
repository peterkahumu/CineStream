'use client'

import styles from './TimeRangeSelector.module.css'

export type TimeRange = '7d' | '30d' | 'mtd' | '90d'

export interface TimeRangeOption {
  key: TimeRange
  label: string
}

const DEFAULT_OPTIONS: TimeRangeOption[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'mtd', label: 'This Month' },
  { key: '90d', label: '3 Months' },
]

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
  options?: TimeRangeOption[]
  ariaLabel?: string
}

export default function TimeRangeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  ariaLabel = 'Time range filter',
}: Props) {
  return (
    <div className={styles.filterControls} role="group" aria-label={ariaLabel}>
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          className={`${styles.filterBtn} ${value === opt.key ? styles.filterBtnActive : ''}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
