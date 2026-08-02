export function MetricCard({ icon: Icon, label, value, badge, badgeClass, iconBg, iconColor, subtitle }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  badge: string
  badgeClass: string
  iconBg: string
  iconColor: string
  subtitle: string
}) {
  return (
    <div className="p-6 rounded-xl border border-outline-variant/20 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] hover:shadow-md transition-shadow duration-300" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className={`${badgeClass} text-[12px] font-[500] leading-[16px] px-2 py-0.5 rounded-full`}>{badge}</span>
      </div>
      <h3 className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant mb-1">{label}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-[700] leading-[40px] tracking-[-0.02em] text-primary">{value}</span>
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{subtitle}</span>
      </div>
    </div>
  )
}
