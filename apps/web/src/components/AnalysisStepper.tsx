import type { AnalysisStep } from "../hooks/useSession";
import { cx } from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface AnalysisStepperProps {
  status: string;
  steps: AnalysisStep[];
}

export function AnalysisStepper({ status, steps }: AnalysisStepperProps) {
  return (
    <SurfaceCard
      eyebrow="Finalize state"
      title="Post-session pipeline"
      description="Make the analysis stages explicit so the demo never feels like a frozen loading state."
    >
      <div className="stack-sm">
        {steps.map((step, index) => (
          <div className="analysis-step" key={step.id}>
            <div
              className={cx(
                "analysis-step__index",
                `analysis-step__index--${step.status}`,
              )}
            >
              {index + 1}
            </div>
            <div className="analysis-step__body">
              <div className="analysis-step__topline">
                <strong>{step.title}</strong>
                <span className={cx("status-chip", `status-chip--${step.status}`)}>
                  {step.status}
                </span>
              </div>
              <p>{step.description}</p>
            </div>
          </div>
        ))}

        {status === "idle" ? (
          <p className="muted-copy">
            Start a session to turn this pipeline on.
          </p>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
