export function challengeErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
