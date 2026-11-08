"use client";

import { useEffect, useRef } from "react";
import { App, type BackButtonListenerEvent } from "@capacitor/app";
import { Capacitor, SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { resolveFinoraDeepLink } from "./deep-links";

type AndroidBackHandler = (event: BackButtonListenerEvent) => void;
type AppRouteHandler = (path: string) => void;

export function useAndroidBackButton(handler: AndroidBackHandler): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    let active = true;
    let listener: PluginListenerHandle | undefined;
    void App.addListener("backButton", (event) => handlerRef.current(event))
      .then((handle) => {
        if (active) listener = handle;
        else void handle.remove();
      })
      .catch((error: unknown) => {
        console.error("Could not register the Android back button handler.", error);
      });

    return () => {
      active = false;
      void listener?.remove();
    };
  }, []);
}

export function useFinoraAppUrlOpen(handler: AppRouteHandler): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: PluginListenerHandle | undefined;
    const openRoute = (url: string | undefined) => {
      if (!url) return;
      const path = resolveFinoraDeepLink(url);
      if (path) handlerRef.current(path);
    };

    void App.addListener("appUrlOpen", ({ url }) => openRoute(url))
      .then((handle) => {
        if (active) listener = handle;
        else void handle.remove();
      })
      .catch((error: unknown) => {
        console.error("Could not register the app URL handler.", error);
      });
    void App.getLaunchUrl()
      .then((launch) => openRoute(launch?.url))
      .catch((error: unknown) => {
        console.error("Could not read the app launch URL.", error);
      });

    return () => {
      active = false;
      void listener?.remove();
    };
  }, []);
}

export function exitNativeApp(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return Promise.resolve();
  return App.exitApp();
}

export function setNativeSystemBarStyle(theme: "light" | "dark"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  return SystemBars.setStyle({
    style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  });
}
