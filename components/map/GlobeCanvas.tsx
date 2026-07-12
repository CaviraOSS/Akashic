"use client";

export default function GlobeCanvas() {
    const DATA_POINTS = [
        { id: "ALPHA", x: "38%", y: "44%", color: "#3b82f6" },
        { id: "BRAVO", x: "62%", y: "36%", color: "#f59e0b" },
        { id: "CHARLIE", x: "52%", y: "58%", color: "#22c55e" },
        { id: "DELTA", x: "71%", y: "48%", color: "#ef4444" },
    ];

    return (
        <div
            className="relative w-full h-full map-grid overflow-hidden"
            style={{ background: "#000" }}
        >
            {}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
                }}
            />

            {}
            <div
                className="absolute"
                style={{
                    left: "50%", top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(70vw, 70vh)",
                    height: "min(70vw, 70vh)",
                }}
            >
                {}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                />
                {}
                {[0.75, 0.5, 0.25].map((scale) => (
                    <div
                        key={scale}
                        className="absolute rounded-full"
                        style={{
                            border: "1px solid rgba(255,255,255,0.03)",
                            width: `${scale * 100}%`,
                            height: `${scale * 100}%`,
                            top: `${(1 - scale) * 50}%`,
                            left: `${(1 - scale) * 50}%`,
                        }}
                    />
                ))}
                {}
                <div
                    className="absolute"
                    style={{
                        top: "50%", left: "0", right: "0",
                        height: "1px",
                        background: "rgba(255,255,255,0.04)",
                    }}
                />
                {}
                <div
                    className="absolute"
                    style={{
                        left: "50%", top: "0", bottom: "0",
                        width: "1px",
                        background: "rgba(255,255,255,0.04)",
                    }}
                />
                {}
                {[-30, -15, 15, 30].map((deg) => (
                    <div
                        key={deg}
                        className="absolute"
                        style={{
                            top: `${50 + deg}%`, left: "5%", right: "5%",
                            height: "1px",
                            background: "rgba(255,255,255,0.02)",
                        }}
                    />
                ))}
                {}
                {[-30, -15, 15, 30].map((deg) => (
                    <div
                        key={deg}
                        className="absolute"
                        style={{
                            left: `${50 + deg}%`, top: "5%", bottom: "5%",
                            width: "1px",
                            background: "rgba(255,255,255,0.02)",
                        }}
                    />
                ))}

                {}
                <div
                    className="absolute"
                    style={{
                        left: "50%", top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "20px", height: "20px",
                    }}
                >
                    <div className="absolute" style={{ top: "50%", left: 0, right: 0, height: "1px", background: "rgba(59,130,246,0.4)" }} />
                    <div className="absolute" style={{ left: "50%", top: 0, bottom: 0, width: "1px", background: "rgba(59,130,246,0.4)" }} />
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: "5px", height: "5px",
                            top: "50%", left: "50%",
                            transform: "translate(-50%, -50%)",
                            background: "#3b82f6",
                            boxShadow: "0 0 8px rgba(59,130,246,0.6)",
                        }}
                    />
                </div>
            </div>

            {}
            {DATA_POINTS.map((pt) => (
                <div
                    key={pt.id}
                    className="absolute flex flex-col items-center"
                    style={{ left: pt.x, top: pt.y, transform: "translate(-50%, -50%)" }}
                >
                    {}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: "20px", height: "20px",
                            border: `1px solid ${pt.color}`,
                            opacity: 0.3,
                            animation: "pulse-slow 3s ease-in-out infinite",
                        }}
                    />
                    {}
                    <div
                        className="rounded-full"
                        style={{
                            width: "7px", height: "7px",
                            background: pt.color,
                            boxShadow: `0 0 8px ${pt.color}`,
                            position: "relative", zIndex: 1,
                        }}
                    />
                    {}
                    <div
                        className="mono"
                        style={{
                            fontSize: "0.48rem",
                            color: pt.color,
                            marginTop: "5px",
                            letterSpacing: "0.1em",
                            opacity: 0.8,
                        }}
                    >
                        {pt.id}
                    </div>
                </div>
            ))}

            {}
            <div
                className="absolute"
                style={{
                    bottom: "50%", left: "50%",
                    transform: "translateX(-50%) translateY(60px)",
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: "0.52rem",
                        color: "rgba(255,255,255,0.06)",
                        letterSpacing: "0.2em",
                        textAlign: "center",
                    }}
                >
                    CESIUMJS · GLOBE RENDER TARGET
                </div>
            </div>
        </div>
    );
}
