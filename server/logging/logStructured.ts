type LogFields = Record<string, unknown>;

export function logStructured(fields: LogFields) {
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(fields));
  } catch {
    // ignore logging errors
  }
}
