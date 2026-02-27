declare module "lamejs" {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }

  /** CJS default export (present when bundler wraps the module). */
  const _default: { Mp3Encoder: typeof Mp3Encoder } | undefined;
  export default _default;
}
