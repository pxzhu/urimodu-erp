export interface LegacyHwpFallbackResult {
  metadataOnly: true;
  metadata: Record<string, unknown>;
  todo: string;
}

export async function parseLegacyHwp(_input: Buffer): Promise<LegacyHwpFallbackResult> {
  return {
    metadataOnly: true,
    metadata: {
      parser: "legacy-hwp-fallback"
    },
    todo: "TODO(PROMPT05+): keep legacy HWP as metadata-extraction fallback adapter only"
  };
}
