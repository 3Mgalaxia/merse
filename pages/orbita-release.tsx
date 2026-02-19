import { useMemo, useState } from "react";
import Link from "next/link";
import { PiArrowLeftBold, PiInstagramLogoFill, PiSparkleFill } from "react-icons/pi";

const channelBaseTime: Record<string, string[]> = {
  Instagram: ["11:30", "18:40", "21:15"],
  TikTok: ["12:10", "19:10", "22:20"],
  YouTube: ["13:00", "20:30"],
  LinkedIn: ["08:40", "12:20", "17:50"],
};

export default function OrbitaReleasePage() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["Instagram", "TikTok"]);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [cadence, setCadence] = useState("Intensa");

  const schedule = useMemo(() => {
    const add = cadence === "Intensa" ? 0 : cadence === "Equilibrada" ? 1 : 2;
    return selectedChannels.flatMap((channel) => {
      const slots = channelBaseTime[channel] ?? [];
      return slots.map((time, index) => {
        const mode = index === 0 ? "Gancho forte" : index === 1 ? "Prova visual" : "CTA final";
        const adjustedTime = slots[Math.min(index + add, slots.length - 1)];
        return {
          id: `${channel}-${index}`,
          channel,
          time: adjustedTime,
          mode,
        };
      });
    });
  }, [selectedChannels, cadence]);

  function toggleChannel(channel: string) {
    setSelectedChannels((current) => {
      if (current.includes(channel)) {
        return current.filter((item) => item !== channel);
      }
      return [...current, channel];
    });
  }

  return (
    <div className="min-h-screen bg-black px-6 pb-16 pt-28 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Órbita de Release</h1>
          <Link
            href="/gerar"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
          >
            <PiArrowLeftBold /> Voltar
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Planejamento inteligente de publicação por canal para aumentar alcance sem perder consistência visual.
        </p>

        <section className="grid gap-5 rounded-3xl border border-white/10 bg-black/60 p-6 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/65">Canais</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(channelBaseTime).map((channel) => {
                const active = selectedChannels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] transition ${
                      active
                        ? "border-indigo-300/40 bg-indigo-500/15 text-indigo-100"
                        : "border-white/20 bg-white/5 text-white/70 hover:text-white"
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Fuso horário
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/Lisbon">Europe/Lisbon</option>
            </select>
          </label>

          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-white/65">
            Cadência
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-3 text-sm tracking-normal text-white outline-none"
            >
              <option>Intensa</option>
              <option>Equilibrada</option>
              <option>Premium</option>
            </select>
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {schedule.map((slot) => (
            <article
              key={slot.id}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.32em] text-indigo-200/80">{slot.channel}</p>
                <span className="rounded-full border border-indigo-300/35 bg-indigo-500/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-indigo-100">
                  {slot.time}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/78">{slot.mode}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-white/55">{timezone}</p>
            </article>
          ))}
        </section>

        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/35 bg-indigo-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100">
          <PiInstagramLogoFill />
          agenda adaptativa por canal
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-100">
          <PiSparkleFill />
          pronto para acionar no loop
        </div>
      </div>
    </div>
  );
}

