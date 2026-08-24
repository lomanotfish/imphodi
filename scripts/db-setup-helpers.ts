export interface DeclaredIndex {
  readonly name: string;
  readonly key: Readonly<Record<string, unknown>>;
  readonly unique?: boolean;
}

export interface ExistingIndex {
  readonly name?: string;
  readonly key: Readonly<Record<string, unknown>>;
  readonly unique?: boolean;
}

function indexMatches(declared: DeclaredIndex, existing: ExistingIndex): boolean {
  if (declared.name !== existing.name) return false;
  if (Boolean(declared.unique) !== Boolean(existing.unique)) return false;

  const declaredKeys = Object.entries(declared.key);
  const existingKeys = Object.entries(existing.key);
  return (
    declaredKeys.length === existingKeys.length &&
    declaredKeys.every(
      ([field, direction], index) =>
        existingKeys[index]?.[0] === field && existingKeys[index]?.[1] === direction,
    )
  );
}

export function unverifiedIndexNames(
  declarations: readonly DeclaredIndex[],
  existingIndexes: readonly ExistingIndex[],
): string[] {
  return declarations
    .filter(
      (declaration) =>
        !existingIndexes.some((existing) => indexMatches(declaration, existing)),
    )
    .map((declaration) => declaration.name);
}

export function isDocumentValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 121
  );
}

export async function assertValidatorRejects(
  insertInvalidProbe: () => Promise<unknown>,
  cleanupProbe: () => Promise<unknown>,
): Promise<void> {
  let rejectedByValidator = false;

  try {
    await insertInvalidProbe();
  } catch (error) {
    if (!isDocumentValidationError(error)) throw error;
    rejectedByValidator = true;
  } finally {
    await cleanupProbe();
  }

  if (!rejectedByValidator) {
    throw new Error("MongoDB validator accepted an invalid probe");
  }
}
