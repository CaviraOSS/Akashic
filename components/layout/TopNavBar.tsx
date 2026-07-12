"use client";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
    { label: "Overview", active: true },
    { label: "Intelligence", active: false },
    { label: "Signals", active: false },
    { label: "Assets", active: false },
    { label: "Reports", active: false },
];

const SYS_STATUS = [
    { label: "UPLINK", value: "NOMINAL" },
    { label: "COMMS", value: "SECURE" },
    { label: "THREAT", value: "GUARDED" },
];

export default function TopNavBar() {
    const [time, setTime] = useState("");
    const [localTime, setLocalTime] = useState("");
    const [tz, setTz] = useState("");

    useEffect(() => {
        setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
        const tick = () => {
            const n = new Date();
            const hh = String(n.getUTCHours()).padStart(2, "0");
            const mm = String(n.getUTCMinutes()).padStart(2, "0");
            const ss = String(n.getUTCSeconds()).padStart(2, "0");
            setTime(`${hh}:${mm}:${ss}`);
            setLocalTime(n.toLocaleTimeString("en-US", { hour12: false }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center w-full flex-shrink-0 h-[52px] bg-m3-surface border-b border-m3-outline-variant">
            {}
            <div className="flex items-center gap-3 px-5 flex-shrink-0 h-full border-r border-m3-outline-variant">
                <div>
                    <div className="font-mono font-bold text-[0.82rem] tracking-[0.14em] text-m3-on-surface leading-tight">
                        GEOVIEW
                    </div>
                    <div className="font-mono text-[0.5rem] text-m3-on-surface-variant tracking-wider uppercase mt-1">
                        OSINT PLATFORM
                    </div>
                </div>
            </div>

            {}
            <nav className="flex items-center h-full px-1">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.label}
                        className={`h-full px-[14px] text-[0.75rem] bg-transparent border-none cursor-pointer outline-none transition-all duration-150 whitespace-nowrap border-b-[3px] ${
                            item.active ? "font-medium text-m3-on-surface border-m3-primary" : "font-normal text-m3-on-surface-variant border-transparent hover:text-m3-on-surface hover:bg-m3-surface-container"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="flex-1 min-w-0" />

            {}
            <div className="flex items-center gap-5 px-5 flex-shrink-0 h-full border-l border-m3-outline-variant">
                {SYS_STATUS.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="rounded-full flex-shrink-0 w-[6px] h-[6px] bg-m3-primary" />
                        <div>
                            <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant tracking-wider uppercase leading-none mb-0.5">
                                {s.label}
                            </div>
                            <div className="font-mono text-[0.6rem] text-m3-on-surface leading-none">
                                {s.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {}
            <div className="flex flex-col items-center justify-center px-5 flex-shrink-0 h-full border-l border-m3-outline-variant min-w-[90px]">
                <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant mb-[2px]">UTC</div>
                <div className="font-mono font-medium text-[0.78rem] text-m3-on-surface tracking-wider">
                    {time || "00:00:00"}
                </div>
            </div>

            {}
            <div className="flex flex-col items-center justify-center px-5 flex-shrink-0 h-full border-l border-m3-outline-variant min-w-[90px]">
                <div className="font-sans text-[0.5rem] font-medium text-m3-on-surface-variant mb-[2px]">({tz || "GMT"})</div>
                <div className="font-mono font-medium text-[0.78rem] text-m3-on-surface-variant tracking-wider">
                    {localTime || "00:00:00"}
                </div>
            </div>
        </div>
    );
}
