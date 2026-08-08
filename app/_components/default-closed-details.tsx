"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type Props = {
  className: string;
  children: ReactNode;
};

export function DefaultClosedDetails({ className, children }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // 某些浏览器会在刷新时恢复 details 的 open 状态；练习答案始终默认折叠。
    if (detailsRef.current) detailsRef.current.open = false;
  }, []);

  return (
    <details ref={detailsRef} className={className} suppressHydrationWarning>
      {children}
    </details>
  );
}
