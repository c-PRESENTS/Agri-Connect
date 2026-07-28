declare module "country-list" {
  export type Country = {
    code: string;
    name: string;
  };

  export function getCode(name: string): string | undefined;
  export function getName(code: string): string | undefined;
  export function getData(): Country[];
}
