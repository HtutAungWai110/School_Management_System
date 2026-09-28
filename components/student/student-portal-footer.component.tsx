const LEGAL_LINKS = ["Help Center", "Privacy Policy", "Terms of Service"]

export default function StudentPortalFooter() {
  return (
    <footer className="w-full bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-[14px] leading-[20px] text-on-surface-variant">
          © 2024 CodePoint Academy School Management System. All rights reserved.
        </div>
        <nav className="flex items-center gap-6">
          {LEGAL_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-[12px] font-[500] leading-[16px] text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}