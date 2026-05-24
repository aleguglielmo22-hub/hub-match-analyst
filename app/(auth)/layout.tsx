export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.696_0.17_162.5_/_0.08),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.596_0.145_163.2_/_0.06),transparent_45%)]" />
      {children}
    </div>
  );
}
