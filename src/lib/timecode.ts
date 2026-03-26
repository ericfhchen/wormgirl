/**
 * Parse a timecode string (HH;MM;SS;FF) into seconds at 30fps.
 * Accepts semicolon, colon, or period as delimiters.
 * Returns null if the string is invalid.
 */
export function timecodeToSeconds(tc: string | null | undefined, fps = 30): number | null {
  if (!tc) return null
  const parts = tc.split(/[;:.]/)
  if (parts.length !== 4) return null
  const [hh, mm, ss, ff] = parts.map(Number)
  if ([hh, mm, ss, ff].some(isNaN)) return null
  return hh * 3600 + mm * 60 + ss + ff / fps
}
