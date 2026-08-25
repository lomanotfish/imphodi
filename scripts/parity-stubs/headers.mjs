// cookie jar ปลอม แทน next/headers ตอนรันนอก Next
export const jar = new Map();

export async function cookies() {
  return {
    get: (key) => (jar.has(key) ? { name: key, value: jar.get(key) } : undefined),
    set: (key, value) => { jar.set(key, value); },
    delete: (key) => { jar.delete(key); },
  };
}
