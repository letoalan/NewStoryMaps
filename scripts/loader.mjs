/**
 * Custom ESM loader to resolve extensionless TypeScript files in Node.js
 */

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch { /* try next */ }
      }
    }
    throw err;
  }
}

