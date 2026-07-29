import { useState } from 'react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinPad({ eyebrow, title, subtitle, correctPin, onBack, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const press = (k) => {
    setError('')
    if (k === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (k === '') return
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      if (next === correctPin) {
        onSuccess()
      } else {
        setError('PIN incorrecto.')
        setTimeout(() => setPin(''), 400)
      }
    }
  }

  return (
    <div className="screen">
      <div className="pin-wrap">
        {eyebrow && (
          <div
            className="eyebrow"
            style={{ color: 'var(--gold)', letterSpacing: 1.5, fontSize: 12, textTransform: 'uppercase' }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="page-title" style={{ fontSize: 30 }}>
          {title}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-grid">
          {KEYS.map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button key={i} className="pin-key" onClick={() => press(k)}>
                {k}
              </button>
            )
          )}
        </div>

        <div className="pin-error">{error}</div>

        <button className="link-btn" style={{ marginTop: 12 }} onClick={onBack}>
          ← Volver
        </button>
      </div>
    </div>
  )
}
