declare module 'sql.js' {
  export interface SqlValue {
    // sql.js values can be various types
  }

  export interface QueryResults {
    columns: string[];
    values: unknown[][];
  }

  export class Statement {
    bind(values?: unknown[]): boolean;
    step(): boolean;
    get(): unknown[];
    getAsObject(): Record<string, unknown>;
    getColumnNames(): string[];
    free(): boolean;
    run(values?: unknown[]): void;
  }

  export class Database {
    constructor(data?: Uint8Array);
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): QueryResults[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    create_function(name: string, func: (...args: unknown[]) => unknown): void;
  }

  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<typeof Database>;

  export default initSqlJs;
}
