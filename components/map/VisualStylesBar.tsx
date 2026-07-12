"use client";

const STYLES = [
    { id: "standard", label: "Standard", key: "F1", icon: "◈" },
    { id: "nightvision", label: "Night Vision", key: "F2", icon: "◉" },
    { id: "crt", label: "CRT Scanlines", key: "F3", icon: "▦" },
    { id: "thermal", label: "Thermal IR", key: "F4", icon: "◍" },
    { id: "radar", label: "Radar Sweep", key: "F5", icon: "◎" },
    { id: "tssci", label: "TS/SCI", key: "F6", icon: "⬡", locked: true },
];

interface Props {
    activeStyle: string;
    setActiveStyle: (style: string) => void;
}

export default function VisualStylesBar({ activeStyle, setActiveStyle }: Props) {
    return (
        <div className="panel-flat flex items-center w-full shrink-0 h-14 bg-m3-surface border-t border-m3-outline-variant px-4 gap-2 rounded-none border-b-0 border-l-0 border-r-0">
            {}
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-m3-outline-variant h-full">
                {}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-m3-on-surface">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                    <circle cx="4" cy="5" r="1.2" fill="currentColor" opacity="0.8" />
                    <circle cx="8.5" cy="4.5" r="1" fill="currentColor" opacity="0.4" />
                    <circle cx="9" cy="8.5" r="1" fill="currentColor" opacity="0.6" />
                    <circle cx="5" cy="9" r="1.2" fill="currentColor" opacity="0.2" />
                </svg>
                <div>
                    <div className="text-[0.7rem] font-semibold text-m3-on-surface leading-tight">Visual Styles</div>
                    <div className="label text-[0.46rem]">
                        ACTIVE: <span className="mono text-m3-primary">
                            {STYLES.find((s) => s.id === activeStyle)?.label.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {}
            <div className="flex items-center gap-1 flex-1">
                {STYLES.map((s) => {
                    const isActive = activeStyle === s.id;
                    return (
                        <button
                            key={s.id}
                            onClick={() => !s.locked && setActiveStyle(s.id)}
                            className={`flex items-center justify-between gap-3 px-3 h-8 rounded-md border transition-all duration-200 outline-none ${
                                isActive 
                                ? "bg-m3-surface-container-high border-m3-outline-variant shadow-sm" 
                                : s.locked 
                                    ? "bg-transparent border-transparent opacity-40 cursor-not-allowed" 
                                    : "bg-transparent border-transparent hover:bg-m3-surface-container hover:border-m3-outline cursor-pointer"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`text-[0.7rem] ${isActive ? "text-m3-on-surface" : "text-m3-on-surface-variant"}`}>{s.icon}</span>
                                <span className={`text-[0.65rem] whitespace-nowrap ${isActive ? "font-medium text-m3-on-surface" : "font-medium text-m3-on-surface-variant"}`}>
                                    {s.label}
                                </span>
                            </div>
                            <span className={`mono text-[0.5rem] px-1.5 py-[2px] rounded ${isActive ? "bg-m3-surface border border-m3-outline-variant text-m3-on-surface" : "text-m3-outline"}`}>
                                {s.key}
                            </span>
                        </button>
                    );
                })}
            </div>

            {}
            <div className="flex items-center gap-5 shrink-0 pl-4 border-l border-m3-outline-variant h-full">
                {[
                    { label: "RENDERER", value: "WebGL 2.0" },
                    { label: "SHADER", value: "Active" },
                    { label: "FPS", value: "60" },
                    { label: "TILES", value: "128" },
                ].map((stat) => (
                    <div key={stat.label} className="flex flex-col items-center">
                        <div className="label text-[0.44rem] mb-[2px]">{stat.label}</div>
                        <div className="mono text-[0.58rem] text-m3-on-surface-variant">{stat.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
