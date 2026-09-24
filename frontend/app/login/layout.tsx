export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto">
      {children}
    </div>
  );
}
