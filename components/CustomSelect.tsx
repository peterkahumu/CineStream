'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CustomSelect.module.css'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
}

export default function CustomSelect({ value, options, onChange, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedOption = options.find(o => o.value === value) || options[0]

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.toggle} ${isOpen ? styles.toggleOpen : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={styles.selectedLabel}>{selectedOption?.label}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {options.map(option => {
            const isActive = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
