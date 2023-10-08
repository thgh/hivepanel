// split by comma, newline or semicolon
export function splitHostnames(str: string) {
  return str.split(/[,;\n]/g).map((s) => s.trim())
}
