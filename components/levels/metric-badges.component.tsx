export default function MetricBadges({ diplomas, units }: { diplomas: number; units: number }) {
  return (
    <div className="grid gap-3 min-w-[280px] sm:min-w-[360px] grid-cols-2">
      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">Qualifications</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[22px] font-[700] leading-[28px] text-on-surface">{diplomas}</span>
          <span className="text-[12px] font-[500] leading-[16px] text-secondary">Diplomas</span>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">Modules</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-[22px] font-[700] leading-[28px] text-on-surface">{units}</span>
          <span className="text-[12px] font-[500] leading-[16px] text-secondary">Units</span>
        </div>
      </div>
    </div>
  )
}
