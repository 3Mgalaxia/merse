"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EnergyProvider, useEnergy } from "@/contexts/EnergyContext";
import CodexEditor from "./CodexEditor";
import CodexSidebar from "./CodexSidebar";
import CodexPreview from "./CodexPreview";
import { callCodexEdit, consumeCodexCredits } from "./api";
import "./style.css";

type CommandHistoryItem = {
  command: string;
  executedAt: string;
};

type StatusState = {
  message: string;
  tone: "info" | "success" | "error";
} | null;

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Merse — Universo da Criatividade com IA</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    name="description"
    content="Merse é uma plataforma de inteligência artificial com visual cósmico, geração de imagens e experiências criativas."
  />
  <!-- Fonte -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <style>
    /* ==========================
       RESET BÁSICO
       ========================== */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      scroll-behavior: smooth;
    }

    body {
      font-family: "Poppins", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top, #11001f 0%, #02000b 45%, #01010a 100%);
      color: #f5f5ff;
      overflow-x: hidden;
      position: relative;
    }

    /* Barra de rolagem customizada */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.8);
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #8b5cf6, #ec4899);
      border-radius: 999px;
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    img {
      max-width: 100%;
      display: block;
    }

    /* ==========================
       FUNDO GALÁXIA / ESTRELAS
       ========================== */
    #starfield {
      position: fixed;
      inset: 0;
      z-index: -3;
      background: radial-gradient(circle at 10% 0%, rgba(72, 61, 139, 0.4) 0, transparent 50%),
                  radial-gradient(circle at 80% 10%, rgba(236, 72, 153, 0.35) 0, transparent 45%),
                  radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.3) 0, transparent 55%),
                  #020010;
      overflow: hidden;
    }

    .star {
      position: absolute;
      width: 2px;
      height: 2px;
      border-radius: 50%;
      background: white;
      opacity: 0.4;
      animation: twinkle 4s infinite ease-in-out;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.1; transform: scale(0.7); }
      50% { opacity: 1; transform: scale(1.4); }
    }

    .nebula-gradient {
      position: fixed;
      border-radius: 50%;
      filter: blur(90px);
      mix-blend-mode: screen;
      opacity: 0.6;
      z-index: -2;
      pointer-events: none;
    }

    .nebula-gradient-1 {
      width: 420px;
      height: 420px;
      background: radial-gradient(circle, #9333ea, transparent 70%);
      top: -60px;
      left: -30px;
      animation: floatNebula1 18s infinite alternate ease-in-out;
    }

    .nebula-gradient-2 {
      width: 520px;
      height: 520px;
      background: radial-gradient(circle, #ec4899, transparent 70%);
      top: 40%;
      right: -120px;
      animation: floatNebula2 26s infinite alternate ease-in-out;
    }

    .nebula-gradient-3 {
      width: 580px;
      height: 580px;
      background: radial-gradient(circle, #22c1c3, transparent 70%);
      bottom: -170px;
      left: 20%;
      animation: floatNebula3 30s infinite alternate ease-in-out;
    }

    @keyframes floatNebula1 {
      0% { transform: translate3d(0,0,0); }
      100% { transform: translate3d(40px, 80px, 0); }
    }

    @keyframes floatNebula2 {
      0% { transform: translate3d(0,0,0); }
      100% { transform: translate3d(-60px, -60px, 0); }
    }

    @keyframes floatNebula3 {
      0% { transform: translate3d(0,0,0); }
      100% { transform: translate3d(60px, -40px, 0); }
    }

    /* ==========================
       CONTAINERS / LAYOUT
       ========================== */
    .page-wrapper {
      position: relative;
      z-index: 1;
      padding: 0 1.5rem 4rem;
    }

    @media (min-width: 1024px) {
      .page-wrapper {
        padding-inline: 4rem;
      }
    }

    .section {
      padding: 6rem 0;
      position: relative;
    }

    .section + .section {
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }

    .section-header {
      max-width: 720px;
      margin: 0 auto 3rem;
      text-align: center;
    }

    .section-kicker {
      font-size: 0.75rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      font-weight: 600;
      color: #a5b4fc;
      margin-bottom: 0.8rem;
    }

    .section-title {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 2rem;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }

    .section-subtitle {
      font-size: 0.98rem;
      color: #cbd5f5;
      opacity: 0.88;
    }

    @media (min-width: 768px) {
      .section-title {
        font-size: 2.3rem;
      }
    }

    .grid {
      display: grid;
      gap: 1.5rem;
    }

    @media (min-width: 768px) {
      .grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    /* ==========================
       LIQUID GLASS / CARDS
       ========================== */
    .glass {
      background: linear-gradient(135deg,
        rgba(15, 23, 42, 0.92),
        rgba(15, 23, 42, 0.7)
      );
      border-radius: 22px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow:
        0 18px 60px rgba(15, 23, 42, 0.9),
        0 0 50px rgba(59, 130, 246, 0.25);
      backdrop-filter: blur(22px) saturate(140%);
      -webkit-backdrop-filter: blur(22px) saturate(140%);
    }

    .glass-soft {
      background: radial-gradient(circle at top left,
        rgba(148, 163, 255, 0.14),
        rgba(15, 23, 42, 0.9)
      );
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow:
        0 16px 40px rgba(15, 23, 42, 0.75);
    }

    .glass-outline {
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: linear-gradient(120deg,
        rgba(15, 23, 42, 0.8),
        rgba(15, 23, 42, 0.95)
      );
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }

    .card {
      padding: 1.6rem 1.4rem;
      position: relative;
      overflow: hidden;
    }

    @media (min-width: 768px) {
      .card {
        padding: 1.9rem 1.7rem;
      }
    }

    .card-glow {
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at top, rgba(129, 140, 248, 0.06) 0, transparent 60%),
        radial-gradient(circle at 80% 120%, rgba(236, 72, 153, 0.16) 0, transparent 65%);
      opacity: 0;
      transition: opacity 0.5s ease-out;
      pointer-events: none;
      z-index: -1;
    }

    .card:hover .card-glow {
      opacity: 1;
    }

    .card-title {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 1.1rem;
      margin-bottom: 0.4rem;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      margin-bottom: 0.4rem;
    }

    .card-text {
      font-size: 0.9rem;
      color: #e5e7f5;
      opacity: 0.9;
      line-height: 1.6;
    }

    /* ==========================
       NAVBAR
       ========================== */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 0.7rem 1.2rem;
      border-radius: 999px;
      margin: 1rem auto 0;
      max-width: 1100px;
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.22),
        rgba(15, 23, 42, 0.96)
      );
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow:
        0 18px 60px rgba(15, 23, 42, 0.9),
        0 0 50px rgba(59, 130, 246, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 1rem;
    }

    .navbar-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .logo-orb {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: conic-gradient(
        from 220deg,
        #0ea5e9,
        #6366f1,
        #a855f7,
        #ec4899,
        #0ea5e9
      );
      box-shadow:
        0 0 20px rgba(79, 70, 229, 0.8),
        0 0 40px rgba(236, 72, 153, 0.6);
      position: relative;
      overflow: hidden;
    }

    .logo-orb::after {
      content: "";
      position: absolute;
      inset: 3px;
      border-radius: inherit;
      background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.9), transparent 55%),
                  radial-gradient(circle at 80% 70%, rgba(249, 168, 212, 0.7), transparent 60%);
      mix-blend-mode: screen;
    }

    .logo-text {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-weight: 600;
      letter-spacing: 0.18em;
      font-size: 0.9rem;
      text-transform: uppercase;
      display: flex;
      align-items: baseline;
      gap: 0.3rem;
    }

    .logo-version {
      font-size: 0.7rem;
      font-weight: 500;
      color: #a5b4fc;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: rgba(30, 64, 175, 0.7);
      border: 1px solid rgba(191, 219, 254, 0.3);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.5);
    }

    .navbar-links {
      display: none;
      align-items: center;
      gap: 0.9rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    @media (min-width: 900px) {
      .navbar-links {
        display: flex;
      }
    }

    .nav-link {
      position: relative;
      padding-block: 0.2rem;
      color: #e5e7eb;
      opacity: 0.8;
      transition: opacity 0.2s ease-out, transform 0.2s ease-out;
    }

    .nav-link::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: -0.35rem;
      width: 0%;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
      transition: width 0.25s ease-out;
    }

    .nav-link:hover {
      opacity: 1;
      transform: translateY(-1px);
    }

    .nav-link.active::after {
      width: 100%;
    }

    .navbar-actions {
      display: none;
      align-items: center;
      gap: 0.6rem;
    }

    @media (min-width: 768px) {
      .navbar-actions {
        display: flex;
      }
    }

    .navbar-toggle {
      background: transparent;
      border: 0;
      display: inline-flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
    }

    .toggle-line {
      width: 20px;
      height: 2px;
      border-radius: 999px;
      background: #e5e7eb;
      transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    }

    @media (min-width: 900px) {
      .navbar-toggle {
        display: none;
      }
    }

    .navbar-mobile {
      position: fixed;
      top: 76px;
      left: 0;
      right: 0;
      padding: 1rem 1.5rem 1.5rem;
      background: radial-gradient(circle at top, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.98));
      border-bottom: 1px solid rgba(148, 163, 184, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: none;
      flex-direction: column;
      gap: 0.6rem;
      z-index: 40;
    }

    .navbar-mobile.open {
      display: flex;
      animation: slideDown 0.25s ease-out forwards;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mobile-link {
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(51, 65, 85, 0.9);
      font-size: 0.9rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.9;
    }

    .navbar-mobile-actions {
      margin-top: 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    /* ==========================
       BOTÕES
       ========================== */
    .btn {
      border-radius: 999px;
      border: 1px solid transparent;
      padding: 0.55rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      white-space: nowrap;
      transition:
        transform 0.18s ease-out,
        box-shadow 0.18s ease-out,
        background 0.18s ease-out,
        border-color 0.18s ease-out,
        color 0.18s ease-out;
    }

    .btn-primary {
      background-image: linear-gradient(120deg, #6366f1, #ec4899, #22c1c3);
      background-size: 200% 200%;
      border-color: rgba(191, 219, 254, 0.7);
      color: #0f172a;
      box-shadow:
        0 12px 30px rgba(79, 70, 229, 0.5),
        0 0 40px rgba(236, 72, 153, 0.6);
      animation: gradientShift 9s ease infinite;
    }

    .btn-primary:hover {
      transform: translateY(-1px) scale(1.02);
      box-shadow:
        0 15px 40px rgba(79, 70, 229, 0.7),
        0 0 50px rgba(236, 72, 153, 0.9);
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .btn-ghost {
      background: radial-gradient(circle at top left,
        rgba(148, 163, 184, 0.18),
        rgba(15, 23, 42, 0.9)
      );
      border-color: rgba(148, 163, 184, 0.7);
      color: #e5e7eb;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.9);
    }

    .btn-ghost:hover {
      border-color: rgba(129, 140, 248, 0.9);
      box-shadow:
        0 10px 30px rgba(15, 23, 42, 0.9),
        0 0 30px rgba(129, 140, 248, 0.6);
      transform: translateY(-1px);
    }

    .btn-icon {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.7);
      background: rgba(15, 23, 42, 0.96);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      cursor: pointer;
      transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, background 0.18s ease-out;
    }

    .btn-icon:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.9);
      background: rgba(15, 23, 42, 0.9);
    }

    .btn.full {
      width: 100%;
    }

    /* ==========================
       HERO SECTION
       ========================== */
    #hero {
      padding-top: 4.5rem;
    }

    .hero-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 2.6rem;
    }

    @media (min-width: 900px) {
      .hero-inner {
        grid-template-columns: 1.3fr 1fr;
        align-items: center;
        gap: 2.2rem;
      }
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.2rem 0.4rem 0.2rem 0.2rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.3),
        rgba(15, 23, 42, 0.96)
      );
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      margin-bottom: 1.2rem;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.95);
    }

    .hero-pill-badge {
      background: linear-gradient(120deg, #22c55e, #14b8a6);
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-weight: 600;
      color: #022c22;
    }

    .hero-pill-text {
      font-size: 0.75rem;
      color: #d1d5db;
      padding-inline: 0.4rem 0.6rem;
    }

    .hero-title {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 2.5rem;
      line-height: 1.05;
      margin-bottom: 0.7rem;
      letter-spacing: -0.03em;
    }

    .hero-title span.highlight {
      background: linear-gradient(120deg, #a855f7, #ec4899, #22c1c3);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      text-shadow: 0 0 28px rgba(236, 72, 153, 0.6);
    }

    @media (min-width: 768px) {
      .hero-title {
        font-size: 3rem;
      }
    }

    @media (min-width: 1100px) {
      .hero-title {
        font-size: 3.3rem;
      }
    }

    .hero-subtitle {
      font-size: 0.98rem;
      color: #cbd5f5;
      max-width: 32rem;
      margin-bottom: 1.6rem;
      line-height: 1.7;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      align-items: center;
      margin-bottom: 1.3rem;
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.3rem;
      font-size: 0.78rem;
      color: #9ca3af;
    }

    .hero-meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .hero-meta-label {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.65rem;
      color: #6b7280;
    }

    .hero-meta-value {
      color: #e5e7eb;
      font-weight: 500;
    }

    .hero-right {
      position: relative;
    }

    .hero-orbit {
      position: relative;
      width: min(380px, 100%);
      margin: 0 auto;
      aspect-ratio: 4 / 5;
      border-radius: 32px;
      padding: 1.2rem;
      background: radial-gradient(circle at top left,
        rgba(148, 163, 255, 0.18),
        rgba(15, 23, 42, 0.98)
      );
      border: 1px solid rgba(148, 163, 184, 0.6);
      box-shadow:
        0 20px 60px rgba(15, 23, 42, 0.95),
        0 0 70px rgba(56, 189, 248, 0.35);
      overflow: hidden;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .hero-orbit-gradient {
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.45), transparent 60%),
        radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.5), transparent 65%),
        radial-gradient(circle at 20% 110%, rgba(56, 189, 248, 0.5), transparent 60%);
      opacity: 0.7;
      mix-blend-mode: screen;
      pointer-events: none;
    }

    .hero-orbit-inner {
      position: relative;
      border-radius: 24px;
      border: 1px solid rgba(191, 219, 254, 0.7);
      padding: 1.1rem;
      height: 100%;
      background: radial-gradient(circle at top, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.98));
      overflow: hidden;
    }

    .hero-orbit-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.8rem;
      font-size: 0.75rem;
    }

    .dot-pulse {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.9);
      position: relative;
    }

    .dot-pulse::after {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      border: 2px solid rgba(34, 197, 94, 0.7);
      opacity: 0;
      animation: ping 1.3s infinite;
    }

    @keyframes ping {
      0% { transform: scale(0.8); opacity: 0.9; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .hero-orbit-label {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #9ca3af;
    }

    .hero-orbit-tag {
      font-size: 0.7rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.8);
      background: rgba(15, 23, 42, 0.96);
    }

    .hero-orbit-screen {
      margin-top: 0.4rem;
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(191, 219, 254, 0.3);
      background: radial-gradient(circle at 20% 0%, rgba(148, 163, 255, 0.3), rgba(15, 23, 42, 1));
      min-height: 180px;
    }

    .hero-orbit-mock {
      position: absolute;
      inset: 0;
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.78rem;
    }

    .hero-orbit-prompt-label {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.65rem;
      color: #9ca3af;
    }

    .hero-orbit-prompt {
      border-radius: 999px;
      border: 1px solid rgba(191, 219, 254, 0.5);
      padding: 0.4rem 0.7rem;
      background: rgba(15, 23, 42, 0.92);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.7rem;
    }

    .hero-orbit-prompt-text {
      font-size: 0.75rem;
      color: #e5e7eb;
      flex: 1;
    }

    .hero-orbit-mini-btn {
      font-size: 0.7rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      border: 1px solid rgba(191, 219, 254, 0.6);
      background: linear-gradient(120deg, #6366f1, #ec4899);
      color: #0f172a;
      cursor: pointer;
      white-space: nowrap;
    }

    .hero-orbit-gallery {
      margin-top: 0.5rem;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
    }

    .hero-orbit-thumb {
      border-radius: 14px;
      border: 1px solid rgba(191, 219, 254, 0.3);
      background: radial-gradient(circle at 20% 0%, rgba(56, 189, 248, 0.4), rgba(15, 23, 42, 1));
      aspect-ratio: 1 / 1;
      position: relative;
      overflow: hidden;
    }

    .hero-orbit-thumb::after {
      content: "";
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 20% 0%, rgba(129, 140, 248, 0.8), transparent 55%),
        radial-gradient(circle at 80% 100%, rgba(236, 72, 153, 0.7), transparent 60%);
      mix-blend-mode: screen;
    }

    .hero-orbit-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      color: #9ca3af;
    }

    .hero-orbit-progress {
      width: 65%;
      height: 4px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 1);
      overflow: hidden;
    }

    .hero-orbit-progress-inner {
      width: 68%;
      height: 100%;
      border-radius: inherit;
      background-image: linear-gradient(90deg, #6366f1, #ec4899, #22c1c3);
      background-size: 140% 140%;
      animation: gradientShift 8s linear infinite;
      box-shadow: 0 0 12px rgba(129, 140, 248, 0.8);
    }

    /* ==========================
       SOBRE
       ========================== */
    .about-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 1.8rem;
    }

    @media (min-width: 900px) {
      .about-grid {
        grid-template-columns: 1.3fr 1fr;
        align-items: start;
      }
    }

    .about-copy {
      font-size: 0.95rem;
      color: #e5e7f5;
      line-height: 1.7;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .about-list {
      list-style: none;
      display: grid;
      gap: 0.7rem;
    }

    .about-list li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .about-list-bullet {
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }

    .about-highlight {
      font-size: 0.85rem;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .about-card {
      padding: 1.4rem 1.3rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .about-stats {
      display: grid;
      gap: 0.8rem;
    }

    @media (min-width: 600px) {
      .about-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .stat {
      padding: 0.9rem 0.8rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.25),
        rgba(15, 23, 42, 0.96)
      );
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.95);
    }

    .stat-value {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 1.3rem;
      margin-bottom: 0.1rem;
    }

    .stat-label {
      font-size: 0.7rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    /* ==========================
       RECURSOS
       ========================== */
    .feature-icon {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      border: 1px solid rgba(191, 219, 254, 0.6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      margin-bottom: 0.6rem;
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.6),
        rgba(15, 23, 42, 0.96)
      );
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.9);
    }

    .feature-list {
      list-style: none;
      display: grid;
      gap: 0.35rem;
      margin-top: 0.4rem;
    }

    .feature-list li {
      font-size: 0.82rem;
      color: #c7d2fe;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .feature-dot {
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(120deg, #6366f1, #ec4899);
      box-shadow: 0 0 8px rgba(129, 140, 248, 0.9);
      flex-shrink: 0;
    }

    /* ==========================
       GALERIA
       ========================== */
    .gallery-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 1.3rem;
    }

    @media (min-width: 900px) {
      .gallery-grid {
        grid-template-columns: 1.7fr 1.1fr;
      }
    }

    .gallery-main {
      border-radius: 22px;
      border: 1px solid rgba(191, 219, 254, 0.5);
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.45),
        rgba(15, 23, 42, 1)
      );
      box-shadow:
        0 18px 55px rgba(15, 23, 42, 0.95),
        0 0 50px rgba(79, 70, 229, 0.6);
      padding: 1.1rem;
      position: relative;
      overflow: hidden;
    }

    .gallery-main-inner {
      border-radius: 18px;
      border: 1px solid rgba(191, 219, 254, 0.5);
      background: radial-gradient(circle at 0% 0%, rgba(8, 47, 73, 0.9), rgba(15, 23, 42, 1));
      min-height: 230px;
      position: relative;
      overflow: hidden;
    }

    .gallery-main-gradient {
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.45), transparent 60%),
        radial-gradient(circle at 80% 100%, rgba(236, 72, 153, 0.5), transparent 60%);
      opacity: 0.85;
      mix-blend-mode: screen;
    }

    .gallery-main-content {
      position: relative;
      padding: 1.2rem 1.3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .gallery-main-tag {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #e5e7eb;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .gallery-art-orbit {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      border: 1px solid rgba(191, 219, 254, 0.6);
      background: radial-gradient(circle at 30% 0%, rgba(59, 130, 246, 0.7), rgba(15, 23, 42, 1));
      box-shadow:
        0 18px 60px rgba(15, 23, 42, 1),
        0 0 60px rgba(59, 130, 246, 0.7);
      position: absolute;
      bottom: -10px;
      right: -10px;
      overflow: hidden;
    }

    .gallery-art-orbit::before {
      content: "";
      position: absolute;
      inset: 18%;
      border-radius: 50%;
      border: 1px solid rgba(191, 219, 254, 0.9);
      box-shadow: 0 0 30px rgba(191, 219, 254, 0.6);
    }

    .gallery-art-orbit::after {
      content: "";
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 20% 0%, rgba(129, 140, 248, 0.9), transparent 60%),
        radial-gradient(circle at 80% 100%, rgba(236, 72, 153, 0.8), transparent 65%);
      mix-blend-mode: screen;
    }

    .gallery-row {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.7rem;
    }

    .gallery-mini {
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.7);
      padding: 0.7rem 0.8rem;
      font-size: 0.8rem;
      color: #e5e7eb;
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.24),
        rgba(15, 23, 42, 0.96)
      );
    }

    .gallery-mini-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #9ca3af;
      margin-bottom: 0.3rem;
    }

    .gallery-mini-value {
      font-size: 0.8rem;
    }

    .gallery-side {
      display: grid;
      gap: 1rem;
    }

    .gallery-badge {
      font-size: 0.8rem;
      color: #cbd5f5;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      border: 1px dashed rgba(148, 163, 184, 0.9);
      background: rgba(15, 23, 42, 0.96);
    }

    /* ==========================
       PLANOS
       ========================== */
    .pricing-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 1.4rem;
    }

    @media (min-width: 900px) {
      .pricing-grid {
        grid-template-columns: 1.1fr 1.1fr 0.9fr;
      }
    }

    .pricing-card {
      padding: 1.7rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      position: relative;
      overflow: hidden;
    }

    .pricing-card.highlight {
      border: 1px solid rgba(251, 191, 36, 0.9);
      box-shadow:
        0 18px 55px rgba(15, 23, 42, 0.95),
        0 0 40px rgba(252, 211, 77, 0.7);
    }

    .pricing-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #9ca3af;
    }

    .pricing-name {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 1.1rem;
    }

    .pricing-price {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 1.7rem;
      margin-top: 0.2rem;
    }

    .pricing-period {
      font-size: 0.8rem;
      color: #9ca3af;
    }

    .pricing-tagline {
      font-size: 0.85rem;
      color: #cbd5f5;
      margin-bottom: 0.7rem;
    }

    .pricing-list {
      list-style: none;
      display: grid;
      gap: 0.45rem;
      font-size: 0.82rem;
      color: #e5e7eb;
      margin-bottom: 0.9rem;
    }

    .pricing-list li {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .pricing-check {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1px solid rgba(129, 140, 248, 0.8);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
    }

    .pricing-badge {
      position: absolute;
      top: 0.9rem;
      right: 1rem;
      font-size: 0.7rem;
      padding: 0.16rem 0.6rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      background: linear-gradient(120deg, #fbbf24, #f97316);
      color: #111827;
      border: 1px solid rgba(254, 243, 199, 0.9);
      box-shadow: 0 0 22px rgba(252, 211, 77, 0.7);
    }

    /* ==========================
       DEPOIMENTOS
       ========================== */
    .testimonial-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 1.4rem;
    }

    @media (min-width: 900px) {
      .testimonial-grid {
        grid-template-columns: 1.4fr 1fr;
      }
    }

    .testimonial-main {
      padding: 1.5rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .testimonial-quote {
      font-size: 0.95rem;
      color: #e5e7f5;
      line-height: 1.7;
    }

    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-size: 0.85rem;
    }

    .testimonial-avatar {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(191, 219, 254, 0.8);
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.6),
        rgba(15, 23, 42, 0.96)
      );
      box-shadow:
        0 12px 26px rgba(15, 23, 42, 0.95),
        0 0 25px rgba(129, 140, 248, 0.7);
    }

    .testimonial-name {
      font-weight: 500;
    }

    .testimonial-role {
      color: #9ca3af;
      font-size: 0.8rem;
    }

    .testimonial-side {
      display: grid;
      gap: 0.9rem;
    }

    .testimonial-pill {
      padding: 0.7rem 0.9rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.8);
      font-size: 0.82rem;
      background: rgba(15, 23, 42, 0.96);
    }

    /* ==========================
       FAQ
       ========================== */
    .faq-grid {
      max-width: 950px;
      margin: 0 auto;
      display: grid;
      gap: 1rem;
    }

    .faq-item {
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.7);
      background: rgba(15, 23, 42, 0.95);
      padding: 0.9rem 1.1rem;
      cursor: pointer;
      transition: border-color 0.2s ease-out, background 0.2s ease-out, box-shadow 0.2s ease-out;
    }

    .faq-item.open {
      border-color: rgba(129, 140, 248, 0.95);
      background: radial-gradient(circle at top left,
        rgba(129, 140, 248, 0.25),
        rgba(15, 23, 42, 0.98)
      );
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.95);
    }

    .faq-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .faq-question {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .faq-toggle {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.9);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .faq-body {
      font-size: 0.85rem;
      color: #cbd5f5;
      margin-top: 0.5rem;
      line-height: 1.6;
      display: none;
    }

    .faq-item.open .faq-body {
      display: block;
    }

    /* ==========================
       FOOTER
       ========================== */
    footer {
      border-radius: 24px;
      border: 1px solid rgba(30, 64, 175, 0.8);
      background: radial-gradient(circle at top left,
        rgba(30, 64, 175, 0.6),
        rgba(15, 23, 42, 0.98)
      );
      padding: 1.4rem 1.6rem 1.2rem;
      max-width: 1100px;
      margin: 0 auto;
      box-shadow:
        0 18px 55px rgba(15, 23, 42, 0.96),
        0 0 45px rgba(30, 64, 175, 0.8);
    }

    .footer-top {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (min-width: 800px) {
      .footer-top {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1.2rem;
      }
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .footer-brand-title {
      font-family: "Space Grotesk", system-ui, sans-serif;
      font-size: 1.2rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .footer-brand-sub {
      font-size: 0.85rem;
      color: #cbd5f5;
    }

    .footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    .footer-bottom {
      margin-top: 1.1rem;
      padding-top: 0.8rem;
      border-top: 1px solid rgba(148, 163, 184, 0.6);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.6rem;
      font-size: 0.78rem;
      color: #9ca3af;
    }

    .footer-social {
      display: flex;
      gap: 0.5rem;
    }

    /* ==========================
       ANIMAÇÕES DE ENTRADA
       ========================== */
    .reveal {
      opacity: 0;
      transform: translateY(18px) scale(0.98);
      transition:
        opacity 0.65s ease-out,
        transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .reveal.in-view {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .delay-1 { transition-delay: 0.1s; }
    .delay-2 { transition-delay: 0.18s; }
    .delay-3 { transition-delay: 0.28s; }
    .delay-4 { transition-delay: 0.38s; }

    /* ==========================
       CURSOR GLOW
       ========================== */
    .cursor-glow {
      position: fixed;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle, rgba(129, 140, 248, 0.27), transparent 60%);
      mix-blend-mode: screen;
      opacity: 0;
      transform: translate(-50%, -50%);
      transition: opacity 0.25s ease-out;
      z-index: -1;
    }

    @media (max-width: 800px) {
      .cursor-glow {
        display: none;
      }
    }
  </style>
</head>
<body>
  <!-- Fundo de estrelas gerado via JS -->
  <div id="starfield"></div>
  <div class="nebula-gradient nebula-gradient-1"></div>
  <div class="nebula-gradient nebula-gradient-2"></div>
  <div class="nebula-gradient nebula-gradient-3"></div>
  <div class="cursor-glow" id="cursorGlow"></div>

  <!-- NAVBAR -->
  <header class="navbar glass">
    <div class="navbar-inner">
      <div class="navbar-logo">
        <div class="logo-orb"></div>
        <span class="logo-text">
          Merse
          <span class="logo-version">1.0</span>
        </span>
      </div>

      <nav class="navbar-links" id="navbarLinks">
        <a href="#hero" class="nav-link active">Início</a>
        <a href="#sobre" class="nav-link">Sobre</a>
        <a href="#recursos" class="nav-link">Recursos</a>
        <a href="#galeria" class="nav-link">Galeria</a>
        <a href="#planos" class="nav-link">Planos</a>
        <a href="#faq" class="nav-link">FAQ</a>
      </nav>

      <div class="navbar-actions">
        <button class="btn btn-ghost" type="button">Entrar</button>
        <button class="btn btn-primary" type="button">Começar agora</button>
      </div>

      <button class="navbar-toggle" id="navbarToggle" aria-label="Menu">
        <span class="toggle-line"></span>
        <span class="toggle-line"></span>
      </button>
    </div>
  </header>

  <div class="navbar-mobile" id="navbarMobile">
    <a href="#hero" class="nav-link mobile-link">Início</a>
    <a href="#sobre" class="nav-link mobile-link">Sobre</a>
    <a href="#recursos" class="nav-link mobile-link">Recursos</a>
    <a href="#galeria" class="nav-link mobile-link">Galeria</a>
    <a href="#planos" class="nav-link mobile-link">Planos</a>
    <a href="#faq" class="nav-link mobile-link">FAQ</a>
    <div class="navbar-mobile-actions">
      <button class="btn btn-ghost full" type="button">Entrar</button>
      <button class="btn btn-primary full" type="button">Começar agora</button>
    </div>
  </div>

  <main class="page-wrapper">
    <!-- HERO -->
    <section id="hero" class="section">
      <div class="hero-inner">
        <div class="hero-left reveal delay-1">
          <div class="hero-pill">
            <span class="hero-pill-badge">Nova Era</span>
            <span class="hero-pill-text">Crie imagens galácticas em segundos com IA.</span>
          </div>
          <h1 class="hero-title">
            A <span class="highlight">Merse</span> transforma sua imaginação em
            universos inteiros.
          </h1>
          <p class="hero-subtitle">
            Uma plataforma de inteligência artificial com visual cósmico, pensada para criadores,
            empreendedores e curiosos que querem ir além dos prompts básicos.
          </p>

          <div class="hero-actions">
            <button class="btn btn-primary" type="button">Começar de graça</button>
            <button class="btn btn-ghost" type="button">Ver exemplos de artes</button>
          </div>

          <div class="hero-meta">
            <div class="hero-meta-item">
              <span class="hero-meta-label">Gerações hoje</span>
              <span class="hero-meta-value" data-counter data-target="1287">0</span>
            </div>
            <div class="hero-meta-item">
              <span class="hero-meta-label">Artistas ativos</span>
              <span class="hero-meta-value" data-counter data-target="426">0</span>
            </div>
            <div class="hero-meta-item">
              <span class="hero-meta-label">Taxa de aprovação</span>
              <span class="hero-meta-value">98%</span>
            </div>
          </div>
        </div>

        <div class="hero-right reveal delay-2">
          <div class="hero-orbit">
            <div class="hero-orbit-gradient"></div>
            <div class="hero-orbit-inner">
              <div class="hero-orbit-status">
                <div style="display:flex;align-items:center; gap:0.4rem;">
                  <span class="dot-pulse"></span>
                  <span class="hero-orbit-label">Studio Cósmico</span>
                </div>
                <span class="hero-orbit-tag">Modo Galáxia • ON</span>
              </div>

              <div class="hero-orbit-screen">
                <div class="hero-orbit-mock">
                  <div>
                    <p class="hero-orbit-prompt-label">Prompt em execução</p>
                    <div class="hero-orbit-prompt">
                      <p class="hero-orbit-prompt-text">
                        Astronauta sentado em frente a uma fogueira em um planeta roxo,
                        com um anel de galáxias no céu, arte em 8K, estilo cinematográfico.
                      </p>
                      <button class="hero-orbit-mini-btn" type="button">
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div class="hero-orbit-gallery">
                    <div class="hero-orbit-thumb"></div>
                    <div class="hero-orbit-thumb"></div>
                    <div class="hero-orbit-thumb"></div>
                  </div>

                  <div class="hero-orbit-footer">
                    <div>Processando cena cósmica…</div>
                    <div class="hero-orbit-progress">
                      <div class="hero-orbit-progress-inner"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top:0.7rem; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#9ca3af;">
                <span>Créditos cósmicos: <strong>2 480</strong></span>
                <span>Modelo: Merse Nebula v1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SOBRE -->
    <section id="sobre" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Sobre a Merse</p>
        <h2 class="section-title">Uma IA com DNA de galáxia, feita para você experimentar sem medo.</h2>
        <p class="section-subtitle">
          Enquanto outras plataformas de IA focam apenas em tecnologia, a Merse combina
          visual, experiência e ferramentas pensadas para quem quer criar arte, produtos,
          campanhas e mundos inteiros.
        </p>
      </div>

      <div class="about-grid">
        <div class="about-copy reveal delay-1">
          <p>
            A Merse nasceu da vontade de ter um lugar onde criar com IA não parecesse só
            “apertar um botão”. Cada detalhe do site, do design das cartas até o fundo
            galáctico, foi pensado para parecer um cockpit de nave espacial criativa.
          </p>
          <p>
            Você pode testar prompts, salvar suas melhores criações, montar coleções e
            transformar suas ideias em artes que realmente chamam atenção — seja no feed,
            em sites, no portfólio ou em projetos pessoais.
          </p>
          <ul class="about-list">
            <li>
              <span class="about-list-bullet">✨</span>
              <span>Interface em liquid glass com animações suaves e foco total no visual.</span>
            </li>
            <li>
              <span class="about-list-bullet">🪐</span>
              <span>Sistema de créditos cósmicos para organizar uso, planos e upgrades.</span>
            </li>
            <li>
              <span class="about-list-bullet">🚀</span>
              <span>Experiência feita para criadores, designers, devs, estudantes e marcas.</span>
            </li>
          </ul>
          <p class="about-highlight">
            A ideia é simples: deixar a IA poderosa, mas a experiência tão bonita que
            você sinta vontade de ficar explorando.
          </p>
        </div>

        <div class="about-card glass-soft reveal delay-2">
          <div class="about-stats">
            <div class="stat">
              <p class="stat-value" data-counter data-target="3.8">0</p>
              <p class="stat-label">Segundos médios por geração</p>
            </div>
            <div class="stat">
              <p class="stat-value" data-counter data-target="24">0</p>
              <p class="stat-label">Temas cósmicos prontos</p>
            </div>
            <div class="stat">
              <p class="stat-value" data-counter data-target="92">0</p>
              <p class="stat-label">Países com acessos</p>
            </div>
          </div>

          <p style="font-size:0.86rem; color:#e5e7f5; margin-top:0.9rem;">
            Em vez de esconder a IA, a Merse cria um ambiente de cockpit criativo:
            você mexe, testa, erra, acerta, salva e compartilha. Como um estúdio
            de arte dentro de uma nave.
          </p>
        </div>
      </div>
    </section>

    <!-- RECURSOS -->
    <section id="recursos" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Recursos da plataforma</p>
        <h2 class="section-title">Tudo que você precisa para criar artes cósmicas sem travar no prompt.</h2>
        <p class="section-subtitle">
          A Merse combina presets inteligentes, controles avançados e visual guiado
          para que você não dependa de “prompts secretos” ou tutoriais gigantes.
        </p>
      </div>

      <div class="grid grid-3">
        <article class="glass card reveal delay-1">
          <div class="card-glow"></div>
          <div class="feature-icon">🎨</div>
          <p class="card-subtitle">Criação guiada</p>
          <h3 class="card-title">Assistente de Prompts</h3>
          <p class="card-text">
            Escolha o estilo, clima, foco e intensidade. A Merse monta um prompt
            completo com detalhes técnicos, mas numa linguagem que você entende.
          </p>
          <ul class="feature-list">
            <li><span class="feature-dot"></span>Estilos prontos: neón, futurista, vaporwave e mais.</li>
            <li><span class="feature-dot"></span>Ajuste de luz, textura, nitidez e distância.</li>
            <li><span class="feature-dot"></span>Histórico de prompts para repetir as melhores criações.</li>
          </ul>
        </article>

        <article class="glass card reveal delay-2">
          <div class="card-glow"></div>
          <div class="feature-icon">🌌</div>
          <p class="card-subtitle">Visual cósmico</p>
          <h3 class="card-title">Interface Liquid Glass</h3>
          <p class="card-text">
            Cards translúcidos, contornos brilhando, gradientes suaves e partículas
            em segundo plano. Você sente que está em uma nave, não num painel qualquer.
          </p>
          <ul class="feature-list">
            <li><span class="feature-dot"></span>Blur dinâmico com luzes azuis e roxas.</li>
            <li><span class="feature-dot"></span>Components prontos para dashboards, galerias e cards.</li>
            <li><span class="feature-dot"></span>Animações suaves ao rolar a página.</li>
          </ul>
        </article>

        <article class="glass card reveal delay-3">
          <div class="card-glow"></div>
          <div class="feature-icon">⚡</div>
          <p class="card-subtitle">Pensado para uso real</p>
          <h3 class="card-title">Fluxos Inteligentes</h3>
          <p class="card-text">
            Atalhos para duplicar imagens, criar variações, subir referência e
            já exportar no formato certo para redes, sites ou anúncios.
          </p>
          <ul class="feature-list">
            <li><span class="feature-dot"></span>Variações rápidas com um clique.</li>
            <li><span class="feature-dot"></span>Pré-cortes para feed, story, banner e capa.</li>
            <li><span class="feature-dot"></span>Tags e coleções para organizar suas séries.</li>
          </ul>
        </article>
      </div>
    </section>

    <!-- GALERIA -->
    <section id="galeria" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Galeria Merse</p>
        <h2 class="section-title">Uma prévia dos mundos que você pode criar.</h2>
        <p class="section-subtitle">
          Não é só “imagem bonita”: são cenas com narrativa, atmosfera, textura
          e profundidade — pensadas para parecer frame de filme.
        </p>
      </div>

      <div class="gallery-grid">
        <div class="gallery-main reveal delay-1">
          <div class="gallery-main-inner">
            <div class="gallery-main-gradient"></div>
            <div class="gallery-main-content">
              <p class="gallery-main-tag">
                CENA DESTAQUE · <span style="opacity:0.7;">Nebula Dreams</span>
              </p>
              <h3 style="font-family:'Space Grotesk'; font-size:1.2rem;">
                Astronauta ao lado de uma fogueira em um planeta violeta
              </h3>
              <p style="font-size:0.9rem; max-width:360px; color:#e5e7f5;">
                Um viajante solitário observa um anel de galáxias girando no céu,
                enquanto fagulhas da fogueira se misturam a poeira estelar.
              </p>

              <div class="gallery-art-orbit"></div>
            </div>
          </div>

          <div class="gallery-row">
            <div class="gallery-mini">
              <p class="gallery-mini-label">Cenário</p>
              <p class="gallery-mini-value">Planeta com neblina roxa e rochas em neon.</p>
            </div>
            <div class="gallery-mini">
              <p class="gallery-mini-label">Estilo</p>
              <p class="gallery-mini-value">Realismo cinematográfico em 8K.</p>
            </div>
            <div class="gallery-mini">
              <p class="gallery-mini-label">Uso</p>
              <p class="gallery-mini-value">Capas, campanhas, fundos de site e posters.</p>
            </div>
          </div>
        </div>

        <div class="gallery-side">
          <div class="glass-outline card reveal delay-2">
            <p class="card-subtitle">Coleções</p>
            <h3 class="card-title">Séries prontas para você customizar.</h3>
            <p class="card-text">
              Packs temáticos com prompts base para você adaptar: planeta-mercado,
              cafés em naves, cidades submersas, desertos holográficos e muito mais.
            </p>
          </div>

          <div class="gallery-badge reveal delay-3">
            Você pode usar as artes da Merse para: thumbnails, capas de playlist,
            banners, capas de e-book, anúncios, backgrounds de app, mockups e
            qualquer projeto visual que peça um toque de galáxia.
          </div>
        </div>
      </div>
    </section>

    <!-- PLANOS -->
    <section id="planos" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Planos & Créditos</p>
        <h2 class="section-title">Comece de graça e só evolua quando sentir necessidade.</h2>
        <p class="section-subtitle">
          Todos os planos usam créditos cósmicos. Você sempre vê quanto está usando
          e quanto ainda tem, sem sustos no final do mês.
        </p>
      </div>

      <div class="pricing-grid">
        <article class="glass-soft pricing-card reveal delay-1">
          <p class="pricing-label">Começar</p>
          <h3 class="pricing-name">Explorador</h3>
          <div>
            <span class="pricing-price">R$ 0</span>
            <span class="pricing-period">/ mês</span>
          </div>
          <p class="pricing-tagline">
            Ideal para testar a Merse, brincar com prompts e entender o fluxo.
          </p>
          <ul class="pricing-list">
            <li><span class="pricing-check">✓</span> 80 créditos cósmicos por mês.</li>
            <li><span class="pricing-check">✓</span> Acesso ao assistente de prompts básico.</li>
            <li><span class="pricing-check">✓</span> Galeria pessoal limitada.</li>
          </ul>
          <button class="btn btn-ghost full" type="button">Começar no explorador</button>
        </article>

        <article class="glass pricing-card highlight reveal delay-2">
          <span class="pricing-badge">Mais usado</span>
          <p class="pricing-label">Expandir</p>
          <h3 class="pricing-name">Galáxia</h3>
          <div>
            <span class="pricing-price">R$ 39</span>
            <span class="pricing-period">/ mês</span>
          </div>
          <p class="pricing-tagline">
            Para quem cria todo dia: designers, social media, devs, estudantes e curiosos.
          </p>
          <ul class="pricing-list">
            <li><span class="pricing-check">✓</span> 900 créditos cósmicos por mês.</li>
            <li><span class="pricing-check">✓</span> Assistente de prompts avançado.</li>
            <li><span class="pricing-check">✓</span> Coleções, tags e favoritos ilimitados.</li>
            <li><span class="pricing-check">✓</span> Fila prioritária em horários de pico.</li>
          </ul>
          <button class="btn btn-primary full" type="button">Ativar plano Galáxia</button>
        </article>

        <article class="glass-soft pricing-card reveal delay-3">
          <p class="pricing-label">Escalar</p>
          <h3 class="pricing-name">Constelação</h3>
          <div>
            <span class="pricing-price">Sob consulta</span>
          </div>
          <p class="pricing-tagline">
            Para marcas, agências, times de criação e quem precisa de muita geração.
          </p>
          <ul class="pricing-list">
            <li><span class="pricing-check">✓</span> Créditos sob medida.</li>
            <li><span class="pricing-check">✓</span> Workspaces para equipe.</li>
            <li><span class="pricing-check">✓</span> Acesso antecipado a novos modelos.</li>
            <li><span class="pricing-check">✓</span> Suporte humano prioritário.</li>
          </ul>
          <button class="btn btn-ghost full" type="button">Conversar com a Merse</button>
        </article>
      </div>
    </section>

    <!-- DEPOIMENTOS -->
    <section id="depoimentos" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Depoimentos</p>
        <h2 class="section-title">Como a Merse se encaixa na rotina de quem cria.</h2>
        <p class="section-subtitle">
          A ideia é simples: menos tempo travado no prompt, mais tempo postando,
          testando, criando coisas novas e crescendo com o que você faz.
        </p>
      </div>

      <div class="testimonial-grid">
        <article class="glass testimonial-main reveal delay-1">
          <p class="testimonial-quote">
            “Antes eu passava 40 minutos tentando achar o prompt perfeito em outros
            sites de IA. Na Merse, eu escolho o estilo, ajusto duas coisas e já
            tenho uma base boa em 10 segundos. Isso muda tudo na hora de criar.”
          </p>
          <div class="testimonial-author">
            <div class="testimonial-avatar"></div>
            <div>
              <div class="testimonial-name">Criador Anônimo</div>
              <div class="testimonial-role">Designer & Social Media</div>
            </div>
          </div>
        </article>

        <div class="testimonial-side">
          <div class="testimonial-pill glass-soft reveal delay-2">
            “Eu uso a Merse para criar capas de vídeo e thumb de canal. Em vez de
            ficar baixando imagens aleatórias, eu crio tudo num estilo só.”
          </div>
          <div class="testimonial-pill glass-soft reveal delay-3">
            “As artes da Merse combinaram tanto com o visual do meu site que parece
            que a IA já foi feita pensando em como eu queria que meu projeto fosse.”
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="section">
      <div class="section-header reveal">
        <p class="section-kicker">Perguntas frequentes</p>
        <h2 class="section-title">Dúvidas que todo viajante cósmico tem antes de entrar.</h2>
        <p class="section-subtitle">
          Se você ainda está decidindo se entra agora ou deixa para depois, essa parte é para você.
        </p>
      </div>

      <div class="faq-grid">
        <div class="faq-item reveal delay-1">
          <div class="faq-header">
            <p class="faq-question">A Merse é só um site bonito ou realmente gera imagens boas?</p>
            <span class="faq-toggle">+</span>
          </div>
          <div class="faq-body">
            A ideia é justamente unir as duas coisas. O visual é pensado para você
            se sentir em um cockpit criativo, mas por trás disso existem modelos
            de IA que geram imagens em alta qualidade, com foco em detalhes,
            textura e atmosfera.
          </div>
        </div>

        <div class="faq-item reveal delay-2">
          <div class="faq-header">
            <p class="faq-question">Preciso saber muito de prompt para usar a Merse?</p>
            <span class="faq-toggle">+</span>
          </div>
          <div class="faq-body">
            Não. Você pode começar escolhendo estilos e temas prontos, ajustando
            apenas o que quer ver na cena. O assistente de prompts monta descrições
            mais técnicas por você, se quiser.
          </div>
        </div>

        <div class="faq-item reveal delay-3">
          <div class="faq-header">
            <p class="faq-question">Posso usar as imagens da Merse em projetos comerciais?</p>
            <span class="faq-toggle">+</span>
          </div>
          <div class="faq-body">
            A ideia é justamente essa: você pode usar as artes em sites, campanhas,
            redes sociais, portfólios e outros projetos visuais. Os detalhes
            específicos de uso comercial vão ficar explicados nos termos de uso.
          </div>
        </div>

        <div class="faq-item reveal delay-4">
          <div class="faq-header">
            <p class="faq-question">O plano gratuito já é suficiente para testar de verdade?</p>
            <span class="faq-toggle">+</span>
          </div>
          <div class="faq-body">
            Sim. O plano Explorador foi pensado para que você consiga testar,
            brincar com estilos, validar ideias e sentir o fluxo de criação antes
            de decidir se vale migrar para o plano Galáxia.
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="reveal">
    <div class="footer-top">
      <div class="footer-brand">
        <h3 class="footer-brand-title">MERSE</h3>
        <p class="footer-brand-sub">
          Uma IA de outro universo, feita para quem quer criar muito, rápido
          e com visual que entrega respeito.
        </p>
      </div>

      <div class="footer-links">
        <a href="#hero">Início</a>
        <a href="#sobre">Sobre</a>
        <a href="#recursos">Recursos</a>
        <a href="#galeria">Galeria</a>
        <a href="#planos">Planos</a>
        <a href="#faq">FAQ</a>
      </div>
    </div>

    <div class="footer-bottom">
      <span>© <span id="currentYear"></span> Merse. Todos os direitos reservados.</span>
      <div class="footer-social">
        <button class="btn-icon" type="button">𝕏</button>
        <button class="btn-icon" type="button">IG</button>
        <button class="btn-icon" type="button">YT</button>
      </div>
    </div>
  </footer>

  <script>
    // ==========================
    // ESTRELAS ALEATÓRIAS
    // ==========================
    (function createStars() {
      const starfield = document.getElementById("starfield");
      const starCount = 150;
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        star.className = "star";
        const size = Math.random() * 2 + 1;
        star.style.width = size + "px";
        star.style.height = size + "px";
        star.style.top = Math.random() * 100 + "%";
        star.style.left = Math.random() * 100 + "%";
        const delay = Math.random() * 5;
        star.style.animationDelay = delay + "s";
        starfield.appendChild(star);
      }
    })();

    // ==========================
    // NAVBAR MOBILE
    // ==========================
    const navbarToggle = document.getElementById("navbarToggle");
    const navbarMobile = document.getElementById("navbarMobile");

    navbarToggle.addEventListener("click", () => {
      navbarMobile.classList.toggle("open");
      navbarToggle.classList.toggle("open");
    });

    // Fecha menu ao clicar em link
    document.querySelectorAll(".mobile-link").forEach((link) => {
      link.addEventListener("click", () => {
        navbarMobile.classList.remove("open");
        navbarToggle.classList.remove("open");
      });
    });

    // ==========================
    // REVEAL ON SCROLL
    // ==========================
    const revealElements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    // ==========================
    // ATUALIZAR ANO FOOTER
    // ==========================
    document.getElementById("currentYear").textContent =
      new Date().getFullYear();

    // ==========================
    // FAQ ABRIR / FECHAR
    // ==========================
    document.querySelectorAll(".faq-item").forEach((item) => {
      item.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        document
          .querySelectorAll(".faq-item.open")
          .forEach((openItem) => openItem.classList.remove("open"));

        if (!isOpen) {
          item.classList.add("open");
        }
      });
    });

    // ==========================
    // CURSOR GLOW
    // ==========================
    const cursorGlow = document.getElementById("cursorGlow");

    document.addEventListener("mousemove", (e) => {
      if (!cursorGlow) return;
      cursorGlow.style.opacity = 1;
      cursorGlow.style.left = e.clientX + "px";
      cursorGlow.style.top = e.clientY + "px";
    });

    document.addEventListener("mouseleave", () => {
      if (!cursorGlow) return;
      cursorGlow.style.opacity = 0;
    });

    // ==========================
    // CONTADORES
    // ==========================
    const counters = document.querySelectorAll("[data-counter]");
    const speed = 140; // quanto menor, mais rápido

    function animateCounter(counter) {
      const target = parseFloat(counter.getAttribute("data-target"));
      const isDecimal = !Number.isInteger(target);
      const increment = target / speed;

      let current = 0;
      const update = () => {
        current += increment;
        if (current < target) {
          counter.textContent = isDecimal
            ? current.toFixed(1)
            : Math.floor(current);
          requestAnimationFrame(update);
        } else {
          counter.textContent = isDecimal ? target.toFixed(1) : target;
        }
      };
      update();
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));

    // ==========================
    // DESTACAR LINK ATUAL NA NAVBAR
    // ==========================
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".navbar-links .nav-link");

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            navLinks.forEach((link) => {
              link.classList.toggle(
                "active",
                link.getAttribute("href") === "#" + id
              );
            });
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  </script>
</body>
</html>
`;

const CREDIT_FORMATTER = new Intl.NumberFormat("pt-BR");
const formatCredits = (value: number | null | undefined) =>
  CREDIT_FORMATTER.format(Math.max(0, Math.round(value ?? 0)));

function BackLink() {
  return (
    <Link href="/gerar" className="codex-back-link">
      VOLTAR
    </Link>
  );
}

function CodexStudioContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { remaining, planName } = useEnergy();

  const [html, setHtml] = useState<string>(DEFAULT_HTML);
  const [comando, setComando] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [creditsSnapshot, setCreditsSnapshot] = useState(remaining);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    setCreditsSnapshot(remaining);
  }, [remaining]);

  const presets = useMemo(
    () => [
      "Transformar hero em layout meia-lua com CTA duplo",
      "Adicionar sessão de depoimentos com cards em carrossel",
      "Aplicar gradiente Merse roxo/azul no fundo e tipografia Space Grotesk",
      "Incluir footer escuro com links e ícones sociais",
    ],
    [],
  );

  const executarComando = async () => {
    const trimmedCommand = comando.trim();
    if (!trimmedCommand) {
      setStatus({ message: "Descreva o ajuste que deseja fazer no código.", tone: "info" });
      return;
    }
    setLoading(true);
    setStatus({ message: "Reservando energia cósmica...", tone: "info" });

    let latestCredits: number | null = null;

    try {
      const consume = await consumeCodexCredits({ html });
      latestCredits = consume.remainingCredits;
      const creditsLabel = formatCredits(latestCredits);
      setStatus({ message: `⚡ ${creditsLabel} créditos restantes`, tone: "info" });

      const data = await callCodexEdit({ html, comando: trimmedCommand });
      const updatedHtml = data.htmlAtualizado ?? data.html ?? html;
      setHtml(updatedHtml);
      setHistory((prev) => [{ command: trimmedCommand, executedAt: new Date().toISOString() }, ...prev].slice(0, 8));
      const successLabel = creditsLabel;
      setStatus({ message: `Blueprint atualizado • ⚡ ${successLabel} créditos`, tone: "success" });
    } catch (error) {
      const reason = (error as { reason?: string })?.reason;
      if (reason === "NO_PLAN" || reason === "NO_CREDITS") {
        setStatus({
          message: "Créditos insuficientes. Vamos te levar para os planos para recarregar.",
          tone: "error",
        });
        setTimeout(() => router.push("/planos"), 1200);
      } else if (reason === "AUTH_REQUIRED") {
        setStatus({ message: "Entre na sua conta para usar o Merse Codex.", tone: "error" });
      } else {
        const message =
          error instanceof Error ? error.message : "Não foi possível atualizar o código agora.";
        setStatus({ message, tone: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const insights = [
    "Combine comandos curtos e diretos para ajustes precisos.",
    "Reaproveite o histórico para iterar sem perder contexto.",
    "Copy/paste o HTML final direto no laboratório de sites.",
  ];

  const latestCommand = history[0]?.command ?? "Nenhum comando executado ainda.";
  const cosmicCredits = creditsSnapshot ?? remaining;
  const creditsLabel = formatCredits(cosmicCredits);
  const missionLog = history.slice(0, 4);

  const heroStats = [
    { label: "Modo ativo", value: viewMode === "desktop" ? "Desktop" : "Mobile" },
    { label: "Comandos nesta sessão", value: history.length },
    { label: "Status", value: status?.message ?? "Pronto para lançar." },
  ];

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setStatus({ message: "Não consegui copiar o HTML automaticamente.", tone: "error" });
    }
  }, [html]);

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "merse-codex-blueprint.html";
    link.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const handleOpenDocs = useCallback(() => {
    window.open("https://merse.ai", "_blank", "noreferrer");
  }, []);

  const handleVSCodeSync = useCallback(() => {
    window.open(
      "https://marketplace.visualstudio.com/items?itemName=Merse.merse-codex",
      "_blank",
      "noreferrer",
    );
  }, []);

  const heroActions = useMemo(
    () => [
      {
        label: "Sincronizar com VS Code",
        description: "Conecte o estúdio ao plugin oficial em segundos.",
        onClick: handleVSCodeSync,
      },
      {
        label: copyStatus === "copied" ? "Código copiado!" : "Copiar HTML",
        description: "Copie o blueprint atual para colar no Builder.",
        onClick: handleCopyHtml,
      },
      {
        label: "Baixar blueprint",
        description: "Gere um arquivo .html com o layout renderizado.",
        onClick: handleDownloadHtml,
      },
      {
        label: "Ver docs do Codex",
        description: "Relembre atalhos e comandos suportados.",
        onClick: handleOpenDocs,
      },
    ],
    [copyStatus, handleCopyHtml, handleDownloadHtml, handleOpenDocs, handleVSCodeSync],
  );

  const renderGuardCard = (title: string, description: string, cta?: boolean) => (
    <section className="codex-card codex-guard-card">
      <p className="badge">Codex</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {cta ? (
        <Link href="/login?redirect=/codex-studio" className="codex-button">
          Entrar
        </Link>
      ) : null}
    </section>
  );

  const shouldShowMain = !authLoading && Boolean(user);

  return (
    <div className="codex-shell">
      <div className="codex-glow codex-glow--one" />
      <div className="codex-glow codex-glow--two" />

      <BackLink />

      <div className="codex-main">
        {!shouldShowMain ? (
          authLoading
            ? renderGuardCard("Conectando ao cockpit cósmico...", "Validando acesso ao Merse Codex.")
            : renderGuardCard(
                "Entre para usar o Merse Codex",
                "Seu login ativa a contagem de créditos cósmicos.",
                true,
              )
        ) : (
          <>
            <header className="codex-header">
              <div className="codex-hero-copy">
                <p className="codex-header__eyebrow">Merse Builder · Codex Studio</p>
                <h1>Comande o HTML como se pilotasse uma nave</h1>
                <p>
                  Descreva o ajuste em português e veja o Merse Codex alterar o blueprint em tempo real,
                  mantendo a estética intergaláctica da marca. Sincronize com o VS Code ou baixe o layout final com um clique.
                </p>
                <ul className="codex-hero-stats">
                  {heroStats.map((stat) => (
                    <li key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="codex-header__meta">
                <p className="codex-credit-pill" aria-live="polite">
                  <span>⚡ {creditsLabel} créditos</span>
                  <small>{planName}</small>
                </p>
                {status && (
                  <div className={`codex-status codex-status--${status.tone}`}>
                    {status.message}
                  </div>
                )}
              </div>
            </header>

            <section className="codex-hero-console">
              <div className="codex-card codex-actions-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Fluxo</p>
                    <h3>Painel de ações rápidas</h3>
                  </div>
                </header>
                <div className="codex-action-grid">
                  {heroActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="codex-action-button"
                      onClick={action.onClick}
                    >
                      <span>{action.label}</span>
                      <p>{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="codex-card codex-mission-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Mission Log</p>
                    <h3>Últimas transmissões</h3>
                  </div>
                </header>
                {missionLog.length === 0 ? (
                  <p className="codex-mission-empty">Nenhum comando enviado ainda. Inicie a primeira manobra!</p>
                ) : (
                  <ul className="codex-mission-list">
                    {missionLog.map((item, index) => (
                      <li key={`${item.command}-${item.executedAt}-${index}`}>
                        <span>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.executedAt))}</span>
                        <p>{item.command}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="codex-grid">
              <CodexSidebar
                comando={comando}
                setComando={setComando}
                loading={loading}
                onExecute={executarComando}
                status={status}
                history={history.map((entry) => entry.command)}
                presets={presets}
              />
              <CodexEditor html={html} setHtml={setHtml} loading={loading} />
              <CodexPreview html={html} viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <section className="codex-footer-grid">
              <div className="codex-card codex-summary-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Resumo</p>
                    <h3>Logs do laboratório</h3>
                  </div>
                </header>

                <ul className="codex-summary-stats">
                  <li>
                    <span>Último comando</span>
                    <p>{latestCommand}</p>
                  </li>
                  <li>
                    <span>Execuções nesta sessão</span>
                    <p>{history.length}</p>
                  </li>
                  <li>
                    <span>Créditos disponíveis</span>
                    <p>⚡ {creditsLabel}</p>
                  </li>
                  <li>
                    <span>Status atual</span>
                    <p>{status?.message ?? "Pronto para editar."}</p>
                  </li>
                </ul>
              </div>

              <div className="codex-card codex-next-card">
                <header className="codex-card__header">
                  <div>
                    <p className="badge">Próximos passos</p>
                    <h3>Dicas para acelerar</h3>
                  </div>
                </header>
                <ul className="codex-insight-list">
                  {insights.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function CodexStudioPage() {
  return (
    <AuthProvider>
      <EnergyProvider>
        <CodexStudioContent />
      </EnergyProvider>
    </AuthProvider>
  );
}
