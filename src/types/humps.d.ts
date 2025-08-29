declare module "humps" {
  // Convert object keys from snake_case to camelCase
  export function camelizeKeys<T extends object>(obj: T): T;

  // Convert object keys from camelCase to snake_case
  export function decamelizeKeys<T extends object>(obj: T): T;

  // Convert a single string to camelCase
  export function camelize(str: string): string;

  // Convert a single string to snake_case (or custom separator)
  export function decamelize(
    str: string,
    options?: { separator?: string }
  ): string;
}
