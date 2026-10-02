// The engine runs in browsers, Node and Cloudflare Workers, which all provide
// structuredClone. The shared package deliberately has no DOM types, so any
// accidental use of window/document/localStorage fails to compile.
declare function structuredClone<T>(value: T): T;
