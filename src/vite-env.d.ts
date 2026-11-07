/// <reference types="vite/client" />

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

declare module '*?worker&inline' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

