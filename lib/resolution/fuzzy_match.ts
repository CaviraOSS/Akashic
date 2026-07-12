


const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()

export const levenshtein = (a: string, b: string): number => {
  const an = normalize(a), bn = normalize(b)
  if (!an.length) return bn.length
  if (!bn.length) return an.length

  const matrix = Array.from({ length: bn.length + 1 }, () => new Array(an.length + 1).fill(0))

  for (let i = 0; i <= an.length; i++) matrix[0][i] = i
  for (let j = 0; j <= bn.length; j++) matrix[j][0] = j

  for (let j = 1; j <= bn.length; j++) {
    for (let i = 1; i <= an.length; i++) {
      if (bn.charAt(j - 1) === an.charAt(i - 1)) {
        matrix[j][i] = matrix[j - 1][i - 1]
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, 
          matrix[j][i - 1] + 1,     
          matrix[j - 1][i] + 1      
        )
      }
    }
  }
  return matrix[bn.length][an.length]
}

export const similarity_score = (a: string, b: string): number => {
  const an = normalize(a), bn = normalize(b)
  if (an === bn) return 100
  const max_len = Math.max(an.length, bn.length)
  if (max_len === 0) return 0
  const dist = levenshtein(an, bn)
  return Math.max(0, 100 - (dist / max_len) * 100)
}

