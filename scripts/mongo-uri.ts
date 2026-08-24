export function sanitizeMongoUri(uri: string) {
  return uri.replace(/\/\/[^@]*@/, "//****:****@");
}
