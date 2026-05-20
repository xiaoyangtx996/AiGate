import { Check } from 'lucide-react'
import { clsx } from 'clsx'

interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step */}
            <div className="flex items-center gap-3">
              {/* Circle */}
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors',
                  isCompleted && 'text-white',
                  isCurrent && 'text-white',
                  !isCompleted && !isCurrent && 'text-secondary'
                )}
                style={{
                  backgroundColor: isCompleted || isCurrent ? 'var(--brand-main)' : 'var(--bg-elevated)',
                  border: !isCompleted && !isCurrent ? '2px solid var(--border-color)' : 'none',
                }}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>

              {/* Text */}
              <div>
                <div
                  className={clsx(
                    'text-sm font-medium',
                    isCurrent ? 'text-primary' : isCompleted ? 'text-primary' : 'text-secondary'
                  )}
                >
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-secondary mt-0.5">{step.description}</div>
                )}
              </div>
            </div>

            {/* Connector */}
            {!isLast && (
              <div className="flex-1 mx-4 h-0.5" style={{ backgroundColor: isCompleted ? 'var(--brand-main)' : 'var(--border-color)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
