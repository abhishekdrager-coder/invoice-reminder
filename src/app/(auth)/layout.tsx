export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-white to-cyan-100 p-6">
      <div className="mx-auto mt-10 max-w-md rounded-xl bg-white p-8 shadow-lg shadow-stone-300/50">
        {children}
      </div>
    </div>
  );
}
