let nextUid = 1

export function getNextUid(): number {
  return nextUid++
}

export function resetUids(): void {
  nextUid = 1
}
