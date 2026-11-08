import { Capacitor } from "@capacitor/core";

export { resolveFinoraDeepLink } from "./deep-links";
export {
  exitNativeApp,
  setNativeSystemBarStyle,
  useAndroidBackButton,
  useFinoraAppUrlOpen,
} from "./hooks";

/** True only when this code is running inside a native Capacitor shell. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
