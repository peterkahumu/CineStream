'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CustomSelect.module.css'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export default function MultiSelect({ options, values, onChange, placeholder = 'Select...' }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  const selectedLabels = values
    .map(v => options.find(o => o.value === v)?.label)
    .filter(Boolean)

  const display = selectedLabels.length > 0
    ? selectedLabels.join(', ')
    : placeholder

  return (
    <div className={styles.container} ref={containerRef}>
      <button 
        type="button" 
        className={`${styles.toggle} ${isOpen ? styles.toggleOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={display}
      >
        <span className={styles.selectedLabel}>{display}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {options.map(opt => {
            const isSelected = values.includes(opt.value)
            return (
              <label key={opt.value} className={styles.item} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: isSelected ? 'var(--bg-hover)' : 'transparent' }}>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => handleToggle(opt.value)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
