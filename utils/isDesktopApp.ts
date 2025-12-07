export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any).isMerseDesktop === true;
}
