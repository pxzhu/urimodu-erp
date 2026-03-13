export interface HwpxParseResult {
  metadata: Record<string, unknown>;
  sections: Array<{ title: string; text: string }>;
}

export async function parseHwpx(_input: Buffer): Promise<HwpxParseResult> {
  return {
    metadata: {
      parser: "hwpx-scaffold",
      note: "HWPX-first adapter scaffold"
    },
    sections: []
  };
}
