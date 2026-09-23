import DarkVeil from "@/components/DarkVeil";
import "./Aurora.css";

export default function Aurora() {
  return (
    <div className="aurora-container" aria-hidden="true">
      <DarkVeil
        hueShift={0}
        noiseIntensity={0}
        scanlineIntensity={0}
        speed={0.5}
        scanlineFrequency={0}
        warpAmount={0}
        resolutionScale={1}
      />
    </div>
  );
}
