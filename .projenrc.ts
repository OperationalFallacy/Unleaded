import { javascript, typescript } from "projen";
import {
  TypeScriptJsxMode,
  TypeScriptModuleDetection,
  TypeScriptModuleResolution,
  YarnChecksumBehavior,
  YarnNodeLinker,
} from "projen/lib/javascript/index.js";
const project = new typescript.TypeScriptAppProject({
  defaultReleaseBranch: "main",
  name: "Unleaded",
  authorName: "Roman Naumenko",
  packageManager: javascript.NodePackageManager.YARN_BERRY,
  projenrcTs: true,
  github: false,
  repository: "https://github.com/OperationalFallacy/Unleaded",
  yarnBerryOptions: {
    version: "4.10.3",
    zeroInstalls: false,
    yarnRcOptions: {
      checksumBehavior: YarnChecksumBehavior.UPDATE,
      enableImmutableInstalls: false,
      nodeLinker: YarnNodeLinker.NODE_MODULES,
    },
  },
  tsconfig: {
    compilerOptions: {
      // https://www.effect.solutions/tsconfig
      incremental: true,
      moduleDetection: TypeScriptModuleDetection.FORCE,
      verbatimModuleSyntax: true,
      strict: true,
      noUnusedLocals: true,
      noImplicitOverride: true,

      declaration: false,
      noImplicitReturns: true,
      experimentalDecorators: false,
      target: "ESNext",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: TypeScriptModuleResolution.BUNDLER,
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: TypeScriptJsxMode.PRESERVE,
      paths: {
        "@/*": ["./src/*"],
        "@/backend/*": ["../backend/amplify/*"],
      },
      // incremental: true // didn't work?!
    },
    exclude: ["check-files.ts"],
    include: ["next-env.d.ts", "src/**/*.tsx", "src/**/*.ts"],
  },

  gitignore: ["cache"],
  deps: [
    "@effect-atom/atom@^0.4.11",
    "@effect/cli@^0.73.0",
    "@effect/cluster@^0.56.0",
    "@effect/experimental@^0.58.0",
    "@effect/language-service@^0.62.5",
    "@effect/platform@^0.94.0",
    "@effect/platform-node@^0.104.0",
    "@effect/printer@^0.47.0",
    "@effect/printer-ansi@^0.47.0",
    "@effect/rpc@^0.73.0",
    "@effect/sql@^0.49.0",
    "@effect/typeclass@^0.38.0",
    "@effect/workflow@^0.16.0",
    "@effect-atom/atom-react@^0.4.4",
    "cli-table3@^0.6.5",
    "date-fns@^4.1.0",
    "effect@^3.19.13",
    "ink@^6.6.0",
    "ink-select-input@^5.0.0",
    "react@^19.2.3",
  ],
  devDeps: ["@types/react@^19.0.0"],
});

project.package.addField("type", "module");
project.synth();
