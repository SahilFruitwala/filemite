declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

// Inlined by the `wasm-base64` Vite plugin (see vite.config.ts).
declare module '*.wasm?base64' {
  const base64: string;
  export default base64;
}
