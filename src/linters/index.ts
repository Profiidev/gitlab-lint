import Clippy from "./clippy";
import Prettier from "./prettier";
import RustFmt from "./rustfmt";
import TSC from "./tsc";
import Svelte from "./svelte";
import TexFmt from "./tex-fmt";
import OxLint from "./oxlint";
import OxFmt from "./oxfmt";

const linters = {
  oxlint: OxLint,
  oxfmt: OxFmt,
  clippy: Clippy,
  prettier: Prettier,
  rustfmt: RustFmt,
  tsc: TSC,
  svelte: Svelte,
  tex_fmt: TexFmt,
};

export default linters;
