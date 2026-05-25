declare module "dictionary-nb" {
  function load(
    cb: (err: Error | null, dict: { aff: Buffer; dic: Buffer }) => void
  ): void;
  export default load;
}

declare module "dictionary-nn" {
  function load(
    cb: (err: Error | null, dict: { aff: Buffer; dic: Buffer }) => void
  ): void;
  export default load;
}

declare module "nspell" {
  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): this;
  }
  function nspell(dict: { aff: Buffer | string; dic: Buffer | string }): NSpell;
  export default nspell;
}
