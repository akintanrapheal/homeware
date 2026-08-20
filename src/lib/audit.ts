import { hasDatabase, prisma } from './prisma';

/**
 * A record of what the admin changed.
 *
 * With one shared store password there is no "who", so this deliberately logs
 * the what and the when only — enough to answer "why is this price different
 * from yesterday", which is the question that actually gets asked.
 *
 * Never throws: an audit failure must not roll back the action it describes.
 */
export async function audit(
  action: string,
  summary: string,
  options?: { target?: string; meta?: Record<string, unknown> },
): Promise<void> {
  if (!hasDatabase || !prisma) return;
  try {
    await prisma.auditLog.create({
      data: {
        action,
        summary,
        target: options?.target ?? null,
        meta: options?.meta ? (options.meta as object) : undefined,
      },
    });
  } catch (error) {
    console.error('[audit] could not record', action, error);
  }
}
