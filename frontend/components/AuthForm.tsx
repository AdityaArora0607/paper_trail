"use client";

import { Button, Card } from "@/components/ui";

/** Centered card shell shared by login/signup. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm mt-12">
      <Card className="!p-5">
        <h1 className="text-lg font-semibold mb-4">{title}</h1>
        {children}
      </Card>
    </div>
  );
}

export function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input {...rest} />
    </label>
  );
}

export { Button };
