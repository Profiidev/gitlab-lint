import Clippy from "./clippy";
import Prettier from "./prettier";
import RustFmt from "./rustfmt";
import TSC from "./tsc";
import Svelte from "./svelte";

const linters = {
  clippy: Clippy,
  prettier: Prettier,
  rustfmt: RustFmt,
  tsc: TSC,
  svelte: Svelte,
};

export default linters;
