"use client";

import { useEffect, useRef } from "react";
import { ARBITRUM_TOKENS } from "@/lib/tokens";

export function BorrowFlowDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const stage = stageRef.current;
    if (!scene || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId = 0;
    let tx = -6;
    let ty = 18;

    const apply = () => {
      stage.style.transform = `rotateX(${ty}deg) rotateY(${tx}deg)`;
      rafId = 0;
    };

    const onMove = (e: PointerEvent) => {
      const r = scene.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      tx = -6 + nx * 10;
      ty = 18 - ny * 8;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      tx = -6;
      ty = 18;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const wbtc = ARBITRUM_TOKENS.WBTC;
  const usdc = ARBITRUM_TOKENS.USDC;

  return (
    <div
      ref={sceneRef}
      className="scene-3d relative mx-auto aspect-square w-full max-w-[560px]"
    >
      <div ref={stageRef} className="stage-3d absolute inset-0">
        <div
          aria-hidden
          className="floor-grid absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{ transform: "translate(-50%, -50%) translateZ(-80px)" }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            transform: "translate(-50%, -50%) translateZ(-79px)",
            background:
              "radial-gradient(ellipse at center, rgba(20,242,252,.18) 0%, rgba(20,242,252,0) 60%)",
          }}
        />

        <svg
          viewBox="0 0 560 560"
          className="absolute inset-0 h-full w-full"
          style={{ transform: "translateZ(20px)" }}
          aria-hidden
        >
          <defs>
            <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(20,242,252,0)" />
              <stop offset="20%" stopColor="rgba(20,242,252,.45)" />
              <stop offset="80%" stopColor="rgba(20,242,252,.85)" />
              <stop offset="100%" stopColor="rgba(20,242,252,.15)" />
            </linearGradient>
            <marker
              id="arc-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(20,242,252,.9)" />
            </marker>
          </defs>

          {/* Underlying static guide arcs — very faint quarter-arcs that
              form a symmetric diamond around (280, 280). Each arc starts
              ~60u from one node center and ends ~60u from the next, leaving
              breathing room before the icon edge. */}
          <g
            fill="none"
            stroke="rgba(20,242,252,.12)"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M 238 165 C 195 175 175 195 165 238" />
            <path d="M 165 322 C 175 365 195 385 238 395" />
            <path d="M 322 395 C 365 385 385 365 395 322" />
            <path d="M 395 238 C 385 195 365 175 322 165" />
          </g>

          {/* Animated traveling dashes on top of the guides. */}
          <g
            fill="none"
            stroke="url(#arc-grad)"
            strokeOpacity="0.95"
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd="url(#arc-arrow)"
          >
            <path
              d="M 238 165 C 195 175 175 195 165 238"
              className="flow-arc"
            />
            <path
              d="M 165 322 C 175 365 195 385 238 395"
              className="flow-arc"
              style={{ animationDelay: "-450ms" }}
            />
            <path
              d="M 322 395 C 365 385 385 365 395 322"
              className="flow-arc"
              style={{ animationDelay: "-900ms" }}
            />
            <path
              d="M 395 238 C 385 195 365 175 322 165"
              className="flow-arc"
              style={{ animationDelay: "-1350ms" }}
            />
          </g>
        </svg>

        {/* Particles travelling along the arcs (above the lines, below the pucks). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ transform: "translateZ(30px)" }}
        >
          <span
            className="flow-particle"
            style={{
              offsetPath: "path('M 238 165 C 195 175 175 195 165 238')",
              animationDelay: "0ms",
            }}
          />
          <span
            className="flow-particle"
            style={{
              offsetPath: "path('M 165 322 C 175 365 195 385 238 395')",
              animationDelay: "-700ms",
            }}
          />
          <span
            className="flow-particle"
            style={{
              offsetPath: "path('M 322 395 C 365 385 385 365 395 322')",
              animationDelay: "-1400ms",
            }}
          />
          <span
            className="flow-particle"
            style={{
              offsetPath: "path('M 395 238 C 385 195 365 175 322 165')",
              animationDelay: "-2100ms",
            }}
          />
        </div>

        {/* Pucks — exact 50% diamond, symmetric on both axes. */}
        <Puck
          x="50%"
          y="22%"
          z={70}
          delayClass="node-float-delay-1"
          label="Borrower"
          labelPosition="above"
          kind="person"
        />
        <Puck
          x="22%"
          y="50%"
          z={40}
          delayClass="node-float-delay-2"
          label="Collateral"
          kind="token"
          iconUrl={wbtc.iconUrl}
          iconAlt={wbtc.symbol}
          sublabel={wbtc.symbol}
        />
        <Puck
          x="50%"
          y="78%"
          z={20}
          delayClass="node-float-delay-3"
          label="Market"
          kind="market"
        />
        <Puck
          x="78%"
          y="50%"
          z={40}
          delayClass=""
          label="Loan"
          kind="token"
          iconUrl={usdc.iconUrl}
          iconAlt={usdc.symbol}
          sublabel={usdc.symbol}
        />
      </div>
    </div>
  );
}

function Puck({
  x,
  y,
  z,
  delayClass,
  label,
  sublabel,
  kind,
  iconUrl,
  iconAlt,
  labelPosition = "below",
}: {
  x: string;
  y: string;
  z: number;
  delayClass: string;
  label: string;
  sublabel?: string;
  kind: "person" | "token" | "market";
  iconUrl?: string;
  iconAlt?: string;
  labelPosition?: "above" | "below";
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateZ(${z}px)`,
      }}
    >
      {/* Projected shadow on the floor plate. */}
      <div
        aria-hidden
        className="node-shadow absolute left-1/2 top-1/2 h-[40px] w-[110px] -translate-x-1/2"
        style={{
          transform: `translate(-50%, ${z * 0.42}px) translateZ(${-z}px) rotateX(70deg)`,
        }}
      />

      <div className={`node-float ${delayClass} relative`}>
        {/* Soft halo behind the icon — gives it backing without a disc. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,242,252,.32) 0%, rgba(20,242,252,.08) 35%, rgba(20,242,252,0) 70%)",
          }}
        />

        {/* Icon container — transparent. No blue disc. */}
        <div className="relative flex h-[96px] w-[96px] items-center justify-center">
          {kind === "person" ? <PersonGlyph /> : null}
          {kind === "market" ? <MarketGlyph /> : null}
          {kind === "token" && iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt={iconAlt ?? ""}
              width={88}
              height={88}
              className="h-[88px] w-[88px] rounded-full object-contain"
              style={{
                filter:
                  "drop-shadow(0 8px 14px rgba(0,0,0,.45)) drop-shadow(0 0 12px rgba(20,242,252,.25))",
              }}
            />
          ) : null}
        </div>

        {/* Label — flips above the icon when the incoming arrow is from below.
            Borrower (top node) gets `above` so the inbound arrow head doesn't
            clip the text. */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center ${
            labelPosition === "above" ? "bottom-full mb-3" : "top-full mt-3"
          }`}
          style={{ transform: "translate(-50%, 0) rotateX(-12deg)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">
            {label}
          </p>
          {sublabel ? (
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-text-muted">
              {sublabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PersonGlyph() {
  return (
    <svg viewBox="0 0 96 96" className="h-[88px] w-[88px]" aria-hidden>
      <defs>
        <radialGradient id="person-blue" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#7fb8ff" />
          <stop offset="45%" stopColor="#2a6cff" />
          <stop offset="100%" stopColor="#0a3d9e" />
        </radialGradient>
      </defs>

      {/* Bust — rounded shoulders bleeding off the bottom edge of the viewBox. */}
      <path
        d="M 6 96 C 6 68 24 56 48 56 C 72 56 90 68 90 96 Z"
        fill="url(#person-blue)"
      />

      {/* Head — perfect sphere, slightly tucked into the bust. */}
      <circle cx="48" cy="28" r="20" fill="url(#person-blue)" />

      {/* Key-light specular on the top-left of the head. */}
      <ellipse
        cx="40"
        cy="18"
        rx="6.5"
        ry="3.8"
        fill="#ffffff"
        opacity="0.32"
        transform="rotate(-22 40 18)"
      />
      {/* Matching key-light streak on the bust shoulder. */}
      <ellipse
        cx="32"
        cy="64"
        rx="12"
        ry="3"
        fill="#ffffff"
        opacity="0.18"
        transform="rotate(-20 32 64)"
      />
    </svg>
  );
}

function MarketGlyph() {
  return (
    <svg viewBox="0 0 96 96" className="h-[88px] w-[88px]" aria-hidden>
      <defs>
        <linearGradient id="market-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a6cff" />
          <stop offset="100%" stopColor="#04204f" />
        </linearGradient>
        <linearGradient id="market-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ea1ff" />
          <stop offset="100%" stopColor="#2a6cff" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="68" rx="32" ry="8" fill="#04204f" />
      <rect x="16" y="36" width="64" height="32" fill="url(#market-side)" />
      <ellipse
        cx="48"
        cy="36"
        rx="32"
        ry="8"
        fill="url(#market-top)"
        stroke="rgba(20,242,252,.6)"
        strokeWidth="1"
      />
      <ellipse
        cx="48"
        cy="36"
        rx="22"
        ry="4"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <ellipse
        cx="48"
        cy="36"
        rx="10"
        ry="2"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="0.8"
      />
    </svg>
  );
}
