export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_50%),radial-gradient(circle_at_70%_80%,color-mix(in_oklab,var(--chart-2)_7%,transparent),transparent_45%)]" />
      {children}
    </div>
  );
}
