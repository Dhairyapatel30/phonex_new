import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useSpeechRecognition — minimal wrapper around the browser SpeechRecognition
 * API (supported in Chrome, Edge, most Chromium-based browsers and iOS Safari).
 *
 * Returns:
 *   supported   → boolean, true if the browser exposes the API
 *   listening   → boolean, true while a recognition session is active
 *   start()     → begin listening
 *   stop()      → stop listening (fires onResult if speech was captured)
 *   toggle()    → convenience flip between start/stop
 *
 * Options:
 *   onResult?(transcript)   — called once with the final transcript
 *   onError?(errorString)   — called on any recognition error
 *   lang                    — BCP-47 tag, defaults to 'en-IN' for India
 *
 * Zero dependencies. Cleans up on unmount.
 */
export function useSpeechRecognition({
  onResult,
  onError,
  lang = 'en-IN',
} = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  // Keep callbacks in refs so consumers can pass new closures every render
  // without tearing down the recognition instance.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Initialise once per mount (and when language changes)
  useEffect(() => {
    const SR =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) {
      setSupported(false)
      return
    }
    setSupported(true)

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false // only care about the final transcript
    rec.continuous = false // stop after the first pause
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (transcript) onResultRef.current?.(transcript)
    }

    rec.onerror = (event) => {
      // Common errors: "not-allowed" (mic permission denied),
      // "no-speech", "audio-capture", "network"
      onErrorRef.current?.(event.error || 'unknown')
      setListening(false)
    }

    rec.onend = () => setListening(false)

    recognitionRef.current = rec

    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, [lang])

  const start = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec || listening) return
    try {
      rec.start()
      setListening(true)
    } catch {
      // `start()` can throw if called while already running — swallow
    }
  }, [listening])

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, start, stop, toggle }
}
