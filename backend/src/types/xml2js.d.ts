declare module 'xml2js' {
  export interface ParserOptions {
    explicitArray?: boolean;
    ignoreAttrs?: boolean;
    mergeAttrs?: boolean;
    explicitRoot?: boolean;
    tagNameProcessors?: ((name: string) => string)[];
    attrNameProcessors?: ((name: string) => string)[];
    valueProcessors?: ((value: string, name: string) => any)[];
    attrValueProcessors?: ((value: string, name: string) => any)[];
  }

  export interface BuilderOptions {
    rootName?: string;
    renderOpts?: {
      pretty?: boolean;
      indent?: string;
      newline?: string;
    };
    xmldec?: {
      version?: string;
      encoding?: string;
      standalone?: boolean;
    };
    headless?: boolean;
    cdata?: boolean;
  }

  export class Parser {
    constructor(options?: ParserOptions);
    parseString(xml: string, callback: (err: Error | null, result: any) => void): void;
    parseStringPromise(xml: string): Promise<any>;
  }

  export class Builder {
    constructor(options?: BuilderOptions);
    buildObject(obj: any): string;
  }

  export function parseString(
    xml: string,
    callback: (err: Error | null, result: any) => void
  ): void;
  export function parseString(
    xml: string,
    options: ParserOptions,
    callback: (err: Error | null, result: any) => void
  ): void;
  export function parseStringPromise(xml: string, options?: ParserOptions): Promise<any>;
}
