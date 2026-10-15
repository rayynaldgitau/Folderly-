declare module "mammoth" {
  export interface ConvertResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Options {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }

  export function convertToHtml(input: Options): Promise<ConvertResult>;
  export function extractRawText(input: Options): Promise<ConvertResult>;
}
