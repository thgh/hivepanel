declare module 'native-dns'

declare const global: {
  closeSignal: Promise<number>
  viteInstance: ViteDevServer
}
