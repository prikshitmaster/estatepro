// app/_components/MobileTopBar.tsx — sticky top bar shown only on mobile
export default function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
        <span className="text-white font-bold text-sm">E</span>
      </div>
      <span className="font-semibold text-gray-900">EstatePro CRM</span>
    </header>
  );
}
