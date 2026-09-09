"use client";

import { Suspense, type ReactNode } from "react";

import { Masthead } from "@/components/layout/Masthead";
import {
  ShellProvider,
  useShell,
  type SidebarState,
} from "@/components/layout/ShellContext";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Taxonomy } from "@/lib/types";

interface AppShellProps {
  categories: Taxonomy[];
  countries: Taxonomy[];
  children: ReactNode;
}

/**
 * Khung ung dung: thanh tren cung co dinh, sidebar ben trai va vung noi dung
 * tu dich sang phai theo trang thai cua sidebar.
 */
export function AppShell({ categories, countries, children }: AppShellProps) {
  return (
    <ShellProvider>
      {/* Masthead doc searchParams nen can bien Suspense theo yeu cau cua Next. */}
      <Suspense fallback={<div className="fixed inset-x-0 top-0 z-50 h-14 bg-canvas" />}>
        <Masthead />
      </Suspense>
      <Sidebar categories={categories} countries={countries} />
      <Main>{children}</Main>
    </ShellProvider>
  );
}

/** Le trai cua vung noi dung ung voi tung trang thai sidebar. */
const MAIN_CLASS: Record<SidebarState, string> = {
  auto: "xl:ml-sidebar",
  open: "xl:ml-sidebar",
  closed: "xl:ml-rail",
};

function Main({ children }: { children: ReactNode }) {
  const { sidebarState } = useShell();

  return (
    <main
      className={`min-h-[calc(100vh-3.5rem)] pt-14 transition-[margin] duration-200 ${MAIN_CLASS[sidebarState]}`}
    >
      {children}
    </main>
  );
}
