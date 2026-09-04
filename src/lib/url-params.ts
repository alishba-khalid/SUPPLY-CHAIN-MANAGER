/** Builds a query string from the current params with overrides applied — used to link between filter/sort/page states without any client JS. */
export function buildQueryString(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  return params.toString();
}
