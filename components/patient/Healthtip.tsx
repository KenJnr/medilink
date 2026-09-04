// components/patient/HealthTip.tsx
import { Droplet } from 'lucide-react'

interface HealthTipProps {
  tip?: string
}

export default function HealthTip({
  tip = 'Stay hydrated — aim for at least 8 glasses of water a day.',
}: HealthTipProps) {
  return (
    <div className="bg-teal-50 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <Droplet size={18} className="text-teal-700 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-teal-900">Health tip</h3>
          <p className="text-sm text-teal-700 mt-1 leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  )
}