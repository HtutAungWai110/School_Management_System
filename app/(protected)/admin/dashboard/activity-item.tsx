export function ActivityItem({ icon: Icon, bg, iconColor, children, time }: {
  icon: React.ComponentType<{ className?: string }>
  bg: string
  iconColor: string
  children: React.ReactNode
  time: string
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[14px] leading-[20px] text-on-surface">{children}</p>
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{time}</span>
      </div>
    </div>
  )
}
